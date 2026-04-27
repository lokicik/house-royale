package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/lokicik/house-royale/backend/server/internal/config"
	"github.com/lokicik/house-royale/backend/server/internal/handlers"
	"github.com/lokicik/house-royale/backend/server/internal/hub"
	"github.com/lokicik/house-royale/backend/server/internal/middleware"
)

func main() {
	_ = godotenv.Load()
	cfg := config.Load()

	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	h := hub.New()
	go h.Run()

	store := handlers.NewLobbyStore()
	lobbyHandler := handlers.NewLobbyHandler(store)
	wsHandler := handlers.NewWSHandler(h, store)

	r := gin.Default()

	r.GET("/health", handlers.Health)

	auth := middleware.Auth()
	r.POST("/lobbies", auth, lobbyHandler.Create)
	r.GET("/lobbies/:id", lobbyHandler.Get)
	r.GET("/ws/lobby/:id", auth, wsHandler.ServeWS)

	log.Printf("House Royale server starting on %s (env: %s)", cfg.Port, cfg.AppEnv)
	if err := r.Run(cfg.Port); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
