package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	firebasepkg "github.com/lokicik/house-royale/backend/server/internal/firebase"
)

type verifyRequest struct {
	IDToken string `json:"id_token" binding:"required"`
}

func VerifyToken(c *gin.Context) {
	var req verifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeError(c, http.StatusBadRequest, errCodeIDTokenRequired, "id_token required")
		return
	}

	client, err := firebasepkg.GetAuth(c.Request.Context())
	if err != nil {
		writeError(c, http.StatusInternalServerError, errCodeAuthUnavailable, "auth service unavailable")
		return
	}

	token, err := client.VerifyIDToken(c.Request.Context(), req.IDToken)
	if err != nil {
		writeError(c, http.StatusUnauthorized, errCodeInvalidToken, "invalid token")
		return
	}

	email, _ := token.Claims["email"].(string)
	c.JSON(http.StatusOK, gin.H{
		"player_id": token.UID,
		"email":     strings.ToLower(email),
	})
}
