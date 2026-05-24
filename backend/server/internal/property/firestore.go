package property

import (
	"context"
	"fmt"

	"cloud.google.com/go/firestore"
	"google.golang.org/api/iterator"
)

const firestoreCollection = "game_properties"

func LoadFromFirestore(ctx context.Context, client *firestore.Client) ([]Property, error) {
	iter := client.Collection(firestoreCollection).Documents(ctx)
	defer iter.Stop()

	var props []Property
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("property.LoadFromFirestore: %w", err)
		}
		var p Property
		if err := doc.DataTo(&p); err != nil {
			continue
		}
		if p.ImageURLs == nil {
			p.ImageURLs = []string{}
		}
		props = append(props, p)
	}
	return props, nil
}
