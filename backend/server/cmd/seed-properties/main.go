// seed-properties reads the CSV, picks 150 evenly-spaced rows, and writes
// them to the "game_properties" Firestore collection.
//
// Usage (from backend/server/):
//
//	FIREBASE_PROJECT_ID=houseroyale-62031 PROPERTY_CSV_PATH=../../scraping/data/no_beylikdüzü.csv \
//	  go run ./cmd/seed-properties
package main

import (
	"context"
	"flag"
	"log"
	"os"

	firebase "firebase.google.com/go/v4"
	"google.golang.org/api/option"

	"github.com/lokicik/house-royale/backend/server/internal/property"
)

func main() {
	n := flag.Int("n", 150, "number of properties to seed")
	flag.Parse()

	projectID := os.Getenv("FIREBASE_PROJECT_ID")
	if projectID == "" {
		log.Fatal("FIREBASE_PROJECT_ID env var required")
	}
	csvPath := os.Getenv("PROPERTY_CSV_PATH")
	if csvPath == "" {
		csvPath = "../../scraping/data/no_beylikdüzü.csv"
	}

	ctx := context.Background()

	var opt option.ClientOption
	if credJSON := os.Getenv("FIREBASE_CREDENTIALS_JSON"); credJSON != "" {
		opt = option.WithCredentialsJSON([]byte(credJSON))
	} else if credFile := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS"); credFile != "" {
		opt = option.WithCredentialsFile(credFile)
	}

	app, err := firebase.NewApp(ctx, &firebase.Config{ProjectID: projectID}, opt)
	if err != nil {
		log.Fatalf("firebase init: %v", err)
	}
	fsClient, err := app.Firestore(ctx)
	if err != nil {
		log.Fatalf("firestore init: %v", err)
	}
	defer fsClient.Close()

	props, err := property.LoadCSV(csvPath)
	if err != nil {
		log.Fatalf("load CSV: %v", err)
	}
	log.Printf("CSV loaded: %d rows", len(props))

	sample := evenlySample(props, *n)
	log.Printf("Seeding %d properties to Firestore...", len(sample))

	col := fsClient.Collection("game_properties")
	batch := fsClient.Batch()
	batchSize := 0
	total := 0

	for _, p := range sample {
		ref := col.Doc(p.ID)
		batch.Set(ref, p)
		batchSize++
		if batchSize == 400 {
			if _, err := batch.Commit(ctx); err != nil {
				log.Fatalf("batch commit: %v", err)
			}
			total += batchSize
			batch = fsClient.Batch()
			batchSize = 0
		}
	}
	if batchSize > 0 {
		if _, err := batch.Commit(ctx); err != nil {
			log.Fatalf("batch commit: %v", err)
		}
		total += batchSize
	}

	log.Printf("Done — %d properties written to game_properties", total)
}

func evenlySample(props []property.Property, n int) []property.Property {
	if n >= len(props) {
		return props
	}
	out := make([]property.Property, n)
	step := float64(len(props)) / float64(n)
	for i := 0; i < n; i++ {
		idx := int(float64(i) * step)
		out[i] = props[idx]
	}
	return out
}
