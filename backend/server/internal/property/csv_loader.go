package property

import (
	"encoding/csv"
	"fmt"
	"io"
	"log"
	"os"
	"strconv"
	"strings"
)

// LoadCSV reads a property CSV and returns a slice of Property suitable for
// game rounds. The CSV is already feature-engineered: oda_salon is split into
// oda_sayisi / salon_sayisi, `il` is missing (dataset is İstanbul-only), and
// amenity fields (balkon, asansor, otopark, image_urls) are not in the CSV.
// We reconstruct oda_salon as "<oda>+<salon>" and leave the amenities blank;
// the ml-infra preprocessor handles missing values via medians and defaults.
func LoadCSV(path string) ([]Property, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("open %s: %w", path, err)
	}
	defer f.Close()

	r := csv.NewReader(f)
	r.FieldsPerRecord = -1
	header, err := r.Read()
	if err != nil {
		return nil, fmt.Errorf("read header: %w", err)
	}
	idx := make(map[string]int, len(header))
	for i, h := range header {
		idx[strings.TrimSpace(h)] = i
	}

	required := []string{"fiyat", "metrekare_brut", "bina_yasi", "kat", "kat_sayisi", "isitma", "ilce", "mahalle", "oda_sayisi", "salon_sayisi"}
	for _, col := range required {
		if _, ok := idx[col]; !ok {
			return nil, fmt.Errorf("required column %q missing", col)
		}
	}

	getStr := func(row []string, col string) string {
		i, ok := idx[col]
		if !ok || i >= len(row) {
			return ""
		}
		return strings.TrimSpace(row[i])
	}
	getFloat := func(row []string, col string) (float64, bool) {
		s := getStr(row, col)
		if s == "" {
			return 0, false
		}
		v, err := strconv.ParseFloat(s, 64)
		if err != nil {
			return 0, false
		}
		return v, true
	}

	var props []Property
	rowIdx := 0
	skipped := 0
	for {
		row, err := r.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			skipped++
			continue
		}

		fiyat, ok := getFloat(row, "fiyat")
		if !ok || fiyat <= 0 {
			skipped++
			rowIdx++
			continue
		}
		brut, ok := getFloat(row, "metrekare_brut")
		if !ok || brut <= 0 {
			skipped++
			rowIdx++
			continue
		}
		oda, _ := getFloat(row, "oda_sayisi")
		salon, _ := getFloat(row, "salon_sayisi")
		odaSalon := fmt.Sprintf("%d+%d", int(oda), int(salon))

		kat := getStr(row, "kat")
		if f, ok := getFloat(row, "kat"); ok {
			kat = strconv.Itoa(int(f))
		}
		katSayisi := getStr(row, "kat_sayisi")
		if f, ok := getFloat(row, "kat_sayisi"); ok {
			katSayisi = strconv.Itoa(int(f))
		}

		var mnet float64
		if v, ok := getFloat(row, "metrekare_net"); ok && v > 0 {
			mnet = v
		}
		banyo := ""
		if v, ok := getFloat(row, "banyo_sayisi"); ok && v > 0 {
			banyo = strconv.Itoa(int(v))
		}

		props = append(props, Property{
			ID:            fmt.Sprintf("csv-%d", rowIdx),
			Il:            "İstanbul",
			Ilce:          getStr(row, "ilce"),
			Mahalle:       getStr(row, "mahalle"),
			MetrekareBrut: brut,
			MetrekareNet:  mnet,
			OdaSalon:      odaSalon,
			BinaYasi:      getStr(row, "bina_yasi"),
			Kat:           kat,
			KatSayisi:     katSayisi,
			Isitma:        getStr(row, "isitma"),
			BanyoSayisi:   banyo,
			PriceTRY:      fiyat,
			ImageURLs:     []string{},
		})
		rowIdx++
	}

	log.Printf("property.LoadCSV path=%s loaded=%d skipped=%d", path, len(props), skipped)
	return props, nil
}
