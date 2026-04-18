# ML-Infra

House Royale'ın **inference servisi**. Eğitilmiş modelleri bellekte tutar ve oyun sunucusunun gönderdiği ilan verileri için fiyat tahmini üretir.

## Rol

- **Girdi**: ilan öznitelikleri (tablo) + opsiyonel görsel URL'leri
- **Çıktı**: lobideki her aktif modelin tahmin ettiği fiyat
- **Stateless** — konteyner başına N kopya yatay ölçeklenebilir

## Stack

- **Python 3.11+**
- **FastAPI** — HTTP API çerçevesi
- **Uvicorn** — ASGI sunucusu
- **PyTorch** ve/veya **TensorFlow** — model runtime
- **Pydantic** — request/response validation
- **Pillow / torchvision** — görsel ön-işleme

## Endpoint İskeleti

### `GET /models`
Yüklü ve tahmin üretmeye hazır modellerin listesi.

```json
{
  "models": [
    {"id": "mlp-v1", "type": "MLP", "trained_at": "2026-04-10"},
    {"id": "custom-ann-v1", "type": "CustomANN", "trained_at": "2026-04-12"},
    {"id": "hybrid-v1", "type": "Hybrid", "trained_at": "2026-04-15"}
  ]
}
```

### `POST /predict`
Verilen ilan için seçili modellerin tahminlerini döner.

```json
// request
{
  "model_ids": ["mlp-v1", "hybrid-v1"],
  "features": {
    "il": "Edirne", "ilce": "Merkez", "brut_m2": 120, "net_m2": 105,
    "oda": 3, "salon": 1, "bina_yasi": 8, "kat": 3, "toplam_kat": 5,
    "isitma": "dogalgaz", "cephe": "guney", "site_ici": false
  },
  "image_urls": ["https://..."]
}

// response
{
  "predictions": {
    "mlp-v1":    {"price_try": 3850000, "confidence": 0.81},
    "hybrid-v1": {"price_try": 4010000, "confidence": 0.87}
  }
}
```

### `GET /health`
Kubernetes/ALB liveness probe'u için basit 200 OK.

## Model Artifact'ları

- Modeller `models/` altında saklanır (repo'da değil — `.gitignore`'lanır)
- [model-training/](../../model-training/) pipeline'ının ürettiği dosyalar deploy aşamasında buraya kopyalanır veya harici object storage'dan çekilir
- Yeni model sürümleri **model ID'si + versiyon** ile isimlendirilir

## Kullanım (iskelet)

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Model dosyalarını ./models/ altına yerleştirin
uvicorn app.main:app --reload --port 8001
```