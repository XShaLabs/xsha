package utils

import (
	"context"
	"fmt"
	"io/ioutil"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

type WorkspaceManager struct {
	baseDir         string
	gitCloneTimeout time.Duration
}

func NewWorkspaceManager(baseDir string, gitCloneTimeout time.Duration) *WorkspaceManager {
	if baseDir == "" {
		baseDir = "/tmp/xsha-workspaces"
	}
	if gitCloneTimeout == 0 {
		gitCloneTimeout = 5 * time.Minute
	}
	return &WorkspaceManager{baseDir: baseDir, gitCloneTimeout: gitCloneTimeout}
}

func (w *WorkspaceManager) GetOrCreateTaskWorkspace(taskID uint, existingPath string) (string, error) {
	if existingPath != "" && w.CheckWorkspaceExists(existingPath) {
		return existingPath, nil
	}

	if err := os.MkdirAll(w.baseDir, 0777); err != nil {
		return "", fmt.Errorf("failed to create base directory: %v", err)
	}
	// 确保base目录有正确的权限
	if err := os.Chmod(w.baseDir, 0777); err != nil {
		return "", fmt.Errorf("failed to set base directory permissions: %v", err)
	}

	dirName := fmt.Sprintf("task-%d-%d", taskID, time.Now().Unix())
	workspacePath := filepath.Join(w.baseDir, dirName)

	if err := os.MkdirAll(workspacePath, 0777); err != nil {
		return "", fmt.Errorf("failed to create workspace directory: %v", err)
	}

	// 显式设置目录权限为0777，确保在Docker容器中也能正确设置权限
	if err := os.Chmod(workspacePath, 0777); err != nil {
		return "", fmt.Errorf("failed to set workspace directory permissions: %v", err)
	}

	return workspacePath, nil
}

func (w *WorkspaceManager) CleanupTaskWorkspace(workspacePath string) error {
	if workspacePath == "" {
		return nil
	}
	return os.RemoveAll(workspacePath)
}

func (w *WorkspaceManager) CloneRepositoryWithConfig(workspacePath, repoURL, branch string, credential *GitCredentialInfo, sslVerify bool, proxyConfig *GitProxyConfig) error {
	ctx, cancel := context.WithTimeout(context.Background(), w.gitCloneTimeout)
	defer cancel()

	var cmd *exec.Cmd
	var envVars []string

	baseEnv := w.createNonInteractiveGitEnv()

	if credential != nil {
		if err := w.validateCredential(credential); err != nil {
			return fmt.Errorf("credential validation failed: %v", err)
		}

		switch credential.Type {
		case GitCredentialTypePassword, GitCredentialTypeToken:
			authenticatedURL, err := w.buildAuthenticatedURL(repoURL, credential)
			if err != nil {
				return err
			}
			cmd = exec.CommandContext(ctx, "git", "clone", "-b", branch, authenticatedURL, workspacePath)
			cmd.Env = ApplyProxyToGitEnv(baseEnv, proxyConfig)

		case GitCredentialTypeSSHKey:
			keyFile := filepath.Join(workspacePath, ".ssh_key")
			if err := ioutil.WriteFile(keyFile, []byte(credential.PrivateKey), 0600); err != nil {
				return fmt.Errorf("failed to create SSH key file: %v", err)
			}
			defer os.Remove(keyFile)

			envVars = append(baseEnv,
				fmt.Sprintf("GIT_SSH_COMMAND=ssh -i %s -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no -o BatchMode=yes -o PasswordAuthentication=no", keyFile),
			)
			envVars = ApplyProxyToGitEnv(envVars, proxyConfig)
			cmd = exec.CommandContext(ctx, "git", "clone", "-b", branch, repoURL, workspacePath)
			cmd.Env = envVars
		}
	} else {
		cmd = exec.CommandContext(ctx, "git", "clone", "-b", branch, repoURL, workspacePath)
		cmd.Env = ApplyProxyToGitEnv(baseEnv, proxyConfig)
	}

	if !sslVerify {
		cmd.Env = append(cmd.Env, "GIT_SSL_NO_VERIFY=true")
	}

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("clone repository failed: %v", err)
	}

	return nil
}

