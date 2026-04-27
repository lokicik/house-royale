package middleware

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

const PlayerIDKey = "playerID"

// Auth extracts player identity. In development mode the X-Player-ID header is
// trusted directly. Production mode returns 401 until Firebase integration is added.
func Auth() gin.HandlerFunc {
	return func(c *gin.Context) {
		if os.Getenv("APP_ENV") != "production" {
			playerID := c.GetHeader("X-Player-ID")
			if playerID == "" {
				playerID = "anonymous"
			}
			c.Set(PlayerIDKey, playerID)
			c.Next()
			return
		}
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Firebase auth not yet configured"})
	}
}
