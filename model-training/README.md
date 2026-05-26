# 🧠 Model Training (YSA Eğitim Süreci)

Bu dizin, House Royale projesinin Yapay Sinir Ağları (YSA) eğitim sürecini, veri keşfi aşamasından başlayıp canlı tahmin altyapısına model üretmeye kadar olan tüm pipeline'ı içerir. 

Eğitim sürecinde kullanılan veri seti, veri temizliği, öznitelik mühendisliği ve kodlama (encoding) adımlarından geçirilmiş ve TensorFlow/Keras kütüphanesi kullanılarak farklı mimarilerde **8 adet model** eğitilmiştir.

---

## 📂 Dosya Yapısı ve Eğitim Adımları

Eğitim süreci 6 ana Jupyter Notebook (`.ipynb`) dosyası üzerinden sırasıyla yürütülmektedir:

### 1️⃣ [1)EDA.ipynb](file:///C:/Users/Baran/Desktop/YSA_PROJE/house-royale/model-training/1)EDA.ipynb) — Keşifçi Veri Analizi (Exploratory Data Analysis)
* **Amaç:** Scraping aşamasından gelen `train_data.csv` veri setinin genel yapısını incelemek, hedef değişken olan `fiyat` ve diğer numerik değişkenlerin dağılımlarını analiz etmek.
* **Yapılan Çalışmalar:** 
  * Fiyat verisinin Q-Q Plot (normal olasılık grafiği) ve Histogram grafikleri çizilerek dağılımın sağa çarpık (right-skewed) olduğu tespit edilmiştir.
  * Kutu grafikleri (Boxplot) kullanılarak veri setindeki aşırı yüksek ve mantıksız fiyat uç değerleri (aykırı değerler) görselleştirilmiştir.

### 2️⃣ [2)Outlier_Cleaning.ipynb](file:///C:/Users/Baran/Desktop/YSA_PROJE/house-royale/model-training/2)Outlier_Cleaning.ipynb) — Aykırı Değer Temizliği
* **Amaç:** Model eğitimini olumsuz etkileyecek uç/hatalı fiyat verilerini veri setinden uzaklaştırmak.
* **Yapılan Çalışmalar:**
  * Çeyreklikler Açıklığı (**IQR - Interquartile Range**) yöntemi uygulanmıştır.
  * Hesaplanan üst ve alt sınırlar dışındaki aykırı konut fiyatları filtrelenerek veri seti temizlenmiş ve `cleaned_data.csv` olarak kaydedilmiştir.

### 3️⃣ [3)Missing_Data_Analysis_and_Feature_Engineering.ipynb](file:///C:/Users/Baran/Desktop/YSA_PROJE/house-royale/model-training/3)Missing_Data_Analysis_and_Feature_Engineering.ipynb) — Kayıp Veri Analizi ve Öznitelik Mühendisliği
* **Amaç:** Eksik verilerin imputasyonunu yapmak ve YSA modellerinin başarısını artıracak yeni türetilmiş özellikler (features) eklemek.
* **Yapılan Çalışmalar:**
  * **Eksik Veri:** Analizler yapılarak veri setindeki eksik değerler mantıklı varsayılanlarla veya medyan/mod değerleriyle doldurulmuştur.
  * **Öznitelik Mühendisliği (Feature Engineering):**
    * `kat_orani`: Konutun bulunduğu katın binanın toplam kat sayısına oranı (`kat / kat_sayisi`).
    * `metrekare_farki`: Brüt ve net metrekare farkı (`metrekare_brut - metrekare_net`).
    * `metrekare_verimliligi`: Net alanın brüt alana oranı (`metrekare_net / metrekare_brut`).
    * `oda_salon` kolonu bölünerek `oda_sayisi`, `salon_sayisi` ve `toplam_oda` (`oda_sayisi + salon_sayisi`) özellikleri türetilmiştir.
  * **Anomali Filtreleme:** Brüt ve net alan arasında mantıksız fark olan (`metrekare_farki > 50`) hatalı kayıtlar temizlenerek veri seti `no_beylikdüzü.csv` adıyla kaydedilmiştir.

### 4️⃣ [4)Encoding.ipynb](file:///C:/Users/Baran/Desktop/YSA_PROJE/house-royale/model-training/4)Encoding.ipynb) — Kategorik Veri Kodlama (Encoding)
* **Amaç:** Kategorik metin verilerini YSA modellerinin işleyebileceği numerik formatlara dönüştürmek ve ölçeklemek.
* **Yapılan Çalışmalar:**
  * `bina_yasi` metinsel ifadeleri ("Sıfır Bina", "6 Yaşında", "5-10" vb.) sayısal yaş değerlerine dönüştürülmüştür.
  * Isıtma türleri (`isitma`) için **One-Hot Encoding** uygulanmıştır.
  * Yüksek kardinaliteye sahip konum verileri (`ilce` ve `mahalle`) için **Target Encoding** (`category_encoders.TargetEncoder`) uygulanmıştır.
  * Target encoder nesnesi `target_encoder.pkl` ve ısıtma sütunları `isitma_columns.pkl` olarak canlı servislerin kullanımı için dışa aktarılmıştır.

