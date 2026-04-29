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
}

// scoreRound ranks players by absolute deviation and assigns points.
// Points: 1st → 3, 2nd → 2, 3rd → 1, rest → 0. Non-submitters always score 0.
func scoreRound(players map[string]*Player, guesses map[string]float64, actualPrice float64) []PlayerResult {
	results := make([]PlayerResult, 0, len(players))
	for _, p := range players {
		guess := guesses[p.ID]
		devPct := 0.0
		if actualPrice > 0 && guess > 0 {
			devPct = math.Abs(guess-actualPrice) / actualPrice * 100
		}
		results = append(results, PlayerResult{
			PlayerID:     p.ID,
			Nickname:     p.Nickname,
			Guess:        guess,
			DeviationPct: math.Round(devPct*10) / 10,
		})
	}

	// sort: submitted first, then by deviation ascending
	sort.SliceStable(results, func(i, j int) bool {
		gi, gj := guesses[results[i].PlayerID] > 0, guesses[results[j].PlayerID] > 0
		if gi != gj {
			return gi
		}
		return results[i].DeviationPct < results[j].DeviationPct
	})

	pointTable := []int{3, 2, 1}
	for i := range results {
		if guesses[results[i].PlayerID] == 0 {
			results[i].PointsEarned = 0
			continue
		}
		if i < len(pointTable) {
			results[i].PointsEarned = pointTable[i]
		}
	}
	return results
}

// buildAIResults converts raw model predictions to AIResult with deviation %.
func buildAIResults(predictions map[string]mlclient.ModelPrediction, actualPrice float64) map[string]AIResult {
	out := make(map[string]AIResult, len(predictions))
	for name, pred := range predictions {
		devPct := 0.0
		if actualPrice > 0 {
			devPct = math.Abs(pred.PriceTRY-actualPrice) / actualPrice * 100
		}
		out[name] = AIResult{
			PriceTRY:     pred.PriceTRY,
			DeviationPct: math.Round(devPct*10) / 10,
		}
	}
	return out
}
