package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/lokicik/house-royale/backend/server/internal/history"
	"github.com/lokicik/house-royale/backend/server/internal/middleware"
)

type HistoryHandler struct {
	Store *history.Store
}

func NewHistoryHandler(store *history.Store) *HistoryHandler {
	return &HistoryHandler{Store: store}
}

func (h *HistoryHandler) Get(c *gin.Context) {
	playerIDVal, _ := c.Get(middleware.PlayerIDKey)
	playerID, _ := playerIDVal.(string)
	if playerID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"records": h.Store.Get(playerID)})
}
