package services

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"regexp"
	"strings"
	"sync"
	"time"
	"xsha-backend/config"
	"xsha-backend/database"
	"xsha-backend/repository"
	"xsha-backend/utils"
)

// ExecutionManager 执行管理器
type ExecutionManager struct {
	runningConversations map[uint]context.CancelFunc // 正在运行的对话及其取消函数
	maxConcurrency       int                         // 最大并发数
	currentCount         int                         // 当前执行数量
	mu                   sync.RWMutex                // 读写锁
}

// NewExecutionManager 创建执行管理器
func NewExecutionManager(maxConcurrency int) *ExecutionManager {
	if maxConcurrency <= 0 {
		maxConcurrency = 5 // 默认最大并发数为5
	}
	return &ExecutionManager{
		runningConversations: make(map[uint]context.CancelFunc),
		maxConcurrency:       maxConcurrency,
	}
}

// CanExecute 检查是否可以执行新任务
func (em *ExecutionManager) CanExecute() bool {
	em.mu.RLock()
	defer em.mu.RUnlock()
	return em.currentCount < em.maxConcurrency
}

// AddExecution 添加执行任务
func (em *ExecutionManager) AddExecution(conversationID uint, cancelFunc context.CancelFunc) bool {
	em.mu.Lock()
	defer em.mu.Unlock()

	if em.currentCount >= em.maxConcurrency {
		return false
	}

	em.runningConversations[conversationID] = cancelFunc
	em.currentCount++
	return true
}

// RemoveExecution 移除执行任务
func (em *ExecutionManager) RemoveExecution(conversationID uint) {
	em.mu.Lock()
	defer em.mu.Unlock()

	if _, exists := em.runningConversations[conversationID]; exists {
		delete(em.runningConversations, conversationID)
		em.currentCount--
	}
}

// CancelExecution 取消特定执行
func (em *ExecutionManager) CancelExecution(conversationID uint) bool {
	em.mu.Lock()
	defer em.mu.Unlock()

	if cancelFunc, exists := em.runningConversations[conversationID]; exists {
		cancelFunc()
		delete(em.runningConversations, conversationID)
		em.currentCount--
		return true
	}
	return false
}

// GetRunningCount 获取当前运行数量
func (em *ExecutionManager) GetRunningCount() int {
	em.mu.RLock()
	defer em.mu.RUnlock()
	return em.currentCount
}

// IsRunning 检查特定对话是否在运行
func (em *ExecutionManager) IsRunning(conversationID uint) bool {
	em.mu.RLock()
	defer em.mu.RUnlock()
	_, exists := em.runningConversations[conversationID]
	return exists
}

type aiTaskExecutorService struct {
	taskConvRepo          repository.TaskConversationRepository
	taskRepo              repository.TaskRepository
	execLogRepo           repository.TaskExecutionLogRepository
	taskConvResultRepo    repository.TaskConversationResultRepository
	workspaceManager      *utils.WorkspaceManager
	gitCredService        GitCredentialService
	taskConvResultService TaskConversationResultService
	config                *config.Config
	executionManager      *ExecutionManager
	logBroadcaster        *LogBroadcaster
	logLineJSONRegex      *regexp.Regexp // 用于提取日志行中JSON的正则表达式
}

// NewAITaskExecutorService 创建AI任务执行服务
func NewAITaskExecutorService(
	taskConvRepo repository.TaskConversationRepository,
	taskRepo repository.TaskRepository,
	execLogRepo repository.TaskExecutionLogRepository,
	taskConvResultRepo repository.TaskConversationResultRepository,
	gitCredService GitCredentialService,
	taskConvResultService TaskConversationResultService,
	cfg *config.Config,
	logBroadcaster *LogBroadcaster,
) AITaskExecutorService {
	// 从配置读取最大并发数，默认为5
	maxConcurrency := 5
	if cfg.MaxConcurrentTasks > 0 {
		maxConcurrency = cfg.MaxConcurrentTasks
	}

	// 预编译用于提取日志行中JSON的正则表达式
	logLineJSONRegex := regexp.MustCompile(`^(?:\[\d{2}:\d{2}:\d{2}\]\s*)?(?:\w+:\s*)?(\{.*\})\s*$`)

	return &aiTaskExecutorService{
		taskConvRepo:          taskConvRepo,
		taskRepo:              taskRepo,
		execLogRepo:           execLogRepo,
		taskConvResultRepo:    taskConvResultRepo,
		workspaceManager:      utils.NewWorkspaceManager(cfg.WorkspaceBaseDir),
		gitCredService:        gitCredService,
		taskConvResultService: taskConvResultService,
		config:                cfg,
		executionManager:      NewExecutionManager(maxConcurrency),
		logBroadcaster:        logBroadcaster,
		logLineJSONRegex:      logLineJSONRegex,
	}
}

