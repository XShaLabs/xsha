package handlers

import (
	"net/http"
	"strconv"
	"xsha-backend/i18n"
	"xsha-backend/middleware"
	"xsha-backend/services"

	"github.com/gin-gonic/gin"
)

type DashboardHandlers struct {
	dashboardService services.DashboardService
}

func NewDashboardHandlers(dashboardService services.DashboardService) *DashboardHandlers {
	return &DashboardHandlers{
		dashboardService: dashboardService,
	}
}

// GetDashboardStats gets dashboard statistics
// @Summary Get dashboard statistics
// @Description Get aggregated system statistics for dashboard
// @Tags Dashboard
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} object{stats=map[string]interface{}} "Dashboard statistics"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /dashboard/stats [get]
func (h *DashboardHandlers) GetDashboardStats(c *gin.Context) {
	lang := middleware.GetLangFromContext(c)

	stats, err := h.dashboardService.GetDashboardStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": i18n.MapErrorToI18nKey(err, lang),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"stats": stats,
	})
}

// GetRecentTasks gets recent tasks
// @Summary Get recent tasks
// @Description Get recent tasks for dashboard
// @Tags Dashboard
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param limit query int false "Number of tasks to return" default(10)
// @Success 200 {object} object{tasks=[]object{}} "Recent tasks"
// @Failure 400 {object} map[string]interface{} "Invalid request parameters"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /dashboard/recent-tasks [get]
func (h *DashboardHandlers) GetRecentTasks(c *gin.Context) {
	lang := middleware.GetLangFromContext(c)

	// Parse limit parameter, default to 10
	limit := 10
	if limitStr := c.Query("limit"); limitStr != "" {
		parsedLimit, err := strconv.Atoi(limitStr)
		if err != nil || parsedLimit <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": i18n.T(lang, "errors.invalid_limit"),
			})
			return
		}
		if parsedLimit > 50 {
			parsedLimit = 50 // Maximum limit
		}
		limit = parsedLimit
	}

	tasks, err := h.dashboardService.GetRecentTasks(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": i18n.MapErrorToI18nKey(err, lang),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"tasks": tasks,
	})
}
