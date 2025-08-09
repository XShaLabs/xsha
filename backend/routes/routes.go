package routes

import (
	"embed"
	"io/fs"
	"net/http"
	"path/filepath"
	"strings"
	"xsha-backend/config"
	"xsha-backend/handlers"
	"xsha-backend/middleware"
	"xsha-backend/services"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

func SetupRoutes(r *gin.Engine, cfg *config.Config, authService services.AuthService, authHandlers *handlers.AuthHandlers, gitCredHandlers *handlers.GitCredentialHandlers, projectHandlers *handlers.ProjectHandlers, operationLogHandlers *handlers.AdminOperationLogHandlers, devEnvHandlers *handlers.DevEnvironmentHandlers, taskHandlers *handlers.TaskHandlers, taskConvHandlers *handlers.TaskConversationHandlers, taskConvResultHandlers *handlers.TaskConversationResultHandlers, taskExecLogHandlers *handlers.TaskExecutionLogHandlers, systemConfigHandlers *handlers.SystemConfigHandlers, dashboardHandlers *handlers.DashboardHandlers, staticFiles *embed.FS) {
	r.Use(middleware.I18nMiddleware())
	r.Use(middleware.ErrorHandlerMiddleware())

	r.NoMethod(middleware.MethodNotAllowedHandler())

	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	r.GET("/health", handlers.HealthHandler)

	auth := r.Group("/api/v1/auth")
	{
		auth.POST("/login", middleware.LoginRateLimitMiddleware(), authHandlers.LoginHandler)
	}

	api := r.Group("/api/v1")
	api.Use(middleware.AuthMiddlewareWithService(authService, cfg))

	api.Use(middleware.OperationLogMiddleware(operationLogHandlers.OperationLogService))

	{
		api.GET("/user/current", authHandlers.CurrentUserHandler)
		api.POST("/auth/logout", authHandlers.LogoutHandler)

		admin := api.Group("/admin")
		{
			admin.GET("/login-logs", authHandlers.GetLoginLogsHandler)

			admin.GET("/operation-logs", operationLogHandlers.GetOperationLogs)
			admin.GET("/operation-logs/:id", operationLogHandlers.GetOperationLog)
			admin.GET("/operation-stats", operationLogHandlers.GetOperationStats)
		}

		gitCreds := api.Group("/credentials")
		{
			gitCreds.POST("", gitCredHandlers.CreateCredential)
			gitCreds.GET("", gitCredHandlers.ListCredentials)
			gitCreds.GET("/:id", gitCredHandlers.GetCredential)
			gitCreds.PUT("/:id", gitCredHandlers.UpdateCredential)
			gitCreds.DELETE("/:id", gitCredHandlers.DeleteCredential)
		}

		projects := api.Group("/projects")
		{
			projects.POST("", projectHandlers.CreateProject)
			projects.GET("", projectHandlers.ListProjects)
			projects.POST("/parse-url", projectHandlers.ParseRepositoryURL)
			projects.POST("/branches", projectHandlers.FetchRepositoryBranches)
			projects.POST("/validate-access", projectHandlers.ValidateRepositoryAccess)
			projects.GET("/credentials", projectHandlers.GetCompatibleCredentials)
			projects.GET("/:id", projectHandlers.GetProject)
			projects.PUT("/:id", projectHandlers.UpdateProject)
			projects.DELETE("/:id", projectHandlers.DeleteProject)
		}

		tasks := api.Group("/tasks")
		{
			tasks.POST("", taskHandlers.CreateTask)
			tasks.GET("", taskHandlers.ListTasks)
			tasks.GET("/:id", taskHandlers.GetTask)
			tasks.PUT("/:id", taskHandlers.UpdateTask)
			tasks.PUT("/:id/status", taskHandlers.UpdateTaskStatus)
			tasks.PUT("/batch/status", taskHandlers.BatchUpdateTaskStatus)
			tasks.DELETE("/:id", taskHandlers.DeleteTask)
			tasks.GET("/:id/git-diff", taskHandlers.GetTaskGitDiff)
			tasks.GET("/:id/git-diff/file", taskHandlers.GetTaskGitDiffFile)
			tasks.POST("/:id/push", taskHandlers.PushTaskBranch)
		}

		conversations := api.Group("/conversations")
		{
			conversations.POST("", taskConvHandlers.CreateConversation)
			conversations.GET("", taskConvHandlers.ListConversations)
			conversations.GET("/latest", taskConvHandlers.GetLatestConversation)
			conversations.GET("/:id", taskConvHandlers.GetConversation)
			conversations.PUT("/:id", taskConvHandlers.UpdateConversation)
			conversations.DELETE("/:id", taskConvHandlers.DeleteConversation)
			conversations.GET("/:id/git-diff", taskConvHandlers.GetConversationGitDiff)
			conversations.GET("/:id/git-diff/file", taskConvHandlers.GetConversationGitDiffFile)
		}

		results := api.Group("/conversation-results")
		{
			results.GET("", taskConvResultHandlers.ListResultsByTaskID)
			results.GET("/by-project", taskConvResultHandlers.ListResultsByProjectID)
			results.GET("/:id", taskConvResultHandlers.GetResult)
			results.GET("/by-conversation/:conversation_id", taskConvResultHandlers.GetResultByConversationID)
			results.PUT("/:id", taskConvResultHandlers.UpdateResult)
			results.DELETE("/:id", taskConvResultHandlers.DeleteResult)
		}

		stats := api.Group("/stats")
		{
			stats.GET("/tasks/:task_id", taskConvResultHandlers.GetTaskStats)
			stats.GET("/projects/:project_id", taskConvResultHandlers.GetProjectStats)
		}

		api.GET("/task-conversations/:conversationId/execution-log", taskExecLogHandlers.GetExecutionLog)
		api.POST("/task-conversations/:conversationId/execution/cancel", taskExecLogHandlers.CancelExecution)
		api.POST("/task-conversations/:conversationId/execution/retry", taskExecLogHandlers.RetryExecution)

		devEnvs := api.Group("/environments")
		{
			devEnvs.POST("", devEnvHandlers.CreateEnvironment)
			devEnvs.GET("", devEnvHandlers.ListEnvironments)
			devEnvs.GET("/available-images", devEnvHandlers.GetAvailableImages)
			devEnvs.GET("/stats", devEnvHandlers.GetStats)
			devEnvs.GET("/:id", devEnvHandlers.GetEnvironment)
			devEnvs.PUT("/:id", devEnvHandlers.UpdateEnvironment)
			devEnvs.DELETE("/:id", devEnvHandlers.DeleteEnvironment)
			devEnvs.GET("/:id/env-vars", devEnvHandlers.GetEnvironmentVars)
			devEnvs.PUT("/:id/env-vars", devEnvHandlers.UpdateEnvironmentVars)
		}

		systemConfigs := api.Group("/settings")
		{
			systemConfigs.GET("", systemConfigHandlers.ListAllConfigs)
			systemConfigs.PUT("", systemConfigHandlers.BatchUpdateConfigs)
		}

		dashboard := api.Group("/dashboard")
		{
			dashboard.GET("/stats", dashboardHandlers.GetDashboardStats)
			dashboard.GET("/recent-tasks", dashboardHandlers.GetRecentTasks)
		}
	}

	// Setup static file serving for frontend
	setupStaticRoutes(r, staticFiles)
}

func setupStaticRoutes(r *gin.Engine, embeddedFiles *embed.FS) {
	// Try to get embedded filesystem first
	var staticFS fs.FS
	var assetsFS fs.FS
	var err error

	if embeddedFiles != nil {
		staticFS, err = fs.Sub(*embeddedFiles, "static")
		if err != nil {
			staticFS = nil
		} else {
			// Create assets subdirectory filesystem
			assetsFS, err = fs.Sub(staticFS, "assets")
			if err != nil {
				staticFS = nil
				assetsFS = nil
			}
		}
	}

	// If embed fails or is nil, fallback to file system
	if staticFS == nil || assetsFS == nil {
		setupFallbackStaticRoutes(r)
		return
	}

	// Serve static assets from embedded assets filesystem
	r.StaticFS("/assets", http.FS(assetsFS))

	// Serve individual static files
	serveSingleFile(r, "/favicon.ico", staticFS)
	serveSingleFile(r, "/vite.svg", staticFS)

	// Serve index.html for all non-API routes (SPA support)
	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path

		// Skip API routes and static assets
		if strings.HasPrefix(path, "/api") ||
			strings.HasPrefix(path, "/assets") ||
			strings.HasPrefix(path, "/swagger") ||
			strings.HasPrefix(path, "/health") ||
			path == "/favicon.ico" ||
			path == "/vite.svg" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Not Found"})
			return
		}

		// For all other routes, serve the React app
		indexData, err := staticFS.Open("index.html")
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Frontend not built"})
			return
		}
		defer indexData.Close()

		stat, err := indexData.Stat()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get file info"})
			return
		}

		c.DataFromReader(http.StatusOK, stat.Size(), "text/html; charset=utf-8", indexData, nil)
	})
}

