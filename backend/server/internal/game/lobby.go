package game

import (
	"errors"
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
	ID        string `json:"id"`
	Nickname  string `json:"nickname"`
	Score     int    `json:"score"`
	Connected bool   `json:"connected"`
}

type LobbySettings struct {
	RoundCount       int `json:"round_count"`
	RoundDurationSec int `json:"round_duration_sec"`
}

type AIModelMeta struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Type string `json:"type"`
}

// AvailableAIModels is the canonical registry of model IDs the lobby can enable.
var AvailableAIModels = []AIModelMeta{
	{ID: "custom_ann", Name: "Custom ANN", Type: "Neural Network"},
	{ID: "hybrid", Name: "Hybrid Model", Type: "Ensemble"},
	{ID: "mlp", Name: "MLP Model", Type: "Neural Network"},
	{ID: "transformer", Name: "Transformer Model", Type: "LLM"},
	{ID: "tree", Name: "Tree Ensemble", Type: "XGBoost"},
}

func defaultAIModels() map[string]bool {
	m := make(map[string]bool, len(AvailableAIModels))
	for _, meta := range AvailableAIModels {
		m[meta.ID] = true
	}
	return m
}

func defaultSettings() LobbySettings {
	return LobbySettings{RoundCount: 3, RoundDurationSec: 15}
}

type Lobby struct {
	ID             string             `json:"id"`
	HostID         string             `json:"host_id"`
	Players        map[string]*Player `json:"players"`
	Status         Status             `json:"status"`
	CreatedAt      time.Time          `json:"created_at"`
	Settings       LobbySettings      `json:"settings"`
	AIModels       map[string]bool    `json:"ai_models"`
	NextRoundVotes map[string]bool    `json:"-"`
	mu             sync.RWMutex
}

func NewLobby(id, hostID string) *Lobby {
	return &Lobby{
		ID:             id,
		HostID:         hostID,
		Players:        make(map[string]*Player),
		Status:         StatusWaiting,
		CreatedAt:      time.Now(),
		Settings:       defaultSettings(),
		AIModels:       defaultAIModels(),
		NextRoundVotes: make(map[string]bool),
	}
}

func (l *Lobby) AddPlayer(p *Player) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.Players[p.ID] = p
}

// AddOrReconnectPlayer adds a new player or marks an existing player as
// reconnected (preserving score). Returns true if it was a reconnect.
func (l *Lobby) AddOrReconnectPlayer(p *Player) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	if existing, ok := l.Players[p.ID]; ok {
		existing.Connected = true
		if p.Nickname != "" {
			existing.Nickname = p.Nickname
		}
		return true
	}
	p.Connected = true
	l.Players[p.ID] = p
	return false
}

func (l *Lobby) RemovePlayer(playerID string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.Players, playerID)
}

func (l *Lobby) MarkConnected(playerID string, connected bool) {
	l.mu.Lock()
	defer l.mu.Unlock()
	if p, ok := l.Players[playerID]; ok {
		p.Connected = connected
	}
}

func (l *Lobby) PlayerCount() int {
	l.mu.RLock()
	defer l.mu.RUnlock()
	return len(l.Players)
}

func (l *Lobby) GetPlayer(playerID string) (*Player, bool) {
	l.mu.RLock()
	defer l.mu.RUnlock()
	p, ok := l.Players[playerID]
	return p, ok
}

func (l *Lobby) HasPlayer(playerID string) bool {
	l.mu.RLock()
	defer l.mu.RUnlock()
	_, ok := l.Players[playerID]
	return ok
}

func (l *Lobby) Snapshot() map[string]*Player {
	l.mu.RLock()
	defer l.mu.RUnlock()
	out := make(map[string]*Player, len(l.Players))
	for k, v := range l.Players {
		copy := *v
		out[k] = &copy
	}
	return out
}

// ConnectedPlayerIDs returns IDs of currently connected players.
func (l *Lobby) ConnectedPlayerIDs() []string {
	l.mu.RLock()
	defer l.mu.RUnlock()
	ids := make([]string, 0, len(l.Players))
	for id, p := range l.Players {
		if p.Connected {
			ids = append(ids, id)
		}
	}
	return ids
}

// CurrentStatus returns the lobby status with read locking.
func (l *Lobby) CurrentStatus() Status {
	l.mu.RLock()
	defer l.mu.RUnlock()
	return l.Status
}

// ApplyUpdate merges a partial settings/AI update under a single lock.
// roundCount and roundDurationSec are honored only if non-zero; aiModels
// merges entry-by-entry.
func (l *Lobby) ApplyUpdate(roundCount, roundDurationSec int, aiModels map[string]bool) error {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.Status != StatusWaiting {
		return errors.New("settings can only be changed in waiting state")
	}
	if roundCount != 0 {
		if roundCount != 3 && roundCount != 6 {
			return errors.New("round_count must be 3 or 6")
		}
		l.Settings.RoundCount = roundCount
	}
	if roundDurationSec != 0 {
		if roundDurationSec != 15 && roundDurationSec != 30 {
			return errors.New("round_duration_sec must be 15 or 30")
		}
		l.Settings.RoundDurationSec = roundDurationSec
	}
	for id, on := range aiModels {
		if _, ok := l.AIModels[id]; !ok {
			return errors.New("unknown ai model id: " + id)
		}
		l.AIModels[id] = on
	}
	return nil
}

// EnabledAIModelIDs returns the slice of enabled model IDs (stable order
// matching AvailableAIModels registry).
func (l *Lobby) EnabledAIModelIDs() []string {
	l.mu.RLock()
	defer l.mu.RUnlock()
	out := make([]string, 0, len(l.AIModels))
	for _, meta := range AvailableAIModels {
		if l.AIModels[meta.ID] {
			out = append(out, meta.ID)
		}
	}
	return out
}

// SettingsSnapshot copies settings + AI map under the read lock.
func (l *Lobby) SettingsSnapshot() (LobbySettings, map[string]bool) {
	l.mu.RLock()
	defer l.mu.RUnlock()
	ai := make(map[string]bool, len(l.AIModels))
	for k, v := range l.AIModels {
		ai[k] = v
	}
	return l.Settings, ai
}

// ResetVotes clears the next-round vote tally.
func (l *Lobby) ResetVotes() {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.NextRoundVotes = make(map[string]bool)
}

// RecordVote marks a player's vote for the next round. Returns true if the
// vote was newly counted.
func (l *Lobby) RecordVote(playerID string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	if _, ok := l.Players[playerID]; !ok {
		return false
	}
	if l.NextRoundVotes[playerID] {
		return false
	}
	l.NextRoundVotes[playerID] = true
	return true
}

// VoteState returns the IDs of players who have voted and the IDs of
// currently-connected players whose vote is still needed.
func (l *Lobby) VoteState() (voted, needed []string) {
	l.mu.RLock()
	defer l.mu.RUnlock()
	for id, p := range l.Players {
		if !p.Connected {
			continue
		}
		if l.NextRoundVotes[id] {
			voted = append(voted, id)
		} else {
			needed = append(needed, id)
		}
	}
	return voted, needed
}
