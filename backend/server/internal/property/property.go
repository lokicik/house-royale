package property

import (
	"context"
	"log"
	"os"
	"sync"

	"cloud.google.com/go/firestore"
	"github.com/lokicik/house-royale/backend/server/internal/mlclient"
)

// Property is a single real-estate listing used in a game round.
// PriceTRY is the actual sale price — never sent to players until round ends.
type Property struct {
	ID            string   `json:"id"`
	Il            string   `json:"il"`
	Ilce          string   `json:"ilce"`
	Mahalle       string   `json:"mahalle"`
	MetrekareBrut float64  `json:"metrekare_brut"`
	MetrekareNet  float64  `json:"metrekare_net"`
	OdaSalon      string   `json:"oda_salon"`
	BinaYasi      string   `json:"bina_yasi"`
	Kat           string   `json:"kat"`
	KatSayisi     string   `json:"kat_sayisi"`
	Isitma        string   `json:"isitma"`
	BanyoSayisi   string   `json:"banyo_sayisi"`
	Balkon        string   `json:"balkon"`
	Asansor       string   `json:"asansor"`
	Otopark       string   `json:"otopark"`
	PriceTRY      float64  `json:"price_try"`
	ImageURLs     []string `json:"image_urls"`
}

// ToFeatures maps a Property to the mlclient.Features schema used for predictions.
func (p Property) ToFeatures() mlclient.Features {
	s := func(v string) *string { return &v }
	f := mlclient.Features{
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
	if p.MetrekareNet > 0 {
		f.MetrekareNet = &p.MetrekareNet
	}
	if p.BanyoSayisi != "" {
		f.BanyoSayisi = s(p.BanyoSayisi)
	}
	return f
}

var (
	loadOnce   sync.Once
	properties []Property
	fsClient   *firestore.Client
)

// SetFirestoreClient wires a Firestore client so All() loads from the
// "game_properties" collection instead of the local CSV. Call before first All().
func SetFirestoreClient(c *firestore.Client) {
	fsClient = c
}

const defaultCSVPath = "scraping/data/no_beylikdüzü.csv"

func loadProperties() []Property {
	if fsClient != nil {
		props, err := LoadFromFirestore(context.Background(), fsClient)
		if err == nil && len(props) > 0 {
			log.Printf("property.loadProperties loaded=%d from Firestore", len(props))
			return props
		}
		log.Printf("property.loadProperties Firestore load failed: %v — falling back to CSV", err)
	}

	path := os.Getenv("PROPERTY_CSV_PATH")
	if path == "" {
		path = defaultCSVPath
	}
	props, err := LoadCSV(path)
	if err != nil {
		log.Printf("property.loadProperties CSV load failed path=%s err=%v — falling back to %d hardcoded fixtures", path, err, len(fixtures))
		out := make([]Property, len(fixtures))
		copy(out, fixtures)
		return out
	}
	if len(props) == 0 {
		log.Printf("property.loadProperties CSV had 0 usable rows — falling back to %d hardcoded fixtures", len(fixtures))
		out := make([]Property, len(fixtures))
		copy(out, fixtures)
		return out
	}
	return props
}

// All returns a copy of all properties (loaded lazily on first call).
func All() []Property {
	loadOnce.Do(func() {
		properties = loadProperties()
	})
	out := make([]Property, len(properties))
	copy(out, properties)
	return out
}

// ByID returns the property with the given ID, or false if not found.
func ByID(id string) (Property, bool) {
	for _, p := range All() {
		if p.ID == id {
			return p, true
		}
	}
	return Property{}, false
}

// Random returns a pseudo-randomly selected property.
// Callers that need seeded randomness should use their own selection logic via All().
func Random() Property {
	props := All()
	return props[randomIndex(len(props))]
}

// PublicView is the property data sent to players during a round — actual price is omitted.
// Only fields present in the training dataset are exposed.
type PublicView struct {
	ID            string   `json:"id"`
	Il            string   `json:"il"`
	Ilce          string   `json:"ilce"`
	Mahalle       string   `json:"mahalle"`
	MetrekareBrut float64  `json:"metrekare_brut"`
	MetrekareNet  float64  `json:"metrekare_net"`
	OdaSalon      string   `json:"oda_salon"`
	BinaYasi      string   `json:"bina_yasi"`
	Kat           string   `json:"kat"`
	KatSayisi     string   `json:"kat_sayisi"`
	Isitma        string   `json:"isitma"`
	BanyoSayisi   string   `json:"banyo_sayisi"`
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
		MetrekareBrut: p.MetrekareBrut, MetrekareNet: p.MetrekareNet,
		OdaSalon: p.OdaSalon, BinaYasi: p.BinaYasi,
		Kat: p.Kat, KatSayisi: p.KatSayisi,
		Isitma: p.Isitma, BanyoSayisi: p.BanyoSayisi,
		ImageURLs: urls,
	}
}
