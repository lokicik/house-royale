package config

import (
	"os"
	"strings"
)

type Config struct {
	Port              string
	MLInfraURL        string
	AppEnv            string
	FirebaseProjectID string
	CORSOrigins       []string
}

func Load() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	if port[0] != ':' {
		port = ":" + port
	}
	mlURL := os.Getenv("ML_INFRA_URL")
	if mlURL == "" {
		mlURL = "http://localhost:8001"
	}
	appEnv := os.Getenv("APP_ENV")
	if appEnv == "" {
		appEnv = "development"
	}
	corsRaw := os.Getenv("CORS_ORIGIN")
	if corsRaw == "" {
		corsRaw = "http://localhost:5173"
	}
	corsOrigins := strings.Split(corsRaw, ",")
	for i, o := range corsOrigins {
		corsOrigins[i] = strings.TrimSpace(o)
	}
	return &Config{
		Port:              port,
		MLInfraURL:        mlURL,
		AppEnv:            appEnv,
		FirebaseProjectID: os.Getenv("FIREBASE_PROJECT_ID"),
		CORSOrigins:       corsOrigins,
	}
}
