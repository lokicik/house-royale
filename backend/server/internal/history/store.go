package history

import (
	"context"
	"sync"
	"time"

	"cloud.google.com/go/firestore"
)

const maxRecordsPerUser = 20

type GameRecord struct {
	LobbyID     string    `json:"lobby_id" firestore:"lobby_id"`
	FinishedAt  time.Time `json:"finished_at" firestore:"finished_at"`
	Nickname    string    `json:"nickname" firestore:"nickname"`
	Rank        int       `json:"rank" firestore:"rank"`
	Score       int       `json:"score" firestore:"score"`
	Rounds      int       `json:"rounds" firestore:"rounds"`
	PlayerCount int       `json:"player_count" firestore:"player_count"`
}

// Storer defines the interface for history storage backends.
type Storer interface {
	Record(userID string, r GameRecord)
	Get(userID string) []GameRecord
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

// FirestoreStore persists game history to Firestore.
type FirestoreStore struct {
	client *firestore.Client
}

func NewFirestoreStore(client *firestore.Client) *FirestoreStore {
	return &FirestoreStore{client: client}
}

// Record adds a new game record for a user in Firestore, capped at 20 per user.
func (fs *FirestoreStore) Record(userID string, r GameRecord) {
	ctx := context.Background()
	docRef := fs.client.Collection("user_history").Doc(userID)

	fs.client.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		doc, err := tx.Get(docRef)
		if err != nil && err.Error() != "document not found" {
			return err
		}

		var userHistory struct {
			Records []GameRecord `firestore:"records"`
		}

		if doc.Exists() {
			doc.DataTo(&userHistory)
		}

		// Prepend new record (newest first)
		userHistory.Records = append([]GameRecord{r}, userHistory.Records...)

		// Cap at maxRecordsPerUser
		if len(userHistory.Records) > maxRecordsPerUser {
			userHistory.Records = userHistory.Records[:maxRecordsPerUser]
		}

		return tx.Set(docRef, userHistory)
	})
}

// Get retrieves all game records for a user from Firestore.
func (fs *FirestoreStore) Get(userID string) []GameRecord {
	ctx := context.Background()
	doc, err := fs.client.Collection("user_history").Doc(userID).Get(ctx)
	if err != nil {
		return []GameRecord{}
	}

	var userHistory struct {
		Records []GameRecord `firestore:"records"`
	}

	if err := doc.DataTo(&userHistory); err != nil {
		return []GameRecord{}
	}

	if userHistory.Records == nil {
		return []GameRecord{}
	}

	out := make([]GameRecord, len(userHistory.Records))
	copy(out, userHistory.Records)
	return out
}
