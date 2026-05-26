package league

import (
	"context"
	"log"
	"sync"
	"time"

	"cloud.google.com/go/firestore"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

const firestoreCollection = "user_leagues"

// Storer is the interface for persisting per-user league state.
type Storer interface {
	Get(ctx context.Context, userID string) (UserLeague, error)
	Upsert(ctx context.Context, u UserLeague) error
}

// MemoryStore is an in-memory implementation used in development.
type MemoryStore struct {
	mu sync.RWMutex
	m  map[string]UserLeague
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{m: make(map[string]UserLeague)}
}

func defaultUserLeague(userID string) UserLeague {
	return UserLeague{
		UserID:    userID,
		League:    Bronze,
		LP:        StartingLP,
		UpdatedAt: time.Now(),
	}
}

// Get returns the user's league. If unknown, returns a synthetic Bronze entry
// (not persisted — caller must Upsert to persist).
func (s *MemoryStore) Get(_ context.Context, userID string) (UserLeague, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if u, ok := s.m[userID]; ok {
		return u, nil
	}
	return defaultUserLeague(userID), nil
}

func (s *MemoryStore) Upsert(_ context.Context, u UserLeague) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	u.UpdatedAt = time.Now()
	s.m[u.UserID] = u
	return nil
}

// FirestoreStore persists league state to Firestore.
type FirestoreStore struct {
	client *firestore.Client
}

func NewFirestoreStore(client *firestore.Client) *FirestoreStore {
	return &FirestoreStore{client: client}
}

func (fs *FirestoreStore) Get(ctx context.Context, userID string) (UserLeague, error) {
	doc, err := fs.client.Collection(firestoreCollection).Doc(userID).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return defaultUserLeague(userID), nil
		}
		return defaultUserLeague(userID), err
	}
	var raw struct {
		UserID    string    `firestore:"user_id"`
		League    string    `firestore:"league"`
		LP        int64     `firestore:"lp"`
		UpdatedAt time.Time `firestore:"updated_at"`
	}
	if err := doc.DataTo(&raw); err != nil {
		log.Printf("league.Get firestore DataTo failed id=%s err=%v", userID, err)
		return defaultUserLeague(userID), err
	}
	return UserLeague{
		UserID:    userID,
		League:    FromString(raw.League),
		LP:        int(raw.LP),
		UpdatedAt: raw.UpdatedAt,
	}, nil
}

func (fs *FirestoreStore) Upsert(ctx context.Context, u UserLeague) error {
	u.UpdatedAt = time.Now()
	_, err := fs.client.Collection(firestoreCollection).Doc(u.UserID).Set(ctx, map[string]interface{}{
		"user_id":    u.UserID,
		"league":     string(u.League),
		"lp":         u.LP,
		"updated_at": u.UpdatedAt,
	})
	if err != nil {
		log.Printf("league.Upsert firestore set failed id=%s err=%v", u.UserID, err)
	}
	return err
}
