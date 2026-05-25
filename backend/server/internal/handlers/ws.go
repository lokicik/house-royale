package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/lokicik/house-royale/backend/server/internal/game"
	"github.com/lokicik/house-royale/backend/server/internal/history"
	"github.com/lokicik/house-royale/backend/server/internal/hub"
	"github.com/lokicik/house-royale/backend/server/internal/leaderboard"
	"github.com/lokicik/house-royale/backend/server/internal/league"
	"github.com/lokicik/house-royale/backend/server/internal/middleware"
	"github.com/lokicik/house-royale/backend/server/internal/mlclient"
)

const (
	writeWait    = 10 * time.Second
	pongWait     = 60 * time.Second
	pingPeriod   = (pongWait * 9) / 10
	maxMsgSize   = 4096
	cleanupDelay = 30 * time.Second // grace period after game ends before store cleanup
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

type WSHandler struct {
	Hub          *hub.Hub
	Store        *LobbyStore
	Sessions     *SessionStore
	Predictor    mlclient.Predictor
	LB           leaderboard.Storer
	HistoryStore history.Storer
	Leagues      league.Storer
}

func NewWSHandler(h *hub.Hub, store *LobbyStore, sessions *SessionStore, predictor mlclient.Predictor, lb leaderboard.Storer, hs history.Storer, lg league.Storer) *WSHandler {
	return &WSHandler{Hub: h, Store: store, Sessions: sessions, Predictor: predictor, LB: lb, HistoryStore: hs, Leagues: lg}
}

func (h *WSHandler) ServeWS(c *gin.Context) {
	lobbyID := c.Param("id")
	lobby, ok := h.Store.Get(lobbyID)
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "lobby not found"})
		return
	}

	playerIDVal, _ := c.Get(middleware.PlayerIDKey)
	playerID, _ := playerIDVal.(string)
	if playerID == "" {
		playerID = "anonymous"
	}

	// Reject newcomers once the game is in progress — only existing players may
	// reconnect.
	if status := lobby.CurrentStatus(); status != game.StatusWaiting {
		if !lobby.HasPlayer(playerID) {
			c.JSON(http.StatusConflict, gin.H{"error": "game already in progress"})
			return
		}
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("ws upgrade error: %v", err)
		return
	}

	client := hub.NewClient(lobbyID, playerID, conn)
	h.Hub.Register <- client

	// Hydrate this socket with the current lobby snapshot so it can render the
	// waiting room without waiting for the next event.
	h.sendLobbyState(client, lobby)

	go h.writePump(client)
	go h.readPump(client)
}

func (h *WSHandler) readPump(c *hub.Client) {
	defer func() {
		// Collect nickname before marking player as disconnected.
		nickname := ""
		if lobby, ok := h.Store.Get(c.LobbyID); ok {
			if p, ok := lobby.GetPlayer(c.PlayerID); ok {
				nickname = p.Nickname
			}
			// If the game has not started yet, fully remove the player so the
			// waiting room reflects who's actually there. Once a game is in
			// progress (or finished), preserve their slot so they can rejoin
			// and keep their score.
			if lobby.CurrentStatus() == game.StatusWaiting {
				lobby.RemovePlayer(c.PlayerID)
			} else {
				lobby.MarkConnected(c.PlayerID, false)
			}
		}

		// Unregister from hub first: closes c.Send so writePump exits,
		// and ensures the departed player won't receive their own PLAYER_LEFT.
		h.Hub.Unregister <- c
		c.Conn.Close()

		// Notify the session so a vote-wait can re-evaluate (the disconnected
		// player no longer needs to vote).
		if session, ok := h.Sessions.Get(c.LobbyID); ok {
			session.NotifyPlayerDisconnected(c.PlayerID)
		}

		// Broadcast after unregister so only remaining clients receive it.
		h.broadcastPlayerLeft(c.LobbyID, c.PlayerID, nickname)
		h.broadcastActivity(c.LobbyID, "left", c.PlayerID, nickname)
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
			h.handleJoin(c, msg)
		case game.MsgReady:
			h.handleReady(c)
		case game.MsgSubmitGuess:
			h.handleSubmitGuess(c, msg)
		case game.MsgUpdateSettings:
			h.handleUpdateSettings(c, msg)
		case game.MsgNextRoundVote:
			h.handleNextRoundVote(c)
		case game.MsgLeave:
			return
		default:
			h.sendError(c, "unknown message type")
		}
	}
}

