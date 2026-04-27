package handlers

import (
	"crypto/rand"
	"encoding/hex"
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

func newID() string {
	b := make([]byte, 8)
	rand.Read(b)
	return hex.EncodeToString(b)
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
