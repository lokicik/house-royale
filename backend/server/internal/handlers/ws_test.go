package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lokicik/house-royale/backend/server/internal/game"
	"github.com/lokicik/house-royale/backend/server/internal/hub"
	"github.com/lokicik/house-royale/backend/server/internal/league"
	"github.com/lokicik/house-royale/backend/server/internal/middleware"
)

func TestHandleDisconnectRemovesWaitingPlayerAndBroadcastsRemove(t *testing.T) {
	gin.SetMode(gin.TestMode)

	hubRef := hub.New()
	store := NewLobbyStore()
	lobby := store.Create("host-1", league.Bronze)
	lobby.AddOrReconnectPlayer(&game.Player{ID: "host-1", Nickname: "Host"})
	lobby.AddOrReconnectPlayer(&game.Player{ID: "guest-1", Nickname: "Guest"})

	handler := &WSHandler{
		Hub:      hubRef,
		Store:    store,
		Sessions: NewSessionStore(),
	}

	observer := hub.NewClient(lobby.ID, "host-1", nil)
	leaver := hub.NewClient(lobby.ID, "guest-1", nil)
	hubRef.Register(observer)
	hubRef.Register(leaver)

	handler.handleDisconnect(leaver)

	if lobby.HasPlayer("guest-1") {
		t.Fatalf("expected waiting player to be removed from lobby")
	}

	select {
	case raw := <-observer.Send:
		var msg game.Message
		if err := json.Unmarshal(raw, &msg); err != nil {
			t.Fatalf("unmarshal message: %v", err)
		}
		if msg.Type != game.MsgPlayerLeft {
			t.Fatalf("expected PLAYER_LEFT broadcast, got %s", msg.Type)
		}
		var payload game.PlayerLeftPayload
		if err := json.Unmarshal(msg.Payload, &payload); err != nil {
			t.Fatalf("unmarshal payload: %v", err)
		}
		if !payload.Remove {
			t.Fatalf("expected remove=true for waiting disconnect")
		}
		if payload.Reason != "disconnect" {
			t.Fatalf("expected disconnect reason, got %q", payload.Reason)
		}
	default:
		t.Fatalf("expected observer to receive a PLAYER_LEFT message")
	}
}

func TestHandleKickAndCloseRejectNonHost(t *testing.T) {
	store := NewLobbyStore()
	lobby := store.Create("host-1", league.Bronze)
	lobby.AddOrReconnectPlayer(&game.Player{ID: "host-1", Nickname: "Host"})
	lobby.AddOrReconnectPlayer(&game.Player{ID: "guest-1", Nickname: "Guest"})

	handler := &WSHandler{
		Hub:      hub.New(),
		Store:    store,
		Sessions: NewSessionStore(),
	}

	guest := hub.NewClient(lobby.ID, "guest-1", nil)

	kickPayload, _ := json.Marshal(game.KickPlayerPayload{PlayerID: "host-1"})
	handler.handleKickPlayer(guest, game.Message{Type: game.MsgKickPlayer, Payload: kickPayload})
	assertClientReceivesError(t, guest, "only the host can kick players")

	handler.handleCloseRoom(guest)
	assertClientReceivesError(t, guest, "only the host can close the room")
}

func TestServeWSRejectsBlockedAndOutsiderDuringGame(t *testing.T) {
	gin.SetMode(gin.TestMode)

	store := NewLobbyStore()
	sessions := NewSessionStore()
	hubRef := hub.New()
	lifecycle := NewLobbyLifecycle(store, sessions, hubRef)
	handler := &WSHandler{
		Hub:       hubRef,
		Store:     store,
		Sessions:  sessions,
		Lifecycle: lifecycle,
	}

	blockedLobby := store.Create("host-blocked", league.Bronze)
	blockedLobby.BlockPlayer("blocked-user")

	blockedCtx, blockedRec := newWSRequestContext(blockedLobby.ID, "blocked-user")
	handler.ServeWS(blockedCtx)
	assertAccessErrorResponse(t, blockedRec, http.StatusForbidden, errCodeRemovedFromLobby)

	playingLobby := store.Create("host-playing", league.Bronze)
	playingLobby.AddOrReconnectPlayer(&game.Player{ID: "host-playing", Nickname: "Host"})
	playingLobby.SetStatus(game.StatusPlaying)

	outsiderCtx, outsiderRec := newWSRequestContext(playingLobby.ID, "outsider")
	handler.ServeWS(outsiderCtx)
	assertAccessErrorResponse(t, outsiderRec, http.StatusConflict, errCodeGameInProgress)

	missingCtx, missingRec := newWSRequestContext("MISSING", "outsider")
	handler.ServeWS(missingCtx)
	assertAccessErrorResponse(t, missingRec, http.StatusNotFound, errCodeLobbyNotFound)
}