// ProcessPendingConversations 处理待处理的对话 - 支持并发执行
func (s *aiTaskExecutorService) ProcessPendingConversations() error {
	conversations, err := s.taskConvRepo.GetPendingConversationsWithDetails()
	if err != nil {
		return fmt.Errorf("获取待处理对话失败: %v", err)
	}

	utils.Info("发现待处理的对话",
		"count", len(conversations),
		"running", s.executionManager.GetRunningCount(),
		"maxConcurrency", s.executionManager.maxConcurrency)

	// 并发处理对话
	var wg sync.WaitGroup
	processedCount := 0
	skippedCount := 0

	for _, conv := range conversations {
		// 检查是否可以执行新任务
		if !s.executionManager.CanExecute() {
			skippedCount++
			utils.Warn("达到最大并发数限制，跳过对话", "conversationId", conv.ID)
			continue
		}

		// 检查是否已经在运行
		if s.executionManager.IsRunning(conv.ID) {
			skippedCount++
			utils.Warn("对话已在运行中，跳过", "conversationId", conv.ID)
			continue
		}

		wg.Add(1)
		processedCount++

		// 并发处理对话
		go func(conversation database.TaskConversation) {
			defer wg.Done()
			if err := s.processConversation(&conversation); err != nil {
				utils.Error("处理对话失败", "conversationId", conversation.ID, "error", err)
			}
		}(conv)
	}

	// 等待所有当前批次的对话开始处理（不等待完成）
	wg.Wait()

	utils.Info("本批次对话处理完成", "processed", processedCount, "skipped", skippedCount)
	return nil
}

// GetExecutionLog 获取执行日志
func (s *aiTaskExecutorService) GetExecutionLog(conversationID uint) (*database.TaskExecutionLog, error) {
	return s.execLogRepo.GetByConversationID(conversationID)
}

// CancelExecution 取消执行 - 支持强制取消正在运行的任务
func (s *aiTaskExecutorService) CancelExecution(conversationID uint, createdBy string) error {
	// 获取对话信息作为主体
	conv, err := s.taskConvRepo.GetByID(conversationID, createdBy)
	if err != nil {
		return fmt.Errorf("获取对话信息失败: %v", err)
	}

	// 检查对话状态是否可以取消
	if conv.Status != database.ConversationStatusPending && conv.Status != database.ConversationStatusRunning {
		return fmt.Errorf("只能取消待处理或执行中的任务")
	}

	// 如果任务正在运行，先取消执行
	if s.executionManager.CancelExecution(conversationID) {
		utils.Info("Force cancelling running conversation",
			"conversation_id", conversationID,
		)
	}

	// 更新对话状态为已取消
	conv.Status = database.ConversationStatusCancelled
	if err := s.taskConvRepo.Update(conv); err != nil {
		return fmt.Errorf("failed to update conversation status to cancelled: %v", err)
	}

	// 清理工作空间（在取消时）
	if conv.Task != nil && conv.Task.WorkspacePath != "" {
		if cleanupErr := s.CleanupWorkspaceOnCancel(conv.Task.ID, conv.Task.WorkspacePath); cleanupErr != nil {
			utils.Error("取消执行时清理工作空间失败", "task_id", conv.Task.ID, "workspace", conv.Task.WorkspacePath, "error", cleanupErr)
			// 不因为清理失败而中断取消操作，但要记录错误
		}
	}

	return nil
}

// RetryExecution 重试执行对话
func (s *aiTaskExecutorService) RetryExecution(conversationID uint, createdBy string) error {
	// 获取对话信息
	conv, err := s.taskConvRepo.GetByID(conversationID, createdBy)
	if err != nil {
		return fmt.Errorf("获取对话信息失败: %v", err)
	}

	// 检查对话状态是否可以重试
	if conv.Status != database.ConversationStatusFailed && conv.Status != database.ConversationStatusCancelled {
		return fmt.Errorf("只能重试失败或已取消的任务")
	}

	// 检查是否有正在运行的执行
	if s.executionManager.IsRunning(conversationID) {
		return fmt.Errorf("任务正在执行中，无法重试")
	}

	// 检查是否可以执行新任务（并发限制）
	if !s.executionManager.CanExecute() {
		return fmt.Errorf("已达到最大并发数限制，请稍后重试")
	}

	// 删除该对话的所有旧执行日志
	if err := s.execLogRepo.DeleteByConversationID(conversationID); err != nil {
		return fmt.Errorf("删除旧执行日志失败: %v", err)
	}

	// 重置对话状态为待处理
	conv.Status = database.ConversationStatusPending
	if err := s.taskConvRepo.Update(conv); err != nil {
		return fmt.Errorf("重置对话状态失败: %v", err)
	}

	// 处理对话（这会创建新的执行日志）
	if err := s.processConversation(conv); err != nil {
		// 如果处理失败，将状态回滚为失败
		conv.Status = database.ConversationStatusFailed
		s.taskConvRepo.Update(conv)
		return fmt.Errorf("重试执行失败: %v", err)
	}

	return nil
}

