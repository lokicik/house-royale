package property

import "github.com/lokicik/house-royale/backend/server/internal/mlclient"

// Property is a single real-estate listing used in a game round.
// PriceTRY is the actual sale price — never sent to players until round ends.
type Property struct {
	ID            string   `json:"id"`
	Il            string   `json:"il"`
	Ilce          string   `json:"ilce"`
	Mahalle       string   `json:"mahalle"`
	MetrekareBrut float64  `json:"metrekare_brut"`
	OdaSalon      string   `json:"oda_salon"`
	BinaYasi      string   `json:"bina_yasi"`
	Kat           string   `json:"kat"`
	KatSayisi     string   `json:"kat_sayisi"`
	Isitma        string   `json:"isitma"`
	Balkon        string   `json:"balkon"`
	Asansor       string   `json:"asansor"`
	Otopark       string   `json:"otopark"`
	PriceTRY      float64  `json:"price_try"`
	ImageURLs     []string `json:"image_urls"`
}

// ToFeatures maps a Property to the mlclient.Features schema used for predictions.
func (p Property) ToFeatures() mlclient.Features {
	s := func(v string) *string { return &v }
	return mlclient.Features{
		Il:            p.Il,
		Ilce:          s(p.Ilce),
		Mahalle:       s(p.Mahalle),
		MetrekareBrut: p.MetrekareBrut,
		OdaSalon:      p.OdaSalon,
		BinaYasi:      s(p.BinaYasi),
		Kat:           s(p.Kat),
		KatSayisi:     s(p.KatSayisi),
		Isitma:        s(p.Isitma),
		Balkon:        s(p.Balkon),
		Asansor:       s(p.Asansor),
		Otopark:       s(p.Otopark),
	}
}

// All returns a copy of all fixture properties.
func All() []Property {
	out := make([]Property, len(fixtures))
	copy(out, fixtures)
	return out
}

// ByID returns the property with the given ID, or false if not found.
func ByID(id string) (Property, bool) {
	for _, p := range fixtures {
		if p.ID == id {
			return p, true
		}
	}
	return Property{}, false
}

// Random returns a pseudo-randomly selected property from the fixtures.
// Callers that need seeded randomness should use their own selection logic via All().
func Random() Property {
	return fixtures[randomIndex(len(fixtures))]
}

// PublicView is the property data sent to players during a round — actual price is omitted.
type PublicView struct {
	ID            string   `json:"id"`
	Il            string   `json:"il"`
	Ilce          string   `json:"ilce"`
	Mahalle       string   `json:"mahalle"`
	MetrekareBrut float64  `json:"metrekare_brut"`
	OdaSalon      string   `json:"oda_salon"`
	BinaYasi      string   `json:"bina_yasi"`
	Kat           string   `json:"kat"`
	KatSayisi     string   `json:"kat_sayisi"`
	Isitma        string   `json:"isitma"`
	Balkon        string   `json:"balkon"`
	Asansor       string   `json:"asansor"`
	Otopark       string   `json:"otopark"`
	ImageURLs     []string `json:"image_urls"`
}

// Public returns the property without its actual price.
func (p Property) Public() PublicView {
	urls := p.ImageURLs
	if urls == nil {
		urls = []string{}
	}
	return PublicView{
		ID: p.ID, Il: p.Il, Ilce: p.Ilce, Mahalle: p.Mahalle,
		MetrekareBrut: p.MetrekareBrut, OdaSalon: p.OdaSalon,
		BinaYasi: p.BinaYasi, Kat: p.Kat, KatSayisi: p.KatSayisi,
		Isitma: p.Isitma, Balkon: p.Balkon, Asansor: p.Asansor, Otopark: p.Otopark,
		ImageURLs: urls,
	}
}
