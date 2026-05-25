package handlers

import (
	"context"
	"crypto/rand"
	"log"
	"net/http"
	"sort"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/lokicik/house-royale/backend/server/internal/game"
	"github.com/lokicik/house-royale/backend/server/internal/league"
	"github.com/lokicik/house-royale/backend/server/internal/middleware"
)

type LobbyStore struct {
	mu      sync.RWMutex
	lobbies map[string]*game.Lobby
}

func NewLobbyStore() *LobbyStore {
	return &LobbyStore{lobbies: make(map[string]*game.Lobby)}
}

func (s *LobbyStore) Create(hostID string, hostLeague league.League) *game.Lobby {
	id := newID()
	l := game.NewLobby(id, hostID, hostLeague)
	s.mu.Lock()
	s.lobbies[id] = l
	s.mu.Unlock()
	return l
}

func (s *LobbyStore) Get(id string) (*game.Lobby, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	l, ok := s.lobbies[id]
	return l, ok
}

func (s *LobbyStore) Delete(id string) {
	s.mu.Lock()
	delete(s.lobbies, id)
	s.mu.Unlock()
}

// ListAccessible returns lobbies the player can currently access. Waiting-room
// lobbies remain joinable by code; playing/finished lobbies are listed only for
// existing members so they can reconnect.
func (s *LobbyStore) ListAccessible(playerID string) []*game.Lobby {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var out []*game.Lobby
	for _, l := range s.lobbies {
		if l.ListedFor(playerID) {
			out = append(out, l)
		}
	}
	sort.SliceStable(out, func(i, j int) bool {
		return out[i].CreatedAt.After(out[j].CreatedAt)
	})
	return out
}

const lobbyIDCharset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

func newID() string {
	b := make([]byte, 6)
	rand.Read(b)
	out := make([]byte, 6)
	for i := range b {
		out[i] = lobbyIDCharset[int(b[i])%len(lobbyIDCharset)]
	}
	return string(out)
}

type LobbyHandler struct {
	Store     *LobbyStore
	Leagues   league.Storer
	Lifecycle *LobbyLifecycle
}

func NewLobbyHandler(store *LobbyStore, leagues league.Storer, lifecycle *LobbyLifecycle) *LobbyHandler {
	return &LobbyHandler{Store: store, Leagues: leagues, Lifecycle: lifecycle}
}

func (h *LobbyHandler) Create(c *gin.Context) {
	playerIDVal, _ := c.Get(middleware.PlayerIDKey)
	playerID, _ := playerIDVal.(string)
	if playerID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var body struct {
		Nickname string `json:"nickname"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	hostLeague := league.Bronze
	if h.Leagues != nil {
		u, err := h.Leagues.Get(context.Background(), playerID)
		if err != nil {
			log.Printf("lobby.Create league lookup failed id=%s err=%v (defaulting to bronze)", playerID, err)
		} else {
			hostLeague = u.League
		}
	}

	lobby := h.Store.Create(playerID, hostLeague)
	if h.Lifecycle != nil {
		h.Lifecycle.Track(lobby.ID)
	}
	c.JSON(http.StatusCreated, lobby)
}

func (h *LobbyHandler) List(c *gin.Context) {
	playerIDVal, _ := c.Get(middleware.PlayerIDKey)
	playerID, _ := playerIDVal.(string)
	if playerID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	lobbies := h.Store.ListAccessible(playerID)
	type lobbyView struct {
		ID          string      `json:"id"`
		Status      game.Status `json:"status"`
		Role        string      `json:"role"`
		PlayerCount int         `json:"player_count"`
		HostID      string      `json:"host_id"`
		CreatedAt   interface{} `json:"created_at"`
		Settings    interface{} `json:"settings"`
	}
	out := make([]lobbyView, 0, len(lobbies))
	for _, l := range lobbies {
		settings, _ := l.SettingsSnapshot()
		role := "player"
		if l.HostID == playerID {
			role = "host"
		}
		out = append(out, lobbyView{
			ID:          l.ID,
			Status:      l.CurrentStatus(),
			Role:        role,
			PlayerCount: l.PlayerCount(),
			HostID:      l.HostID,
			CreatedAt:   l.CreatedAt,
			Settings:    settings,
		})
	}
	c.JSON(http.StatusOK, out)
}

func (h *LobbyHandler) Get(c *gin.Context) {
	playerIDVal, _ := c.Get(middleware.PlayerIDKey)
	playerID, _ := playerIDVal.(string)
	if playerID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id := c.Param("id")
	lobby, ok := h.Store.Get(id)
	if !ok {
		writeAccessError(c, http.StatusNotFound, errCodeLobbyNotFound, "lobby not found")
		return
	}
	if lobby.IsBlocked(playerID) {
		writeAccessError(c, http.StatusForbidden, errCodeRemovedFromLobby, "you were removed from this lobby")
		return
	}
	if lobby.CurrentStatus() != game.StatusWaiting && !lobby.HasPlayer(playerID) && playerID != lobby.HostID {
		writeAccessError(c, http.StatusConflict, errCodeGameInProgress, "game already in progress")
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"id":           lobby.ID,
		"host_id":      lobby.HostID,
		"league":       lobby.League,
		"status":       lobby.CurrentStatus(),
		"player_count": lobby.PlayerCount(),
		"players":      lobby.Snapshot(),
		"created_at":   lobby.CreatedAt,
	})
}
