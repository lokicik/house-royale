package middleware

import (
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	firebasepkg "github.com/lokicik/house-royale/backend/server/internal/firebase"
)

const PlayerIDKey = "playerID"

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

		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing authorization header"})
			return
		}
		idToken := strings.TrimPrefix(header, "Bearer ")

		client, err := firebasepkg.GetAuth(c.Request.Context())
		if err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "auth service unavailable"})
			return
		}

		token, err := client.VerifyIDToken(c.Request.Context(), idToken)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}

		c.Set(PlayerIDKey, token.UID)
		c.Next()
	}
}
