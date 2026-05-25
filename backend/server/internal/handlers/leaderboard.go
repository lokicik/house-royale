package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/lokicik/house-royale/backend/server/internal/game"
	"github.com/lokicik/house-royale/backend/server/internal/leaderboard"
	"github.com/lokicik/house-royale/backend/server/internal/league"
)

type LeaderboardHandler struct {
	LB     leaderboard.Storer
	League league.Storer
}

func (h *LeaderboardHandler) Get(c *gin.Context) {
	entries := h.LB.Snapshot()
	// Backfill missing League at read time for legacy rows written before the
	// league field existed. AI mapping is deterministic from the model ID;
	// human mapping requires a user_leagues lookup (one Firestore read per
	// missing human). Newly recorded rows already carry the league field.
	for i := range entries {
		if entries[i].League != "" {
			continue
		}
		if entries[i].IsAI {
			modelID := strings.TrimPrefix(entries[i].ID, "ai:")
			if l := game.ModelLeague(modelID); l != "" {
				entries[i].League = string(l)
			}
			continue
		}
		if h.League != nil {
			if ul, err := h.League.Get(c.Request.Context(), entries[i].ID); err == nil {
				entries[i].League = string(ul.League)
			}
		}
	}
	c.JSON(http.StatusOK, gin.H{"entries": entries})
}
