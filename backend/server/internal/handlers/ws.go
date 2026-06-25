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

var (
	writeWait          = 10 * time.Second
	pongWait           = 60 * time.Second
	pingPeriod         = (pongWait * 9) / 10
	maxMsgSize   int64 = 4096
	cleanupDelay       = 30 * time.Second // grace period after game ends before store cleanup
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
	Lifecycle    *LobbyLifecycle
}

func NewWSHandler(h *hub.Hub, store *LobbyStore, sessions *SessionStore, predictor mlclient.Predictor, lb leaderboard.Storer, hs history.Storer, lg league.Storer, lifecycle *LobbyLifecycle) *WSHandler {
	return &WSHandler{
		Hub:          h,
		Store:        store,
		Sessions:     sessions,
		Predictor:    predictor,
		LB:           lb,
		HistoryStore: hs,
		Leagues:      lg,
		Lifecycle:    lifecycle,
	}
}

func (h *WSHandler) ServeWS(c *gin.Context) {
	lobbyID := c.Param("id")
	lobby, ok := h.Store.Get(lobbyID)
	if !ok {
		writeAccessError(c, http.StatusNotFound, errCodeLobbyNotFound, "lobby not found")
		return
	}

	playerIDVal, _ := c.Get(middleware.PlayerIDKey)
	playerID, _ := playerIDVal.(string)
	if playerID == "" {
		playerID = "anonymous"
	}

	if lobby.IsBlocked(playerID) {
		writeAccessError(c, http.StatusForbidden, errCodeRemovedFromLobby, "you were removed from this lobby")
		return
	}
	if status := lobby.CurrentStatus(); status != game.StatusWaiting {
		if !lobby.HasPlayer(playerID) && playerID != lobby.HostID {
			writeAccessError(c, http.StatusConflict, errCodeGameInProgress, "game already in progress")
			return
		}
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("ws upgrade error: %v", err)
		return
	}

	client := hub.NewClient(lobbyID, playerID, conn)
	h.Hub.Register(client)

	go h.writePump(client)
	go h.readPump(client)
}

func (h *WSHandler) readPump(c *hub.Client) {
	defer h.handleDisconnect(c)

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
			return
		}

		var msg game.Message
		if err := json.Unmarshal(raw, &msg); err != nil {
			h.sendError(c, "invalid_message_format", "invalid message format")
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
		case game.MsgKickPlayer:
			h.handleKickPlayer(c, msg)
		case game.MsgCloseRoom:
			h.handleCloseRoom(c)
		case game.MsgLeave:
			c.SetCloseReason("left")
			return
		default:
			h.sendError(c, "unknown_message_type", "unknown message type")
		}
	}
}

func (h *WSHandler) handleDisconnect(c *hub.Client) {
	reason := c.CloseReason()
	if reason == "" {
		reason = "disconnect"
	}
	h.Hub.Unregister(c)
	c.CloseConn()

	if skipDisconnectCleanup(reason) {
		if h.Lifecycle != nil {
			h.Lifecycle.Refresh(c.LobbyID)
		}
		return
	}

	nickname := ""
	remove := false
	if lobby, ok := h.Store.Get(c.LobbyID); ok {
		if p, ok := lobby.GetPlayer(c.PlayerID); ok {
			nickname = p.Nickname
		}
		if lobby.CurrentStatus() == game.StatusWaiting {
			lobby.RemovePlayer(c.PlayerID)
			remove = true
		} else {
			lobby.MarkConnected(c.PlayerID, false)
		}
	}

	if session, ok := h.Sessions.Get(c.LobbyID); ok {
		session.NotifyPlayerDisconnected(c.PlayerID)
	}

	h.broadcastPlayerLeft(c.LobbyID, c.PlayerID, nickname, remove, reason)
	h.broadcastActivity(c.LobbyID, "left", c.PlayerID, nickname)

	if h.Lifecycle != nil {
		h.Lifecycle.Refresh(c.LobbyID)
	}
}

