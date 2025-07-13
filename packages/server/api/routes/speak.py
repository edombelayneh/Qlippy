from fastapi import APIRouter
from services.tts_service import tts_service
from config.models import SpeakRequest

router = APIRouter()

@router.post("/speak")
async def speak(request: SpeakRequest):
    try:
        if request.stop:
            await tts_service.stop_speaking()
            return {"status": "stopped"}
        
        await tts_service.speak_text(request.text)
        return {"status": "success"}
        
    except Exception as e:
        print(f"Error in speak: {e}")
        return {"status": "error", "message": str(e)}