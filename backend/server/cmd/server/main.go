package main

import (
	"context"
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/lokicik/house-royale/backend/server/internal/config"
	firebasepkg "github.com/lokicik/house-royale/backend/server/internal/firebase"
	"github.com/lokicik/house-royale/backend/server/internal/handlers"
	"github.com/lokicik/house-royale/backend/server/internal/hub"
	"github.com/lokicik/house-royale/backend/server/internal/middleware"
)

func main() {
	_ = godotenv.Load()
	cfg := config.Load()

	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
		if err := firebasepkg.Init(context.Background(), cfg.FirebaseProjectID); err != nil {
			log.Fatalf("firebase init: %v", err)
		}
	}

	h := hub.New()
	go h.Run()

	store := handlers.NewLobbyStore()
	lobbyHandler := handlers.NewLobbyHandler(store)
	wsHandler := handlers.NewWSHandler(h, store)

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-Player-ID"},
		AllowCredentials: true,
	}))

	r.GET("/health", handlers.Health)
	r.POST("/auth/verify", handlers.VerifyToken)

	auth := middleware.Auth()
	r.POST("/lobbies", auth, lobbyHandler.Create)
	r.GET("/lobbies/:id", lobbyHandler.Get)
	r.GET("/ws/lobby/:id", auth, wsHandler.ServeWS)

	log.Printf("House Royale server starting on %s (env: %s)", cfg.Port, cfg.AppEnv)
	if err := r.Run(cfg.Port); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
