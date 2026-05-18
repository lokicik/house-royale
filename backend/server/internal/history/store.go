package history

import (
	"sync"
	"time"
)

const maxRecordsPerUser = 20

type GameRecord struct {
	LobbyID     string    `json:"lobby_id"`
	FinishedAt  time.Time `json:"finished_at"`
	Nickname    string    `json:"nickname"`
	Rank        int       `json:"rank"`
	Score       int       `json:"score"`
	Rounds      int       `json:"rounds"`
	PlayerCount int       `json:"player_count"`
}

type Store struct {
	mu      sync.RWMutex
	records map[string][]GameRecord // userID → records (newest first, capped)
}

func NewStore() *Store {
	return &Store{records: make(map[string][]GameRecord)}
}

func (s *Store) Record(userID string, r GameRecord) {
	s.mu.Lock()
	defer s.mu.Unlock()
	existing := s.records[userID]
	// Prepend so newest is first.
	updated := make([]GameRecord, 0, len(existing)+1)
	updated = append(updated, r)
	updated = append(updated, existing...)
	if len(updated) > maxRecordsPerUser {
		updated = updated[:maxRecordsPerUser]
	}
	s.records[userID] = updated
}

func (s *Store) Get(userID string) []GameRecord {
	s.mu.RLock()
	defer s.mu.RUnlock()
	recs := s.records[userID]
	if recs == nil {
		return []GameRecord{}
	}
	out := make([]GameRecord, len(recs))
	copy(out, recs)
	return out
}
