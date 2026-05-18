package game

import (
	"math"
	"sort"

	"github.com/lokicik/house-royale/backend/server/internal/mlclient"
)

// PlayerResult holds one player's outcome for a single round.
type PlayerResult struct {
	PlayerID     string  `json:"player_id"`
	Nickname     string  `json:"nickname"`
	Guess        float64 `json:"guess"`
	DeviationPct float64 `json:"deviation_pct"`
	PointsEarned int     `json:"points_earned"`
}

// AIResult holds one model's prediction outcome for a single round.
type AIResult struct {
	PriceTRY     float64 `json:"price_try"`
	DeviationPct float64 `json:"deviation_pct"`
	PointsEarned int     `json:"points_earned"`
}

// scoreRound ranks players and AI models together by absolute deviation and
// assigns points (1st→3, 2nd→2, 3rd→1). Non-submitting humans get 0 points.
func scoreRound(
	players map[string]*Player,
	guesses map[string]float64,
	aiPredictions map[string]mlclient.ModelPrediction,
	actualPrice float64,
) ([]PlayerResult, map[string]AIResult) {

	type entry struct {
		id       string
		nickname string
		price    float64
		devPct   float64
		isAI     bool
	}

	devOf := func(price float64) float64 {
		if actualPrice <= 0 || price <= 0 {
			return 0
		}
		return math.Round(math.Abs(price-actualPrice)/actualPrice*100*10) / 10
	}

	var unified []entry

	for _, p := range players {
		g := guesses[p.ID]
		unified = append(unified, entry{
			id:       p.ID,
			nickname: p.Nickname,
			price:    g,
			devPct:   devOf(g),
		})
	}
	for name, pred := range aiPredictions {
		unified = append(unified, entry{
			id:       "ai:" + name,
			nickname: name,
			price:    pred.PriceTRY,
			devPct:   devOf(pred.PriceTRY),
			isAI:     true,
		})
	}

	// Sort: submitted (price > 0) first, then by deviation ascending.
	sort.SliceStable(unified, func(i, j int) bool {
		si, sj := unified[i].price > 0, unified[j].price > 0
		if si != sj {
			return si
		}
		return unified[i].devPct < unified[j].devPct
	})

	// Assign points to the first 3 submitted entries in ranking order.
	pointTable := []int{3, 2, 1}
	pts := make(map[string]int, len(unified))
	rank := 0
	for _, e := range unified {
		if e.price <= 0 {
			break
		}
		if rank < len(pointTable) {
			pts[e.id] = pointTable[rank]
		}
		rank++
	}

	// Build human results.
	humanResults := make([]PlayerResult, 0, len(players))
	for _, p := range players {
		g := guesses[p.ID]
		humanResults = append(humanResults, PlayerResult{
			PlayerID:     p.ID,
			Nickname:     p.Nickname,
			Guess:        g,
			DeviationPct: devOf(g),
			PointsEarned: pts[p.ID],
		})
	}
	// Re-sort human results: submitted first, then by deviation.
	sort.SliceStable(humanResults, func(i, j int) bool {
		gi, gj := humanResults[i].Guess > 0, humanResults[j].Guess > 0
		if gi != gj {
			return gi
		}
		return humanResults[i].DeviationPct < humanResults[j].DeviationPct
	})

	// Build AI results.
	aiResults := make(map[string]AIResult, len(aiPredictions))
	for name, pred := range aiPredictions {
		aiResults[name] = AIResult{
			PriceTRY:     pred.PriceTRY,
			DeviationPct: devOf(pred.PriceTRY),
			PointsEarned: pts["ai:"+name],
		}
	}

	return humanResults, aiResults
}

// allSubmitted returns true when every current player has a non-zero guess,
// or when no players remain in the lobby (all disconnected).
func allSubmitted(guesses map[string]float64, current map[string]*Player) bool {
	if len(current) == 0 {
		return true
	}
	for id := range current {
		if guesses[id] == 0 {
			return false
		}
	}
	return true
}
