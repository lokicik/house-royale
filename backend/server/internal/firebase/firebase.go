package firebase

import (
	"context"
	"sync"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"cloud.google.com/go/firestore"
)

var (
	app  *firebase.App
	once sync.Once
	initErr error
)

func Init(ctx context.Context, projectID string) error {
	once.Do(func() {
		var err error
		app, err = firebase.NewApp(ctx, &firebase.Config{ProjectID: projectID})
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
