package game

import (
	"sync"
	"time"
)

type Status string

const (
	StatusWaiting  Status = "waiting"
	StatusPlaying  Status = "playing"
	StatusFinished Status = "finished"
)

type Player struct {
	ID       string `json:"id"`
	Nickname string `json:"nickname"`
	Score    int    `json:"score"`
}

type Lobby struct {
	ID        string             `json:"id"`
	HostID    string             `json:"host_id"`
	Players   map[string]*Player `json:"players"`
	Status    Status             `json:"status"`
	CreatedAt time.Time          `json:"created_at"`
	mu        sync.RWMutex
}

func NewLobby(id, hostID string) *Lobby {
	return &Lobby{
		ID:        id,
		HostID:    hostID,
		Players:   make(map[string]*Player),
		Status:    StatusWaiting,
		CreatedAt: time.Now(),
	}
}

func (l *Lobby) AddPlayer(p *Player) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.Players[p.ID] = p
}

func (l *Lobby) RemovePlayer(playerID string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.Players, playerID)
}

func (l *Lobby) PlayerCount() int {
	l.mu.RLock()
	defer l.mu.RUnlock()
	return len(l.Players)
}

func (l *Lobby) Snapshot() map[string]*Player {
	l.mu.RLock()
	defer l.mu.RUnlock()
	out := make(map[string]*Player, len(l.Players))
	for k, v := range l.Players {
		out[k] = v
	}
	return out
}
