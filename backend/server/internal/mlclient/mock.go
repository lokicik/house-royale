package mlclient

import (
	"context"
	"math"
	"math/rand"
)

// per-model systematic bias and noise (standard deviation as fraction of base price)
var modelBias = map[string]float64{
	"mlp":         0.00,
	"ann":         -0.05,
	"hybrid":      0.08,
	"custom_ann":  -0.02,
	"transformer": 0.10,
	"tree":        -0.07,
}
var modelNoise = map[string]float64{
	"mlp":         0.15,
	"ann":         0.20,
	"hybrid":      0.12,
	"custom_ann":  0.10,
	"transformer": 0.22,
	"tree":        0.14,
}

// cityPricePerM2 holds approximate 2024 TL/m² medians by city.
var cityPricePerM2 = map[string]float64{
	"İstanbul": 90_000,
	"İzmir":    60_000,
	"Ankara":   45_000,
	"Bursa":    40_000,
	"Antalya":  50_000,
}

type MockPredictor struct{}

func NewMockPredictor() *MockPredictor { return &MockPredictor{} }

func (m *MockPredictor) Predict(_ context.Context, req PredictRequest) (*PredictResponse, error) {
	base := estimateBase(req.Features)
	predictions := make(map[string]ModelPrediction, len(req.ModelIDs))
	for _, name := range req.ModelIDs {
		bias, ok := modelBias[name]
		if !ok {
			bias = 0.0
		}
		noiseFactor, ok := modelNoise[name]
		if !ok {
			noiseFactor = 0.15
		}
		// uniform noise in [-1, 1] scaled by model's noise factor
		noise := (rand.Float64()*2 - 1) * noiseFactor
		multiplier := 1.0 + bias + noise
		if multiplier < 0.3 {
			multiplier = 0.3
		}
		// round to nearest 1 000 TL
		price := math.Round(base*multiplier/1_000) * 1_000
		predictions[name] = ModelPrediction{
			PriceTRY:   price,
			Confidence: 0,
			IsStub:     true,
		}
	}
	return &PredictResponse{Predictions: predictions}, nil
}

func estimateBase(f Features) float64 {
	perM2, ok := cityPricePerM2[f.Il]
	if !ok {
		perM2 = 60_000
	}
	return f.MetrekareBrut * perM2
}
