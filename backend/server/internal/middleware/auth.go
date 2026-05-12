package middleware

import (
	"encoding/base64"
	"encoding/json"
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
			// Priority: X-Player-ID header → player_id query → token query (JWT decode) → anonymous
			playerID := c.GetHeader("X-Player-ID")
			if playerID == "" {
				playerID = c.Query("player_id")
			}
			if playerID == "" {
				if token := c.Query("token"); token != "" {
					// Browser WS connections pass the Firebase ID token as ?token=.
					// In dev we decode the JWT payload without verifying the signature
					// to extract the Firebase UID (sub claim). Fast, no SDK needed.
					if uid, err := extractUID(token); err == nil {
						playerID = uid
					}
				}
			}
			if playerID == "" {
				playerID = "anonymous"
			}
			c.Set(PlayerIDKey, playerID)
			c.Next()
			return
		}

		// Production: verify Firebase ID token.
		// Accept Authorization: Bearer header (HTTP) or ?token= query param (WebSocket).
		idToken := ""
		if h := c.GetHeader("Authorization"); strings.HasPrefix(h, "Bearer ") {
			idToken = strings.TrimPrefix(h, "Bearer ")
		} else if t := c.Query("token"); t != "" {
			idToken = t
		}
		if idToken == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing authorization"})
			return
		}

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

// extractUID decodes a Firebase ID token's payload without verifying the signature
// and returns the Firebase UID from the "sub" claim.
// Only used in development — never call this in production.
func extractUID(idToken string) (string, error) {
	parts := strings.Split(idToken, ".")
	if len(parts) != 3 {
		return "", &jwtError{"not a JWT"}
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return "", err
	}
	var claims struct {
		Sub string `json:"sub"`
	}
	if err := json.Unmarshal(payload, &claims); err != nil {
		return "", err
	}
	if claims.Sub == "" {
		return "", &jwtError{"empty sub claim"}
	}
	return claims.Sub, nil
}

type jwtError struct{ msg string }

func (e *jwtError) Error() string { return e.msg }
