package mlclient

import "context"

// Predictor is the interface satisfied by both the real HTTP client and MockPredictor.
type Predictor interface {
	Predict(ctx context.Context, req PredictRequest) (*PredictResponse, error)
}
