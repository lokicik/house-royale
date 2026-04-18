# Backend

House Royale backend'i **iki bağımsız servisten** oluşur. Bu ayrım her iki teknoloji yığınının güçlü yanlarını kullanmayı mümkün kılar: Go'nun eşzamanlılık + düşük gecikme performansı oyun mantığı için, Python'un olgun ML ekosistemi ise inference için.

## Mimari

```
  ┌─────────────┐     WS      ┌──────────────────┐     HTTP       ┌──────────────────┐
  │  Frontend   │◄──────────► │      server      │ ─────────────► │     ml-infra     │
  │  (React)    │             │  (Go + Gin)      │                │ (Python+FastAPI) │
  └─────────────┘             └────────┬─────────┘                └─────────┬────────┘
                                       │                                    │
                                       ▼                                    ▼
                               ┌──────────────┐                    ┌────────────────┐
                               │   Firebase   │                    │  Model files   │
                               │ (Auth + DB)  │                    │  (.pt/.h5 ...) │
                               └──────────────┘                    └────────────────┘
```

## Servisler

### [server/](server/) — Oyun Sunucusu (Go + Gin)

- Oyun mantığı, round yönetimi, skor hesaplama
- WebSocket üzerinden oyuncularla gerçek-zamanlı iletişim
- Lobi ve oda yönetimi (singleplayer + multiplayer)
- Firebase Auth ile kimlik doğrulama
- Oyuncu tahminlerini **ml-infra**'dan gelen model tahminleriyle karşılaştırıp turu sonuçlandırma

### [ml-infra/](ml-infra/) — Inference Servisi (Python + FastAPI)

- [model-training/](../model-training/) çıktısı artifact'ları yükler
- HTTP `POST /predict` endpoint'i üzerinden tahmin sağlar
- Aynı anda birden fazla mimarinin tahminini döner (MLP, Custom ANN, Hibrit)
- Stateless — yatay ölçekleme kolaylığı

## Servisler Arası İletişim

`server` ↔ `ml-infra` arasındaki iletişim **HTTP (REST/JSON)** üzerindendir. Gelecekte gecikme hassasiyeti gerekirse gRPC'ye geçiş değerlendirilebilir.

Tipik tur akışı:

1. `server` yeni bir round oluşturur, ilan verisini seçer.
2. `server` ilan özniteliklerini (+ görsel URL'leri) `POST /predict` ile `ml-infra`'ya yollar.
3. `ml-infra` tüm lobideki modellerin tahminini tek cevapta döner.
4. Oyuncular WebSocket üzerinden kendi tahminlerini gönderir.
5. `server` gerçek fiyatla tüm tahminleri karşılaştırıp kazananı belirler ve sonucu yayımlar.

## Kurulum

Her servisin kendi bağımlılıkları vardır. Detaylar için:

- [server/README.md](server/README.md)
- [ml-infra/README.md](ml-infra/README.md)