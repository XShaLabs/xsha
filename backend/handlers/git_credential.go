package handlers

import (
	"net/http"
	"strconv"
	"xsha-backend/database"
	"xsha-backend/i18n"
	"xsha-backend/middleware"
	"xsha-backend/services"

	"github.com/gin-gonic/gin"
)

type GitCredentialHandlers struct {
	gitCredService services.GitCredentialService
}

func NewGitCredentialHandlers(gitCredService services.GitCredentialService) *GitCredentialHandlers {
	return &GitCredentialHandlers{
		gitCredService: gitCredService,
	}
}

// @Description Request parameters for creating Git credentials
type CreateCredentialRequest struct {
	Name        string            `json:"name" binding:"required" example:"My GitHub Credential"`
	Description string            `json:"description" example:"Credential for GitHub projects"`
	Type        string            `json:"type" binding:"required,oneof=password token ssh_key" example:"password"`
	Username    string            `json:"username" example:"myusername"`
	SecretData  map[string]string `json:"secret_data" binding:"required" example:"{\"password\":\"mypassword\"}"`
}

// @Description Request parameters for updating Git credentials
type UpdateCredentialRequest struct {
	Name        string            `json:"name" example:"Updated credential name"`
	Description string            `json:"description" example:"Updated description"`
	Username    string            `json:"username" example:"newusername"`
	SecretData  map[string]string `json:"secret_data" example:"{\"password\":\"newpassword\"}"`
}

// CreateCredential creates a Git credential
// @Summary Create Git credential
// @Description Create a new Git credential, supporting password, token, and SSH key types
// @Tags Git Credentials
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param credential body CreateCredentialRequest true "Credential information"
// @Success 201 {object} object{message=string,credential=object} "Credential created successfully"
// @Failure 400 {object} object{error=string} "Request parameter error"
// @Failure 500 {object} object{error=string} "Failed to create credential"
// @Router /credentials [post]
func (h *GitCredentialHandlers) CreateCredential(c *gin.Context) {
	lang := middleware.GetLangFromContext(c)

	username, exists := c.Get("username")
	if !exists {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": i18n.T(lang, "auth.unauthorized"),
		})
		return
	}

	var req CreateCredentialRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": i18n.T(lang, "validation.invalid_format_with_details", err.Error()),
		})
		return
	}

	credential, err := h.gitCredService.CreateCredential(
		req.Name, req.Description, req.Type, req.Username,
		req.SecretData, username.(string),
	)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": i18n.MapErrorToI18nKey(err, lang),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":    i18n.T(lang, "git_credential.create_success"),
		"credential": credential,
	})
}

// GetCredential gets a single Git credential
// @Summary Get Git credential details
// @Description Get detailed information of a specified Git credential by ID
// @Tags Git Credentials
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Credential ID"
// @Success 200 {object} object{credential=object} "Credential details"
// @Failure 400 {object} object{error=string} "Invalid credential ID"
// @Failure 404 {object} object{error=string} "Credential not found"
// @Router /credentials/{id} [get]
func (h *GitCredentialHandlers) GetCredential(c *gin.Context) {
	lang := middleware.GetLangFromContext(c)

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": i18n.T(lang, "validation.invalid_format"),
		})
		return
	}

	credential, err := h.gitCredService.GetCredential(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": i18n.T(lang, "git_credential.not_found"),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"credential": credential,
	})
}

// ListCredentials gets the Git credential list
// @Summary Get Git credential list
// @Description Get the current user's Git credential list, supporting filtering by name, type and pagination
// @Tags Git Credentials
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param name query string false "Credential name filter"
// @Param type query string false "Credential type filter (password/token/ssh_key)"
// @Param page query int false "Page number, defaults to 1"
// @Param page_size query int false "Page size, defaults to 20, maximum 100"
// @Success 200 {object} object{message=string,credentials=[]object,total=number,page=number,page_size=number,total_pages=number} "Credential list"
// @Failure 500 {object} object{error=string} "Failed to get credential list"
// @Router /credentials [get]
func (h *GitCredentialHandlers) ListCredentials(c *gin.Context) {
	lang := middleware.GetLangFromContext(c)

	// Parse query parameters
	page := 1
	pageSize := 20
	var name *string
	var credType *database.GitCredentialType

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
	if t := c.Query("type"); t != "" {
		credTypeValue := database.GitCredentialType(t)
		credType = &credTypeValue
	}

	credentials, total, err := h.gitCredService.ListCredentials(name, credType, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": i18n.T(lang, "common.internal_error"),
		})
		return
	}

	totalPages := (total + int64(pageSize) - 1) / int64(pageSize)

	c.JSON(http.StatusOK, gin.H{
		"message":     i18n.T(lang, "common.success"),
		"credentials": credentials,
		"total":       total,
		"page":        page,
		"page_size":   pageSize,
		"total_pages": totalPages,
	})
}

// UpdateCredential updates a Git credential
// @Summary Update Git credential
// @Description Update information of a specified Git credential
// @Tags Git Credentials
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Credential ID"
// @Param credential body UpdateCredentialRequest true "Credential update information"
// @Success 200 {object} object{message=string} "Credential updated successfully"
// @Failure 400 {object} object{error=string} "Request parameter error"
// @Failure 404 {object} object{error=string} "Credential not found"
// @Router /credentials/{id} [put]
func (h *GitCredentialHandlers) UpdateCredential(c *gin.Context) {
	lang := middleware.GetLangFromContext(c)

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": i18n.T(lang, "validation.invalid_format"),
		})
		return
	}

	var req UpdateCredentialRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": i18n.T(lang, "validation.invalid_format_with_details", err.Error()),
		})
		return
	}

	// Build update data
	updates := make(map[string]interface{})
	if req.Name != "" {
		updates["name"] = req.Name
	}

	updates["description"] = req.Description
	updates["username"] = req.Username

	err = h.gitCredService.UpdateCredential(uint(id), updates, req.SecretData)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": i18n.MapErrorToI18nKey(err, lang),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": i18n.T(lang, "git_credential.update_success"),
	})
}

// DeleteCredential deletes a Git credential
// @Summary Delete Git credential
// @Description Delete a specified Git credential
// @Tags Git Credentials
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Credential ID"
// @Success 200 {object} object{message=string} "Credential deleted successfully"
// @Failure 400 {object} object{error=string} "Invalid credential ID"
// @Failure 404 {object} object{error=string} "Credential not found"
// @Router /credentials/{id} [delete]
func (h *GitCredentialHandlers) DeleteCredential(c *gin.Context) {
	lang := middleware.GetLangFromContext(c)

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": i18n.T(lang, "validation.invalid_format"),
		})
		return
	}

	err = h.gitCredService.DeleteCredential(uint(id))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": i18n.MapErrorToI18nKey(err, lang),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": i18n.T(lang, "git_credential.delete_success"),
	})
}
