package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/lokicik/house-royale/backend/server/internal/leaderboard"
)

type LeaderboardHandler struct {
	LB leaderboard.Storer
}

func (h *LeaderboardHandler) Get(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"entries": h.LB.Snapshot()})
}
