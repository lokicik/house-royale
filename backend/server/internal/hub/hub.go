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
}

type BroadcastMsg struct {
	LobbyID string
	Data    []byte
}

type Hub struct {
	mu         sync.RWMutex
	lobbies    map[string]map[*Client]bool
	Register   chan *Client
	Unregister chan *Client
	Broadcast  chan BroadcastMsg
}

func New() *Hub {
	return &Hub{
		lobbies:    make(map[string]map[*Client]bool),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		Broadcast:  make(chan BroadcastMsg, 64),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case c := <-h.Register:
			h.mu.Lock()
			if h.lobbies[c.LobbyID] == nil {
				h.lobbies[c.LobbyID] = make(map[*Client]bool)
			}
			h.lobbies[c.LobbyID][c] = true
			h.mu.Unlock()

		case c := <-h.Unregister:
			h.mu.Lock()
			if clients, ok := h.lobbies[c.LobbyID]; ok {
				if clients[c] {
					delete(clients, c)
					close(c.Send)
				}
				if len(clients) == 0 {
					delete(h.lobbies, c.LobbyID)
				}
			}
			h.mu.Unlock()

		case msg := <-h.Broadcast:
			h.mu.RLock()
			clients := h.lobbies[msg.LobbyID]
			h.mu.RUnlock()
			for c := range clients {
				select {
				case c.Send <- msg.Data:
				default:
					h.Unregister <- c
				}
			}
		}
	}
}

func (h *Hub) SendToLobby(lobbyID string, data []byte) {
	h.Broadcast <- BroadcastMsg{LobbyID: lobbyID, Data: data}
}

func NewClient(lobbyID, playerID string, conn *websocket.Conn) *Client {
	return &Client{
		LobbyID:  lobbyID,
		PlayerID: playerID,
		Conn:     conn,
		Send:     make(chan []byte, sendBufferSize),
	}
}
