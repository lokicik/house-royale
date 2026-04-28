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
		c.JSON(http.StatusBadRequest, gin.H{"error": "id_token required"})
		return
	}

	client, err := firebasepkg.GetAuth(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "auth service unavailable"})
		return
	}

	token, err := client.VerifyIDToken(c.Request.Context(), req.IDToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}

	email, _ := token.Claims["email"].(string)
	c.JSON(http.StatusOK, gin.H{
		"player_id": token.UID,
		"email":     strings.ToLower(email),
	})
}
