package handlers

import (
	"sync"

	"github.com/lokicik/house-royale/backend/server/internal/game"
)

type SessionStore struct {
	mu       sync.RWMutex
	sessions map[string]*game.Session
}

func NewSessionStore() *SessionStore {
	return &SessionStore{sessions: make(map[string]*game.Session)}
}

func (s *SessionStore) Set(lobbyID string, session *game.Session) {
	s.mu.Lock()
	s.sessions[lobbyID] = session
	s.mu.Unlock()
}

func (s *SessionStore) Get(lobbyID string) (*game.Session, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	sess, ok := s.sessions[lobbyID]
	return sess, ok
}

func (s *SessionStore) Has(lobbyID string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	_, ok := s.sessions[lobbyID]
	return ok
}