func (h *WSHandler) handleJoin(c *hub.Client, msg game.Message) {
	var p game.JoinPayload
	if err := json.Unmarshal(msg.Payload, &p); err != nil {
		h.sendError(c, "invalid_join_payload", "invalid JOIN payload")
		return
	}
	lobby, ok := h.Store.Get(c.LobbyID)
	if !ok {
		h.sendError(c, errCodeLobbyNotFound, "lobby not found")
		return
	}
	if lobby.IsBlocked(c.PlayerID) {
		h.sendError(c, errCodeRemovedFromLobby, "you were removed from this lobby")
		c.SetCloseReason("kicked")
		return
	}

	reconnect := lobby.AddOrReconnectPlayer(&game.Player{ID: c.PlayerID, Nickname: p.Nickname})
	h.sendLobbyState(c, lobby)
	h.broadcastPlayerJoined(c, p.Nickname)
	if reconnect {
		h.broadcastActivity(c.LobbyID, "rejoined", c.PlayerID, p.Nickname)
	} else {
		h.broadcastActivity(c.LobbyID, "joined", c.PlayerID, p.Nickname)
	}

	if h.Lifecycle != nil {
		h.Lifecycle.Refresh(c.LobbyID)
	}

	if session, ok := h.Sessions.Get(c.LobbyID); ok {
		session.ReplayTo(func(t game.MessageType, payload any) {
			h.sendToClient(c, t, payload)
		})
	}
}

