package main

import (
	"context"
	"log"

	"cloud.google.com/go/firestore"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/lokicik/house-royale/backend/server/internal/config"
	firebasepkg "github.com/lokicik/house-royale/backend/server/internal/firebase"
	"github.com/lokicik/house-royale/backend/server/internal/handlers"
	"github.com/lokicik/house-royale/backend/server/internal/history"
	"github.com/lokicik/house-royale/backend/server/internal/hub"
	"github.com/lokicik/house-royale/backend/server/internal/leaderboard"
	"github.com/lokicik/house-royale/backend/server/internal/league"
	"github.com/lokicik/house-royale/backend/server/internal/middleware"
	"github.com/lokicik/house-royale/backend/server/internal/mlclient"
	"github.com/lokicik/house-royale/backend/server/internal/property"
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

	store := handlers.NewLobbyStore()
	sessions := handlers.NewSessionStore()
	lifecycle := handlers.NewLobbyLifecycle(store, sessions, h)
	var predictor mlclient.Predictor
	if cfg.UseMock {
		predictor = mlclient.NewMockPredictor()
		log.Printf("using in-process mock ML predictor (python ml-infra disabled)")
	} else {
		predictor = mlclient.New(cfg.MLInfraURL)
		log.Printf("ml-infra client targeting %s", cfg.MLInfraURL)
	}

	var lb leaderboard.Storer
	var hs history.Storer
	var lg league.Storer
	var fsClient *firestore.Client

	if cfg.AppEnv == "production" {
		client, err := firebasepkg.GetFirestore(context.Background())
		if err != nil {
			log.Fatalf("firestore init: %v", err)
		}
		fsClient = client
		lb = leaderboard.NewFirestoreStore(fsClient)
		hs = history.NewFirestoreStore(fsClient)
		lg = league.NewFirestoreStore(fsClient)
		property.SetFirestoreClient(fsClient)
	} else {
		lb = leaderboard.NewStore()
		hs = history.NewStore()
		lg = league.NewMemoryStore()
	}

	log.Printf("storage backend: leaderboard=%T history=%T league=%T appEnv=%s firebaseProject=%s corsOrigins=%v",
		lb, hs, lg, cfg.AppEnv, cfg.FirebaseProjectID, cfg.CORSOrigins)

	lobbyHandler := handlers.NewLobbyHandler(store, lg, lifecycle)
	wsHandler := handlers.NewWSHandler(h, store, sessions, predictor, lb, hs, lg, lifecycle)
	lbHandler := &handlers.LeaderboardHandler{LB: lb, League: lg}
	historyHandler := handlers.NewHistoryHandler(hs)
	leagueHandler := handlers.NewLeagueHandler(lg)

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.CORSOrigins,
		AllowMethods:     []string{"GET", "POST", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-Player-ID"},
		AllowCredentials: true,
	}))

	r.GET("/health", handlers.Health)
	if fsClient != nil {
		r.GET("/health/firestore", handlers.FirestoreHealth(fsClient, cfg.FirebaseProjectID))
	}
	r.POST("/auth/verify", handlers.VerifyToken)
	r.GET("/leaderboard", lbHandler.Get)

	auth := middleware.Auth()
	r.POST("/lobbies", auth, lobbyHandler.Create)
	r.GET("/lobbies", auth, lobbyHandler.List)
	r.GET("/lobbies/:id", auth, lobbyHandler.Get)
	r.GET("/history", auth, historyHandler.Get)
	r.GET("/me/league", auth, leagueHandler.GetMine)
	r.GET("/ws/lobby/:id", auth, wsHandler.ServeWS)

	log.Printf("House Royale server starting on %s (env: %s)", cfg.Port, cfg.AppEnv)
	if err := r.Run(cfg.Port); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
