package game

import (
	"context"
	"encoding/json"
	"log"
	"sort"
	"time"

	"github.com/lokicik/house-royale/backend/server/internal/history"
	"github.com/lokicik/house-royale/backend/server/internal/league"
	"github.com/lokicik/house-royale/backend/server/internal/mlclient"
	"github.com/lokicik/house-royale/backend/server/internal/property"
)

const (
	DefaultRoundCount    = 3
	DefaultRoundDuration = 30 * time.Second
	VoteTimeout          = 90 * time.Second
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

// RoundSummaryEntry captures one participant's per-round stats for leaderboard recording.
type RoundSummaryEntry struct {
	ID           string
	Name         string
	IsAI         bool
	League       string
	DeviationPct float64
	PointsEarned int
}

// Session manages one game's lifecycle from start to leaderboard.
type Session struct {
	lobbyID        string
	lobby          *Lobby
	broadcaster    Broadcaster
	predictor      mlclient.Predictor
	cfg            SessionConfig
	GuessCh        chan playerGuess
	aiScores       map[string]int // cumulative points per AI model name
	RoundSummaries [][]RoundSummaryEntry
	HistoryStore   history.Storer // optional; records per-user game results on finish
	LeagueStore    league.Storer  // optional; persists per-user LP and promotions

	// voteSig wakes the vote-wait loop when a vote arrives or a player
	// disconnects. Buffered/non-blocking sends.
	voteSig chan struct{}
}

func NewSession(lobbyID string, lobby *Lobby, b Broadcaster, p mlclient.Predictor, cfg SessionConfig) *Session {
	return &Session{
		lobbyID:     lobbyID,
		lobby:       lobby,
		broadcaster: b,
		predictor:   p,
		cfg:         cfg,
		GuessCh:     make(chan playerGuess, 32),
		aiScores:    make(map[string]int),
		voteSig:     make(chan struct{}, 32),
	}
}

// SubmitGuess is safe to call from any goroutine (non-blocking).
func (s *Session) SubmitGuess(playerID string, price float64) {
	select {
	case s.GuessCh <- playerGuess{PlayerID: playerID, Price: price}:
	default:
	}
}

// VoteNextRound records a player's vote and nudges the vote-wait loop.
func (s *Session) VoteNextRound(playerID string) {
	if s.lobby.RecordVote(playerID) {
		s.poke()
	}
}

// NotifyPlayerDisconnected re-evaluates the vote state when a player drops.
func (s *Session) NotifyPlayerDisconnected(_ string) {
	s.poke()
}

func (s *Session) poke() {
	select {
	case s.voteSig <- struct{}{}:
	default:
	}
}

// Run executes the full game loop. Call as a goroutine.
func (s *Session) Run() {
	s.lobby.mu.Lock()
	s.lobby.Status = StatusPlaying
	s.lobby.mu.Unlock()

	settings, _ := s.lobby.SettingsSnapshot()
	roundCount := settings.RoundCount
	if roundCount == 0 {
		roundCount = s.cfg.RoundCount
	}
	roundDuration := time.Duration(settings.RoundDurationSec) * time.Second
	if roundDuration == 0 {
		roundDuration = s.cfg.RoundDuration
	}

	props := property.All()
	used := make(map[string]bool)

	for round := 1; round <= roundCount; round++ {
		prop := pickUnused(props, used)
		used[prop.ID] = true

		enabledModels := s.lobby.EnabledAIModelIDs()
		var aiResp *mlclient.PredictResponse
		if len(enabledModels) > 0 {
			resp, err := s.predictor.Predict(context.Background(), mlclient.PredictRequest{
				ModelIDs:  enabledModels,
				Features:  prop.ToFeatures(),
				ImageURLs: []string{},
			})
			if err != nil {
				log.Printf("session %s round %d predictor error: %v", s.lobbyID, round, err)
				aiResp = &mlclient.PredictResponse{Predictions: map[string]mlclient.ModelPrediction{}}
			} else {
				aiResp = resp
			}
		} else {
			aiResp = &mlclient.PredictResponse{Predictions: map[string]mlclient.ModelPrediction{}}
		}

		// Discard any stale guesses that arrived during the inter-round wait.
		for len(s.GuessCh) > 0 {
			<-s.GuessCh
		}

		s.broadcast(MsgRoundStart, roundStartPayload{
			Round:        round,
			TotalRounds:  roundCount,
			TimeLimitSec: int(roundDuration.Seconds()),
			Property:     prop.Public(),
		})

		guesses := s.collectGuesses(roundDuration)

		players := s.lobby.Snapshot()
		results, aiResults := scoreRound(players, guesses, aiResp.Predictions, prop.PriceTRY)

		s.lobby.mu.Lock()
		for _, r := range results {
			if pl, ok := s.lobby.Players[r.PlayerID]; ok {
				pl.Score += r.PointsEarned
			}
		}
		s.lobby.mu.Unlock()

		for name, ar := range aiResults {
			s.aiScores[name] += ar.PointsEarned
		}

		playerLeagues := s.applyLPDeltas(results, aiResults)

		roundRow := make([]RoundSummaryEntry, 0, len(results)+len(aiResults))
		for _, r := range results {
			roundRow = append(roundRow, RoundSummaryEntry{
				ID:           r.PlayerID,
				Name:         r.Nickname,
				League:       string(playerLeagues[r.PlayerID]),
				DeviationPct: r.DeviationPct,
				PointsEarned: r.PointsEarned,
			})
		}
		for name, ar := range aiResults {
			roundRow = append(roundRow, RoundSummaryEntry{
				ID:           "ai:" + name,
				Name:         name,
				IsAI:         true,
				League:       string(ModelLeague(name)),
				DeviationPct: ar.DeviationPct,
				PointsEarned: ar.PointsEarned,
			})
		}
		s.RoundSummaries = append(s.RoundSummaries, roundRow)

		s.broadcast(MsgRoundResult, roundResultPayload{
			Round:         round,
			PropertyID:    prop.ID,
			ActualPrice:   prop.PriceTRY,
			PlayerResults: results,
			AIPredictions: aiResults,
		})

		if round < roundCount {
			s.waitForNextRoundVotes(round)
		}
	}

	s.broadcastLeaderboard()
	s.recordHistory()

	s.lobby.mu.Lock()
	s.lobby.Status = StatusFinished
	s.lobby.mu.Unlock()
}

func (s *Session) collectGuesses(duration time.Duration) map[string]float64 {
	guesses := make(map[string]float64)
	deadline := time.After(duration)

	for {
		// Re-snapshot on every iteration so disconnected players are excluded.
		if allSubmitted(guesses, s.lobby.Snapshot()) {
			return guesses
		}
		select {
		case g := <-s.GuessCh:
			guesses[g.PlayerID] = g.Price
		case <-deadline:
			return guesses
		}
	}
}

// waitForNextRoundVotes blocks until every currently-connected real player has
// voted to advance, or VoteTimeout elapses, whichever comes first.
func (s *Session) waitForNextRoundVotes(round int) {
	s.lobby.ResetVotes()
	// Drain stale signals from a prior round.
	for len(s.voteSig) > 0 {
		<-s.voteSig
	}

	deadline := time.Now().Add(VoteTimeout)
	timer := time.NewTimer(VoteTimeout)
	defer timer.Stop()

	s.broadcastVoteState(round, deadline)

	for {
		_, needed := s.lobby.VoteState()
		// If no connected players remain, or all connected have voted, advance.
		if len(needed) == 0 {
			return
		}
		select {
		case <-s.voteSig:
			s.broadcastVoteState(round, deadline)
		case <-timer.C:
			s.broadcastVoteState(round, deadline)
			return
		}
	}
}

func (s *Session) broadcastVoteState(round int, deadline time.Time) {
	voted, needed := s.lobby.VoteState()
	if voted == nil {
		voted = []string{}
	}
	if needed == nil {
		needed = []string{}
	}
	s.broadcast(MsgRoundVoteState, RoundVoteStatePayload{
		Round:      round,
		Voted:      voted,
		Needed:     needed,
		DeadlineTS: deadline.UnixMilli(),
	})
}

// applyLPDeltas computes per-player LP deltas for the round, persists the
// updated UserLeague, and broadcasts a LEAGUE_UPDATE message for each affected
// player (so the frontend can render LP bar + promotion/demotion toasts).
//
// Returns a map of player_id -> resulting league (post-delta), populated for
// every player in results — including non-submitters whose LP didn't change.
// The caller uses this to stamp the player's current league onto the
// leaderboard record for the round.
func (s *Session) applyLPDeltas(results []PlayerResult, aiResults map[string]AIResult) map[string]league.League {
	leagues := make(map[string]league.League, len(results))
	if s.LeagueStore == nil {
		return leagues
	}
	// Build modelID -> tier map for the AI models in this round.
	aiTiers := make(map[string]int, len(aiResults))
	for modelID := range aiResults {
		for _, meta := range AvailableAIModels {
			if meta.ID == modelID {
				aiTiers[modelID] = meta.League.Tier()
				break
			}
		}
	}
	deltas := ComputeLPDeltas(results, aiResults, aiTiers)

	ctx := context.Background()
	for _, r := range results {
		current, err := s.LeagueStore.Get(ctx, r.PlayerID)
		if err != nil {
			log.Printf("session %s league.Get failed player=%s err=%v", s.lobbyID, r.PlayerID, err)
			continue
		}
		// Record the current league for every player, even if no LP change.
		leagues[r.PlayerID] = current.League

		delta := deltas[r.PlayerID]
		// Skip both empty deltas and players who didn't submit at all
		// (deltas already returns 0 for non-submitters).
		if delta == 0 && r.Guess <= 0 {
			continue
		}
		promoted, demoted := current.ApplyDelta(delta)
		if err := s.LeagueStore.Upsert(ctx, current); err != nil {
			log.Printf("session %s league.Upsert failed player=%s err=%v", s.lobbyID, r.PlayerID, err)
			continue
		}
		// Refresh to the post-delta league in case a promotion/demotion occurred.
		leagues[r.PlayerID] = current.League
		s.broadcast(MsgLeagueUpdate, LeagueUpdatePayload{
			PlayerID: r.PlayerID,
			League:   current.League,
			LP:       current.LP,
			LPDelta:  delta,
			Promoted: promoted,
			Demoted:  demoted,
		})
	}
	return leagues
}

func (s *Session) broadcastLeaderboard() {
	type entry struct {
		PlayerID string `json:"player_id"`
		Nickname string `json:"nickname"`
		Score    int    `json:"score"`
		Rank     int    `json:"rank"`
		IsAI     bool   `json:"is_ai"`
	}
	players := s.lobby.Snapshot()
	entries := make([]entry, 0, len(players)+len(s.aiScores))
	for _, p := range players {
		entries = append(entries, entry{PlayerID: p.ID, Nickname: p.Nickname, Score: p.Score})
	}
	for name, score := range s.aiScores {
		entries = append(entries, entry{PlayerID: "ai:" + name, Nickname: name, Score: score, IsAI: true})
	}
	sort.SliceStable(entries, func(i, j int) bool { return entries[i].Score > entries[j].Score })
	for i := range entries {
		entries[i].Rank = i + 1
	}
	s.broadcast(MsgLeaderboard, map[string]any{"players": entries})
}

func (s *Session) recordHistory() {
	if s.HistoryStore == nil {
		log.Printf("history.record.skip lobby=%s reason=HistoryStore-nil", s.lobbyID)
		return
	}
	players := s.lobby.Snapshot()
	if len(players) == 0 {
		log.Printf("history.record.skip lobby=%s reason=no-players", s.lobbyID)
		return
	}
	log.Printf("history.record.invoke lobby=%s humanPlayers=%d store=%T", s.lobbyID, len(players), s.HistoryStore)

	// Build a combined ranked list (human + AI) mirroring broadcastLeaderboard.
	type ranked struct {
		playerID string
		nickname string
		score    int
		isAI     bool
		rank     int
	}
	all := make([]ranked, 0, len(players)+len(s.aiScores))
	for _, p := range players {
		all = append(all, ranked{playerID: p.ID, nickname: p.Nickname, score: p.Score})
	}
	for name, score := range s.aiScores {
		all = append(all, ranked{playerID: "ai:" + name, nickname: name, score: score, isAI: true})
	}
	sort.SliceStable(all, func(i, j int) bool { return all[i].score > all[j].score })
	for i := range all {
		all[i].rank = i + 1
	}

	rounds := s.lobby.Settings.RoundCount
	playerCount := len(players)
	now := time.Now()

	for _, entry := range all {
		if entry.isAI {
			continue
		}
		s.HistoryStore.Record(entry.playerID, history.GameRecord{
			LobbyID:     s.lobbyID,
			FinishedAt:  now,
			Nickname:    entry.nickname,
			Rank:        entry.rank,
			Score:       entry.score,
			Rounds:      rounds,
			PlayerCount: playerCount,
		})
	}
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
	Round         int                 `json:"round"`
	PropertyID    string              `json:"property_id"`
	ActualPrice   float64             `json:"actual_price"`
	PlayerResults []PlayerResult      `json:"player_results"`
	AIPredictions map[string]AIResult `json:"ai_predictions"`
}
