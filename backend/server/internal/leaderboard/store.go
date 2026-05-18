package leaderboard

import (
	"context"
	"math"
	"sort"
	"sync"

	"cloud.google.com/go/firestore"
	"google.golang.org/api/iterator"
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

// Storer defines the interface for leaderboard storage backends.
type Storer interface {
	Record(rounds [][]RoundEntry)
	Snapshot() []EntryView
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

// FirestoreStore persists leaderboard stats to Firestore.
type FirestoreStore struct {
	client *firestore.Client
}

func NewFirestoreStore(client *firestore.Client) *FirestoreStore {
	return &FirestoreStore{client: client}
}

// Record updates stats in Firestore for each participant across all rounds.
func (fs *FirestoreStore) Record(rounds [][]RoundEntry) {
	ctx := context.Background()
	for _, round := range rounds {
		for _, r := range round {
			docRef := fs.client.Collection("leaderboard_stats").Doc(r.ID)
			wins := 0
			if r.PointsEarned == 3 {
				wins = 1
			}
			docRef.Set(ctx, map[string]interface{}{
				"id":        r.ID,
				"name":      r.Name,
				"is_ai":     r.IsAI,
				"score":     firestore.Increment(r.PointsEarned),
				"rounds":    firestore.Increment(1),
				"total_dev": firestore.Increment(r.DeviationPct),
				"wins":      firestore.Increment(wins),
			}, firestore.MergeAll)
		}
	}
}

// Snapshot reads all stats from Firestore and returns a sorted leaderboard view.
func (fs *FirestoreStore) Snapshot() []EntryView {
	ctx := context.Background()
	iter := fs.client.Collection("leaderboard_stats").Documents(ctx)
	defer iter.Stop()

	views := []EntryView{}
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return []EntryView{}
		}

		var data map[string]interface{}
		if err := doc.DataTo(&data); err != nil {
			continue
		}

		id, _ := data["id"].(string)
		name, _ := data["name"].(string)
		isAI, _ := data["is_ai"].(bool)
		score := int64(0)
		if s, ok := data["score"].(int64); ok {
			score = s
		}
		rounds := int64(0)
		if r, ok := data["rounds"].(int64); ok {
			rounds = r
		}
		totalDev := 0.0
		if td, ok := data["total_dev"].(float64); ok {
			totalDev = td
		}
		wins := int64(0)
		if w, ok := data["wins"].(int64); ok {
			wins = w
		}

		avgErr := 0.0
		winRate := 0.0
		if rounds > 0 {
			avgErr = math.Round(totalDev/float64(rounds)*100) / 100
			winRate = math.Round(float64(wins)/float64(rounds)*10000) / 100
		}

		views = append(views, EntryView{
			ID:      id,
			Name:    name,
			IsAI:    isAI,
			Rounds:  int(rounds),
			AvgErr:  avgErr,
			WinRate: winRate,
			Score:   int(score),
		})
	}

	sort.SliceStable(views, func(i, j int) bool { return views[i].Score > views[j].Score })
	for i := range views {
		views[i].Rank = i + 1
	}
	return views
}
