package handlers

import (
	"net/http"
	"strconv"
	"xsha-backend/i18n"
	"xsha-backend/middleware"
	"xsha-backend/services"

	"github.com/gin-gonic/gin"
)

type TaskExecutionLogHandlers struct {
	aiTaskExecutor services.AITaskExecutorService
}

func NewTaskExecutionLogHandlers(aiTaskExecutor services.AITaskExecutorService) *TaskExecutionLogHandlers {
	return &TaskExecutionLogHandlers{
		aiTaskExecutor: aiTaskExecutor,
	}
}

// GetExecutionLog gets execution log
// @Summary Get task conversation execution log
// @Description Get detailed execution log of AI task by conversation ID
// @Tags Task Execution Log
// @Accept json
// @Produce json
// @Param conversationId path int true "Conversation ID"
// @Success 200 {object} database.TaskExecutionLog
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /task-conversations/{conversationId}/execution-log [get]
func (h *TaskExecutionLogHandlers) GetExecutionLog(c *gin.Context) {
	lang := middleware.GetLangFromContext(c)

	conversationIDStr := c.Param("conversationId")
	conversationID, err := strconv.ParseUint(conversationIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": i18n.T(lang, "common.invalid_id")})
		return
	}

	log, err := h.aiTaskExecutor.GetExecutionLog(uint(conversationID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": i18n.T(lang, "task_execution_log.not_found")})
		return
	}

	c.JSON(http.StatusOK, log)
}

// CancelExecution cancels task execution
// @Summary Cancel task execution
// @Description Cancel AI task that is executing or pending
// @Tags Task Execution Log
// @Accept json
// @Produce json
// @Param conversationId path int true "Conversation ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /task-conversations/{conversationId}/execution/cancel [post]
func (h *TaskExecutionLogHandlers) CancelExecution(c *gin.Context) {
	lang := middleware.GetLangFromContext(c)

	conversationIDStr := c.Param("conversationId")
	conversationID, err := strconv.ParseUint(conversationIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": i18n.T(lang, "common.invalid_id")})
		return
	}

	username, _ := c.Get("username")
	createdBy, _ := username.(string)

	if err := h.aiTaskExecutor.CancelExecution(uint(conversationID), createdBy); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": i18n.T(lang, "task_execution_log.cancel_success")})
}

// RetryExecution retries task execution
// @Summary Retry task execution
// @Description Retry failed or cancelled AI task
// @Tags Task Execution Log
// @Accept json
// @Produce json
// @Param conversationId path int true "Conversation ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /task-conversations/{conversationId}/execution/retry [post]
func (h *TaskExecutionLogHandlers) RetryExecution(c *gin.Context) {
	lang := middleware.GetLangFromContext(c)

	conversationIDStr := c.Param("conversationId")
	conversationID, err := strconv.ParseUint(conversationIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": i18n.T(lang, "common.invalid_id")})
		return
	}

	username, _ := c.Get("username")
	createdBy, _ := username.(string)

	if err := h.aiTaskExecutor.RetryExecution(uint(conversationID), createdBy); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": i18n.T(lang, "task_execution_log.retry_success")})
}
