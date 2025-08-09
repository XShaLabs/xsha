package services

import (
	"time"
	"xsha-backend/database"
	"xsha-backend/utils"
)

type AuthService interface {
	Login(username, password, clientIP, userAgent string) (bool, string, error)
	Logout(token, username string) error
	IsTokenBlacklisted(token string) (bool, error)
	CleanExpiredTokens() error
}

type LoginLogService interface {
	GetLogs(username, ip *string, success *bool, startTime, endTime *string, page, pageSize int) ([]database.LoginLog, int64, error)
	CleanOldLogs(days int) error
}

type GitCredentialService interface {
	CreateCredential(name, description, credType, username string, secretData map[string]string, createdBy string) (*database.GitCredential, error)
	GetCredential(id uint) (*database.GitCredential, error)
	ListCredentials(name *string, credType *database.GitCredentialType, page, pageSize int) ([]database.GitCredential, int64, error)
	UpdateCredential(id uint, updates map[string]interface{}, secretData map[string]string) error
	DeleteCredential(id uint) error
	ListActiveCredentials(credType *database.GitCredentialType) ([]database.GitCredential, error)
	DecryptCredentialSecret(credential *database.GitCredential, secretType string) (string, error)
	ValidateCredentialData(credType string, data map[string]string) error
}

type ProjectService interface {
	CreateProject(name, description, repoURL, protocol string, credentialID *uint, createdBy string) (*database.Project, error)
	GetProject(id uint) (*database.Project, error)
	ListProjects(name string, protocol *database.GitProtocolType, page, pageSize int) ([]database.Project, int64, error)
	ListProjectsWithTaskCount(name string, protocol *database.GitProtocolType, page, pageSize int) (interface{}, int64, error)
	UpdateProject(id uint, updates map[string]interface{}) error
	DeleteProject(id uint) error
	ValidateProtocolCredential(protocol database.GitProtocolType, credentialID *uint) error
	GetCompatibleCredentials(protocol database.GitProtocolType) ([]database.GitCredential, error)
	FetchRepositoryBranches(repoURL string, credentialID *uint) (*utils.GitAccessResult, error)
	ValidateRepositoryAccess(repoURL string, credentialID *uint) error
}

type AdminOperationLogService interface {
	LogOperation(username, operation, resource, resourceID, description, details string,
		success bool, errorMsg, ip, userAgent, method, path string) error
	LogCreate(username, resource, resourceID, description, ip, userAgent, path string, success bool, errorMsg string) error
	LogUpdate(username, resource, resourceID, description, ip, userAgent, path string, success bool, errorMsg string) error
	LogDelete(username, resource, resourceID, description, ip, userAgent, path string, success bool, errorMsg string) error
	LogRead(username, resource, resourceID, description, ip, userAgent, path string) error
	LogLogin(username, ip, userAgent string, success bool, errorMsg string) error
	LogLogout(username, ip, userAgent string, success bool, errorMsg string) error
	GetLogs(username string, operation *database.AdminOperationType, resource string,
		success *bool, startTime, endTime *time.Time, page, pageSize int) ([]database.AdminOperationLog, int64, error)
	GetLog(id uint) (*database.AdminOperationLog, error)
	GetOperationStats(username string, startTime, endTime time.Time) (map[string]int64, error)
	GetResourceStats(username string, startTime, endTime time.Time) (map[string]int64, error)
	CleanOldLogs(days int) error
}

type DevEnvironmentService interface {
	CreateEnvironment(name, description, envType, dockerImage string, cpuLimit float64, memoryLimit int64, envVars map[string]string, createdBy string) (*database.DevEnvironment, error)
	GetEnvironment(id uint) (*database.DevEnvironment, error)
	ListEnvironments(name *string, dockerImage *string, page, pageSize int) ([]database.DevEnvironment, int64, error)
	UpdateEnvironment(id uint, updates map[string]interface{}) error
	DeleteEnvironment(id uint) error
	ValidateEnvVars(envVars map[string]string) error
	GetEnvironmentVars(id uint) (map[string]string, error)
	UpdateEnvironmentVars(id uint, envVars map[string]string) error
	ValidateResourceLimits(cpuLimit float64, memoryLimit int64) error
	GetAvailableEnvironmentImages() ([]map[string]interface{}, error)
	GetStats() (map[string]interface{}, error)
}

