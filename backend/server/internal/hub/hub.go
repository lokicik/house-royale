package hub

import (
	"sync"

	"github.com/gorilla/websocket"
)

const sendBufferSize = 256

type Client struct {
	LobbyID  string
	PlayerID string
	Conn     *websocket.Conn
	Send     chan []byte

	mu          sync.RWMutex
	closeReason string
	closeOnce   sync.Once
}

type Hub struct {
	mu      sync.RWMutex
	lobbies map[string]map[string]*Client
}

func New() *Hub {
	return &Hub{
		lobbies: make(map[string]map[string]*Client),
	}
}

// Run is kept for backwards compatibility with the old async hub bootstrap.
func (h *Hub) Run() {}

func (h *Hub) Register(c *Client) {
	var replaced *Client

	h.mu.Lock()
	if h.lobbies[c.LobbyID] == nil {
		h.lobbies[c.LobbyID] = make(map[string]*Client)
	}
	if prev := h.lobbies[c.LobbyID][c.PlayerID]; prev != nil && prev != c {
		replaced = prev
	}
	h.lobbies[c.LobbyID][c.PlayerID] = c
	h.mu.Unlock()

	if replaced != nil {
		replaced.Terminate("replaced")
	}
}

func (h *Hub) Unregister(c *Client) bool {
	h.mu.Lock()
	defer h.mu.Unlock()

	clients, ok := h.lobbies[c.LobbyID]
	if !ok {
		return false
	}
	current, ok := clients[c.PlayerID]
	if !ok || current != c {
		return false
	}
	delete(clients, c.PlayerID)
	if len(clients) == 0 {
		delete(h.lobbies, c.LobbyID)
	}
	c.CloseSend()
	return true
}

func (h *Hub) IsCurrent(c *Client) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()

	clients, ok := h.lobbies[c.LobbyID]
	if !ok {
		return false
	}
	return clients[c.PlayerID] == c
}

func (h *Hub) SendToLobby(lobbyID string, data []byte) {
	h.mu.RLock()
	clientsMap := h.lobbies[lobbyID]
	clients := make([]*Client, 0, len(clientsMap))
	for _, c := range clientsMap {
		clients = append(clients, c)
	}
	h.mu.RUnlock()

	for _, c := range clients {
		select {
		case c.Send <- data:
		default:
			h.ClosePlayer(c.LobbyID, c.PlayerID, "backpressure")
		}
	}
}

func (h *Hub) SendToPlayer(lobbyID, playerID string, data []byte) bool {
	h.mu.RLock()
	client := h.lobbies[lobbyID][playerID]
	h.mu.RUnlock()
	if client == nil {
		return false
	}
	select {
	case client.Send <- data:
		return true
	default:
		h.ClosePlayer(lobbyID, playerID, "backpressure")
		return false
	}
}

func (h *Hub) ClosePlayer(lobbyID, playerID, reason string) bool {
	var client *Client

	h.mu.Lock()
	if clients, ok := h.lobbies[lobbyID]; ok {
		client = clients[playerID]
		if client != nil {
			delete(clients, playerID)
			if len(clients) == 0 {
				delete(h.lobbies, lobbyID)
			}
		}
	}
	h.mu.Unlock()

	if client == nil {
		return false
	}
	client.Terminate(reason)
	return true
}

func (h *Hub) CloseLobby(lobbyID, reason string) {
	var clients []*Client

	h.mu.Lock()
	if current, ok := h.lobbies[lobbyID]; ok {
		clients = make([]*Client, 0, len(current))
		for _, client := range current {
			clients = append(clients, client)
		}
		delete(h.lobbies, lobbyID)
	}
	h.mu.Unlock()

	for _, client := range clients {
		client.Terminate(reason)
	}
}

func (h *Hub) HasLobbyClients(lobbyID string) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.lobbies[lobbyID]) > 0
}

func NewClient(lobbyID, playerID string, conn *websocket.Conn) *Client {
	return &Client{
		LobbyID:  lobbyID,
		PlayerID: playerID,
		Conn:     conn,
		Send:     make(chan []byte, sendBufferSize),
	}
}

func (c *Client) SetCloseReason(reason string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.closeReason == "" {
		c.closeReason = reason
	}
}

func (c *Client) CloseReason() string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.closeReason
}

func (c *Client) CloseSend() {
	c.closeOnce.Do(func() {
		close(c.Send)
	})
}

func (c *Client) CloseConn() {
	if c.Conn != nil {
		_ = c.Conn.Close()
	}
}

func (c *Client) Terminate(reason string) {
	c.SetCloseReason(reason)
	c.CloseSend()
	c.CloseConn()
}