// GetExecutionStatus 获取执行状态信息
func (s *aiTaskExecutorService) GetExecutionStatus() map[string]interface{} {
	return map[string]interface{}{
		"running_count":   s.executionManager.GetRunningCount(),
		"max_concurrency": s.executionManager.maxConcurrency,
		"can_execute":     s.executionManager.CanExecute(),
	}
}

// processConversation 处理单个对话 - 添加上下文控制
func (s *aiTaskExecutorService) processConversation(conv *database.TaskConversation) error {
	// 验证关联数据
	if conv.Task == nil {
		s.setConversationFailed(conv, "任务信息缺失")
		return fmt.Errorf("任务信息缺失")
	}
	if conv.Task.Project == nil {
		s.setConversationFailed(conv, "项目信息缺失")
		return fmt.Errorf("项目信息缺失")
	}
	if conv.Task.DevEnvironment == nil {
		s.setConversationFailed(conv, "task has no development environment configured, cannot execute")
		return fmt.Errorf("task has no development environment configured, cannot execute")
	}

	// 更新对话状态为 running
	conv.Status = database.ConversationStatusRunning
	if err := s.taskConvRepo.Update(conv); err != nil {
		s.rollbackConversationState(conv, fmt.Sprintf("failed to update conversation status: %v", err))
		return fmt.Errorf("failed to update conversation status: %v", err)
	}

	// 创建执行日志
	execLog := &database.TaskExecutionLog{
		ConversationID: conv.ID,
		ExecutionLogs:  "", // 初始化为空字符串，避免NULL值问题
	}
	if err := s.execLogRepo.Create(execLog); err != nil {
		s.rollbackConversationState(conv, fmt.Sprintf("failed to create execution log: %v", err))
		return fmt.Errorf("failed to create execution log: %v", err)
	}

	// 创建上下文和取消函数
	ctx, cancel := context.WithCancel(context.Background())

	// 注册到执行管理器
	if !s.executionManager.AddExecution(conv.ID, cancel) {
		// 如果无法添加到执行管理器，回滚状态
		s.rollbackToState(conv, execLog,
			database.ConversationStatusPending,
			"超过最大并发数限制")
		return fmt.Errorf("超过最大并发数限制")
	}

	// 在协程中执行任务
	go s.executeTask(ctx, conv, execLog)

	return nil
}

