# Server

House Royale'ın **oyun sunucusu**. Oyun mantığı, lobi, WebSocket oda yönetimi, skorlama ve kimlik doğrulama burada yaşar.

## Rol

- Oyuncu kimlik doğrulama (Firebase)
- Lobi ve oda yönetimi (singleplayer + multiplayer)
- Round akışı: ilan seçimi → model tahminlerini [ml-infra](../ml-infra/)'dan çekme → oyuncu tahminlerini WebSocket üzerinden toplama → gerçek fiyatla karşılaştırma → kazananı yayımlama
- Skor tablosu ve oyun istatistikleri
- Firebase üzerinde kalıcı oyuncu/maç verisi

## Stack

- **Go 1.22+**
- **Gin** — HTTP framework
- **gorilla/websocket** — WebSocket iletişimi
- **Firebase Admin SDK for Go** — auth + Firestore
- **go-resty** veya `net/http` — ml-infra'ya HTTP istemcisi

## Oyun Akışı (özet)

```
1. Oyuncu login olur (Firebase ID token → server doğrular)
2. Lobi oluşturulur / lobiye katılır
3. Host oyunu başlatır → server round loop'a girer
4. Her round için:
   a. İlan seç
   b. ml-infra POST /predict  → aktif modellerin tahminleri
   c. WebSocket ile oyunculara ilanı yolla (gerçek fiyat gizli)
   d. Süre dolunca oyuncu tahminlerini topla
   e. Mutlak sapmaları hesapla, kazananı belirle
   f. Sonuçları + model tahminlerini yayımla
5. Skorlar Firestore'a yazılır
```

## Endpoint İskeleti

### HTTP
- `POST /auth/verify` — Firebase ID token doğrulama
- `POST /lobbies` — yeni lobi oluştur
- `GET  /lobbies/:id` — lobi durumu
- `GET  /health` — liveness

### WebSocket
- `GET /ws/lobby/:id` — lobi/oyun kanalı
  - Client → Server: `JOIN`, `SUBMIT_GUESS`, `READY`
  - Server → Client: `ROUND_START`, `ROUND_RESULT`, `LEADERBOARD`, `PLAYER_JOINED/LEFT`

## Yapılandırma

`.env` ile:

```
PORT=8080
ML_INFRA_URL=http://localhost:8001
FIREBASE_CREDENTIALS=./firebase-credentials.json
```

## Kullanım (iskelet)

```bash
# Bağımlılıklar
go mod download

# Çalıştır (dev)
go run ./cmd/server

# Build
go build -o bin/server ./cmd/server
./bin/server
```