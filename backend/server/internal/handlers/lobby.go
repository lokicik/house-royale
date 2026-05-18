package handlers

import (
	"crypto/rand"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/lokicik/house-royale/backend/server/internal/game"
	"github.com/lokicik/house-royale/backend/server/internal/middleware"
)

type LobbyStore struct {
	mu      sync.RWMutex
	lobbies map[string]*game.Lobby
}

func NewLobbyStore() *LobbyStore {
	return &LobbyStore{lobbies: make(map[string]*game.Lobby)}
}

func (s *LobbyStore) Create(hostID string) *game.Lobby {
	id := newID()
	l := game.NewLobby(id, hostID)
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

// ListByHost returns active (non-finished) lobbies where HostID matches.
func (s *LobbyStore) ListByHost(hostID string) []*game.Lobby {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var out []*game.Lobby
	for _, l := range s.lobbies {
		if l.HostID == hostID && l.CurrentStatus() != game.StatusFinished {
			out = append(out, l)
		}
	}
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
	Store *LobbyStore
}

func NewLobbyHandler(store *LobbyStore) *LobbyHandler {
	return &LobbyHandler{Store: store}
}

func (h *LobbyHandler) Create(c *gin.Context) {
	playerID, _ := c.Get(middleware.PlayerIDKey)

	var body struct {
		Nickname string `json:"nickname"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	lobby := h.Store.Create(playerID.(string))
	c.JSON(http.StatusCreated, lobby)
}

func (h *LobbyHandler) List(c *gin.Context) {
	playerIDVal, _ := c.Get(middleware.PlayerIDKey)
	playerID, _ := playerIDVal.(string)
	if playerID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	lobbies := h.Store.ListByHost(playerID)
	type lobbyView struct {
		ID          string      `json:"id"`
		Status      game.Status `json:"status"`
		PlayerCount int         `json:"player_count"`
		CreatedAt   interface{} `json:"created_at"`
		Settings    interface{} `json:"settings"`
	}
	out := make([]lobbyView, 0, len(lobbies))
	for _, l := range lobbies {
		settings, _ := l.SettingsSnapshot()
		out = append(out, lobbyView{
			ID:          l.ID,
			Status:      l.CurrentStatus(),
			PlayerCount: l.PlayerCount(),
			CreatedAt:   l.CreatedAt,
			Settings:    settings,
		})
	}
	c.JSON(http.StatusOK, out)
}

func (h *LobbyHandler) Get(c *gin.Context) {
	id := c.Param("id")
	lobby, ok := h.Store.Get(id)
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "lobby not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"id":           lobby.ID,
		"host_id":      lobby.HostID,
		"status":       lobby.Status,
		"player_count": lobby.PlayerCount(),
		"players":      lobby.Snapshot(),
		"created_at":   lobby.CreatedAt,
	})
}