func TestLifecycleClosesWaitingLobbyWhenHostAbsent(t *testing.T) {
	store := NewLobbyStore()
	sessions := NewSessionStore()
	hubRef := hub.New()
	lifecycle := NewLobbyLifecycle(store, sessions, hubRef)

	oldHostGrace := waitingHostAbsentGrace
	oldNotifyDelay := roomCloseNotifyDelay
	waitingHostAbsentGrace = 20 * time.Millisecond
	roomCloseNotifyDelay = 10 * time.Millisecond
	defer func() {
		waitingHostAbsentGrace = oldHostGrace
		roomCloseNotifyDelay = oldNotifyDelay
	}()

	lobby := store.Create("host-1", league.Bronze)
	lobby.AddPlayer(&game.Player{ID: "host-1", Nickname: "Host", Connected: false})
	lobby.AddOrReconnectPlayer(&game.Player{ID: "guest-1", Nickname: "Guest"})
	guestClient := hub.NewClient(lobby.ID, "guest-1", nil)
	hubRef.Register(guestClient)

	lifecycle.Refresh(lobby.ID)

	select {
	case raw := <-guestClient.Send:
		var msg game.Message
		if err := json.Unmarshal(raw, &msg); err != nil {
			t.Fatalf("unmarshal room closed message: %v", err)
		}
		if msg.Type != game.MsgRoomClosed {
			t.Fatalf("expected ROOM_CLOSED, got %s", msg.Type)
		}
		var payload game.RoomClosedPayload
		if err := json.Unmarshal(msg.Payload, &payload); err != nil {
			t.Fatalf("unmarshal room closed payload: %v", err)
		}
		if payload.Reason != "host_absent" {
			t.Fatalf("expected host_absent reason, got %q", payload.Reason)
		}
	case <-time.After(250 * time.Millisecond):
		t.Fatalf("timed out waiting for ROOM_CLOSED")
	}

	time.Sleep(40 * time.Millisecond)
	if _, ok := store.Get(lobby.ID); ok {
		t.Fatalf("expected waiting lobby to be deleted after host absence")
	}
}

func TestLifecycleAbortsEmptyPlayingSession(t *testing.T) {
	store := NewLobbyStore()
	sessions := NewSessionStore()
	hubRef := hub.New()
	lifecycle := NewLobbyLifecycle(store, sessions, hubRef)

	oldReconnectGrace := playingReconnectGrace
	playingReconnectGrace = 20 * time.Millisecond
	defer func() {
		playingReconnectGrace = oldReconnectGrace
	}()

	lobby := store.Create("host-1", league.Bronze)
	lobby.AddPlayer(&game.Player{ID: "host-1", Nickname: "Host", Connected: false})
	lobby.SetStatus(game.StatusPlaying)

	session := game.NewSession(lobby.ID, lobby, hubRef, nil, game.DefaultConfig)
	sessions.Set(lobby.ID, session)

	lifecycle.Refresh(lobby.ID)

	time.Sleep(80 * time.Millisecond)

	if !session.Aborted() {
		t.Fatalf("expected session to be aborted when no connected players remain")
	}
	if _, ok := store.Get(lobby.ID); ok {
		t.Fatalf("expected playing lobby to be deleted after reconnect grace elapsed")
	}
	if sessions.Has(lobby.ID) {
		t.Fatalf("expected session store entry to be deleted after abort")
	}
}

func newWSRequestContext(lobbyID, playerID string) (*gin.Context, *httptest.ResponseRecorder) {
	rec := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(rec)
	ctx.Request = httptest.NewRequest("GET", "/ws/lobby/"+lobbyID, nil)
	ctx.Params = gin.Params{{Key: "id", Value: lobbyID}}
	ctx.Set(middleware.PlayerIDKey, playerID)
	return ctx, rec
}

func assertClientReceivesError(t *testing.T, client *hub.Client, want string) {
	t.Helper()

	select {
	case raw := <-client.Send:
		var msg game.Message
		if err := json.Unmarshal(raw, &msg); err != nil {
			t.Fatalf("unmarshal error message: %v", err)
		}
		if msg.Type != game.MsgError {
			t.Fatalf("expected ERROR message, got %s", msg.Type)
		}
		var payload game.ErrorPayload
		if err := json.Unmarshal(msg.Payload, &payload); err != nil {
			t.Fatalf("unmarshal error payload: %v", err)
		}
		if payload.Message != want {
			t.Fatalf("expected error %q, got %q", want, payload.Message)
		}
	default:
		t.Fatalf("expected client to receive an error message")
	}
}

func assertAccessErrorResponse(t *testing.T, rec *httptest.ResponseRecorder, wantStatus int, wantCode string) {
	t.Helper()

	if rec.Code != wantStatus {
		t.Fatalf("expected status %d, got %d", wantStatus, rec.Code)
	}

	var payload errorResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal access error response: %v", err)
	}
	if payload.ErrorCode != wantCode {
		t.Fatalf("expected error_code %q, got %q", wantCode, payload.ErrorCode)
	}
	if payload.Error == "" {
		t.Fatalf("expected error message to be populated")
	}
}
