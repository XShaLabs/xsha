// @title XSHA Backend API
// @version 1.0
// @description XSHA Backend API service, providing user authentication, project management, Git credential management and other functions

// @host localhost:8080
// @BasePath /api/v1

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and JWT token.

package main

import (
	"embed"
	"os"
	"os/signal"
	"syscall"
	"time"
	"xsha-backend/config"
	"xsha-backend/database"
	"xsha-backend/handlers"
	"xsha-backend/repository"
	"xsha-backend/routes"
	"xsha-backend/scheduler"
	"xsha-backend/services"
	"xsha-backend/services/executor"
	"xsha-backend/utils"

	_ "xsha-backend/docs"

	"github.com/gin-gonic/gin"
)

//go:embed static/*
var StaticFiles embed.FS

func main() {
	// Load configuration
	cfg := config.Load()

	// Initialize database with new architecture
	dbManager, err := database.NewDatabaseManager(cfg)
	if err != nil {
		utils.Error("Failed to initialize database", "error", err)
		os.Exit(1)
	}
	defer dbManager.Close()

	// Initialize database (for backward compatibility)
	database.InitDatabase()

	// Initialize repositories
	tokenRepo := repository.NewTokenBlacklistRepository(dbManager.GetDB())
	loginLogRepo := repository.NewLoginLogRepository(dbManager.GetDB())
	adminOperationLogRepo := repository.NewAdminOperationLogRepository(dbManager.GetDB())
	gitCredRepo := repository.NewGitCredentialRepository(dbManager.GetDB())
	projectRepo := repository.NewProjectRepository(dbManager.GetDB())
	devEnvRepo := repository.NewDevEnvironmentRepository(dbManager.GetDB())
	taskRepo := repository.NewTaskRepository(dbManager.GetDB())
	taskConvRepo := repository.NewTaskConversationRepository(dbManager.GetDB())
	execLogRepo := repository.NewTaskExecutionLogRepository(dbManager.GetDB())
	taskConvResultRepo := repository.NewTaskConversationResultRepository(dbManager.GetDB())
	systemConfigRepo := repository.NewSystemConfigRepository(dbManager.GetDB())
	dashboardRepo := repository.NewDashboardRepository(dbManager.GetDB())

	// Initialize services
	loginLogService := services.NewLoginLogService(loginLogRepo)
	adminOperationLogService := services.NewAdminOperationLogService(adminOperationLogRepo)
	authService := services.NewAuthService(tokenRepo, loginLogRepo, adminOperationLogService, systemConfigRepo, cfg)
	gitCredService := services.NewGitCredentialService(gitCredRepo, projectRepo, cfg)
	systemConfigService := services.NewSystemConfigService(systemConfigRepo)
	dashboardService := services.NewDashboardService(dashboardRepo)

	// Get git clone timeout from system config
	gitCloneTimeout, err := systemConfigService.GetGitCloneTimeout()
	if err != nil {
		utils.Error("Failed to get git clone timeout from system config, using default", "error", err)
		gitCloneTimeout = 5 * time.Minute
	}

	// Initialize workspace manager
	workspaceManager := utils.NewWorkspaceManager(cfg.WorkspaceBaseDir, gitCloneTimeout)
	devEnvService := services.NewDevEnvironmentService(devEnvRepo, taskRepo, systemConfigService, cfg)
	projectService := services.NewProjectService(projectRepo, gitCredRepo, gitCredService, taskRepo, systemConfigService, cfg)
	taskService := services.NewTaskService(taskRepo, projectRepo, devEnvRepo, workspaceManager, cfg, gitCredService, systemConfigService)
	taskConvResultService := services.NewTaskConversationResultService(taskConvResultRepo, taskConvRepo, taskRepo, projectRepo)
	taskConvService := services.NewTaskConversationService(taskConvRepo, taskRepo, execLogRepo, taskConvResultRepo, taskService)
	aiTaskExecutor := executor.NewAITaskExecutorService(taskConvRepo, taskRepo, execLogRepo, taskConvResultRepo, gitCredService, taskConvResultService, taskService, systemConfigService, cfg)

	// Initialize scheduler
	taskProcessor := scheduler.NewTaskProcessor(aiTaskExecutor)
	schedulerManager := scheduler.NewSchedulerManager(taskProcessor, cfg.SchedulerIntervalDuration)

	// Initialize handlers
	authHandlers := handlers.NewAuthHandlers(authService, loginLogService)
	adminOperationLogHandlers := handlers.NewAdminOperationLogHandlers(adminOperationLogService)
	gitCredHandlers := handlers.NewGitCredentialHandlers(gitCredService)
	projectHandlers := handlers.NewProjectHandlers(projectService)
	devEnvHandlers := handlers.NewDevEnvironmentHandlers(devEnvService)
	taskHandlers := handlers.NewTaskHandlers(taskService, taskConvService, projectService)
	taskConvHandlers := handlers.NewTaskConversationHandlers(taskConvService)
	taskConvResultHandlers := handlers.NewTaskConversationResultHandlers(taskConvResultService)
	taskExecLogHandlers := handlers.NewTaskExecutionLogHandlers(aiTaskExecutor)
	systemConfigHandlers := handlers.NewSystemConfigHandlers(systemConfigService)
	dashboardHandlers := handlers.NewDashboardHandlers(dashboardService)

	// Set gin mode
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Create gin engine
	r := gin.Default()

	// Initialize system configuration default values
	if err := systemConfigService.InitializeDefaultConfigs(); err != nil {
		utils.Error("Failed to initialize default system configurations", "error", err)
		os.Exit(1)
	}

	// Setup routes - Pass all handler instances including static files
	routes.SetupRoutes(r, cfg, authService, authHandlers, gitCredHandlers, projectHandlers, adminOperationLogHandlers, devEnvHandlers, taskHandlers, taskConvHandlers, taskConvResultHandlers, taskExecLogHandlers, systemConfigHandlers, dashboardHandlers, &StaticFiles)

	// Start scheduler
	if err := schedulerManager.Start(); err != nil {
		utils.Error("Failed to start scheduler", "error", err)
		os.Exit(1)
	}

	// Setup graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigChan
		utils.Info("Received shutdown signal, stopping service...")

		// Stop scheduler
		if err := schedulerManager.Stop(); err != nil {
			utils.Error("Failed to stop scheduler", "error", err)
		}

		os.Exit(0)
	}()

	// Start server
	utils.Info("Server starting...")
	utils.Info("Server starting on port", "port", cfg.Port)

	if err := r.Run(":" + cfg.Port); err != nil {
		utils.Error("Server start failed", "error", err)
		os.Exit(1)
	}
}
