from fastapi import APIRouter
from config.models import HealthResponse

router = APIRouter()

@router.get("/health")
async def health_check():
    return HealthResponse(
        status="healthy",
        services={
            "audio": "ok",
            "transcription": "ok",
            "llm": "ok",
            "tts": "ok"
        }
    )