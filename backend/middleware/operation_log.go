package middleware

import (
	"bytes"
	"io"
	"strconv"
	"strings"
	"xsha-backend/services"

	"github.com/gin-gonic/gin"
)

func OperationLogMiddleware(operationLogService services.AdminOperationLogService) gin.HandlerFunc {
	return func(c *gin.Context) {
		username, exists := c.Get("username")
		if !exists {
			c.Next()
			return
		}

		clientIP := c.ClientIP()
		userAgent := c.GetHeader("User-Agent")
		method := c.Request.Method
		path := c.Request.URL.Path

		if !shouldLogOperation(method, path) {
			c.Next()
			return
		}

		var requestBody []byte
		if c.Request.Body != nil {
			requestBody, _ = io.ReadAll(c.Request.Body)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(requestBody))
		}

		c.Next()

		go func() {
			operation, resource, resourceID, description := determineOperationInfo(method, path, c.Param("id"))

			success := c.Writer.Status() < 400
			errorMsg := ""
			if !success {
				errorMsg = "HTTP " + strconv.Itoa(c.Writer.Status())
			}

			switch operation {
			case "create":
				operationLogService.LogCreate(username.(string), resource, resourceID,
					description, clientIP, userAgent, path, success, errorMsg)
			case "update":
				operationLogService.LogUpdate(username.(string), resource, resourceID,
					description, clientIP, userAgent, path, success, errorMsg)
			case "delete":
				operationLogService.LogDelete(username.(string), resource, resourceID,
					description, clientIP, userAgent, path, success, errorMsg)
			case "read":
				if success {
					operationLogService.LogRead(username.(string), resource, resourceID,
						description, clientIP, userAgent, path)
				}
			}
		}()
	}
}

func shouldLogOperation(method, path string) bool {
	if strings.HasPrefix(path, "/health") ||
		strings.HasPrefix(path, "/static") {
		return false
	}

	if !strings.HasPrefix(path, "/api/v1/") {
		return false
	}

	return method == "POST" || method == "PUT" || method == "DELETE" || method == "GET"
}

func determineOperationInfo(method, path, id string) (operation, resource, resourceID, description string) {
	pathParts := strings.Split(strings.Trim(path, "/"), "/")
	if len(pathParts) >= 3 {
		resource = pathParts[2]
	}

	switch method {
	case "POST":
		operation = "create"
		if strings.Contains(path, "/toggle") {
			operation = "update"
			description = "toggle status"
		} else if strings.Contains(path, "/use") {
			operation = "read"
			description = "use resource"
		} else if strings.Contains(path, "/parse-url") {
			operation = "read"
			description = "parse repository URL"
		} else if strings.Contains(path, "/branches") {
			operation = "read"
			description = "get repository branches list"
		} else if strings.Contains(path, "/validate-access") {
			operation = "read"
			description = "validate repository access"
		} else {
			description = "create " + getResourceDisplayName(resource)
		}
	case "PUT":
		operation = "update"
		description = "update " + getResourceDisplayName(resource)
		resourceID = id
	case "DELETE":
		operation = "delete"
		description = "delete " + getResourceDisplayName(resource)
		resourceID = id
	case "GET":
		operation = "read"
		if id != "" {
			description = "view " + getResourceDisplayName(resource) + " detail"
			resourceID = id
		} else {
			description = "view " + getResourceDisplayName(resource) + " list"
		}
	}

	resource = normalizeResourceName(path, resource)

	return
}

func getResourceDisplayName(resource string) string {
	displayNames := map[string]string{
		"admin":          "admin",
		"auth":           "auth",
		"credentials":    "credentials",
		"projects":       "projects",
		"tasks":          "tasks",
		"conversations":  "conversations",
		"environments":   "environments",
		"operation-logs": "operation-logs",
		"login-logs":     "login-logs",
		"logs":           "logs",
		"user":           "user",
	}

	if displayName, exists := displayNames[resource]; exists {
		return displayName
	}
	return resource
}

func normalizeResourceName(path, resource string) string {
	if strings.Contains(path, "/admin/operation-logs") {
		return "operation-logs"
	}
	if strings.Contains(path, "/admin/login-logs") {
		return "login-logs"
	}
	if strings.Contains(path, "/admin") {
		return "admin"
	}
	if strings.Contains(path, "/auth") {
		return "auth"
	}
	if strings.Contains(path, "/credentials") {
		return "credentials"
	}
	if strings.Contains(path, "/projects") {
		return "projects"
	}
	if strings.Contains(path, "/tasks") {
		return "tasks"
	}
	if strings.Contains(path, "/conversations") {
		return "conversations"
	}
	if strings.Contains(path, "/environments") {
		return "environments"
	}
	if strings.Contains(path, "/logs") {
		return "logs"
	}
	if strings.Contains(path, "/user") {
		return "user"
	}

	return resource
}