// executeTask 在协程中执行任务 - 添加上下文控制
func (s *aiTaskExecutorService) executeTask(ctx context.Context, conv *database.TaskConversation, execLog *database.TaskExecutionLog) {
	var finalStatus database.ConversationStatus
	var errorMsg string
	var commitHash string

	// 确保从执行管理器中移除
	defer func() {
		s.executionManager.RemoveExecution(conv.ID)

		// 更新对话状态 (主状态)
		conv.Status = finalStatus
		if err := s.taskConvRepo.Update(conv); err != nil {
			utils.Error("更新对话最终状态失败", "error", err)
		}

		// 清理工作空间（在失败或取消时）
		if finalStatus == database.ConversationStatusFailed || finalStatus == database.ConversationStatusCancelled {
			if conv.Task != nil && conv.Task.WorkspacePath != "" {
				if finalStatus == database.ConversationStatusFailed {
					if cleanupErr := s.CleanupWorkspaceOnFailure(conv.Task.ID, conv.Task.WorkspacePath); cleanupErr != nil {
						utils.Error("清理失败任务工作空间时出错", "task_id", conv.Task.ID, "error", cleanupErr)
					}
				} else if finalStatus == database.ConversationStatusCancelled {
					if cleanupErr := s.CleanupWorkspaceOnCancel(conv.Task.ID, conv.Task.WorkspacePath); cleanupErr != nil {
						utils.Error("清理取消任务工作空间时出错", "task_id", conv.Task.ID, "error", cleanupErr)
					}
				}
			}
		}

		// 更新对话的 commit hash（如果成功）
		if commitHash != "" {
			if err := s.taskConvRepo.UpdateCommitHash(conv.ID, commitHash); err != nil {
				utils.Error("更新对话commit hash失败", "error", err)
			}
		}

		// 准备执行日志元数据更新
		updates := make(map[string]interface{})

		if errorMsg != "" {
			updates["error_message"] = errorMsg
		}

		// 更新完成时间
		now := time.Now()
		updates["completed_at"] = &now

		// 使用 UpdateMetadata 避免覆盖 execution_logs 字段
		if err := s.execLogRepo.UpdateMetadata(execLog.ID, updates); err != nil {
			utils.Error("更新执行日志元数据失败", "error", err)
		}

		// 广播状态变化
		statusMessage := fmt.Sprintf("执行完成: %s", string(finalStatus))
		if errorMsg != "" {
			statusMessage += fmt.Sprintf(" - %s", errorMsg)
		}
		s.logBroadcaster.BroadcastStatus(conv.ID, fmt.Sprintf("%s - %s", string(finalStatus), statusMessage))

		// 尝试解析并创建任务结果记录
		// 重新从数据库获取最新的执行日志数据（包含所有追加的日志内容）
		latestExecLog, err := s.execLogRepo.GetByID(execLog.ID)
		if err != nil {
			utils.Error("获取最新执行日志失败", "execLogID", execLog.ID, "error", err)
			latestExecLog = execLog // 使用原始对象作为后备
		}
		s.parseAndCreateTaskResult(conv, latestExecLog)

		utils.Info("对话执行完成", "conversationId", conv.ID, "status", string(finalStatus))
	}()

	// 检查是否被取消
	select {
	case <-ctx.Done():
		finalStatus = database.ConversationStatusCancelled
		errorMsg = "任务被取消"
		s.appendLog(execLog.ID, "❌ 任务被用户取消\n")
		return
	default:
	}

	// 1. 获取或创建任务级工作目录
	workspacePath, err := s.workspaceManager.GetOrCreateTaskWorkspace(conv.Task.ID, conv.Task.WorkspacePath)
	if err != nil {
		finalStatus = database.ConversationStatusFailed
		errorMsg = fmt.Sprintf("创建工作目录失败: %v", err)
		return
	}

	// 更新任务的工作空间路径（如果尚未设置）
	if conv.Task.WorkspacePath == "" {
		conv.Task.WorkspacePath = workspacePath
		if updateErr := s.taskRepo.Update(conv.Task); updateErr != nil {
			utils.Error("更新任务工作空间路径失败", "error", updateErr)
			// 继续执行，不因为路径更新失败而中断任务
		}
	}

	// 更新开始时间
	now := time.Now()
	startedUpdates := map[string]interface{}{
		"started_at": &now,
	}
	s.execLogRepo.UpdateMetadata(execLog.ID, startedUpdates)

	// 检查是否被取消
	select {
	case <-ctx.Done():
		finalStatus = database.ConversationStatusCancelled
		errorMsg = "任务被取消"
		s.appendLog(execLog.ID, "❌ 任务在准备阶段被取消\n")
		return
	default:
	}

	// 2. 检查并克隆代码
	if s.workspaceManager.CheckGitRepositoryExists(workspacePath) {
		// 仓库已存在，跳过克隆
		s.appendLog(execLog.ID, fmt.Sprintf("📁 仓库已存在，跳过克隆: %s\n", workspacePath))
	} else {
		// 仓库不存在，执行克隆
		credential, err := s.prepareGitCredential(conv.Task.Project)
		if err != nil {
			finalStatus = database.ConversationStatusFailed
			errorMsg = fmt.Sprintf("准备Git凭据失败: %v", err)
			return
		}

		if err := s.workspaceManager.CloneRepositoryWithConfig(
			workspacePath,
			conv.Task.Project.RepoURL,
			conv.Task.StartBranch,
			credential,
			s.config.GitSSLVerify,
		); err != nil {
			finalStatus = database.ConversationStatusFailed
			errorMsg = fmt.Sprintf("克隆仓库失败: %v", err)
			return
		}

		s.appendLog(execLog.ID, fmt.Sprintf("✅ 成功克隆仓库到: %s\n", workspacePath))
	}

	// 3. 构建并执行Docker命令
	dockerCmd := s.buildDockerCommand(conv, workspacePath)
	// 构建用于记录的安全版本（环境变量值已打码）
	dockerCmdForLog := s.buildDockerCommandForLog(conv, workspacePath)
	dockerUpdates := map[string]interface{}{
		"docker_command": dockerCmdForLog,
	}
	s.execLogRepo.UpdateMetadata(execLog.ID, dockerUpdates)

	s.appendLog(execLog.ID, fmt.Sprintf("🚀 开始执行命令: %s\n", dockerCmdForLog))

	// 使用上下文控制的Docker执行
	if err := s.executeDockerCommandWithContext(ctx, dockerCmd, execLog.ID); err != nil {
		// 检查是否是由于取消导致的错误
		select {
		case <-ctx.Done():
			finalStatus = database.ConversationStatusCancelled
			errorMsg = "任务被取消"
			s.appendLog(execLog.ID, "❌ 任务在执行过程中被取消\n")
		default:
			finalStatus = database.ConversationStatusFailed
			errorMsg = fmt.Sprintf("执行Docker命令失败: %v", err)
		}
		return
	}

	// 4. 提交更改
	hash, err := s.workspaceManager.CommitChanges(workspacePath, fmt.Sprintf("AI generated changes for conversation %d", conv.ID))
	if err != nil {
		s.appendLog(execLog.ID, fmt.Sprintf("⚠️ 提交更改失败: %v\n", err))
		// 不设为失败，因为任务可能已经成功执行
	} else {
		commitHash = hash
		s.appendLog(execLog.ID, fmt.Sprintf("✅ 成功提交更改，commit hash: %s\n", hash))
	}

	finalStatus = database.ConversationStatusSuccess
}

