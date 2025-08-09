package handlers

import (
	"net/http"
	"strconv"
	"xsha-backend/i18n"
	"xsha-backend/middleware"
	"xsha-backend/services"

	"github.com/gin-gonic/gin"
)

type DevEnvironmentHandlers struct {
	devEnvService services.DevEnvironmentService
}

func NewDevEnvironmentHandlers(devEnvService services.DevEnvironmentService) *DevEnvironmentHandlers {
	return &DevEnvironmentHandlers{
		devEnvService: devEnvService,
	}
}

// @Description Create environment request
type CreateEnvironmentRequest struct {
	Name        string            `json:"name" binding:"required"`
	Description string            `json:"description"`
	Type        string            `json:"type" binding:"required"`
	DockerImage string            `json:"docker_image" binding:"required"`
	CPULimit    float64           `json:"cpu_limit" binding:"min=0.1,max=16"`
	MemoryLimit int64             `json:"memory_limit" binding:"min=128,max=32768"`
	EnvVars     map[string]string `json:"env_vars"`
}

// @Description Update environment request
type UpdateEnvironmentRequest struct {
	Name        string            `json:"name"`
	Description string            `json:"description"`
	CPULimit    float64           `json:"cpu_limit"`
	MemoryLimit int64             `json:"memory_limit"`
	EnvVars     map[string]string `json:"env_vars"`
}

// CreateEnvironment creates a development environment
// @Summary Create development environment
// @Description Create a new development environment
// @Tags Development Environment
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param environment body CreateEnvironmentRequest true "Environment information"
// @Success 201 {object} object{message=string,environment=object} "Environment created successfully"
// @Failure 400 {object} object{error=string} "Request parameter error"
// @Router /environments [post]
func (h *DevEnvironmentHandlers) CreateEnvironment(c *gin.Context) {
	lang := middleware.GetLangFromContext(c)

	username, exists := c.Get("username")
	if !exists {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": i18n.T(lang, "auth.unauthorized"),
		})
		return
	}

	var req CreateEnvironmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": i18n.T(lang, "validation.invalid_format_with_details", err.Error()),
		})
		return
	}

	if req.EnvVars == nil {
		req.EnvVars = make(map[string]string)
	}

	env, err := h.devEnvService.CreateEnvironment(
		req.Name, req.Description, req.Type, req.DockerImage,
		req.CPULimit, req.MemoryLimit, req.EnvVars, username.(string),
	)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": i18n.MapErrorToI18nKey(err, lang),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":     i18n.T(lang, "dev_environment.create_success"),
		"environment": env,
	})
}

// GetEnvironment gets a single development environment
// @Summary Get environment details
// @Description Get detailed information of a development environment by ID
// @Tags Development Environment
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Environment ID"
// @Success 200 {object} object{environment=object} "Environment details"
// @Failure 404 {object} object{error=string} "Environment not found"
// @Router /environments/{id} [get]
func (h *DevEnvironmentHandlers) GetEnvironment(c *gin.Context) {
	lang := middleware.GetLangFromContext(c)

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": i18n.T(lang, "validation.invalid_format"),
		})
		return
	}

	env, err := h.devEnvService.GetEnvironment(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": i18n.T(lang, "dev_environment.not_found"),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"environment": env,
	})
}

// ListEnvironments gets development environment list
// @Summary Get environment list
// @Description Get current user's development environment list with pagination and filtering
// @Tags Development Environment
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param page query int false "Page number, default is 1"
// @Param page_size query int false "Page size, default is 10"
// @Param name query string false "Environment name filter"
// @Param docker_image query string false "Docker image filter"
// @Success 200 {object} object{environments=[]object,total=number} "Environment list"
// @Router /environments [get]
func (h *DevEnvironmentHandlers) ListEnvironments(c *gin.Context) {
	lang := middleware.GetLangFromContext(c)

	page := 1
	pageSize := 10
	var name *string
	var dockerImage *string

	if p := c.Query("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			page = parsed
		}
	}
	if ps := c.Query("page_size"); ps != "" {
		if parsed, err := strconv.Atoi(ps); err == nil && parsed > 0 && parsed <= 100 {
			pageSize = parsed
		}
	}
	if n := c.Query("name"); n != "" {
		name = &n
	}
	if di := c.Query("docker_image"); di != "" {
		dockerImage = &di
	}

	environments, total, err := h.devEnvService.ListEnvironments(name, dockerImage, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": i18n.T(lang, "dev_environment.list_failed"),
		})
		return
	}

	totalPages := (total + int64(pageSize) - 1) / int64(pageSize)

	c.JSON(http.StatusOK, gin.H{
		"message":      i18n.T(lang, "dev_environment.list_success"),
		"environments": environments,
		"total":        total,
		"page":         page,
		"page_size":    pageSize,
		"total_pages":  totalPages,
	})
}