func (h *WSHandler) handleReady(c *hub.Client) {
	lobby, ok := h.Store.Get(c.LobbyID)
	if !ok {
		h.sendError(c, errCodeLobbyNotFound, "lobby not found")
		return
	}
	if c.PlayerID != lobby.HostID {
		h.sendError(c, "only_host_can_start_game", "only the host can start the game")
		return
	}
	if lobby.CurrentStatus() != game.StatusWaiting {
		h.sendError(c, errCodeGameInProgress, "game already started")
		return
	}
	if lobby.PlayerCount() == 0 {
		h.sendError(c, "at_least_one_player_required", "at least one player must join before starting")
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

	lobby.SetStatus(game.StatusPlaying)
	session := game.NewSession(c.LobbyID, lobby, h.Hub, h.Predictor, game.DefaultConfig)
	session.HistoryStore = h.HistoryStore
	session.LeagueStore = h.Leagues
	h.Sessions.Set(c.LobbyID, session)
	if h.Lifecycle != nil {
		h.Lifecycle.Refresh(c.LobbyID)
	}

	log.Printf("session.start lobby=%s host=%s players=%d", c.LobbyID, c.PlayerID, lobby.PlayerCount())
	go func(lobbyID string) {
		session.Run()
		if session.Aborted() {
			log.Printf("session.abort lobby=%s rounds=%d", lobbyID, len(session.RoundSummaries))
			return
		}

		if h.Lifecycle != nil {
			h.Lifecycle.Refresh(lobbyID)
		}

		log.Printf("session.end lobby=%s rounds=%d", lobbyID, len(session.RoundSummaries))
		if h.LB != nil {
			lbRounds := make([][]leaderboard.RoundEntry, len(session.RoundSummaries))
			for i, round := range session.RoundSummaries {
				lbRound := make([]leaderboard.RoundEntry, len(round))
				for j, e := range round {
					lbRound[j] = leaderboard.RoundEntry{
						ID:           e.ID,
						Name:         e.Name,
						IsAI:         e.IsAI,
						League:       e.League,
						DeviationPct: e.DeviationPct,
						PointsEarned: e.PointsEarned,
					}
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
		if h.Lifecycle != nil {
			h.Lifecycle.Refresh(lobbyID)
		}
	}(c.LobbyID)
}

func (h *WSHandler) handleSubmitGuess(c *hub.Client, msg game.Message) {
	var p game.GuessPayload
	if err := json.Unmarshal(msg.Payload, &p); err != nil {
		h.sendError(c, "invalid_submit_guess_payload", "invalid SUBMIT_GUESS payload")
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
		h.sendError(c, "invalid_update_settings_payload", "invalid UPDATE_SETTINGS payload")
		return
	}
	lobby, ok := h.Store.Get(c.LobbyID)
	if !ok {
		return
	}
	if c.PlayerID != lobby.HostID {
		h.sendError(c, "only_host_can_change_settings", "only the host can change settings")
		return
	}
	if err := lobby.ApplyUpdate(p.RoundCount, p.RoundDurationSec, p.AIModels); err != nil {
		h.sendError(c, "invalid_update_settings_payload", err.Error())
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

func (h *WSHandler) handleKickPlayer(c *hub.Client, msg game.Message) {
	var p game.KickPlayerPayload
	if err := json.Unmarshal(msg.Payload, &p); err != nil {
		h.sendError(c, "invalid_kick_player_payload", "invalid KICK_PLAYER payload")
		return
	}

	lobby, ok := h.Store.Get(c.LobbyID)
	if !ok {
		h.sendError(c, errCodeLobbyNotFound, "lobby not found")
		return
	}
	if c.PlayerID != lobby.HostID {
		h.sendError(c, "only_host_can_kick_players", "only the host can kick players")
		return
	}
	if lobby.CurrentStatus() != game.StatusWaiting {
		h.sendError(c, "kick_only_before_start", "players can only be kicked before the game starts")
		return
	}
	if p.PlayerID == "" || p.PlayerID == c.PlayerID {
		h.sendError(c, "host_cannot_kick_player", "the host cannot kick this player")
		return
	}

	target, ok := lobby.GetPlayer(p.PlayerID)
	if !ok {
		h.sendError(c, "player_not_found", "player not found")
		return
	}

	hostNickname := ""
	if host, ok := lobby.GetPlayer(c.PlayerID); ok {
		hostNickname = host.Nickname
	}

	lobby.BlockPlayer(p.PlayerID)
	if h.Lifecycle != nil {
		h.Lifecycle.Refresh(c.LobbyID)
	}

	h.sendToPlayer(c.LobbyID, p.PlayerID, game.MsgPlayerKicked, game.PlayerKickedPayload{
		PlayerID: p.PlayerID,
		Reason:   "kicked",
		Message:  "You were removed from the room by the host.",
	})
	h.broadcastPlayerLeft(c.LobbyID, p.PlayerID, target.Nickname, true, "kicked")
	h.broadcastActivity(c.LobbyID, "kicked", c.PlayerID, hostNickname)

	time.AfterFunc(roomCloseNotifyDelay, func() {
		h.Hub.ClosePlayer(c.LobbyID, p.PlayerID, "kicked")
	})
}

func (h *WSHandler) handleCloseRoom(c *hub.Client) {
	lobby, ok := h.Store.Get(c.LobbyID)
	if !ok {
		h.sendError(c, errCodeLobbyNotFound, "lobby not found")
		return
	}
	if c.PlayerID != lobby.HostID {
		h.sendError(c, "only_host_can_close_room", "only the host can close the room")
		return
	}
	status := lobby.CurrentStatus()
	if status != game.StatusWaiting && status != game.StatusFinished {
		h.sendError(c, "room_close_invalid_state", "the room can only be closed while waiting or after the game ends")
		return
	}

	if h.Lifecycle != nil {
		h.Lifecycle.CloseRoom(c.LobbyID, "host_closed")
	}
}

func (h *WSHandler) writePump(c *hub.Client) {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.CloseConn()
	}()

	for {
		select {
		case data, ok := <-c.Send:
			if c.Conn == nil {
				return
			}
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				_ = c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.Conn.WriteMessage(websocket.TextMessage, data); err != nil {
				return
			}

		case <-ticker.C:
			if c.Conn == nil {
				return
			}
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (h *WSHandler) sendError(c *hub.Client, code, msg string) {
	h.sendToClient(c, game.MsgError, game.ErrorPayload{Code: code, Message: msg})
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
	h.sendToClient(c, game.MsgLobbyState, payload)
}

func (h *WSHandler) sendBroadcast(lobbyID string, t game.MessageType, payload any) {
	data, err := encodeWSMessage(t, payload)
	if err != nil {
		return
	}
	h.Hub.SendToLobby(lobbyID, data)
}

func (h *WSHandler) sendToPlayer(lobbyID, playerID string, t game.MessageType, payload any) {
	data, err := encodeWSMessage(t, payload)
	if err != nil {
		return
	}
	h.Hub.SendToPlayer(lobbyID, playerID, data)
}

func (h *WSHandler) sendToClient(c *hub.Client, t game.MessageType, payload any) {
	data, err := encodeWSMessage(t, payload)
	if err != nil {
		return
	}
	select {
	case c.Send <- data:
	default:
	}
}

func (h *WSHandler) broadcastPlayerJoined(c *hub.Client, nickname string) {
	h.sendBroadcast(c.LobbyID, game.MsgPlayerJoined, map[string]string{
		"player_id": c.PlayerID,
		"nickname":  nickname,
	})
}

func (h *WSHandler) broadcastPlayerLeft(lobbyID, playerID, nickname string, remove bool, reason string) {
	h.sendBroadcast(lobbyID, game.MsgPlayerLeft, game.PlayerLeftPayload{
		PlayerID: playerID,
		Nickname: nickname,
		Remove:   remove,
		Reason:   reason,
	})
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

func encodeWSMessage(t game.MessageType, payload any) ([]byte, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return json.Marshal(game.Message{Type: t, Payload: json.RawMessage(data)})
}

func skipDisconnectCleanup(reason string) bool {
	switch reason {
	case "replaced", "kicked", "host_closed", "host_absent", "stale_empty":
		return true
	default:
		return false
	}
}
