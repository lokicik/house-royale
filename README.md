# House Royale

**Yapay Zekâ Destekli Emlak Fiyat Tahmin Oyunu**

Türkiye emlak piyasasından gerçek ilan verileriyle eğitilmiş çoklu yapay sinir ağı modellerini, oyuncuların kendi tahminleriyle karşılaştırdığı oyunlaştırılmış (gamified) bir web uygulaması. Oyuncular her turda bir evin fotoğraflarına ve özelliklerine bakarak fiyat tahmini yapar; aynı anda lobideki farklı YSA modelleri de tahmin yapar. En yakın tahmini yapan turu kazanır.

Proje, **Trakya Üniversitesi Bilgisayar Mühendisliği Bölümü — Yapay Sinir Ağlarına Giriş** dersi kapsamında geliştirilmektedir.

---

## Takım

| Üye | Birincil Odak Alanı |
|---|---|
| Ahmet Hulusi Yumuk | Veri toplama (scraping), veri önişleme, model eğitimi |
| Baran Taçyıldız | Model eğitimi, hiperparametre optimizasyonu, model karşılaştırma |
| İsmail Onur Ayyıldız | Frontend geliştirme (React), UI/UX tasarımı, model eğitimi |
| Lokman Baturay Efe | Backend geliştirme (Go + Python), sistem mimarisi, model eğitimi |
| Olcay Güney | Veri toplama (scraping), veri önişleme, model eğitimi |

Tüm üyeler makine öğrenmesi / derin öğrenme süreçlerine (veri analizi, model eğitimi, değerlendirme) eşit katkı sağlar. Tablo yalnızca birincil odakları gösterir.

---

## Mimari

```
┌──────────────┐        ┌───────────────────┐        ┌────────────────────┐
│   Frontend   │  WS    │  Backend / Server │  HTTP  │  Backend / ML-Infra│
│   (React)    │◄──────►│     (Go / Gin)    │◄──────►│ (Python / FastAPI) │
└──────────────┘        └───────────────────┘        └──────────┬─────────┘
                                  │                             │
                                  ▼                             ▼
                         ┌─────────────────┐          ┌───────────────────┐
                         │    Firebase     │          │ Eğitilmiş Modeller│
                         │ (Auth + DB)     │          │  (.pt / .h5 ...)  │
                         └─────────────────┘          └─────────┬─────────┘
                                                                │
                                                                │ artifact
                                                                ▼
                                     ┌─────────────┐   ┌────────────────┐
                                     │  Scraping   │──►│ Model Training │
                                     │  (Python)   │   │  (PyTorch/TF)  │
                                     └─────────────┘   └────────────────┘
```

---

## Monorepo Yapısı

```
house-royale/
├── scraping/           # Emlak platformlarından veri toplama
├── model-training/     # YSA model eğitim pipeline'ı
├── backend/
│   ├── server/         # Go + Gin: oyun mantığı, WebSocket
│   └── ml-infra/       # Python + FastAPI: model inference
├── frontend/           # React: oyun UI
├── LICENSE
└── README.md
```

Her bileşenin kendi README'si vardır:

- [scraping/](scraping/) — Veri toplama
- [model-training/](model-training/) — Model eğitimi
- [backend/](backend/) — Backend çatı doküman
  - [backend/server/](backend/server/) — Go oyun sunucusu
  - [backend/ml-infra/](backend/ml-infra/) — Python inference servisi
- [frontend/](frontend/) — React istemci

---

## Teknolojiler

| Katman | Teknoloji | Açıklama |
|---|---|---|
| Frontend | React | Oyun UI, lobi, skor tablosu |
| Backend (API) | Go (Gin) | Oyun mantığı, WebSocket, oda yönetimi |
| ML Servisi | Python (FastAPI) | Model inference, tahmin API'si |
| ML Framework | PyTorch / TensorFlow | Model eğitimi ve değerlendirme |
| Veri Toplama | Python (Scrapy / Selenium / BeautifulSoup) | Data Scraping |
| Veritabanı | Firebase | Veri ve kullanıcı yönetimi |

---

## Modeller

- **MLP (Multi-Layer Perceptron)** — tablo tabanlı baseline model
- **Custom ANN** — özelleştirilmiş yapay sinir ağı
- **Hibrit (ANN + MLP)** — görsel + tablo tabanlı öznitelikleri birleştiren çok girdili mimari

Başarı metrikleri: **MAE, RMSE, MAPE, R²**. Detaylar için [model-training/README.md](model-training/README.md).

---

## Başlarken

Her alt-proje bağımsız şekilde geliştirilir ve kendi bağımlılıklarına sahiptir. Kurulum adımları için ilgili klasörün README'sine bakın:

- Veri toplamak için → [scraping/README.md](scraping/README.md)
- Model eğitmek için → [model-training/README.md](model-training/README.md)
- Oyun sunucusunu çalıştırmak için → [backend/server/README.md](backend/server/README.md)
- Inference servisini çalıştırmak için → [backend/ml-infra/README.md](backend/ml-infra/README.md)
- Frontend'i geliştirmek için → [frontend/README.md](frontend/README.md)

---

## Proje Künyesi

Resmi proje künyesi için bkz. [house_royale_proje_kunyesi.docx](house_royale_proje_kunyesi.docx).

## Lisans

Bu proje [LICENSE](LICENSE) dosyasında belirtilen lisans altında yayımlanmıştır.
