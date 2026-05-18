package firebase

import (
	"context"
	"os"
	"sync"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"cloud.google.com/go/firestore"
	"google.golang.org/api/option"
)

var (
	app     *firebase.App
	once    sync.Once
	initErr error
)

func Init(ctx context.Context, projectID string) error {
	once.Do(func() {
		cfg := &firebase.Config{ProjectID: projectID}

		// On non-GCP hosts (Railway, Render, Fly, etc.) there is no metadata
		// server for ADC. Accept the service-account JSON inline via env var so
		// the secret can be pasted directly into the Railway dashboard without
		// needing to upload a file.
		var opts []option.ClientOption
		if credJSON := os.Getenv("FIREBASE_CREDENTIALS_JSON"); credJSON != "" {
			opts = append(opts, option.WithCredentialsJSON([]byte(credJSON)))
		}

		var err error
		app, err = firebase.NewApp(ctx, cfg, opts...)
		if err != nil {
			initErr = err
		}
	})
	return initErr
}

func GetFirestore(ctx context.Context) (*firestore.Client, error) {
	if app == nil {
		return nil, ErrNotInitialized
	}
	return app.Firestore(ctx)
}

func GetAuth(ctx context.Context) (*auth.Client, error) {
	if app == nil {
		return nil, ErrNotInitialized
	}
	return app.Auth(ctx)
}

var ErrNotInitialized = &initError{"firebase app not initialized — call Init first"}

type initError struct{ msg string }

func (e *initError) Error() string { return e.msg }
