package game

import (
	"context"
	"encoding/json"
	"log"
	"math/rand"
	"sort"
	"sync"
	"sync/atomic"
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

	abortCh    chan struct{}
	abortOnce  sync.Once
	aborted    atomic.Bool
	stateMu    sync.RWMutex
	liveRound  *RoundStartPayload
	liveResult *RoundResultPayload
	liveVote   *RoundVoteStatePayload
	liveBoard  map[string]any
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
		abortCh:     make(chan struct{}),
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
	if s.Aborted() {
		return
	}
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

func (s *Session) Abort() {
	s.aborted.Store(true)
	s.abortOnce.Do(func() {
		close(s.abortCh)
	})
	s.poke()
}

func (s *Session) Aborted() bool {
	return s.aborted.Load()
}

func (s *Session) ReplayTo(send func(MessageType, any)) {
	s.stateMu.RLock()
	defer s.stateMu.RUnlock()

	if s.Aborted() {
		return
	}
	if s.liveBoard != nil {
		send(MsgLeaderboard, cloneMapAny(s.liveBoard))
		return
	}
	if s.liveResult != nil {
		send(MsgRoundResult, *s.liveResult)
		if s.liveVote != nil {
			send(MsgRoundVoteState, *s.liveVote)
		}
		return
	}
	if s.liveRound != nil {
		send(MsgRoundStart, *s.liveRound)
	}
}

func (s *Session) setLiveRound(payload RoundStartPayload) {
	s.stateMu.Lock()
	defer s.stateMu.Unlock()
	s.liveRound = cloneRoundStartPayload(payload)
	s.liveResult = nil
	s.liveVote = nil
	s.liveBoard = nil
}

func (s *Session) setLiveResult(payload RoundResultPayload) {
	s.stateMu.Lock()
	defer s.stateMu.Unlock()
	s.liveResult = cloneRoundResultPayload(payload)
	s.liveVote = nil
	s.liveBoard = nil
}

func (s *Session) setLiveVote(payload RoundVoteStatePayload) {
	s.stateMu.Lock()
	defer s.stateMu.Unlock()
	copyPayload := payload
	copyPayload.Voted = append([]string(nil), payload.Voted...)
	copyPayload.Needed = append([]string(nil), payload.Needed...)
	s.liveVote = &copyPayload
}

func (s *Session) setLiveBoard(payload map[string]any) {
	s.stateMu.Lock()
	defer s.stateMu.Unlock()
	s.liveBoard = cloneMapAny(payload)
}

// Run executes the full game loop. Call as a goroutine.
func (s *Session) Run() {
	s.lobby.SetStatus(StatusPlaying)

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
	rand.Shuffle(len(props), func(i, j int) { props[i], props[j] = props[j], props[i] })
	used := make(map[string]bool)

	for round := 1; round <= roundCount; round++ {
		if s.Aborted() {
			return
		}
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

		deadline := time.Now().Add(roundDuration)
		startPayload := RoundStartPayload{
			Round:        round,
			TotalRounds:  roundCount,
			TimeLimitSec: int(roundDuration.Seconds()),
			DeadlineTS:   deadline.UnixMilli(),
			Property:     prop.Public(),
		}
		s.setLiveRound(startPayload)
		s.broadcast(MsgRoundStart, startPayload)

		guesses, ok := s.collectGuesses(roundDuration)
		if !ok {
			return
		}

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

		resultPayload := RoundResultPayload{
			Round:         round,
			PropertyID:    prop.ID,
			ActualPrice:   prop.PriceTRY,
			PlayerResults: results,
			AIPredictions: aiResults,
		}
		s.setLiveResult(resultPayload)
		s.broadcast(MsgRoundResult, resultPayload)

		if round < roundCount {
			if !s.waitForNextRoundVotes(round) {
				return
			}
		}
	}

	s.broadcastLeaderboard()
	if s.Aborted() {
		return
	}
	s.recordHistory()

	s.lobby.SetStatus(StatusFinished)
}

func (s *Session) collectGuesses(duration time.Duration) (map[string]float64, bool) {
	guesses := make(map[string]float64)
	timer := time.NewTimer(duration)
	defer timer.Stop()

	for {
		// Re-snapshot on every iteration so disconnected players are excluded.
		if allSubmitted(guesses, s.lobby.Snapshot()) {
			return guesses, true
		}
		select {
		case g := <-s.GuessCh:
			guesses[g.PlayerID] = g.Price
		case <-timer.C:
			return guesses, true
		case <-s.abortCh:
			return guesses, false
		}
	}
}

// waitForNextRoundVotes blocks until every currently-connected real player has
// voted to advance, or VoteTimeout elapses, whichever comes first.
func (s *Session) waitForNextRoundVotes(round int) bool {
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
			return true
		}
		select {
		case <-s.voteSig:
			s.broadcastVoteState(round, deadline)
		case <-timer.C:
			s.broadcastVoteState(round, deadline)
			return true
		case <-s.abortCh:
			return false
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
	s.setLiveVote(RoundVoteStatePayload{
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
	payload := map[string]any{"players": entries}
	s.setLiveBoard(payload)
	s.broadcast(MsgLeaderboard, payload)
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

type RoundStartPayload struct {
	Round        int                 `json:"round"`
	TotalRounds  int                 `json:"total_rounds"`
	TimeLimitSec int                 `json:"time_limit_sec"`
	DeadlineTS   int64               `json:"deadline_ts,omitempty"`
	Property     property.PublicView `json:"property"`
}

type RoundResultPayload struct {
	Round         int                 `json:"round"`
	PropertyID    string              `json:"property_id"`
	ActualPrice   float64             `json:"actual_price"`
	PlayerResults []PlayerResult      `json:"player_results"`
	AIPredictions map[string]AIResult `json:"ai_predictions"`
}

func cloneRoundStartPayload(payload RoundStartPayload) *RoundStartPayload {
	copyPayload := payload
	copyPayload.Property.ImageURLs = append([]string(nil), payload.Property.ImageURLs...)
	return &copyPayload
}

func cloneRoundResultPayload(payload RoundResultPayload) *RoundResultPayload {
	copyPayload := payload
	copyPayload.PlayerResults = append([]PlayerResult(nil), payload.PlayerResults...)
	if payload.AIPredictions != nil {
		copyPayload.AIPredictions = make(map[string]AIResult, len(payload.AIPredictions))
		for k, v := range payload.AIPredictions {
			copyPayload.AIPredictions[k] = v
		}
	}
	return &copyPayload
}

func cloneMapAny(src map[string]any) map[string]any {
	if src == nil {
		return nil
	}
	out := make(map[string]any, len(src))
	for k, v := range src {
		out[k] = v
	}
	return out
}
