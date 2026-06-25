package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/lokicik/house-royale/backend/server/internal/league"
	"github.com/lokicik/house-royale/backend/server/internal/middleware"
)

// LeagueHandler exposes the caller's league + LP.
type LeagueHandler struct {
	Store league.Storer
}

func NewLeagueHandler(store league.Storer) *LeagueHandler {
	return &LeagueHandler{Store: store}
}

// GetMine returns the league/LP of the authenticated player. If the player has
// never played a game, returns the default Bronze/50 entry (not persisted).
func (h *LeagueHandler) GetMine(c *gin.Context) {
	playerIDVal, _ := c.Get(middleware.PlayerIDKey)
	playerID, _ := playerIDVal.(string)
	if playerID == "" {
		writeError(c, http.StatusUnauthorized, errCodeUnauthorized, "unauthorized")
		return
	}
	if h.Store == nil {
		c.JSON(http.StatusOK, gin.H{
			"league": league.Bronze,
			"lp":     league.StartingLP,
		})
		return
	}
	u, err := h.Store.Get(c.Request.Context(), playerID)
	if err != nil {
		writeError(c, http.StatusInternalServerError, errCodeBadRequest, err.Error())
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"league":      u.League,
		"lp":          u.LP,
		"promote_at":  league.PromoteAt,
		"demote_at":   league.DemoteAt,
		"starting_lp": league.StartingLP,
	})
}
