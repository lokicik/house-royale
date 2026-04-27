package config

import "os"

type Config struct {
	Port       string
	MLInfraURL string
	AppEnv     string
}

func Load() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = ":8080"
	}
	mlURL := os.Getenv("ML_INFRA_URL")
	if mlURL == "" {
		mlURL = "http://localhost:8001"
	}
	appEnv := os.Getenv("APP_ENV")
	if appEnv == "" {
		appEnv = "development"
	}
	return &Config{Port: port, MLInfraURL: mlURL, AppEnv: appEnv}
}