// prepareGitCredential 准备Git凭据
func (s *aiTaskExecutorService) prepareGitCredential(project *database.Project) (*utils.GitCredentialInfo, error) {
	if project.Credential == nil {
		return nil, nil
	}

	credential := &utils.GitCredentialInfo{
		Type:     utils.GitCredentialType(project.Credential.Type),
		Username: project.Credential.Username,
	}

	// 解密敏感信息
	switch project.Credential.Type {
	case database.GitCredentialTypePassword, database.GitCredentialTypeToken:
		password, err := s.gitCredService.DecryptCredentialSecret(project.Credential, "password")
		if err != nil {
			return nil, err
		}
		credential.Password = password
	case database.GitCredentialTypeSSHKey:
		privateKey, err := s.gitCredService.DecryptCredentialSecret(project.Credential, "private_key")
		if err != nil {
			return nil, err
		}
		credential.PrivateKey = privateKey
		credential.PublicKey = project.Credential.PublicKey
	}

	return credential, nil
}

// buildDockerCommand 构建Docker命令
func (s *aiTaskExecutorService) buildDockerCommand(conv *database.TaskConversation, workspacePath string) string {
	devEnv := conv.Task.DevEnvironment

	// 解析环境变量
	envVars := make(map[string]string)
	if devEnv.EnvVars != "" {
		json.Unmarshal([]byte(devEnv.EnvVars), &envVars)
	}

	// 构建基础命令
	cmd := []string{
		"docker", "run", "--rm",
		fmt.Sprintf("-v %s:/app", workspacePath),
	}

	// 添加资源限制
	if devEnv.CPULimit > 0 {
		cmd = append(cmd, fmt.Sprintf("--cpus=%.2f", devEnv.CPULimit))
	}
	if devEnv.MemoryLimit > 0 {
		cmd = append(cmd, fmt.Sprintf("--memory=%dm", devEnv.MemoryLimit))
	}

	// 添加环境变量
	for key, value := range envVars {
		cmd = append(cmd, fmt.Sprintf("-e %s=%s", key, value))
	}

	// 根据开发环境类型选择镜像和命令
	var imageName string
	var aiCommand []string

	switch devEnv.Type {
	case "claude-code":
		imageName = "claude-code:latest"
		aiCommand = []string{
			"claude",
			"-p",
			"--output-format=stream-json",
			"--dangerously-skip-permissions",
			"--verbose",
			conv.Content,
		}
	case "opencode":
		imageName = "opencode:latest"
		aiCommand = []string{conv.Content}
	case "gemini-cli":
		imageName = "gemini-cli:latest"
		aiCommand = []string{conv.Content}
	default:
		// 默认使用 claude-code
		imageName = "claude-code:latest"
		aiCommand = []string{
			"claude",
			"-p",
			"--output-format=stream-json",
			"--dangerously-skip-permissions",
			"--verbose",
			conv.Content,
		}
	}

	// 添加镜像名称
	cmd = append(cmd, imageName)

	// 添加 AI 命令参数
	cmd = append(cmd, aiCommand...)

	return strings.Join(cmd, " ")
}

// buildDockerCommandForLog 构建用于记录的Docker命令（环境变量值已打码）
func (s *aiTaskExecutorService) buildDockerCommandForLog(conv *database.TaskConversation, workspacePath string) string {
	devEnv := conv.Task.DevEnvironment

	// 解析环境变量
	envVars := make(map[string]string)
	if devEnv.EnvVars != "" {
		json.Unmarshal([]byte(devEnv.EnvVars), &envVars)
	}

	// 构建基础命令
	cmd := []string{
		"docker", "run", "--rm",
		fmt.Sprintf("-v %s:/app", workspacePath),
	}

	// 添加资源限制
	if devEnv.CPULimit > 0 {
		cmd = append(cmd, fmt.Sprintf("--cpus=%.2f", devEnv.CPULimit))
	}
	if devEnv.MemoryLimit > 0 {
		cmd = append(cmd, fmt.Sprintf("--memory=%dm", devEnv.MemoryLimit))
	}

	// 添加环境变量（值已打码）
	for key, value := range envVars {
		maskedValue := utils.MaskSensitiveValue(value)
		cmd = append(cmd, fmt.Sprintf("-e %s=%s", key, maskedValue))
	}

	// 根据开发环境类型选择镜像和命令
	var imageName string
	var aiCommand []string

	switch devEnv.Type {
	case "claude-code":
		imageName = "claude-code:latest"
		aiCommand = []string{
			"claude",
			"-p",
			"--output-format=stream-json",
			"--dangerously-skip-permissions",
			"--verbose",
			conv.Content,
		}
	case "opencode":
		imageName = "opencode:latest"
		aiCommand = []string{conv.Content}
	case "gemini-cli":
		imageName = "gemini-cli:latest"
		aiCommand = []string{conv.Content}
	default:
		// 默认使用 claude-code
		imageName = "claude-code:latest"
		aiCommand = []string{
			"claude",
			"-p",
			"--output-format=stream-json",
			"--dangerously-skip-permissions",
			"--verbose",
			conv.Content,
		}
	}

	// 添加镜像名称
	cmd = append(cmd, imageName)

	// 添加 AI 命令参数
	cmd = append(cmd, aiCommand...)

	return strings.Join(cmd, " ")
}