func (w *WorkspaceManager) CommitChanges(workspacePath, message string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	configCmd1 := exec.CommandContext(ctx, "git", "config", "user.name", "XSHA AI")
	configCmd1.Dir = workspacePath
	if err := configCmd1.Run(); err != nil {
		return "", fmt.Errorf("failed to configure git user name: %v", err)
	}

	configCmd2 := exec.CommandContext(ctx, "git", "config", "user.email", "ai@xsha.dev")
	configCmd2.Dir = workspacePath
	if err := configCmd2.Run(); err != nil {
		return "", fmt.Errorf("failed to configure git email: %v", err)
	}

	addCmd := exec.CommandContext(ctx, "git", "add", ".")
	addCmd.Dir = workspacePath
	if err := addCmd.Run(); err != nil {
		return "", fmt.Errorf("failed to add changes: %v", err)
	}

	statusCmd := exec.CommandContext(ctx, "git", "status", "--porcelain")
	statusCmd.Dir = workspacePath
	statusOutput, err := statusCmd.Output()
	if err != nil {
		return "", fmt.Errorf("failed to check git status: %v", err)
	}

	if len(strings.TrimSpace(string(statusOutput))) == 0 {
		return "", fmt.Errorf("no changes to commit")
	}

	commitCmd := exec.CommandContext(ctx, "git", "commit", "-m", message)
	commitCmd.Dir = workspacePath
	if err := commitCmd.Run(); err != nil {
		return "", fmt.Errorf("failed to commit changes: %v", err)
	}

	hashCmd := exec.CommandContext(ctx, "git", "rev-parse", "HEAD")
	hashCmd.Dir = workspacePath
	output, err := hashCmd.Output()
	if err != nil {
		return "", fmt.Errorf("failed to get commit hash: %v", err)
	}

	return strings.TrimSpace(string(output)), nil
}

func (w *WorkspaceManager) buildAuthenticatedURL(repoURL string, credential *GitCredentialInfo) (string, error) {
	parsedURL, err := url.Parse(repoURL)
	if err != nil {
		return "", fmt.Errorf("failed to parse url: %v", err)
	}

	if parsedURL.Scheme != "https" && parsedURL.Scheme != "http" {
		return "", fmt.Errorf("url scheme must be http or https: %s", parsedURL.Scheme)
	}

	switch credential.Type {
	case GitCredentialTypePassword:
		if credential.Password == "" {
			return "", fmt.Errorf("password cannot be empty")
		}
		if credential.Username == "" {
			return "", fmt.Errorf("username cannot be empty")
		}
		parsedURL.User = url.UserPassword(credential.Username, credential.Password)

	case GitCredentialTypeToken:
		if credential.Password == "" {
			return "", fmt.Errorf("token cannot be empty")
		}

		host := strings.ToLower(parsedURL.Host)
		switch {
		case strings.Contains(host, "github.com") || strings.Contains(host, "github"):
			parsedURL.User = url.UserPassword(credential.Password, "x-oauth-basic")
		case strings.Contains(host, "gitlab.com") || strings.Contains(host, "gitlab"):
			parsedURL.User = url.UserPassword("oauth2", credential.Password)
		case strings.Contains(host, "bitbucket.org") || strings.Contains(host, "bitbucket"):
			parsedURL.User = url.UserPassword("x-token-auth", credential.Password)
		case strings.Contains(host, "dev.azure.com") || strings.Contains(host, "visualstudio.com"):
			parsedURL.User = url.UserPassword("", credential.Password)
		default:
			parsedURL.User = url.UserPassword(credential.Password, "x-oauth-basic")
		}

	default:
		return "", fmt.Errorf("unsupported credential type for url building: %s", credential.Type)
	}

	authenticatedURL := parsedURL.String()
	Info("build authenticated url success", "host", parsedURL.Host, "credentialType", string(credential.Type))

	return authenticatedURL, nil
}

func (w *WorkspaceManager) CheckWorkspaceExists(workspacePath string) bool {
	if workspacePath == "" {
		return false
	}

	info, err := os.Stat(workspacePath)
	return err == nil && info.IsDir()
}

func (w *WorkspaceManager) CheckGitRepositoryExists(workspacePath string) bool {
	if workspacePath == "" {
		return false
	}

	gitDir := filepath.Join(workspacePath, ".git")
	info, err := os.Stat(gitDir)
	return err == nil && info.IsDir()
}

