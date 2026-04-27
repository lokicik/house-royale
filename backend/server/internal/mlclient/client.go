package mlclient

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// Features mirrors app/schemas/predict.py — tüm alanlar scraping DB şemasından türetilmiştir.
type Features struct {
	// Konum
	Il       string  `json:"il"`
	Ilce     *string `json:"ilce,omitempty"`
	Mahalle  *string `json:"mahalle,omitempty"`
	KonumHam *string `json:"konum_ham,omitempty"`

	// Alan
	MetrekareBrut float64  `json:"metrekare_brut"`
	MetrekareNet  *float64 `json:"metrekare_net,omitempty"`

	// Oda — "3+1", "2+1" gibi ham text
	OdaSalon string `json:"oda_salon"`

	// Bina — text değerler (ör. "0-5 yıl", "Giriş Kat")
	BinaYasi  *string `json:"bina_yasi,omitempty"`
	Kat       *string `json:"kat,omitempty"`
	KatSayisi *string `json:"kat_sayisi,omitempty"`

	// Özellikler
	Isitma         *string `json:"isitma,omitempty"`
	BanyoSayisi    *string `json:"banyo_sayisi,omitempty"`
	Balkon         *string `json:"balkon,omitempty"`          // "Var" / "Yok"
	Asansor        *string `json:"asansor,omitempty"`         // "Var" / "Yok"
	Otopark        *string `json:"otopark,omitempty"`         // "Var" / "Yok"
	Esyali         *string `json:"esyali,omitempty"`          // "Evet" / "Hayır"
	KullanimDurumu *string `json:"kullanim_durumu,omitempty"`

	// Site / Kompleks
	SiteIcerisinde *string `json:"site_icerisinde,omitempty"` // "Evet" / "Hayır"
	Aidat          *string `json:"aidat,omitempty"`

	// Yasal / Satıcı
	KrediyeUygun *string `json:"krediye_uygun,omitempty"`
	TapuDurumu   *string `json:"tapu_durumu,omitempty"`
	Kimden       *string `json:"kimden,omitempty"` // "Sahibinden" / "Emlakçıdan"
}

type PredictRequest struct {
	ModelIDs  []string `json:"model_ids"`
	Features  Features `json:"features"`
	ImageURLs []string `json:"image_urls"`
}

type ModelPrediction struct {
	PriceTRY   float64 `json:"price_try"`
	Confidence float64 `json:"confidence"`
	IsStub     bool    `json:"is_stub"`
}

type PredictResponse struct {
	Predictions map[string]ModelPrediction `json:"predictions"`
}

type Client struct {
	baseURL string
	http    *http.Client
}

func New(baseURL string) *Client {
	return &Client{
		baseURL: baseURL,
		http:    &http.Client{Timeout: 10 * time.Second},
	}
}

func (c *Client) Predict(ctx context.Context, req PredictRequest) (*PredictResponse, error) {
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("mlclient marshal: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/predict", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("mlclient new request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("mlclient do: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("mlclient: ml-infra responded %d", resp.StatusCode)
	}

	var result PredictResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("mlclient decode: %w", err)
	}
	return &result, nil
}
