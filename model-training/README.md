# Model Training

House Royale'ın **YSA eğitim pipeline'ı**. Scraping modülünün ürettiği veri setini alır, önişleme adımlarından geçirir, birden fazla mimariyi eğitir ve inference servisinin tüketeceği model artifact'larını üretir.

## Hedef Modeller

1. **MLP (Multi-Layer Perceptron)** — tablo tabanlı öznitelikler üzerinden fiyat tahmini (baseline).
2. **Custom ANN** — özel tasarlanmış, tablo verisi için optimize edilmiş sinir ağı.
3. **Hibrit Model (ANN + MLP)** — görsel (CNN kolu) + tablo (MLP kolu) özniteliklerini birleştiren çok girdili (multi-input) mimari.

> Değerlendirme aşamasında ek modeller (XGBoost benchmark, transformer tabanlı varyantlar vb.) eklenebilir.

## Önişleme

### Eksik Veri
- Düşük eksiklik → medyan/mod ile doldurma (imputation)
- Yüksek eksiklik → sütun silme veya model tabanlı imputation (KNN Imputer)

### Aykırı Değer (Outlier)
- **IQR yöntemi** ve **Z-score** analizi
- Alan bilgisi ışığında filtreleme veya dönüştürme

### Ölçeklendirme
- **Min-Max Scaling** veya **Standard Scaling (Z-score)**
- Seçim, özniteliğin dağılımına göre yapılır

### Kategorik Kodlama
- Düşük kardinalite → **One-Hot Encoding**
- Yüksek kardinalite (ör. mahalle) → **Target Encoding**

### Feature Engineering
Türetilen yeni öznitelikler:
- Metrekare başına fiyat
- Oda başına metrekare
- Göreli kat konumu (bulunduğu kat / toplam kat)
- Bölgesel ortalama fiyat farkı

## Eğitim

| Parametre | Değer |
|---|---|
| Veri bölme | Harici test seti + %80 eğitim / %20 doğrulama |
| Kayıp fonksiyonu | MSE veya Huber Loss |
| Optimizer | Adam, RMSprop, SGD (LR scheduler ile) |
| Regularization | Dropout, Batch Normalization, L1/L2 |
| Early Stopping | Doğrulama kaybı platolaştığında |
| Hiperparametre | Grid Search veya Optuna |
| Epoch / Batch | 100–200 epoch, batch 32–64 (early stopping ile ayar) |
| Donanım | Google Colab / Kaggle GPU |

## Başarı Metrikleri

| Metrik | Açıklama | Seçilme Nedeni |
|---|---|---|
| **MAE** | Ortalama mutlak hata (TL) | Yorumlanabilirlik; gerçek fiyat farkını gösterir |
| **RMSE** | Kök ortalama kare hata | Büyük hataları cezalandırır; uç değerlere duyarlı |
| **MAPE** | Yüzdesel mutlak hata | Ölçekten bağımsız; fiyat aralıklarını karşılaştırır |
| **R²** | Belirtme katsayısı | Modelin varyansı ne oranda açıkladığını gösterir |

## Çıktılar

Eğitilmiş modeller `artifacts/` altında saklanır ve [backend/ml-infra/](../backend/ml-infra/) tarafından yüklenir:

- `*.pt` / `*.pth` — PyTorch
- `*.h5` / `.keras` — TensorFlow/Keras
- `*.onnx` — çerçeveden bağımsız export (opsiyonel)

Boyut nedeniyle artifact'lar `.gitignore`'da — paylaşım için Git LFS veya harici storage kullanılır.

## Kullanım (iskelet)

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Önişleme
python -m src.preprocess --input ../scraping/data/processed/dataset.csv --output data/clean.csv

# Eğitim
python -m src.train --model mlp --config configs/mlp.yaml
python -m src.train --model hybrid --config configs/hybrid.yaml

# Hiperparametre arama
python -m src.tune --model mlp --trials 50
```