// Helper function to serve single files from embedded filesystem
func serveSingleFile(r *gin.Engine, path string, staticFS fs.FS) {
	r.GET(path, func(c *gin.Context) {
		file, err := staticFS.Open(strings.TrimPrefix(path, "/"))
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
			return
		}
		defer file.Close()

		stat, err := file.Stat()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get file info"})
			return
		}

		// Determine content type based on file extension
		contentType := "application/octet-stream"
		ext := filepath.Ext(path)
		switch ext {
		case ".ico":
			contentType = "image/x-icon"
		case ".svg":
			contentType = "image/svg+xml"
		}

		c.DataFromReader(http.StatusOK, stat.Size(), contentType, file, nil)
	})
}

// Fallback function for development mode when static files are not embedded
func setupFallbackStaticRoutes(r *gin.Engine) {
	// Static files directory
	staticDir := "static"

	// Serve static assets (CSS, JS, images, etc.)
	r.Static("/assets", staticDir+"/assets")
	r.StaticFile("/favicon.ico", staticDir+"/favicon.ico")
	r.StaticFile("/vite.svg", staticDir+"/vite.svg")

	// Serve index.html for all non-API routes (SPA support)
	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path

		// Skip API routes and static assets
		if strings.HasPrefix(path, "/api") ||
			strings.HasPrefix(path, "/assets") ||
			strings.HasPrefix(path, "/swagger") ||
			strings.HasPrefix(path, "/health") ||
			path == "/favicon.ico" ||
			path == "/vite.svg" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Not Found"})
			return
		}

		// For all other routes, serve the React app
		indexPath := filepath.Join(staticDir, "index.html")
		c.File(indexPath)
	})
}
