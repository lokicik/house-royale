package handlers

import (
	"sync"
	"time"

	"github.com/lokicik/house-royale/backend/server/internal/game"
	"github.com/lokicik/house-royale/backend/server/internal/hub"
)

var (
	waitingHostAbsentGrace = 5 * time.Minute
	waitingEmptyGrace      = 5 * time.Minute
	playingReconnectGrace  = 10 * time.Minute
	roomCloseNotifyDelay   = 150 * time.Millisecond
)

type lobbyTimerState struct {
	hostAbsent   *time.Timer
	waitingEmpty *time.Timer
	playingEmpty *time.Timer
}

type LobbyLifecycle struct {
	Store    *LobbyStore
	Sessions *SessionStore
	Hub      *hub.Hub

	mu     sync.Mutex
	timers map[string]*lobbyTimerState
}

func NewLobbyLifecycle(store *LobbyStore, sessions *SessionStore, hubRef *hub.Hub) *LobbyLifecycle {
	return &LobbyLifecycle{
		Store:    store,
		Sessions: sessions,
		Hub:      hubRef,
		timers:   make(map[string]*lobbyTimerState),
	}
}

func (lc *LobbyLifecycle) Track(lobbyID string) {
	lc.Refresh(lobbyID)
}

func (lc *LobbyLifecycle) Refresh(lobbyID string) {
	lobby, ok := lc.Store.Get(lobbyID)
	if !ok {
		lc.clear(lobbyID)
		return
	}

	status := lobby.CurrentStatus()
	hostConnected := false
	if host, ok := lobby.GetPlayer(lobby.HostID); ok {
		hostConnected = host.Connected
	}
	connectedCount := lobby.ConnectedPlayerCount()

	lc.mu.Lock()
	state := lc.ensureState(lobbyID)

	switch status {
	case game.StatusWaiting:
		if hostConnected {
			stopTimer(state.hostAbsent)
			state.hostAbsent = nil
		} else if state.hostAbsent == nil {
			state.hostAbsent = time.AfterFunc(waitingHostAbsentGrace, func() {
				lc.expireWaitingHostAbsent(lobbyID)
			})
		}

		if connectedCount == 0 {
			if state.waitingEmpty == nil {
				state.waitingEmpty = time.AfterFunc(waitingEmptyGrace, func() {
					lc.expireWaitingEmpty(lobbyID)
				})
			}
		} else {
			stopTimer(state.waitingEmpty)
			state.waitingEmpty = nil
		}

		stopTimer(state.playingEmpty)
		state.playingEmpty = nil

	case game.StatusPlaying:
		stopTimer(state.hostAbsent)
		state.hostAbsent = nil
		stopTimer(state.waitingEmpty)
		state.waitingEmpty = nil

		if connectedCount == 0 {
			if state.playingEmpty == nil {
				state.playingEmpty = time.AfterFunc(playingReconnectGrace, func() {
					lc.expirePlayingEmpty(lobbyID)
				})
			}
		} else {
			stopTimer(state.playingEmpty)
			state.playingEmpty = nil
		}

	case game.StatusFinished:
		stopTimer(state.hostAbsent)
		state.hostAbsent = nil
		stopTimer(state.waitingEmpty)
		state.waitingEmpty = nil
		stopTimer(state.playingEmpty)
		state.playingEmpty = nil
	}

	lc.mu.Unlock()
}

func (lc *LobbyLifecycle) CloseRoom(lobbyID, reason string) {
	lc.clear(lobbyID)

	if session, ok := lc.Sessions.Get(lobbyID); ok {
		session.Abort()
		lc.Sessions.Delete(lobbyID)
	}

	hasClients := lc.Hub.HasLobbyClients(lobbyID)
	lc.Store.Delete(lobbyID)

	if hasClients {
		payload := game.RoomClosedPayload{Reason: reason}
		data, _ := encodeWSMessage(game.MsgRoomClosed, payload)
		lc.Hub.SendToLobby(lobbyID, data)
		time.AfterFunc(roomCloseNotifyDelay, func() {
			lc.Hub.CloseLobby(lobbyID, reason)
		})
		return
	}

	lc.Hub.CloseLobby(lobbyID, reason)
}

func (lc *LobbyLifecycle) AbortPlayingLobby(lobbyID string) {
	lc.clear(lobbyID)
	if session, ok := lc.Sessions.Get(lobbyID); ok {
		session.Abort()
		lc.Sessions.Delete(lobbyID)
	}
	lc.Store.Delete(lobbyID)
	lc.Hub.CloseLobby(lobbyID, "stale_empty")
}

func (lc *LobbyLifecycle) expireWaitingHostAbsent(lobbyID string) {
	lobby, ok := lc.Store.Get(lobbyID)
	if !ok {
		lc.clear(lobbyID)
		return
	}
	if lobby.CurrentStatus() != game.StatusWaiting {
		lc.Refresh(lobbyID)
		return
	}
	host, ok := lobby.GetPlayer(lobby.HostID)
	if ok && host.Connected {
		lc.Refresh(lobbyID)
		return
	}
	lc.CloseRoom(lobbyID, "host_absent")
}

func (lc *LobbyLifecycle) expireWaitingEmpty(lobbyID string) {
	lobby, ok := lc.Store.Get(lobbyID)
	if !ok {
		lc.clear(lobbyID)
		return
	}
	if lobby.CurrentStatus() != game.StatusWaiting || lobby.ConnectedPlayerCount() > 0 {
		lc.Refresh(lobbyID)
		return
	}
	lc.CloseRoom(lobbyID, "stale_empty")
}

func (lc *LobbyLifecycle) expirePlayingEmpty(lobbyID string) {
	lobby, ok := lc.Store.Get(lobbyID)
	if !ok {
		lc.clear(lobbyID)
		return
	}
	if lobby.CurrentStatus() != game.StatusPlaying || lobby.ConnectedPlayerCount() > 0 {
		lc.Refresh(lobbyID)
		return
	}
	lc.AbortPlayingLobby(lobbyID)
}

func (lc *LobbyLifecycle) ensureState(lobbyID string) *lobbyTimerState {
	if lc.timers[lobbyID] == nil {
		lc.timers[lobbyID] = &lobbyTimerState{}
	}
	return lc.timers[lobbyID]
}

func (lc *LobbyLifecycle) clear(lobbyID string) {
	lc.mu.Lock()
	defer lc.mu.Unlock()

	state := lc.timers[lobbyID]
	if state == nil {
		return
	}
	stopTimer(state.hostAbsent)
	stopTimer(state.waitingEmpty)
	stopTimer(state.playingEmpty)
	delete(lc.timers, lobbyID)
}

func stopTimer(timer *time.Timer) {
	if timer != nil {
		timer.Stop()
	}
}