// UpdateEnvironment updates development environment
// @Summary Update environment
// @Description Update specified development environment information
// @Tags Development Environment
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Environment ID"
// @Param environment body UpdateEnvironmentRequest true "Environment update information"
// @Success 200 {object} object{message=string} "Environment updated successfully"
// @Failure 400 {object} object{error=string} "Request parameter error"
// @Router /environments/{id} [put]
func (h *DevEnvironmentHandlers) UpdateEnvironment(c *gin.Context) {
	lang := middleware.GetLangFromContext(c)

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": i18n.T(lang, "dev_environment.invalid_id"),
		})
		return
	}

	var req UpdateEnvironmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": i18n.T(lang, "dev_environment.invalid_request_with_details", err.Error()),
		})
		return
	}

	updates := make(map[string]interface{})
	if req.Name != "" {
		updates["name"] = req.Name
	}
	// Always update description field, even if empty (user might want to clear it)
	updates["description"] = req.Description
	if req.CPULimit > 0 {
		updates["cpu_limit"] = req.CPULimit
	}
	if req.MemoryLimit > 0 {
		updates["memory_limit"] = req.MemoryLimit
	}

	err = h.devEnvService.UpdateEnvironment(uint(id), updates)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": i18n.MapErrorToI18nKey(err, lang),
		})
		return
	}

	if req.EnvVars != nil {
		err = h.devEnvService.UpdateEnvironmentVars(uint(id), req.EnvVars)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": i18n.MapErrorToI18nKey(err, lang),
			})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": i18n.T(lang, "dev_environment.update_success"),
	})
}

// DeleteEnvironment deletes development environment
// @Summary Delete environment
// @Description Delete specified development environment
// @Tags Development Environment
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Environment ID"
// @Success 200 {object} object{message=string} "Environment deleted successfully"
// @Failure 400 {object} object{error=string} "Delete failed"
// @Router /environments/{id} [delete]
func (h *DevEnvironmentHandlers) DeleteEnvironment(c *gin.Context) {
	lang := middleware.GetLangFromContext(c)

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": i18n.T(lang, "dev_environment.invalid_id"),
		})
		return
	}

	err = h.devEnvService.DeleteEnvironment(uint(id))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": i18n.MapErrorToI18nKey(err, lang),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": i18n.T(lang, "dev_environment.delete_success"),
	})
}

// GetEnvironmentVars gets environment variables
// @Summary Get environment variables
// @Description Get environment variables of specified environment
// @Tags Development Environment
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Environment ID"
// @Success 200 {object} object{env_vars=object} "Environment variables"
// @Failure 400 {object} object{error=string} "Get failed"
// @Router /environments/{id}/env-vars [get]
func (h *DevEnvironmentHandlers) GetEnvironmentVars(c *gin.Context) {
	lang := middleware.GetLangFromContext(c)

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": i18n.T(lang, "dev_environment.invalid_id"),
		})
		return
	}

	envVars, err := h.devEnvService.GetEnvironmentVars(uint(id))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": i18n.MapErrorToI18nKey(err, lang),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"env_vars": envVars,
	})
}

// UpdateEnvironmentVars updates environment variables
// @Summary Update environment variables
// @Description Update environment variables of specified environment
// @Tags Development Environment
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Environment ID"
// @Param env_vars body map[string]string true "Environment variables"
// @Success 200 {object} object{message=string} "Update successful"
// @Failure 400 {object} object{error=string} "Update failed"
// @Router /environments/{id}/env-vars [put]
func (h *DevEnvironmentHandlers) UpdateEnvironmentVars(c *gin.Context) {
	lang := middleware.GetLangFromContext(c)

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": i18n.T(lang, "dev_environment.invalid_id"),
		})
		return
	}

	var envVars map[string]string
	if err := c.ShouldBindJSON(&envVars); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": i18n.T(lang, "dev_environment.invalid_request_with_details", err.Error()),
		})
		return
	}

	err = h.devEnvService.UpdateEnvironmentVars(uint(id), envVars)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": i18n.MapErrorToI18nKey(err, lang),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": i18n.T(lang, "dev_environment.env_vars_update_success"),
	})
}

// GetAvailableImages gets available environment images
// @Summary Get available environment images
// @Description Get available environment images from system configuration
// @Tags Development Environment
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} object{images=[]object} "Available environment images"
// @Router /environments/available-images [get]
func (h *DevEnvironmentHandlers) GetAvailableImages(c *gin.Context) {
	lang := middleware.GetLangFromContext(c)

	images, err := h.devEnvService.GetAvailableEnvironmentImages()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": i18n.MapErrorToI18nKey(err, lang),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"images": images,
	})
}

// GetStats gets development environment statistics
// @Summary Get development environment statistics
// @Description Get statistics about development environments
// @Tags Development Environment
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} object{stats=map[string]interface{}} "Environment statistics"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /environments/stats [get]
func (h *DevEnvironmentHandlers) GetStats(c *gin.Context) {
	lang := middleware.GetLangFromContext(c)

	stats, err := h.devEnvService.GetStats()
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
