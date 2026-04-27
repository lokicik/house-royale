from fastapi import APIRouter, HTTPException

from app.schemas.predict import PredictRequest, PredictResponse
from app.services.model_registry import registry

router = APIRouter()


@router.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if not req.model_ids:
        return PredictResponse(predictions={})

    predictions = {}
    missing = [mid for mid in req.model_ids if registry.get(mid) is None]
    if missing:
        raise HTTPException(status_code=404, detail={"missing_model_ids": missing})

    for model_id in req.model_ids:
        predictions[model_id] = registry.predict(model_id, req.features, req.image_urls)

    return PredictResponse(predictions=predictions)
