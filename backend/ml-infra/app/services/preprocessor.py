import joblib
import pandas as pd
import numpy as np
from pathlib import Path

from app.schemas.predict import Features

class Preprocessor:
    def __init__(self, artifacts_dir: Path):
        self.artifacts_dir = artifacts_dir
        self.target_encoder = None
        self.isitma_columns = None
        self.scaler_X = None
        self.scaler_y = None
        self.expected_features = None

    def load_artifacts(self):
        self.target_encoder = joblib.load(self.artifacts_dir / 'target_encoder.pkl')
        self.isitma_columns = joblib.load(self.artifacts_dir / 'isitma_columns.pkl')
        self.scaler_X = joblib.load(self.artifacts_dir / 'scaler_X.pkl')
        self.scaler_y = joblib.load(self.artifacts_dir / 'scaler_y.pkl')
        
        # Beklenen özellik listesini scaler'dan öğreniyoruz (sayı olarak)
        # Sütun sırası notebook 5'te gördüğümüz sıradır:
        self.expected_features = [
            'metrekare_brut', 'metrekare_net', 'bina_yasi', 'kat', 'kat_sayisi', 
            'banyo_sayisi', 'ilce', 'mahalle', 'kat_orani', 'metrekare_farki', 
            'metrekare_verimliligi', 'oda_sayisi', 'salon_sayisi', 'toplam_oda'
        ] + self.isitma_columns

    def _clean_bina_yasi(self, yas: str) -> float:
        if not yas or pd.isna(yas):
            return 0.0 # Varsayılan
        yas = str(yas).lower()
        if 'sıfır' in yas or 'yeni' in yas or yas == '0': return 0.0
        if 'yaşında' in yas: return float(yas.split()[0])
        if '5-10' in yas: return 7.5
        if '11-15' in yas: return 13.0
        if '16-20' in yas: return 18.0
        if '21 ve üzeri' in yas: return 25.0
        try:
            return float(yas)
        except:
            return 0.0

    def preprocess(self, features: Features) -> np.ndarray:
        # Pydantic modelini dictionary'e çeviriyoruz
        data = features.model_dump()
        df = pd.DataFrame([data])
        
        # 1. Eksik Veri Analizi (Numerik) ve Tür Dönüşümleri
        df['metrekare_brut'] = pd.to_numeric(df['metrekare_brut'], errors='coerce').fillna(80.0)
        df['metrekare_net'] = pd.to_numeric(df['metrekare_net'], errors='coerce').fillna(df['metrekare_brut'])
        df['kat'] = pd.to_numeric(df['kat'], errors='coerce').fillna(0.0)
        df['kat_sayisi'] = pd.to_numeric(df['kat_sayisi'], errors='coerce').fillna(1.0)
        df['banyo_sayisi'] = pd.to_numeric(df['banyo_sayisi'], errors='coerce').fillna(1.0)
        
        # 2. Öznitelik Çıkarımı (Feature Engineering)
        df['kat_orani'] = np.where(df['kat_sayisi'] > 0, df['kat'] / df['kat_sayisi'], 0)
        df['metrekare_farki'] = df['metrekare_brut'] - df['metrekare_net']
        df['metrekare_verimliligi'] = np.where(df['metrekare_brut'] > 0, df['metrekare_net'] / df['metrekare_brut'], 0)
        
        # Oda - Salon Ayrımı
        if 'oda_salon' in df.columns:
            # 3+1 gibi formattan ayır
            parts = str(df['oda_salon'][0]).split('+')
            oda = parts[0] if len(parts) > 0 else '1'
            salon = parts[1] if len(parts) > 1 else '0'
            df['oda_sayisi'] = float(oda) if oda.isdigit() else 1.0
            df['salon_sayisi'] = float(salon) if salon.isdigit() else 0.0
            df['toplam_oda'] = df['oda_sayisi'] + df['salon_sayisi']
        
        # 3. Encoding İşlemleri
        # Bina Yaşı Temizliği
        df['bina_yasi'] = df['bina_yasi'].apply(self._clean_bina_yasi)
        
        # Isıtma için One-Hot Encoding
        isitma_val = "isitma_" + str(df['isitma'][0])
        for col in self.isitma_columns:
            df[col] = 1 if isitma_val == col else 0
            
        # İlçe ve Mahalle için Target Encoding
        # Target encoder, eğitildiği tüm sütunları ve isimlerini bekler (rigid shape check).
        # Bu yüzden feature_names_in_ listesini kullanarak geçici bir DataFrame oluşturuyoruz.
        feature_names_in = getattr(self.target_encoder, 'feature_names_in_', None)
        if feature_names_in is not None:
            df_temp = pd.DataFrame(0, index=df.index, columns=feature_names_in)
            df_temp['ilce'] = df['ilce']
            df_temp['mahalle'] = df['mahalle']
            df_encoded = self.target_encoder.transform(df_temp)
        else:
            # Yedek plan (eğer feature_names_in_ yoksa)
            df_target = df[['ilce', 'mahalle']]
            df_encoded = self.target_encoder.transform(df_target)
            
        df['ilce'] = df_encoded['ilce']
        df['mahalle'] = df_encoded['mahalle']

        
        # Sütunları beklenen sıraya göre düzenleme
        # Eksik sütun varsa 0 ile dolduralım (olası hataları önlemek için)
        for col in self.expected_features:
            if col not in df.columns:
                df[col] = 0.0
                
        df_final = df[self.expected_features]
        
        # 4. Scaling
        X_scaled = self.scaler_X.transform(df_final)
        
        return X_scaled

    def inverse_transform_price(self, price_scaled: float) -> float:
        price_array = np.array([[price_scaled]])
        price_real = self.scaler_y.inverse_transform(price_array)[0][0]
        return float(price_real)