func (h *WSHandler) handleJoin(c *hub.Client, msg game.Message) {
	var p game.JoinPayload
	if err := json.Unmarshal(msg.Payload, &p); err != nil {
		h.sendError(c, "invalid JOIN payload")
		return
	}
	lobby, ok := h.Store.Get(c.LobbyID)
	if !ok {
		return
	}
	reconnect := lobby.AddOrReconnectPlayer(&game.Player{ID: c.PlayerID, Nickname: p.Nickname})
	h.broadcastPlayerJoined(c, p.Nickname)
	if reconnect {
		h.broadcastActivity(c.LobbyID, "rejoined", c.PlayerID, p.Nickname)
	} else {
		h.broadcastActivity(c.LobbyID, "joined", c.PlayerID, p.Nickname)
	}

	// Send each existing player to the newly joined client so their
	// waiting-room list is complete regardless of join order.
	for _, existing := range lobby.Snapshot() {
		if existing.ID == c.PlayerID {
			continue
		}
		payload, _ := json.Marshal(map[string]string{
			"player_id": existing.ID,
			"nickname":  existing.Nickname,
		})
		out, _ := json.Marshal(game.Message{Type: game.MsgPlayerJoined, Payload: payload})
		select {
		case c.Send <- out:
		default:
		}
	}
}

func (h *WSHandler) handleReady(c *hub.Client) {
	lobby, ok := h.Store.Get(c.LobbyID)
	if !ok {
		h.sendError(c, "lobby not found")
		return
	}
	if c.PlayerID != lobby.HostID {
		h.sendError(c, "only the host can start the game")
		return
	}
	if lobby.CurrentStatus() != game.StatusWaiting {
		h.sendError(c, "game already started")
		return
	}
	if lobby.PlayerCount() == 0 {
		h.sendError(c, "at least one player must join before starting")
		return
	}
	if h.Sessions.Has(c.LobbyID) {
		return
	}

	hostNickname := ""
	if p, ok := lobby.GetPlayer(c.PlayerID); ok {
		hostNickname = p.Nickname
	}
	h.broadcastActivity(c.LobbyID, "ready", c.PlayerID, hostNickname)

	session := game.NewSession(c.LobbyID, lobby, h.Hub, h.Predictor, game.DefaultConfig)
	session.HistoryStore = h.HistoryStore
	session.LeagueStore = h.Leagues
	h.Sessions.Set(c.LobbyID, session)
	log.Printf("session.start lobby=%s host=%s players=%d", c.LobbyID, c.PlayerID, lobby.PlayerCount())
	go func(lobbyID string) {
		session.Run()
		log.Printf("session.end lobby=%s rounds=%d", lobbyID, len(session.RoundSummaries))
		if h.LB != nil {
			lbRounds := make([][]leaderboard.RoundEntry, len(session.RoundSummaries))
			for i, round := range session.RoundSummaries {
				lbRound := make([]leaderboard.RoundEntry, len(round))
				for j, e := range round {
					lbRound[j] = leaderboard.RoundEntry{ID: e.ID, Name: e.Name, IsAI: e.IsAI, League: e.League, DeviationPct: e.DeviationPct, PointsEarned: e.PointsEarned}
				}
				lbRounds[i] = lbRound
			}
			log.Printf("leaderboard.record.invoke lobby=%s rounds=%d store=%T", lobbyID, len(lbRounds), h.LB)
			h.LB.Record(lbRounds)
		} else {
			log.Printf("leaderboard.record.skip lobby=%s reason=LB-nil", lobbyID)
		}
		time.Sleep(cleanupDelay)
		h.Sessions.Delete(lobbyID)
		h.Store.Delete(lobbyID)
	}(c.LobbyID)
}

func (h *WSHandler) handleSubmitGuess(c *hub.Client, msg game.Message) {
	var p game.GuessPayload
	if err := json.Unmarshal(msg.Payload, &p); err != nil {
		h.sendError(c, "invalid SUBMIT_GUESS payload")
		return
	}
	if session, ok := h.Sessions.Get(c.LobbyID); ok {
		session.SubmitGuess(c.PlayerID, p.PriceTRY)
	}
	if lobby, ok := h.Store.Get(c.LobbyID); ok {
		if pl, ok := lobby.GetPlayer(c.PlayerID); ok {
			h.broadcastActivity(c.LobbyID, "submitted", c.PlayerID, pl.Nickname)
		}
	}
}