func (w *WorkspaceManager) ResetWorkspaceToCleanState(workspacePath string) error {
	if workspacePath == "" {
		return fmt.Errorf("workspace path cannot be empty")
	}

	if !w.CheckWorkspaceExists(workspacePath) {
		return fmt.Errorf("workspace does not exist: %s", workspacePath)
	}

	if !w.CheckGitRepositoryExists(workspacePath) {
		if err := os.RemoveAll(workspacePath); err != nil {
			return fmt.Errorf("failed to cleanup non-git workspace: %v", err)
		}
		if err := os.MkdirAll(workspacePath, 0777); err != nil {
			return fmt.Errorf("failed to recreate workspace: %v", err)
		}
		// 显式设置目录权限为0777，确保在Docker容器中也能正确设置权限
		if err := os.Chmod(workspacePath, 0777); err != nil {
			return fmt.Errorf("failed to set recreated workspace directory permissions: %v", err)
		}
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	resetStagedCmd := exec.CommandContext(ctx, "git", "reset", "HEAD", ".")
	resetStagedCmd.Dir = workspacePath
	if err := resetStagedCmd.Run(); err != nil {
		Info("reset staged area", "workspace", workspacePath, "note", "may not have staged files")
	}

	resetHardCmd := exec.CommandContext(ctx, "git", "reset", "--hard", "HEAD")
	resetHardCmd.Dir = workspacePath
	if err := resetHardCmd.Run(); err != nil {
		return fmt.Errorf("failed to reset workspace: %v", err)
	}

	cleanCmd := exec.CommandContext(ctx, "git", "clean", "-fd")
	cleanCmd.Dir = workspacePath
	if err := cleanCmd.Run(); err != nil {
		return fmt.Errorf("failed to clean untracked files: %v", err)
	}

	cleanIgnoredCmd := exec.CommandContext(ctx, "git", "clean", "-fdx")
	cleanIgnoredCmd.Dir = workspacePath
	if err := cleanIgnoredCmd.Run(); err != nil {
		Warn("failed to clean ignored files", "workspace", workspacePath, "error", err.Error())
	}

	Info("workspace has been reset to clean state", "workspace", workspacePath)
	return nil
}

func (w *WorkspaceManager) CheckWorkspaceIsDirty(workspacePath string) (bool, error) {
	if workspacePath == "" {
		return false, fmt.Errorf("workspace path cannot be empty")
	}

	if !w.CheckWorkspaceExists(workspacePath) {
		return false, fmt.Errorf("workspace does not exist: %s", workspacePath)
	}

	if !w.CheckGitRepositoryExists(workspacePath) {
		return false, fmt.Errorf("not a git repository: %s", workspacePath)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	statusCmd := exec.CommandContext(ctx, "git", "status", "--porcelain")
	statusCmd.Dir = workspacePath
	output, err := statusCmd.Output()
	if err != nil {
		return false, fmt.Errorf("failed to check git status: %v", err)
	}

	return len(strings.TrimSpace(string(output))) > 0, nil
}

func (w *WorkspaceManager) CreateAndSwitchToBranch(workspacePath, branchName, baseBranch string, proxyConfig *GitProxyConfig) error {
	if workspacePath == "" {
		return fmt.Errorf("workspace path cannot be empty")
	}

	if branchName == "" {
		return fmt.Errorf("branch name cannot be empty")
	}

	if baseBranch == "" {
		baseBranch = "main"
	}

	if !w.CheckWorkspaceExists(workspacePath) {
		return fmt.Errorf("workspace does not exist: %s", workspacePath)
	}

	if !w.CheckGitRepositoryExists(workspacePath) {
		return fmt.Errorf("not a git repository: %s", workspacePath)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	switchCmd := exec.CommandContext(ctx, "git", "checkout", baseBranch)
	switchCmd.Dir = workspacePath
	if err := switchCmd.Run(); err != nil {
		return fmt.Errorf("failed to checkout base branch %s: %v", baseBranch, err)
	}

	pullCmd := exec.CommandContext(ctx, "git", "pull", "origin", baseBranch)
	pullCmd.Dir = workspacePath
	pullCmd.Env = ApplyProxyToGitEnv(os.Environ(), proxyConfig)
	if err := pullCmd.Run(); err != nil {
		Warn("failed to pull latest code", "workspace", workspacePath, "baseBranch", baseBranch, "error", err)
	}

	exists, err := w.CheckBranchExists(workspacePath, branchName)
	if err != nil {
		return fmt.Errorf("failed to check if branch exists: %v", err)
	}

	if exists {
		switchExistingCmd := exec.CommandContext(ctx, "git", "checkout", branchName)
		switchExistingCmd.Dir = workspacePath
		if err := switchExistingCmd.Run(); err != nil {
			return fmt.Errorf("failed to switch to existing branch %s: %v", branchName, err)
		}
		Info("switched to existing branch", "workspace", workspacePath, "branch", branchName)
	} else {
		createCmd := exec.CommandContext(ctx, "git", "checkout", "-b", branchName)
		createCmd.Dir = workspacePath
		if err := createCmd.Run(); err != nil {
			return fmt.Errorf("failed to create and switch to branch %s: %v", branchName, err)
		}
		Info("created and switched to new branch", "workspace", workspacePath, "branch", branchName, "baseBranch", baseBranch)
	}

	return nil
}

func (w *WorkspaceManager) CheckBranchExists(workspacePath, branchName string) (bool, error) {
	if workspacePath == "" {
		return false, fmt.Errorf("workspace path cannot be empty")
	}

	if branchName == "" {
		return false, fmt.Errorf("branch name cannot be empty")
	}

	if !w.CheckWorkspaceExists(workspacePath) {
		return false, fmt.Errorf("workspace does not exist: %s", workspacePath)
	}

	if !w.CheckGitRepositoryExists(workspacePath) {
		return false, fmt.Errorf("not a git repository: %s", workspacePath)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	branchCmd := exec.CommandContext(ctx, "git", "branch", "--list", branchName)
	branchCmd.Dir = workspacePath
	output, err := branchCmd.Output()
	if err != nil {
		return false, fmt.Errorf("failed to check branch: %v", err)
	}

	return len(strings.TrimSpace(string(output))) > 0, nil
}

func (w *WorkspaceManager) validateCredential(credential *GitCredentialInfo) error {
	if credential == nil {
		return fmt.Errorf("credential information cannot be empty")
	}

	switch credential.Type {
	case GitCredentialTypePassword:
		if credential.Username == "" {
			return fmt.Errorf("username cannot be empty")
		}
		if credential.Password == "" {
			return fmt.Errorf("password cannot be empty")
		}
	case GitCredentialTypeToken:
		if credential.Password == "" {
			return fmt.Errorf("token cannot be empty")
		}
	case GitCredentialTypeSSHKey:
		if credential.PrivateKey == "" {
			return fmt.Errorf("ssh private key cannot be empty")
		}
		if !strings.Contains(credential.PrivateKey, "BEGIN") || !strings.Contains(credential.PrivateKey, "PRIVATE KEY") {
			return fmt.Errorf("ssh private key format is incorrect")
		}
	default:
		return fmt.Errorf("unsupported credential type: %s", credential.Type)
	}

	return nil
}

func (w *WorkspaceManager) PushBranch(workspacePath, branchName, repoURL string, credential *GitCredentialInfo, sslVerify bool, proxyConfig *GitProxyConfig, forcePush bool) (string, error) {
	if workspacePath == "" {
		return "", fmt.Errorf("workspace path cannot be empty")
	}

	if branchName == "" {
		return "", fmt.Errorf("branch name cannot be empty")
	}

	if !w.CheckWorkspaceExists(workspacePath) {
		return "", fmt.Errorf("workspace does not exist: %s", workspacePath)
	}

	if !w.CheckGitRepositoryExists(workspacePath) {
		return "", fmt.Errorf("not a git repository: %s", workspacePath)
	}

	if credential != nil {
		if err := w.validateCredential(credential); err != nil {
			return "", fmt.Errorf("credential validation failed: %v", err)
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	var cmd *exec.Cmd
	var envVars []string
	var output string

	baseEnv := w.createNonInteractiveGitEnv()

	if credential != nil {
		switch credential.Type {
		case GitCredentialTypePassword, GitCredentialTypeToken:
			authenticatedURL, err := w.buildAuthenticatedURL(repoURL, credential)
			if err != nil {
				return "", fmt.Errorf("failed to build authenticated URL: %v", err)
			}

			Info("preparing HTTPS push", "workspace", workspacePath, "branch", branchName, "credentialType", string(credential.Type))

			exists, err := w.CheckBranchExists(workspacePath, branchName)
			if err != nil {
				return "", fmt.Errorf("failed to check branch: %v", err)
			}
			if !exists {
				return "", fmt.Errorf("branch '%s' does not exist", branchName)
			}

			setURLCmd := exec.CommandContext(ctx, "git", "remote", "set-url", "origin", authenticatedURL)
			setURLCmd.Dir = workspacePath
			setURLCmd.Env = ApplyProxyToGitEnv(baseEnv, proxyConfig)

			if !sslVerify {
				setURLCmd.Env = append(setURLCmd.Env, "GIT_SSL_NO_VERIFY=true")
			}

			if err := setURLCmd.Run(); err != nil {
				return "", fmt.Errorf("failed to set remote repository URL: %v", err)
			}

			args := []string{"push", "--porcelain"}
			if forcePush {
				args = append(args, "--force")
			}
			args = append(args, "origin", branchName)
			cmd = exec.CommandContext(ctx, "git", args...)
			cmd.Dir = workspacePath
			cmd.Env = ApplyProxyToGitEnv(baseEnv, proxyConfig)

			if !sslVerify {
				cmd.Env = append(cmd.Env, "GIT_SSL_NO_VERIFY=true")
			}

		case GitCredentialTypeSSHKey:
			Info("preparing SSH push", "workspace", workspacePath, "branch", branchName)

			exists, err := w.CheckBranchExists(workspacePath, branchName)
			if err != nil {
				return "", fmt.Errorf("failed to check branch: %v", err)
			}
			if !exists {
				return "", fmt.Errorf("branch '%s' does not exist", branchName)
			}

			keyFile := filepath.Join(workspacePath, ".ssh_key_push")
			if err := ioutil.WriteFile(keyFile, []byte(credential.PrivateKey), 0600); err != nil {
				return "", fmt.Errorf("failed to create SSH key file: %v", err)
			}
			defer os.Remove(keyFile)

			envVars = append(baseEnv,
				fmt.Sprintf("GIT_SSH_COMMAND=ssh -i %s -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no -o BatchMode=yes -o PasswordAuthentication=no", keyFile),
			)
			envVars = ApplyProxyToGitEnv(envVars, proxyConfig)

			args := []string{"push", "--porcelain"}
			if forcePush {
				args = append(args, "--force")
			}
			args = append(args, "origin", branchName)
			cmd = exec.CommandContext(ctx, "git", args...)
			cmd.Dir = workspacePath
			cmd.Env = envVars
		}
	} else {
		Info("preparing unauthenticated push", "workspace", workspacePath, "branch", branchName)

		exists, err := w.CheckBranchExists(workspacePath, branchName)
		if err != nil {
			return "", fmt.Errorf("failed to check branch: %v", err)
		}
		if !exists {
			return "", fmt.Errorf("branch '%s' does not exist", branchName)
		}

		args := []string{"push", "--porcelain"}
		if forcePush {
			args = append(args, "--force")
		}
		args = append(args, "origin", branchName)
		cmd = exec.CommandContext(ctx, "git", args...)
		cmd.Dir = workspacePath
		cmd.Env = ApplyProxyToGitEnv(baseEnv, proxyConfig)
	}

	var outputBuilder strings.Builder
	cmd.Stdout = &outputBuilder
	cmd.Stderr = &outputBuilder

	Info("starting Git push command", "workspace", workspacePath, "branch", branchName)

	err := cmd.Run()
	output = outputBuilder.String()

	if err != nil {
		Error("Git push failed", "workspace", workspacePath, "branch", branchName, "error", err, "output", output)

		if strings.Contains(output, "Authentication failed") || strings.Contains(output, "401") || strings.Contains(output, "403") {
			return output, fmt.Errorf("authentication failed, please check if the credential is correct: %v", err)
		}
		if strings.Contains(output, "Permission denied") {
			return output, fmt.Errorf("permission denied, please check if the repository access is correct: %v", err)
		}
		if strings.Contains(output, "Could not resolve host") {
			return output, fmt.Errorf("could not resolve host, please check if the network connection is correct: %v", err)
		}

		return output, fmt.Errorf("push branch failed: %v", err)
	}

	Info("successfully pushed branch", "workspace", workspacePath, "branch", branchName, "output", output)
	return output, nil
}

func (w *WorkspaceManager) createNonInteractiveGitEnv() []string {
	return append(os.Environ(),
		"GIT_TERMINAL_PROMPT=0",              // disable terminal prompt
		"GIT_ASKPASS=",                       // disable password prompt
		"SSH_ASKPASS=",                       // disable SSH password prompt
		"GIT_CONFIG_NOSYSTEM=true",           // ignore system-level Git configuration
		"GCM_INTERACTIVE=never",              // disable Git Credential Manager interactive
		"GIT_CREDENTIAL_HELPER=",             // disable credential helper
		"GIT_AUTHOR_NAME=XSHA Bot",           // set default author
		"GIT_AUTHOR_EMAIL=bot@xsha.local",    // set default email
		"GIT_COMMITTER_NAME=XSHA Bot",        // set default committer
		"GIT_COMMITTER_EMAIL=bot@xsha.local", // set default committer email
	)
}
