package leaderboard

import (
	"math"
	"sort"
	"sync"
)

// RoundEntry captures one participant's result for a single round.
type RoundEntry struct {
	ID           string
	Name         string
	IsAI         bool
	DeviationPct float64
	PointsEarned int
}

type stat struct {
	id       string
	name     string
	isAI     bool
	score    int
	rounds   int
	totalDev float64
	wins     int // rounds where PointsEarned == 3 (1st place)
}

// EntryView is the JSON-serialisable leaderboard row.
type EntryView struct {
	ID      string  `json:"id"`
	Name    string  `json:"name"`
	IsAI    bool    `json:"is_ai"`
	Rank    int     `json:"rank"`
	Rounds  int     `json:"rounds"`
	AvgErr  float64 `json:"avg_err"`   // average deviation %
	WinRate float64 `json:"win_rate"`  // % of rounds finished 1st
	Score   int     `json:"score"`
}

// Store accumulates leaderboard stats across completed games in memory.
type Store struct {
	mu    sync.RWMutex
	stats map[string]*stat
}

func NewStore() *Store {
	return &Store{stats: make(map[string]*stat)}
}

// Record processes all rounds from a completed game and updates cumulative stats.
func (s *Store) Record(rounds [][]RoundEntry) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, round := range rounds {
		for _, r := range round {
			e, ok := s.stats[r.ID]
			if !ok {
				e = &stat{id: r.ID, name: r.Name, isAI: r.IsAI}
				s.stats[r.ID] = e
			}
			e.name = r.Name // keep nickname up-to-date
			e.score += r.PointsEarned
			e.rounds++
			e.totalDev += r.DeviationPct
			if r.PointsEarned == 3 {
				e.wins++
			}
		}
	}
}

// Snapshot returns all entries sorted by score descending with ranks assigned.
func (s *Store) Snapshot() []EntryView {
	s.mu.RLock()
	defer s.mu.RUnlock()
	views := make([]EntryView, 0, len(s.stats))
	for _, e := range s.stats {
		avgErr := 0.0
		winRate := 0.0
		if e.rounds > 0 {
			avgErr = math.Round(e.totalDev/float64(e.rounds)*100) / 100
			winRate = math.Round(float64(e.wins)/float64(e.rounds)*10000) / 100
		}
		views = append(views, EntryView{
			ID:      e.id,
			Name:    e.name,
			IsAI:    e.isAI,
			Rounds:  e.rounds,
			AvgErr:  avgErr,
			WinRate: winRate,
			Score:   e.score,
		})
	}
	sort.SliceStable(views, func(i, j int) bool { return views[i].Score > views[j].Score })
	for i := range views {
		views[i].Rank = i + 1
	}
	return views
}
