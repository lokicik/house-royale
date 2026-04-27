package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/lokicik/house-royale/backend/server/internal/game"
	"github.com/lokicik/house-royale/backend/server/internal/hub"
	"github.com/lokicik/house-royale/backend/server/internal/middleware"
)

const (
	writeWait  = 10 * time.Second
	pongWait   = 60 * time.Second
	pingPeriod = (pongWait * 9) / 10
	maxMsgSize = 4096
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

type WSHandler struct {
	Hub   *hub.Hub
	Store *LobbyStore
}

func NewWSHandler(h *hub.Hub, store *LobbyStore) *WSHandler {
	return &WSHandler{Hub: h, Store: store}
}

func (h *WSHandler) ServeWS(c *gin.Context) {
	lobbyID := c.Param("id")
	if _, ok := h.Store.Get(lobbyID); !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "lobby not found"})
		return
	}

	playerID, _ := c.Get(middleware.PlayerIDKey)
	if playerID == nil {
		playerID = "anonymous"
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("ws upgrade error: %v", err)
		return
	}

	client := hub.NewClient(lobbyID, playerID.(string), conn)
	h.Hub.Register <- client

	go h.writePump(client)
	go h.readPump(client)
}

func (h *WSHandler) readPump(c *hub.Client) {
	defer func() {
		h.Hub.Unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(maxMsgSize)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, raw, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("ws read error [%s]: %v", c.PlayerID, err)
			}
			break
		}

		var msg game.Message
		if err := json.Unmarshal(raw, &msg); err != nil {
			h.sendError(c, "invalid message format")
			continue
		}

		switch msg.Type {
		case game.MsgJoin:
			var p game.JoinPayload
			if err := json.Unmarshal(msg.Payload, &p); err != nil {
				h.sendError(c, "invalid JOIN payload")
				continue
			}
			if lobby, ok := h.Store.Get(c.LobbyID); ok {
				lobby.AddPlayer(&game.Player{ID: c.PlayerID, Nickname: p.Nickname})
				h.broadcastPlayerJoined(c, p.Nickname)
			}

		case game.MsgSubmitGuess:
			// round orchestration sonraki iterasyonda

		case game.MsgReady:
			// oyun başlatma sonraki iterasyonda

		default:
			h.sendError(c, "unknown message type")
		}
	}
}

func (h *WSHandler) writePump(c *hub.Client) {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case data, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.Conn.WriteMessage(websocket.TextMessage, data); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (h *WSHandler) sendError(c *hub.Client, msg string) {
	payload, _ := json.Marshal(game.ErrorPayload{Message: msg})
	out, _ := json.Marshal(game.Message{Type: game.MsgError, Payload: payload})
	select {
	case c.Send <- out:
	default:
	}
}

func (h *WSHandler) broadcastPlayerJoined(c *hub.Client, nickname string) {
	payload, _ := json.Marshal(map[string]string{"player_id": c.PlayerID, "nickname": nickname})
	out, _ := json.Marshal(game.Message{Type: game.MsgPlayerJoined, Payload: payload})
	h.Hub.SendToLobby(c.LobbyID, out)
}