type TaskService interface {
	CreateTask(title, startBranch string, projectID uint, devEnvironmentID *uint, createdBy string) (*database.Task, error)
	GetTask(id uint) (*database.Task, error)
	ListTasks(projectID *uint, status *database.TaskStatus, title *string, branch *string, devEnvID *uint, page, pageSize int) ([]database.Task, int64, error)
	UpdateTask(id uint, updates map[string]interface{}) error
	UpdateTaskStatus(id uint, status database.TaskStatus) error
	UpdateTaskSessionID(id uint, sessionID string) error
	UpdateTaskStatusBatch(taskIDs []uint, status database.TaskStatus) ([]uint, []uint, error)
	DeleteTask(id uint) error
	ValidateTaskData(title, startBranch string, projectID uint) error
	GetTaskGitDiff(task *database.Task, includeContent bool) (*utils.GitDiffSummary, error)
	GetTaskGitDiffFile(task *database.Task, filePath string) (string, error)
	PushTaskBranch(id uint, forcePush bool) (string, error)
}

type TaskConversationService interface {
	CreateConversation(taskID uint, content, createdBy string) (*database.TaskConversation, error)
	GetConversation(id uint) (*database.TaskConversation, error)
	ListConversations(taskID uint, page, pageSize int) ([]database.TaskConversation, int64, error)
	UpdateConversation(id uint, updates map[string]interface{}) error
	DeleteConversation(id uint) error
	GetLatestConversation(taskID uint) (*database.TaskConversation, error)
	GetConversationGitDiff(conversationID uint, includeContent bool) (*utils.GitDiffSummary, error)
	GetConversationGitDiffFile(conversationID uint, filePath string) (string, error)
	ValidateConversationData(taskID uint, content string) error
}

type TaskConversationResultService interface {
	CreateResult(conversationID uint, resultData map[string]interface{}) (*database.TaskConversationResult, error)
	GetResult(id uint) (*database.TaskConversationResult, error)
	GetResultByConversationID(conversationID uint) (*database.TaskConversationResult, error)
	UpdateResult(id uint, updates map[string]interface{}) error
	DeleteResult(id uint) error
	ListResultsByTaskID(taskID uint, page, pageSize int) ([]database.TaskConversationResult, int64, error)
	ListResultsByProjectID(projectID uint, page, pageSize int) ([]database.TaskConversationResult, int64, error)
	GetTaskStats(taskID uint) (map[string]interface{}, error)
	GetProjectStats(projectID uint) (map[string]interface{}, error)
	ExistsForConversation(conversationID uint) (bool, error)
	ValidateResultData(resultData map[string]interface{}) error
}

type AITaskExecutorService interface {
	ProcessPendingConversations() error
	GetExecutionLog(conversationID uint) (*database.TaskExecutionLog, error)
	CancelExecution(conversationID uint, createdBy string) error
	RetryExecution(conversationID uint, createdBy string) error
	GetExecutionStatus() map[string]interface{}
	CleanupWorkspaceOnFailure(taskID uint, workspacePath string) error
	CleanupWorkspaceOnCancel(taskID uint, workspacePath string) error
}

type ConfigUpdateItem struct {
	ConfigKey   string
	ConfigValue string
}

type SystemConfigService interface {
	ListAllConfigs() ([]database.SystemConfig, error)
	BatchUpdateConfigs(configs []ConfigUpdateItem) error
	GetValue(key string) (string, error)
	SetValue(key, value string) error
	InitializeDefaultConfigs() error
	ValidateConfigData(key, value, category string) error
	GetGitProxyConfig() (*utils.GitProxyConfig, error)
	GetGitCloneTimeout() (time.Duration, error)
	GetGitSSLVerify() (bool, error)
	GetDockerTimeout() (time.Duration, error)
}

type DashboardService interface {
	GetDashboardStats() (map[string]interface{}, error)
	GetRecentTasks(limit int) ([]database.Task, error)
}
