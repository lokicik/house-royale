<div align="center">

# 🏠 House Royale

### Can you out-predict a neural network?

**A real-time multiplayer game where players go head-to-head against an ensemble of neural networks to guess Turkish real-estate prices.**

Each round, everyone sees a real property — its photos and features — and races to estimate its price. At the same time, multiple neural networks trained on ~13,000 scraped listings make their own predictions. Closest to the real price wins the round. Human intuition vs. machine learning, live.

[![Go](https://img.shields.io/badge/Go-1.22+-00ADD8?logo=go&logoColor=white)](https://go.dev/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![TensorFlow](https://img.shields.io/badge/TensorFlow%2FKeras-FF6F00?logo=tensorflow&logoColor=white)](https://www.tensorflow.org/)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Playwright](https://img.shields.io/badge/Playwright-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/)
[![License](https://img.shields.io/badge/License-See%20LICENSE-blue.svg)](LICENSE)

</div>

---

## ✨ Highlights

- 🎮 **Real-time multiplayer** — lobbies, ready-up, and live rounds over WebSockets; play solo or against friends.
- 🤖 **Human vs. AI** — players compete directly against an ensemble of neural networks, round by round.
- 🧠 **8 trained models** — a full ML pipeline from raw scraped data to a ResNet-style deep net, MLP variants, and baselines (TensorFlow/Keras).
- 🕷️ **~13k-listing dataset** — built from scratch by scraping Turkish real-estate platforms across all 81 provinces with stealth browser automation.
- 🏆 **Leagues & leaderboards** — persistent ranking, match history, and a model-vs-human performance comparison view.
- 🗺️ **Interactive district map** — Leaflet-powered map of property locations.
- ⚡ **Polyglot architecture** — Go for low-latency game logic, Python for the ML ecosystem, React for the UI.
- 🔌 **Runs out of the box** — a built-in mock predictor lets you start the whole game with zero Python/ML setup.

---

## 🎯 How It Works

```
                        ┌─── A real property is drawn from the dataset
                        ▼
   ┌──────────────────────────────────────────────────────────────┐
   │  ROUND START                                                   │
   │  • Players see the property's photos + features (price hidden) │
   │  • Neural networks predict the price simultaneously            │
   └──────────────────────────────────────────────────────────────┘
                        │
                        ▼  players submit their guesses before the timer runs out
   ┌──────────────────────────────────────────────────────────────┐
   │  ROUND RESULT                                                  │
   │  • The real price is revealed                                  │
   │  • Every guess (human + model) is scored by absolute error    │
   │  • Closest prediction wins — was it you, or the machine?       │
   └──────────────────────────────────────────────────────────────┘
                        │
                        ▼
              Scores persist → leagues, leaderboards & history update
```

---

## 🏗️ Architecture

House Royale is a **monorepo** of five cooperating components, spanning the full lifecycle from raw data to a live game.

```
   DATA & MODELS                                LIVE GAME
   ─────────────                                ─────────
  ┌────────────┐   listings   ┌──────────────┐
  │  scraping  │ ───────────► │    model-    │   trained artifacts
  │ (Node +    │              │   training   │ ─────────────┐
  │  Playwright)│              │ (TF / Keras) │              │
  └────────────┘              └──────────────┘              ▼
                                                    ┌──────────────────┐
   ┌─────────────┐    WebSocket   ┌──────────────┐  │     ml-infra     │
   │  frontend   │ ◄────────────► │    server    │  │ (Python+FastAPI) │
   │  (React 19) │                │  (Go + Gin)  │  │  model inference │
   └─────────────┘                └──────┬───────┘  └────────┬─────────┘
                                         │      HTTP /predict │
                                         │  ◄─────────────────┘
                                         ▼
                                  ┌──────────────┐
                                  │   Firebase   │
                                  │ (Auth + DB)  │
                                  └──────────────┘
```

**Why two backend services?** Go handles concurrency-heavy, low-latency game logic (rooms, timers, WebSocket fan-out); Python owns model inference where the mature ML ecosystem lives. They talk over plain HTTP/JSON.

---

## 🧰 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite 8, React Router 7, Firebase Auth SDK, Leaflet / react-leaflet, WebSocket API |
| **Game Server** | Go 1.22+, Gin, gorilla/websocket, Firebase Admin SDK (Auth + Firestore) |
| **ML Inference** | Python 3.11+, FastAPI, Uvicorn, TensorFlow/Keras, Pydantic |
| **Model Training** | TensorFlow/Keras, scikit-learn, category-encoders, pandas, Jupyter |
| **Data Scraping** | Node.js, Playwright (+ stealth), better-sqlite3 |
| **Data / Auth** | Firebase (Authentication + Firestore) |

---

## 🧠 The Machine Learning Pipeline

The dataset and models are built entirely from scratch — no off-the-shelf dataset.

### 1. Data collection ([`scraping/`](scraping/))
Stealth browser automation (Playwright + `puppeteer-extra-plugin-stealth`) collects **for-sale apartment listings across all 81 Turkish provinces**, with resume-on-interrupt progress tracking stored in SQLite.

| Source | Listings | Coverage |
|---|---|---|
| hepsiemlak.com | 3,553 | 81 provinces |
| emlakjet.com | 5,170 | 81 provinces |
| emlakjet.com (metro) | 3,991 | İstanbul / Ankara / İzmir |
| sahibinden.com | ongoing | nationwide |

Each listing captures ~30 fields: location, gross/net m², rooms, building age, floor, heating type, balcony/elevator/parking flags, dues, deed status, and more.

### 2. Training ([`model-training/`](model-training/))
A six-stage Jupyter pipeline takes raw data to deployable models:

1. **EDA** — distribution analysis (right-skewed prices, Q-Q plots, boxplots).
2. **Outlier cleaning** — IQR-based filtering of implausible prices.
3. **Missing-data + feature engineering** — imputation plus derived features (`floor_ratio`, `gross/net m² delta`, `area efficiency`, room/living-room split).
4. **Encoding** — One-Hot for heating, **Target Encoding** for high-cardinality location fields, exported as reusable artifacts.
5. **Scaling + training** — `StandardScaler` on both inputs and target; the top performers are trained here.
6. **Moderate/baseline models** — additional architectures for comparison.

**8 models** are produced across the spectrum:

| Tier | Models | Architecture |
|---|---|---|
| High performance | `model_0`–`model_2` | ResNet-style net (residual blocks, Swish, AdamW) + deep MLP variants |
| Moderate | `model_3`–`model_5` | Regularized standard MLPs |
| Baseline | `model_6`–`model_8` | Shallow reference networks |

Evaluation metrics: **MAE, RMSE, MAPE, R²**.

### 3. Serving ([`backend/ml-infra/`](backend/ml-infra/))
A stateless FastAPI service loads the trained `.keras` models and preprocessing artifacts (scalers, encoders) and answers `POST /predict` with each requested model's price estimate.

---

## 📁 Repository Structure

```
house-royale/
├── scraping/           # Node + Playwright scrapers → SQLite dataset
├── model-training/     # Jupyter pipeline: EDA → cleaning → features → training
├── backend/
│   ├── server/         # Go + Gin: game logic, lobbies, WebSocket, leagues
│   └── ml-infra/       # Python + FastAPI: model inference service
├── frontend/           # React 19 + Vite: game UI, maps, leaderboards
├── LICENSE
└── README.md
```

Every component ships with its own README:
[scraping](scraping/) · [model-training](model-training/) · [backend](backend/) · [server](backend/server/) · [ml-infra](backend/ml-infra/) · [frontend](frontend/)

---

## 🚀 Getting Started

You can run the **playable game** (frontend + Go server) without touching Python or any model files — the server ships with a built-in mock predictor that stands in for the ML service.

### Prerequisites
- [Go](https://go.dev/) 1.22+
- [Node.js](https://nodejs.org/) 18+
- (Optional, for real models) [Python](https://www.python.org/) 3.11+

### 1. Game server (Go)
```bash
cd backend/server
cp .env.example .env          # USE_MOCK_PREDICTOR=true by default — no ML setup needed
go run ./cmd/server           # serves on :8080
```

### 2. Frontend (React)
```bash
cd frontend
npm install
cp .env.example .env.local    # set your Firebase keys + VITE_API_BASE_URL
npm run dev                    # serves on :5173
```

Open <http://localhost:5173> and play. 🎉

### 3. (Optional) Real ML predictions
Bring up the inference service and point the game server at it:
```bash
cd backend/ml-infra
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# place trained models under ./models/
uvicorn app.main:app --reload --port 8001
```
Then set `USE_MOCK_PREDICTOR=false` (and `ML_INFRA_URL=http://localhost:8001`) in `backend/server/.env` and restart the server.

---

## 🖥️ Frontend Tour

| Page | What it does |
|---|---|
| **Landing** | Animated intro and entry point |
| **Login** | Firebase authentication |
| **Lobby / Lobby Room** | Create or join rooms, ready-up, and play live rounds |
| **Leaderboard** | Global rankings and league standings |
| **Model Comparison** | Average model vs. human accuracy over time |
| **Profile** | Player stats and match history |

Plus a Leaflet **district map**, light/dark theme toggle, and protected routing.

---

## 👥 Team

Built by a five-person team for the **Introduction to Artificial Neural Networks** course at **Trakya University, Department of Computer Engineering**.

| Member | Primary Focus |
|---|---|
| Ahmet Hulusi Yumuk | Data scraping, preprocessing, model training |
| Baran Taçyıldız | Model training, hyperparameter tuning, model comparison |
| İsmail Onur Ayyıldız | Frontend (React), UI/UX, model training |
| Lokman Baturay Efe | Backend (Go + Python), system architecture, model training |
| Olcay Güney | Data scraping, preprocessing, model training |

> All members contributed equally to the machine-learning workflow (data analysis, training, evaluation). The table reflects primary focus areas only.

---

## 📄 License

Released under the terms in [LICENSE](LICENSE).
