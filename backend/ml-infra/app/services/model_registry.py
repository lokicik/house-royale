import os
import hashlib
import random
from datetime import datetime
from pathlib import Path

from app.config import settings
from app.schemas.predict import Features, ModelPrediction

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
            if path.suffix in _SUPPORTED_EXTENSIONS:
                model_id = path.stem
                self._models[model_id] = {
                    "id": model_id,
                    "type": _MODEL_TYPE_MAP.get(path.suffix, "Unknown"),
                    "path": str(path),
                    "trained_at": datetime.fromtimestamp(path.stat().st_mtime).isoformat(),
                }

        print(f"[ModelRegistry] {len(self._models)} model(s) loaded from '{model_dir}'")

    def list_models(self) -> list[dict]:
        return list(self._models.values())

    def get(self, model_id: str) -> dict | None:
        return self._models.get(model_id)

    def predict(self, model_id: str, features: Features, image_urls: list[str]) -> ModelPrediction:
        seed = int(hashlib.md5(
            f"{model_id}{features.il}{features.metrekare_brut}{features.oda_salon}".encode()
        ).hexdigest(), 16)
        rng = random.Random(seed)
        price = round(rng.uniform(1_000_000, 10_000_000), -3)
        return ModelPrediction(price_try=price, confidence=0.0, is_stub=True)


registry = ModelRegistry()
