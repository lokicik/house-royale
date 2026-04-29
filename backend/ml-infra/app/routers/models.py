from fastapi import APIRouter

from app.services.model_registry import registry

router = APIRouter()


@router.get("/models")
def list_models():
    return {"models": registry.list_models()}