func (h *WSHandler) handleUpdateSettings(c *hub.Client, msg game.Message) {
	var p game.UpdateSettingsPayload
	if err := json.Unmarshal(msg.Payload, &p); err != nil {
		h.sendError(c, "invalid UPDATE_SETTINGS payload")
		return
	}
	lobby, ok := h.Store.Get(c.LobbyID)
	if !ok {
		return
	}
	if c.PlayerID != lobby.HostID {
		h.sendError(c, "only the host can change settings")
		return
	}
	if err := lobby.ApplyUpdate(p.RoundCount, p.RoundDurationSec, p.AIModels); err != nil {
		h.sendError(c, err.Error())
		return
	}

	settings, ai := lobby.SettingsSnapshot()
	updated := game.SettingsUpdatedPayload{Settings: settings, AIModels: ai}
	h.sendBroadcast(c.LobbyID, game.MsgSettingsUpdated, updated)

	hostNickname := ""
	if pl, ok := lobby.GetPlayer(c.PlayerID); ok {
		hostNickname = pl.Nickname
	}
	kind := "settings_changed"
	if len(p.AIModels) > 0 && p.RoundCount == 0 && p.RoundDurationSec == 0 {
		kind = "ai_toggled"
	}
	h.broadcastActivity(c.LobbyID, kind, c.PlayerID, hostNickname)
}

func (h *WSHandler) handleNextRoundVote(c *hub.Client) {
	session, ok := h.Sessions.Get(c.LobbyID)
	if !ok {
		return
	}
	session.VoteNextRound(c.PlayerID)

	if lobby, ok := h.Store.Get(c.LobbyID); ok {
		if pl, ok := lobby.GetPlayer(c.PlayerID); ok {
			h.broadcastActivity(c.LobbyID, "voted_next", c.PlayerID, pl.Nickname)
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

func (h *WSHandler) sendLobbyState(c *hub.Client, lobby *game.Lobby) {
	settings, ai := lobby.SettingsSnapshot()
	playersMap := lobby.Snapshot()
	players := make([]game.Player, 0, len(playersMap))
	for _, p := range playersMap {
		players = append(players, *p)
	}
	payload := game.LobbyStatePayload{
		LobbyID:           lobby.ID,
		HostID:            lobby.HostID,
		League:            lobby.League,
		Status:            lobby.CurrentStatus(),
		Players:           players,
		Settings:          settings,
		AIModels:          ai,
		AvailableAIModels: game.ModelsForLeague(lobby.League),
		YouID:             c.PlayerID,
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return
	}
	out, _ := json.Marshal(game.Message{Type: game.MsgLobbyState, Payload: json.RawMessage(data)})
	select {
	case c.Send <- out:
	default:
	}
}

func (h *WSHandler) sendBroadcast(lobbyID string, t game.MessageType, payload any) {
	data, err := json.Marshal(payload)
	if err != nil {
		return
	}
	out, _ := json.Marshal(game.Message{Type: t, Payload: json.RawMessage(data)})
	h.Hub.SendToLobby(lobbyID, out)
}

func (h *WSHandler) broadcastPlayerJoined(c *hub.Client, nickname string) {
	payload, _ := json.Marshal(map[string]string{"player_id": c.PlayerID, "nickname": nickname})
	out, _ := json.Marshal(game.Message{Type: game.MsgPlayerJoined, Payload: payload})
	h.Hub.SendToLobby(c.LobbyID, out)
}

func (h *WSHandler) broadcastPlayerLeft(lobbyID, playerID, nickname string) {
	payload, _ := json.Marshal(map[string]string{"player_id": playerID, "nickname": nickname})
	out, _ := json.Marshal(game.Message{Type: game.MsgPlayerLeft, Payload: payload})
	h.Hub.SendToLobby(lobbyID, out)
}

func (h *WSHandler) broadcastActivity(lobbyID, kind, actorID, actorNickname string) {
	payload := game.LobbyActivityPayload{
		Kind:          kind,
		ActorID:       actorID,
		ActorNickname: actorNickname,
		UnixMillis:    time.Now().UnixMilli(),
	}
	h.sendBroadcast(lobbyID, game.MsgLobbyActivity, payload)
}
