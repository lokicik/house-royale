# Frontend

House Royale'ın **React tabanlı oyun arayüzü**. Oyuncu, modellerle karşılaştırmalı fiyat tahmini yaptığı tur bazlı oyunu bu istemci üzerinden oynar.

## Stack

- **React 18+**
- **Vite** — dev sunucusu + build
- **TypeScript**
- **Firebase Auth SDK** — kimlik doğrulama
- **WebSocket API** — [backend/server](../backend/server/) ile gerçek-zamanlı iletişim
- State: React Context veya Zustand (karar sonradan)
- Stil: TBD (Tailwind / CSS modules)

## Sayfalar

| Sayfa | Açıklama |
|---|---|
| **Login** | Firebase ile giriş / kayıt |
| **Lobi** | Oda oluşturma, odaya katılma, oyuncu listesi, oyuna hazır durumu |
| **Oyun (Round)** | İlan fotoğrafları + öznitelikler, fiyat tahmin girişi, geri sayım |
| **Round Sonucu** | Gerçek fiyat, oyuncu sapmaları, model tahminleri yan yana |
| **Skor Tablosu** | Oyun sonu liderlik, model vs. insan performansı |
| **Model Karşılaştırma** | Geçmiş turlarda modellerin ortalama MAE/MAPE görünümü |

## Backend ile İletişim

- **Auth**: Firebase ID token alınır → `POST /auth/verify` ile server'a doğrulatılır.
- **Lobi/Oyun**: `GET /ws/lobby/:id` WebSocket kanalı üzerinden `ROUND_START` / `SUBMIT_GUESS` / `ROUND_RESULT` mesajlaşması.
- Bkz. [backend/server/README.md](../backend/server/README.md).

## Yapılandırma

`.env.local` ile:

```
VITE_API_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=...
```

## Kullanım (iskelet)

```bash
npm install

# Dev sunucusu
npm run dev

# Prod build
npm run build
npm run preview

# Testler
npm test
```