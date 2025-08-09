package handlers

import (
	"net/http"
	"strconv"
	"xsha-backend/i18n"
	"xsha-backend/middleware"
	"xsha-backend/services"
	"xsha-backend/utils"

	"github.com/gin-gonic/gin"
)

type AuthHandlers struct {
	authService     services.AuthService
	loginLogService services.LoginLogService
}

func NewAuthHandlers(authService services.AuthService, loginLogService services.LoginLogService) *AuthHandlers {
	return &AuthHandlers{
		authService:     authService,
		loginLogService: loginLogService,
	}
}

// LoginHandler handles login
// @Summary User login
// @Description Login authentication using username and password
// @Tags Authentication
// @Accept json
// @Produce json
// @Param loginData body object{username=string,password=string} true "Login information"
// @Success 200 {object} object{token=string,expires_at=string} "Login successful"
// @Failure 400 {object} object{error=string} "Request parameter error"
// @Failure 401 {object} object{error=string} "Authentication failed"
// @Failure 429 {object} object{error=string} "Too frequent requests"
// @Router /auth/login [post]
func (h *AuthHandlers) LoginHandler(c *gin.Context) {
	lang := middleware.GetLangFromContext(c)

	var loginData struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&loginData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": i18n.T(lang, "login.invalid_request"),
		})
		return
	}

	clientIP := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")

	loginSuccess, token, err := h.authService.Login(loginData.Username, loginData.Password, clientIP, userAgent)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": i18n.T(lang, "login.token_generate_error"),
		})
		return
	}

	if loginSuccess {
		c.JSON(http.StatusOK, gin.H{
			"message": i18n.T(lang, "login.success"),
			"user":    loginData.Username,
			"token":   token,
		})
	} else {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": i18n.T(lang, "login.failed"),
		})
	}
}

// LogoutHandler handles logout
// @Summary User logout
// @Description Logout current user and add token to blacklist
// @Tags Authentication
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} object{message=string} "Logout successful"
// @Failure 400 {object} object{error=string} "Invalid token"
// @Failure 401 {object} object{error=string} "Authentication failed"
// @Failure 500 {object} object{error=string} "Logout failed"
// @Router /auth/logout [post]
func (h *AuthHandlers) LogoutHandler(c *gin.Context) {
	lang := middleware.GetLangFromContext(c)

	authHeader := c.GetHeader("Authorization")
	token, err := utils.ExtractTokenFromAuthHeader(authHeader)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": i18n.T(lang, "logout.invalid_token_with_details", err.Error()),
		})
		return
	}

	claims, err := utils.ValidateJWT(token, "")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": i18n.T(lang, "logout.invalid_token_with_details", err.Error()),
		})
		return
	}

	if err := h.authService.Logout(token, claims.Username); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": i18n.T(lang, "logout.failed"),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": i18n.T(lang, "logout.success"),
	})
}

// CurrentUserHandler gets current user information
// @Summary Get current user information
// @Description Get information of current logged-in user
// @Tags User
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} object{username=string} "User information"
// @Failure 500 {object} object{error=string} "Failed to get user information"
// @Router /user/current [get]
func (h *AuthHandlers) CurrentUserHandler(c *gin.Context) {
	lang := middleware.GetLangFromContext(c)

	username, exists := c.Get("username")
	if !exists {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": i18n.T(lang, "user.get_info_error"),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user":          username,
		"authenticated": true,
		"message":       i18n.T(lang, "user.authenticated"),
	})
}

// GetLoginLogsHandler gets login logs (requires admin privileges)
// @Summary Get login logs
// @Description Get system login log records, supporting filtering by username, IP, success status, date range and pagination
// @Tags Authentication
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param username query string false "Username filter"
// @Param ip query string false "IP address filter"
// @Param success query boolean false "Success status filter"
// @Param start_time query string false "Start time filter (YYYY-MM-DD)"
// @Param end_time query string false "End time filter (YYYY-MM-DD)"
// @Param page query int false "Page number, defaults to 1"
// @Param page_size query int false "Page size, defaults to 20, maximum 100"
// @Success 200 {object} object{message=string,logs=[]object,total=number,page=number,page_size=number,total_pages=number} "Login log list"
// @Failure 500 {object} object{error=string} "Failed to get login logs"
// @Router /admin/login-logs [get]
func (h *AuthHandlers) GetLoginLogsHandler(c *gin.Context) {
	lang := middleware.GetLangFromContext(c)

	// Parse query parameters
	page := 1
	pageSize := 20
	var username, ip, startTime, endTime *string
	var success *bool

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

	if u := c.Query("username"); u != "" {
		username = &u
	}

	if i := c.Query("ip"); i != "" {
		ip = &i
	}

	if s := c.Query("success"); s != "" {
		if parsed, err := strconv.ParseBool(s); err == nil {
			success = &parsed
		}
	}

	if st := c.Query("start_time"); st != "" {
		startTime = &st
	}

	if et := c.Query("end_time"); et != "" {
		endTime = &et
	}

	logs, total, err := h.loginLogService.GetLogs(username, ip, success, startTime, endTime, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": i18n.T(lang, "common.internal_error"),
		})
		return
	}

	totalPages := (total + int64(pageSize) - 1) / int64(pageSize)

	c.JSON(http.StatusOK, gin.H{
		"message":     i18n.T(lang, "common.success"),
		"logs":        logs,
		"total":       total,
		"page":        page,
		"page_size":   pageSize,
		"total_pages": totalPages,
	})
}
