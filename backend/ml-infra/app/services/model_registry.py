import os
import hashlib
import random
from datetime import datetime
from pathlib import Path

# Keras import
import os
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"  # TF uyarılarını gizle
from tensorflow.keras.models import load_model

from app.config import settings
from app.schemas.predict import Features, ModelPrediction
from app.services.preprocessor import Preprocessor

_SUPPORTED_EXTENSIONS = {".pt", ".pth", ".h5", ".keras", ".onnx"}

_MODEL_TYPE_MAP = {
    ".pt": "PyTorch",
    ".pth": "PyTorch",
    ".h5": "TensorFlow/Keras",
    ".keras": "TensorFlow/Keras",
    ".onnx": "ONNX",
}


class ModelRegistry:
    def __init__(self) -> None:
        self._models: dict[str, dict] = {}

    def load_all(self) -> None:
        model_dir = Path(settings.MODEL_DIR)
        model_dir.mkdir(parents=True, exist_ok=True)

        for path in model_dir.iterdir():
            if path.is_dir():
                model_id = path.name
                
                # Check if it has a .keras model
                keras_model_path = path / "model.keras"
                if keras_model_path.exists():
                    try:
                        # Preprocessor'u yükle
                        preprocessor = Preprocessor(path)
                        preprocessor.load_artifacts()
                        
                        # Keras modelini yükle
                        model = load_model(keras_model_path)
                        
                        self._models[model_id] = {
                            "id": model_id,
                            "type": "TensorFlow/Keras",
                            "path": str(path),
                            "trained_at": datetime.fromtimestamp(keras_model_path.stat().st_mtime).isoformat(),
                            "preprocessor": preprocessor,
                            "model": model
                        }
                    except Exception as e:
                        print(f"Error loading model {model_id}: {e}")

        print(f"[ModelRegistry] {len(self._models)} model(s) loaded from '{model_dir}'")

    def list_models(self) -> list[dict]:
        return [{"id": m["id"], "type": m["type"], "path": m["path"], "trained_at": m["trained_at"]} for m in self._models.values()]

    def get(self, model_id: str) -> dict | None:
        return self._models.get(model_id)

    def predict(self, model_id: str, features: Features, image_urls: list[str]) -> ModelPrediction:
        model_data = self._models.get(model_id)
        if not model_data:
            return ModelPrediction(price_try=0, confidence=0.0, is_stub=True)
            
        preprocessor = model_data["preprocessor"]
        model = model_data["model"]
        
        try:
            # 1. Ön İşleme
            X_scaled = preprocessor.preprocess(features)
            
            # 2. Tahmin
            y_pred_scaled = model.predict(X_scaled, verbose=0)
            
            # 3. Ters Ölçekleme (Fiyatı TL'ye çevirme)
            price_real = preprocessor.inverse_transform_price(y_pred_scaled[0][0])
            
            # Fiyatı daha okunabilir yapmak için yuvarlama (örn: 10,000'in katlarına)
            price_final = round(price_real, -3)
            
            return ModelPrediction(price_try=price_final, confidence=0.85, is_stub=False)
        except Exception as e:
            print(f"Prediction error: {e}")
            return ModelPrediction(price_try=0, confidence=0.0, is_stub=True)

registry = ModelRegistry()