### 5️⃣ [5.1)Scaling_and_Training.ipynb](file:///C:/Users/Baran/Desktop/YSA_PROJE/house-royale/model-training/5.1)Scaling_and_Training.ipynb) — Başarılı Modellerin Eğitimi
* **Amaç:** Veriyi ölçeklemek, veriyi Eğitim/Doğrulama/Test setlerine bölmek ve yüksek performanslı derin öğrenme mimarileri eğitmek.
* **Yapılan Çalışmalar:**
  * Hem X girdileri hem de y (hedef fiyat) değişkeni için `StandardScaler` uygulanmıştır. Ölçekleyiciler `scaler_X.pkl` ve `scaler_y.pkl` olarak kaydedilmiştir.
  * Farklı mimarilerde üç model eğitilmiştir:
    * **model_0** (`Advanced_ResNet_Model`): Gerçek ResNet mimarisi — 2 residual blok, `Add()` kısayol bağlantıları, Swish aktivasyon, AdamW optimizer, Dropout
    * **model_1** (`Standard_Sequential_Dense_Model`, MLP Pro Plus Max): Standart ardışık derin MLP — residual bağlantı yok, ReLU aktivasyon, Adam optimizer, Dropout
    * **model_2** (`Standard_Dense_No_Dropout`, MLP Pro Plus): Standart ardışık MLP — residual bağlantı ve Dropout yok, `use_bias=False`, ReLU aktivasyon, Adam optimizer
  * En başarılı 3 model olan **model_0**, **model_1** ve **model_2** bu aşamada üretilmiş ve kaydedilmiştir.

### 6️⃣ [5.2.)Moderate_Models.ipynb](file:///C:/Users/Baran/Desktop/YSA_PROJE/house-royale/model-training/5.2.)Moderate_Models.ipynb) — Standart ve Temel Modellerin Eğitimi
* **Amaç:** Karşılaştırma ve yedekleme amacıyla standart derinlikte modeller (orta ve zayıf modeller) eğitmek.
* **Yapılan Çalışmalar:**
  * Daha az katmanlı standart MLP ağları, yüksek dropout oranlarına sahip regüle edilmiş yapılar tasarlanmıştır.
  * **model_3**, **model_4**, **model_5** (orta performans) ve **model_6**, **model_7**, **model_8** (baz/zayıf performans) modelleri bu aşamada eğitilmiştir.

---

## 🛠️ Kurulum ve Çalıştırma

Notebook dosyalarını yerel bilgisayarınızda çalıştırmak veya modelleri yeniden eğitmek için aşağıdaki adımları takip edin:

### 1. Sanal Ortamı Aktif Edin (Örnek: `sp500` Env)
Modellerin eğitildiği ve test edildiği kararlı Python ortamını kurmak için `requirements.txt` dosyasındaki kütüphaneleri yükleyebilirsiniz:

```bash
# Sanal ortamı aktif edin (conda kullanıyorsanız)
conda activate sp500

# Veya yeni bir venv oluşturun:
python -m venv .venv
source .venv/bin/activate  # Windows için: .venv\Scripts\activate

# Gerekli bağımlılıkları yükleyin
pip install -r requirements.txt
```

### 2. Notebook Dosyalarını Çalıştırma Sırası
Veri işleme ve eğitim adımlarının doğru çalışması için notebook'ları aşağıdaki sıralamada çalıştırınız:
1. `1)EDA.ipynb`
2. `2)Outlier_Cleaning.ipynb`
3. `3)Missing_Data_Analysis_and_Feature_Engineering.ipynb`
4. `4)Encoding.ipynb`
5. `5.1)Scaling_and_Training.ipynb` *(Başarılı Modeller için)*
6. `5.2.)Moderate_Models.ipynb` *(Standart/Temel Modeller için)*

---

## 🎯 Model Çıktıları ve Canlı Tahmin Entegrasyonu

Eğitilen tüm modeller (`model.keras`) ve ön işleme nesneleri (`scaler_X.pkl`, `scaler_y.pkl`, `target_encoder.pkl`, `isitma_columns.pkl`) canlı servis altyapısının tüketebileceği şekilde organize edilmiştir.

Model çıktılarının doğrulanması ve test veri seti üzerindeki hata payı analizleri için ana backend dizinindeki [run_predict.py](file:///C:/Users/Baran/Desktop/YSA_PROJE/house-royale/backend/ml-infra/run_predict.py) dosyasını inceleyebilirsiniz.