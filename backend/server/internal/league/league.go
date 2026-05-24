package league

import (
	"encoding/json"
	"errors"
	"strings"
	"time"
)

// League represents a competitive tier. Three tiers exist: Bronze < Gold < Diamond.
type League string

const (
	Bronze  League = "bronze"
	Gold    League = "gold"
	Diamond League = "diamond"

	// LP thresholds. Players start at 50 LP after every league transition.
	StartingLP   = 50
	PromoteAt    = 100
	DemoteAt     = 0
	MinLP        = 0
	MaxLP        = 100
)

// Tier returns the numeric tier value used in LP calculations.
// Bronze=1, Gold=2, Diamond=3.
func (l League) Tier() int {
	switch l {
	case Bronze:
		return 1
	case Gold:
		return 2
	case Diamond:
		return 3
	}
	return 1
}

// All returns the leagues in ascending order.
func All() []League {
	return []League{Bronze, Gold, Diamond}
}

// FromString parses a league name (case-insensitive). Falls back to Bronze on
// unknown input.
func FromString(s string) League {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "bronze":
		return Bronze
	case "gold":
		return Gold
	case "diamond":
		return Diamond
	}
	return Bronze
}

// Next returns the league one tier above, or the same league if already at top.
func (l League) Next() League {
	switch l {
	case Bronze:
		return Gold
	case Gold:
		return Diamond
	}
	return l
}

// Prev returns the league one tier below, or the same league if already at bottom.
func (l League) Prev() League {
	switch l {
	case Diamond:
		return Gold
	case Gold:
		return Bronze
	}
	return l
}

// UserLeague is the per-user league state persisted in Firestore (in prod) or
// memory (in dev). LP is the league-points counter that drives promotion and
// relegation.
type UserLeague struct {
	UserID    string    `json:"user_id" firestore:"user_id"`
	League    League    `json:"league" firestore:"league"`
	LP        int       `json:"lp" firestore:"lp"`
	UpdatedAt time.Time `json:"updated_at" firestore:"updated_at"`
}

// ApplyDelta mutates LP by delta and applies promotion/relegation rules.
// Returns whether the user was promoted or demoted.
func (u *UserLeague) ApplyDelta(delta int) (promoted, demoted bool) {
	u.LP += delta
	if u.LP >= PromoteAt && u.League != Diamond {
		u.League = u.League.Next()
		u.LP = StartingLP
		promoted = true
		return
	}
	if u.LP < DemoteAt && u.League != Bronze {
		u.League = u.League.Prev()
		u.LP = StartingLP
		demoted = true
		return
	}
	if u.LP < MinLP {
		u.LP = MinLP
	}
	if u.LP > MaxLP {
		u.LP = MaxLP
	}
	return
}

// MarshalJSON keeps lowercase enum values stable.
func (l League) MarshalJSON() ([]byte, error) {
	return json.Marshal(string(l))
}

func (l *League) UnmarshalJSON(data []byte) error {
	var s string
	if err := json.Unmarshal(data, &s); err != nil {
		return errors.New("league: expected string")
	}
	*l = FromString(s)
	return nil
}
