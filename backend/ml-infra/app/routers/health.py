from fastapi import APIRouter

from app.services.model_registry import registry

router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok", "model_count": len(registry.list_models())}