// executeDockerCommandWithContext 执行Docker命令，添加上下文控制
func (s *aiTaskExecutorService) executeDockerCommandWithContext(ctx context.Context, dockerCmd string, execLogID uint) error {
	// 首先检查 Docker 是否可用
	if err := s.checkDockerAvailability(); err != nil {
		s.appendLog(execLogID, fmt.Sprintf("❌ Docker 不可用: %v\n", err))
		return fmt.Errorf("docker 不可用: %v", err)
	}

	s.appendLog(execLogID, "✅ Docker 可用性检查通过\n")

	// 解析超时时间
	timeout, err := time.ParseDuration(s.config.DockerExecutionTimeout)
	if err != nil {
		utils.Warn("解析Docker超时时间失败，使用默认值30分钟", "error", err)
		timeout = 30 * time.Minute
	}

	ctx, cancel := context.WithTimeout(ctx, timeout) // 使用传入的上下文
	defer cancel()

	cmd := exec.CommandContext(ctx, "sh", "-c", dockerCmd)

	// 获取输出管道
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return err
	}

	// 启动命令
	if err := cmd.Start(); err != nil {
		return err
	}

	// 实时读取输出和错误信息
	var stderrLines []string
	var mu sync.Mutex

	go s.readPipe(stdout, execLogID, "STDOUT")
	go s.readPipeWithErrorCapture(stderr, execLogID, "STDERR", &stderrLines, &mu)

	// 等待命令完成
	err = cmd.Wait()
	if err != nil && len(stderrLines) > 0 {
		// 将 STDERR 中的错误信息合并作为错误消息
		mu.Lock()
		errorLines := make([]string, len(stderrLines))
		copy(errorLines, stderrLines)
		mu.Unlock()

		if len(errorLines) > 0 {
			errorMsg := strings.Join(errorLines, "\n")
			// 限制错误信息长度，避免过长
			if len(errorMsg) > 1000 {
				errorMsg = errorMsg[:1000] + "..."
			}
			return fmt.Errorf("%s", errorMsg)
		}
	}
	return err
}

// checkDockerAvailability 检查 Docker 是否可用
func (s *aiTaskExecutorService) checkDockerAvailability() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 检查 Docker 守护进程是否可用
	cmd := exec.CommandContext(ctx, "docker", "version")
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("docker 命令不可用或 docker 守护进程未运行: %v", err)
	}

	return nil
}

// readPipe 读取管道输出
func (s *aiTaskExecutorService) readPipe(pipe interface{}, execLogID uint, prefix string) {
	scanner := bufio.NewScanner(pipe.(interface{ Read([]byte) (int, error) }))
	for scanner.Scan() {
		line := scanner.Text()
		logLine := fmt.Sprintf("[%s] %s: %s\n", time.Now().Format("15:04:05"), prefix, line)
		s.appendLog(execLogID, logLine)
	}
}

// readPipeWithErrorCapture 读取管道输出并捕获错误信息
func (s *aiTaskExecutorService) readPipeWithErrorCapture(pipe interface{}, execLogID uint, prefix string, errorLines *[]string, mu *sync.Mutex) {
	scanner := bufio.NewScanner(pipe.(interface{ Read([]byte) (int, error) }))
	for scanner.Scan() {
		line := scanner.Text()
		logLine := fmt.Sprintf("[%s] %s: %s\n", time.Now().Format("15:04:05"), prefix, line)
		s.appendLog(execLogID, logLine)

		// 如果是 STDERR，捕获错误信息
		if prefix == "STDERR" {
			mu.Lock()
			*errorLines = append(*errorLines, line)
			mu.Unlock()
		}
	}
}

// setConversationFailed 设置对话状态为失败并创建执行日志
func (s *aiTaskExecutorService) setConversationFailed(conv *database.TaskConversation, errorMessage string) {
	// 更新对话状态为失败
	conv.Status = database.ConversationStatusFailed
	if updateErr := s.taskConvRepo.Update(conv); updateErr != nil {
		utils.Error("failed to update conversation status to failed", "error", updateErr)
	}

	// 创建执行日志记录失败原因
	execLog := &database.TaskExecutionLog{
		ConversationID: conv.ID,
		ErrorMessage:   errorMessage,
		ExecutionLogs:  "", // 初始化为空字符串，避免NULL值问题
	}
	if logErr := s.execLogRepo.Create(execLog); logErr != nil {
		utils.Error("failed to create execution log", "error", logErr)
	}
}

