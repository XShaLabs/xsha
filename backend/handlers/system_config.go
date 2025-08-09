package handlers

import (
	"net/http"
	"xsha-backend/i18n"
	"xsha-backend/middleware"
	"xsha-backend/services"

	"github.com/gin-gonic/gin"
)

type SystemConfigHandlers struct {
	configService services.SystemConfigService
}

func NewSystemConfigHandlers(configService services.SystemConfigService) *SystemConfigHandlers {
	return &SystemConfigHandlers{
		configService: configService,
	}
}

type ConfigUpdateItem struct {
	ConfigKey   string `json:"config_key" binding:"required"`
	ConfigValue string `json:"config_value" binding:"required"`
}

type BatchUpdateConfigsRequest struct {
	Configs []ConfigUpdateItem `json:"configs" binding:"required"`
}

// @Summary Get all configurations
// @Description Get all system configurations without pagination
// @Tags System Configuration
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} object{configs=[]object} "All configurations"
// @Router /settings [get]
func (h *SystemConfigHandlers) ListAllConfigs(c *gin.Context) {
	lang := middleware.GetLangFromContext(c)

	configs, err := h.configService.ListAllConfigs()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": i18n.T(lang, "system_config.list_failed"),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": i18n.T(lang, "system_config.list_success"),
		"configs": configs,
	})
}

// BatchUpdateConfigs updates all system configurations
// @Summary Batch update configurations
// @Description Update multiple system configurations in a single request
// @Tags System Configuration
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param configs body BatchUpdateConfigsRequest true "Configuration updates"
// @Success 200 {object} object{message=string} "Configurations updated successfully"
// @Failure 400 {object} object{error=string} "Request parameter error"
// @Router /settings [put]
func (h *SystemConfigHandlers) BatchUpdateConfigs(c *gin.Context) {
	lang := middleware.GetLangFromContext(c)

	var req BatchUpdateConfigsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": i18n.T(lang, "validation.invalid_format_with_details", err.Error()),
		})
		return
	}

	var configItems []services.ConfigUpdateItem
	for _, config := range req.Configs {
		configItems = append(configItems, services.ConfigUpdateItem{
			ConfigKey:   config.ConfigKey,
			ConfigValue: config.ConfigValue,
		})
	}

	if err := h.configService.BatchUpdateConfigs(configItems); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": i18n.MapErrorToI18nKey(err, lang),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": i18n.T(lang, "system_config.update_success"),
	})
}
