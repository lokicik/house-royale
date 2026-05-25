package game

import (
	"errors"
	"sync"
	"time"

	"github.com/lokicik/house-royale/backend/server/internal/league"
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
	ID     string        `json:"id"`
	Name   string        `json:"name"`
	Type   string        `json:"type"`
	League league.League `json:"league"`
}

// AvailableAIModels is the canonical registry of model IDs the lobby can
// enable. Each model is permanently assigned to one league based on its
// training quality (notebook 5.1 ResNet models → Diamond; notebook 5.2
// baselines → Gold/Bronze).
var AvailableAIModels = []AIModelMeta{
	// Diamond — notebook 5.1 ResNet-style MLPs, ~3–5% error.
	{ID: "model_0", Name: "ResNet Pro", Type: "Deep MLP", League: league.Diamond},
	{ID: "model_1", Name: "ResNet Plus", Type: "Deep MLP", League: league.Diamond},
	{ID: "model_2", Name: "ResNet Lite", Type: "Deep MLP", League: league.Diamond},
	// Gold — notebook 5.2 mid-tier baselines.
	{ID: "model_3", Name: "MLP Pro", Type: "MLP", League: league.Gold},
	{ID: "model_4", Name: "MLP Plus", Type: "MLP", League: league.Gold},
	{ID: "model_5", Name: "MLP Lite", Type: "MLP", League: league.Gold},
	// Bronze — notebook 5.2 weakest baselines (e.g. model_8 with R²<0).
	{ID: "model_6", Name: "Mini MLP", Type: "MLP", League: league.Bronze},
	{ID: "model_7", Name: "Tiny MLP", Type: "MLP", League: league.Bronze},
	{ID: "model_8", Name: "Stub MLP", Type: "MLP", League: league.Bronze},
}

// ModelsForLeague returns the AIModelMeta entries belonging to a league.
func ModelsForLeague(l league.League) []AIModelMeta {
	out := make([]AIModelMeta, 0, 3)
	for _, m := range AvailableAIModels {
		if m.League == l {
			out = append(out, m)
		}
	}
	return out
}

// ModelLeague returns the permanent league assigned to an AI model ID, or an
// empty string if the ID is not in the registry.
func ModelLeague(modelID string) league.League {
	for _, m := range AvailableAIModels {
		if m.ID == modelID {
			return m.League
		}
	}
	return ""
}

func defaultAIModels(lobbyLeague league.League) map[string]bool {
	models := ModelsForLeague(lobbyLeague)
	m := make(map[string]bool, len(models))
	for _, meta := range models {
		m[meta.ID] = true
	}
	return m
}

func defaultSettings() LobbySettings {
	return LobbySettings{RoundCount: 3, RoundDurationSec: 30}
}

type Lobby struct {
	ID             string             `json:"id"`
	HostID         string             `json:"host_id"`
	League         league.League      `json:"league"`
	Players        map[string]*Player `json:"players"`
	Status         Status             `json:"status"`
	CreatedAt      time.Time          `json:"created_at"`
	Settings       LobbySettings      `json:"settings"`
	AIModels       map[string]bool    `json:"ai_models"`
	NextRoundVotes map[string]bool    `json:"-"`
	BlockedPlayers map[string]bool    `json:"-"`
	mu             sync.RWMutex
}

// NewLobby creates a new lobby in the host's league. The set of selectable AI
// models is locked to that league for the lifetime of the lobby.
func NewLobby(id, hostID string, hostLeague league.League) *Lobby {
	return &Lobby{
		ID:             id,
		HostID:         hostID,
		League:         hostLeague,
		Players:        make(map[string]*Player),
		Status:         StatusWaiting,
		CreatedAt:      time.Now(),
		Settings:       defaultSettings(),
		AIModels:       defaultAIModels(hostLeague),
		NextRoundVotes: make(map[string]bool),
		BlockedPlayers: make(map[string]bool),
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
	delete(l.NextRoundVotes, playerID)
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

func (l *Lobby) ConnectedPlayerCount() int {
	l.mu.RLock()
	defer l.mu.RUnlock()
	count := 0
	for _, p := range l.Players {
		if p.Connected {
			count++
		}
	}
	return count
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

func (l *Lobby) IsBlocked(playerID string) bool {
	l.mu.RLock()
	defer l.mu.RUnlock()
	return l.BlockedPlayers[playerID]
}

func (l *Lobby) BlockPlayer(playerID string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.BlockedPlayers[playerID] = true
	delete(l.Players, playerID)
	delete(l.NextRoundVotes, playerID)
}

func (l *Lobby) AccessibleBy(playerID string) bool {
	l.mu.RLock()
	defer l.mu.RUnlock()
	if l.BlockedPlayers[playerID] {
		return false
	}
	if playerID == l.HostID {
		return true
	}
	if l.Status == StatusWaiting {
		return true
	}
	_, ok := l.Players[playerID]
	return ok
}

func (l *Lobby) ListedFor(playerID string) bool {
	l.mu.RLock()
	defer l.mu.RUnlock()
	if l.BlockedPlayers[playerID] {
		return false
	}
	if playerID == l.HostID {
		return true
	}
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

func (l *Lobby) SetStatus(status Status) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.Status = status
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
		if roundDurationSec != 30 && roundDurationSec != 60 {
			return errors.New("round_duration_sec must be 30 or 60")
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
// matching this lobby's league models).
func (l *Lobby) EnabledAIModelIDs() []string {
	l.mu.RLock()
	defer l.mu.RUnlock()
	models := ModelsForLeague(l.League)
	out := make([]string, 0, len(models))
	for _, meta := range models {
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