// rollbackConversationState 回滚对话状态为失败
func (s *aiTaskExecutorService) rollbackConversationState(conv *database.TaskConversation, errorMessage string) {
	conv.Status = database.ConversationStatusFailed
	if updateErr := s.taskConvRepo.Update(conv); updateErr != nil {
		utils.Error("failed to rollback conversation status to failed", "error", updateErr)
	}

	// 尝试创建或更新执行日志记录失败原因
	failedExecLog := &database.TaskExecutionLog{
		ConversationID: conv.ID,
		ErrorMessage:   errorMessage,
		ExecutionLogs:  "", // 初始化为空字符串，避免NULL值问题
	}
	if logErr := s.execLogRepo.Create(failedExecLog); logErr != nil {
		utils.Error("failed to create failed execution log", "error", logErr)
	}
}

// rollbackToState 回滚对话和执行日志到指定状态
func (s *aiTaskExecutorService) rollbackToState(
	conv *database.TaskConversation,
	execLog *database.TaskExecutionLog,
	convStatus database.ConversationStatus,
	errorMessage string,
) {
	// 回滚对话状态
	conv.Status = convStatus
	if updateErr := s.taskConvRepo.Update(conv); updateErr != nil {
		utils.Error("failed to rollback conversation status", "status", convStatus, "error", updateErr)
	}

	// 更新执行日志错误信息
	errorUpdates := map[string]interface{}{
		"error_message": errorMessage,
	}
	if updateErr := s.execLogRepo.UpdateMetadata(execLog.ID, errorUpdates); updateErr != nil {
		utils.Error("failed to update execution log", "error", updateErr)
	}
}

// appendLog 追加日志并广播
func (s *aiTaskExecutorService) appendLog(execLogID uint, content string) {
	// 追加到数据库
	if err := s.execLogRepo.AppendLog(execLogID, content); err != nil {
		utils.Error("追加日志失败", "error", err)
		return
	}

	// 获取对话ID进行广播
	if execLog, err := s.execLogRepo.GetByID(execLogID); err == nil {
		s.logBroadcaster.BroadcastLog(execLog.ConversationID, content, "log")
	}
}

// CleanupWorkspaceOnFailure 在任务执行失败时清理工作空间
func (s *aiTaskExecutorService) CleanupWorkspaceOnFailure(taskID uint, workspacePath string) error {
	if workspacePath == "" {
		utils.Warn("工作空间路径为空，跳过清理", "task_id", taskID)
		return nil
	}

	utils.Info("开始清理失败任务的工作空间", "task_id", taskID, "workspace", workspacePath)

	// 检查工作空间是否为脏状态
	isDirty, err := s.workspaceManager.CheckWorkspaceIsDirty(workspacePath)
	if err != nil {
		utils.Error("检查工作空间状态失败", "task_id", taskID, "workspace", workspacePath, "error", err)
		// 即使检查失败，也尝试清理
	}

	if isDirty || err != nil {
		// 重置工作空间到干净状态
		if resetErr := s.workspaceManager.ResetWorkspaceToCleanState(workspacePath); resetErr != nil {
			utils.Error("重置工作空间失败", "task_id", taskID, "workspace", workspacePath, "error", resetErr)
			return fmt.Errorf("清理失败任务工作空间失败: %v", resetErr)
		}
		utils.Info("已清理失败任务的工作空间文件变动", "task_id", taskID, "workspace", workspacePath)
	} else {
		utils.Info("工作空间已处于干净状态，无需清理", "task_id", taskID, "workspace", workspacePath)
	}

	return nil
}

// CleanupWorkspaceOnCancel 在任务被取消时清理工作空间
func (s *aiTaskExecutorService) CleanupWorkspaceOnCancel(taskID uint, workspacePath string) error {
	if workspacePath == "" {
		utils.Warn("工作空间路径为空，跳过清理", "task_id", taskID)
		return nil
	}

	utils.Info("开始清理被取消任务的工作空间", "task_id", taskID, "workspace", workspacePath)

	// 检查工作空间是否为脏状态
	isDirty, err := s.workspaceManager.CheckWorkspaceIsDirty(workspacePath)
	if err != nil {
		utils.Error("检查工作空间状态失败", "task_id", taskID, "workspace", workspacePath, "error", err)
		// 即使检查失败，也尝试清理
	}

	if isDirty || err != nil {
		// 重置工作空间到干净状态
		if resetErr := s.workspaceManager.ResetWorkspaceToCleanState(workspacePath); resetErr != nil {
			utils.Error("重置工作空间失败", "task_id", taskID, "workspace", workspacePath, "error", resetErr)
			return fmt.Errorf("清理取消任务工作空间失败: %v", resetErr)
		}
		utils.Info("已清理被取消任务的工作空间文件变动", "task_id", taskID, "workspace", workspacePath)
	} else {
		utils.Info("工作空间已处于干净状态，无需清理", "task_id", taskID, "workspace", workspacePath)
	}

	return nil
}

