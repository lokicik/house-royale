// One-off admin tool that wipes the Firestore "leaderboard_stats" collection so
// the league rollout starts from a clean slate.
//
// Usage:
//
//	APP_ENV=production FIREBASE_PROJECT_ID=<id> go run ./cmd/reset-leaderboard
//
// Add --include-history to also clear game_history (per-user game records).
package main

import (
	"context"
	"flag"
	"log"

	"cloud.google.com/go/firestore"
	"github.com/joho/godotenv"
	"github.com/lokicik/house-royale/backend/server/internal/config"
	firebasepkg "github.com/lokicik/house-royale/backend/server/internal/firebase"
	"google.golang.org/api/iterator"
)

func main() {
	_ = godotenv.Load()
	cfg := config.Load()

	includeHistory := flag.Bool("include-history", false, "also wipe per-user game_history")
	flag.Parse()

	if cfg.FirebaseProjectID == "" {
		log.Fatal("FIREBASE_PROJECT_ID must be set")
	}

	ctx := context.Background()
	if err := firebasepkg.Init(ctx, cfg.FirebaseProjectID); err != nil {
		log.Fatalf("firebase init: %v", err)
	}
	client, err := firebasepkg.GetFirestore(ctx)
	if err != nil {
		log.Fatalf("firestore init: %v", err)
	}
	defer client.Close()

	if err := wipe(ctx, client, "leaderboard_stats"); err != nil {
		log.Fatalf("wipe leaderboard_stats: %v", err)
	}
	if *includeHistory {
		if err := wipe(ctx, client, "game_history"); err != nil {
			log.Fatalf("wipe game_history: %v", err)
		}
	}
	log.Println("done.")
}

// wipe deletes every document at the top of the given collection. For nested
// subcollections add per-doc recursion — not needed for current schema.
func wipe(ctx context.Context, client *firestore.Client, collection string) error {
	const batchSize = 100
	deleted := 0
	for {
		iter := client.Collection(collection).Limit(batchSize).Documents(ctx)
		batch := client.Batch()
		count := 0
		for {
			doc, err := iter.Next()
			if err == iterator.Done {
				break
			}
			if err != nil {
				iter.Stop()
				return err
			}
			batch.Delete(doc.Ref)
			count++
		}
		iter.Stop()
		if count == 0 {
			log.Printf("%s: deleted %d docs total", collection, deleted)
			return nil
		}
		if _, err := batch.Commit(ctx); err != nil {
			return err
		}
		deleted += count
		log.Printf("%s: deleted batch of %d (running total %d)", collection, count, deleted)
	}
}
