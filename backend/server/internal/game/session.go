package game

import (
	"context"
	"encoding/json"
	"log"
	"sort"
	"time"

	"github.com/lokicik/house-royale/backend/server/internal/mlclient"
	"github.com/lokicik/house-royale/backend/server/internal/property"
)

const (
	DefaultRoundCount    = 5
	DefaultRoundDuration = 30 * time.Second
	InterRoundPause      = 5 * time.Second
)

// Broadcaster is satisfied by *hub.Hub — kept here to avoid importing hub from game.
type Broadcaster interface {
	SendToLobby(lobbyID string, data []byte)
}

// SessionConfig controls round count and per-round time limit.
type SessionConfig struct {
	RoundCount    int
	RoundDuration time.Duration
}

var DefaultConfig = SessionConfig{
	RoundCount:    DefaultRoundCount,
	RoundDuration: DefaultRoundDuration,
}

type playerGuess struct {
	PlayerID string
	Price    float64
}

// Session manages one game's lifecycle from start to leaderboard.
type Session struct {
	lobbyID     string
	lobby       *Lobby
	broadcaster Broadcaster
	predictor   mlclient.Predictor
	cfg         SessionConfig
	GuessCh     chan playerGuess
}

func NewSession(lobbyID string, lobby *Lobby, b Broadcaster, p mlclient.Predictor, cfg SessionConfig) *Session {
	return &Session{
		lobbyID:     lobbyID,
		lobby:       lobby,
		broadcaster: b,
		predictor:   p,
		cfg:         cfg,
		GuessCh:     make(chan playerGuess, 32),
	}
}

// SubmitGuess is safe to call from any goroutine (non-blocking).
func (s *Session) SubmitGuess(playerID string, price float64) {
	select {
	case s.GuessCh <- playerGuess{PlayerID: playerID, Price: price}:
	default:
	}
}

// Run executes the full game loop. Call as a goroutine.
func (s *Session) Run() {
	s.lobby.mu.Lock()
	s.lobby.Status = StatusPlaying
	s.lobby.mu.Unlock()

	props := property.All()
	used := make(map[string]bool)

	for round := 1; round <= s.cfg.RoundCount; round++ {
		prop := pickUnused(props, used)
		used[prop.ID] = true

		aiResp, err := s.predictor.Predict(context.Background(), mlclient.PredictRequest{
			ModelIDs: []string{"mlp", "ann", "hybrid"},
			Features: prop.ToFeatures(),
		})
		if err != nil {
			log.Printf("session %s round %d predictor error: %v", s.lobbyID, round, err)
			aiResp = &mlclient.PredictResponse{Predictions: map[string]mlclient.ModelPrediction{}}
		}

		s.broadcast(MsgRoundStart, roundStartPayload{
			Round:        round,
			TotalRounds:  s.cfg.RoundCount,
			TimeLimitSec: int(s.cfg.RoundDuration.Seconds()),
			Property:     prop.Public(),
		})

		guesses := s.collectGuesses()

		players := s.lobby.Snapshot()
		results := scoreRound(players, guesses, prop.PriceTRY)

		s.lobby.mu.Lock()
		for _, r := range results {
			if pl, ok := s.lobby.Players[r.PlayerID]; ok {
				pl.Score += r.PointsEarned
			}
		}
		s.lobby.mu.Unlock()

		s.broadcast(MsgRoundResult, roundResultPayload{
			Round:         round,
			PropertyID:    prop.ID,
			ActualPrice:   prop.PriceTRY,
			PlayerResults: results,
			AIPredictions: buildAIResults(aiResp.Predictions, prop.PriceTRY),
		})

		if round < s.cfg.RoundCount {
			time.Sleep(InterRoundPause)
		}
	}

	s.broadcastLeaderboard()

	s.lobby.mu.Lock()
	s.lobby.Status = StatusFinished
	s.lobby.mu.Unlock()
}

func (s *Session) collectGuesses() map[string]float64 {
	guesses := make(map[string]float64)
	players := s.lobby.Snapshot()
	deadline := time.After(s.cfg.RoundDuration)

	for {
		if len(guesses) >= len(players) {
			return guesses
		}
		select {
		case g := <-s.GuessCh:
			if _, ok := players[g.PlayerID]; ok {
				guesses[g.PlayerID] = g.Price
			}
		case <-deadline:
			return guesses
		}
	}
}

func (s *Session) broadcastLeaderboard() {
	type entry struct {
		PlayerID string `json:"player_id"`
		Nickname string `json:"nickname"`
		Score    int    `json:"score"`
		Rank     int    `json:"rank"`
	}
	players := s.lobby.Snapshot()
	entries := make([]entry, 0, len(players))
	for _, p := range players {
		entries = append(entries, entry{PlayerID: p.ID, Nickname: p.Nickname, Score: p.Score})
	}
	sort.SliceStable(entries, func(i, j int) bool { return entries[i].Score > entries[j].Score })
	for i := range entries {
		entries[i].Rank = i + 1
	}
	s.broadcast(MsgLeaderboard, map[string]any{"players": entries})
}

func (s *Session) broadcast(msgType MessageType, payload any) {
	data, err := json.Marshal(payload)
	if err != nil {
		return
	}
	msg, _ := json.Marshal(Message{Type: msgType, Payload: json.RawMessage(data)})
	s.broadcaster.SendToLobby(s.lobbyID, msg)
}

func pickUnused(props []property.Property, used map[string]bool) property.Property {
	for _, p := range props {
		if !used[p.ID] {
			return p
		}
	}
	return props[0]
}

// --- payload types ---

type roundStartPayload struct {
	Round        int                 `json:"round"`
	TotalRounds  int                 `json:"total_rounds"`
	TimeLimitSec int                 `json:"time_limit_sec"`
	Property     property.PublicView `json:"property"`
}

type roundResultPayload struct {
	Round         int                `json:"round"`
	PropertyID    string             `json:"property_id"`
	ActualPrice   float64            `json:"actual_price"`
	PlayerResults []PlayerResult     `json:"player_results"`
	AIPredictions map[string]AIResult `json:"ai_predictions"`
}