// parseAndCreateTaskResult 解析执行日志中的结果并创建 TaskConversationResult 记录
func (s *aiTaskExecutorService) parseAndCreateTaskResult(conv *database.TaskConversation, execLog *database.TaskExecutionLog) {
	// 从执行日志中解析结果 JSON
	resultData, err := s.parseExecutionResult(execLog.ExecutionLogs)
	if err != nil {
		utils.Warn("Failed to parse execution result from logs",
			"conversation_id", conv.ID,
			"execution_log_id", execLog.ID,
			"error", err)
		return
	}

	if resultData == nil {
		// 没有找到结果数据，可能是正常情况（某些执行可能不产生结果JSON）
		utils.Info("No result data found in execution logs",
			"conversation_id", conv.ID,
			"execution_log_id", execLog.ID)
		return
	}

	// 检查是否已存在结果记录
	exists, err := s.taskConvResultRepo.ExistsByConversationID(conv.ID)
	if err != nil {
		utils.Error("Failed to check existing task conversation result",
			"conversation_id", conv.ID,
			"error", err)
		return
	}

	if exists {
		utils.Info("Task conversation result already exists, skipping creation",
			"conversation_id", conv.ID)
		return
	}

	// 创建 TaskConversationResult 记录
	_, err = s.taskConvResultService.CreateResult(conv.ID, resultData)
	if err != nil {
		utils.Error("Failed to create task conversation result",
			"conversation_id", conv.ID,
			"error", err)
		return
	}

	utils.Info("Successfully created task conversation result",
		"conversation_id", conv.ID,
		"result_data", resultData)
}

// parseExecutionResult 从执行日志字符串中解析结果 JSON
func (s *aiTaskExecutorService) parseExecutionResult(executionLogs string) (map[string]interface{}, error) {
	if executionLogs == "" {
		return nil, nil
	}

	// 按行分割日志
	lines := strings.Split(executionLogs, "\n")

	// 从后往前查找，因为结果通常在日志末尾
	for i := len(lines) - 1; i >= 0; i-- {
		line := strings.TrimSpace(lines[i])
		if line == "" {
			continue
		}

		// 提取日志行中的 JSON 部分
		jsonStr := s.extractJSONFromLogLine(line)
		if jsonStr == "" {
			continue // 没有找到 JSON 部分
		}

		// 尝试解析为 JSON
		var result map[string]interface{}
		if err := json.Unmarshal([]byte(jsonStr), &result); err != nil {
			continue // 不是有效的 JSON，继续查找
		}

		// 检查是否是我们要找的结果类型
		if typeVal, ok := result["type"].(string); ok && typeVal == "result" {
			// 验证必需字段
			if _, hasSubtype := result["subtype"]; hasSubtype {
				if _, hasIsError := result["is_error"]; hasIsError {
					// 额外验证其他关键字段
					if s.validateResultData(result) {
						utils.Info("Found result JSON in execution logs",
							"line_index", i,
							"result_type", typeVal,
							"json_extract", jsonStr[:100]+"...") // 记录前100个字符用于调试
						return result, nil
					}
				}
			}
		}
	}

	return nil, nil // 没有找到符合条件的结果 JSON
}

// extractJSONFromLogLine 从日志行中提取 JSON 字符串
// 支持格式: [时间戳] 前缀: {JSON内容} 或纯 JSON
func (s *aiTaskExecutorService) extractJSONFromLogLine(line string) string {
	// 使用预编译的正则表达式匹配日志格式并提取 JSON
	// 模式说明:
	// ^                     - 行开始
	// (?:\[\d{2}:\d{2}:\d{2}\]\s*)?  - 可选的时间戳 [HH:MM:SS]
	// (?:\w+:\s*)?          - 可选的前缀如 STDOUT:, STDERR: 等
	// (\{.*\})              - 捕获组：JSON 对象（从 { 开始到 } 结束）
	// \s*$                  - 可选的空白字符直到行尾

	// 匹配并提取 JSON
	matches := s.logLineJSONRegex.FindStringSubmatch(strings.TrimSpace(line))
	if len(matches) >= 2 {
		return matches[1] // 返回第一个捕获组（JSON部分）
	}

	// 如果正则匹配失败，检查是否是纯 JSON 行
	trimmedLine := strings.TrimSpace(line)
	if strings.HasPrefix(trimmedLine, "{") && strings.HasSuffix(trimmedLine, "}") {
		return trimmedLine
	}

	return ""
}

// validateResultData 验证结果数据的完整性
func (s *aiTaskExecutorService) validateResultData(data map[string]interface{}) bool {
	// 检查必需字段是否存在
	requiredFields := []string{"type", "subtype", "is_error", "session_id"}
	for _, field := range requiredFields {
		if _, exists := data[field]; !exists {
			utils.Warn("Missing required field in result data", "field", field)
			return false
		}
	}

	// 检查数据类型
	if typeVal, ok := data["type"].(string); !ok || typeVal != "result" {
		utils.Warn("Invalid type field in result data", "type", data["type"])
		return false
	}

	if _, ok := data["is_error"].(bool); !ok {
		utils.Warn("Invalid is_error field in result data", "is_error", data["is_error"])
		return false
	}

	if sessionID, ok := data["session_id"].(string); !ok || sessionID == "" {
		utils.Warn("Invalid session_id field in result data", "session_id", data["session_id"])
		return false
	}

	return true
}
