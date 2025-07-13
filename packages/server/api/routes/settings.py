"""
Settings API Routes
Clean API endpoints that delegate to the settings service
Following the separation of concerns pattern used in the codebase
"""

from fastapi import APIRouter, HTTPException, status, File, UploadFile, Request
from typing import List, Dict, Any
from services.settings_service import settings_service
from services.tts_service import tts_service
from config.models import (
    ThemeSettings, TTSSettings, ModelBehaviorSettings,
    VoiceDetectionSettings, AudioSettings, ModelRequest,
    RuleRequest, ConversationRequest, ConversationTitleUpdateRequest,
    MessageRequest, SettingsResponse
)
from .tools import router as tools_router
import os
import json

router = APIRouter()

# Include tools router
router.include_router(tools_router, prefix="/tools", tags=["tools"])

# =============================================================================
# THEME SETTINGS
# =============================================================================

@router.get("/theme")
async def get_theme_settings() -> Dict[str, Any]:
    """Get current theme settings"""
    try:
        data = settings_service.get_theme_settings()
        return {"status": "success", "data": data}
    except Exception as e:
        print(f"Error getting theme settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve theme settings"
        )

@router.post("/theme")
async def update_theme_settings(settings: ThemeSettings) -> Dict[str, Any]:
    """Update theme settings"""
    try:
        success = settings_service.update_theme_settings(settings)
        if success:
            # Return the updated data in the same format as GET
            updated_data = settings_service.get_theme_settings()
            return {"status": "success", "data": updated_data, "message": "Theme settings updated"}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update theme settings"
            )
    except Exception as e:
        print(f"Error updating theme settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update theme settings"
        )

# =============================================================================
# TTS SETTINGS
# =============================================================================

@router.get("/tts")
async def get_tts_settings() -> Dict[str, Any]:
    """Get TTS settings"""
    try:
        data = settings_service.get_tts_settings()
        return {"status": "success", "data": data}
    except Exception as e:
        print(f"Error getting TTS settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve TTS settings"
        )

@router.post("/tts")
async def update_tts_settings(settings: TTSSettings) -> SettingsResponse:
    """Update TTS settings"""
    try:
        success = settings_service.update_tts_settings(settings)
        if success:
            return SettingsResponse(status="success", message="TTS settings updated")
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update TTS settings"
            )
    except Exception as e:
        print(f"Error updating TTS settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update TTS settings"
        )

@router.get("/tts/voices")
async def get_available_voices() -> Dict[str, Any]:
    """Get available TTS voices (English speakers only)"""
    try:
        voices = tts_service.get_english_voices()
        return {"status": "success", "data": voices}
    except Exception as e:
        print(f"Error getting available voices: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve available voices"
        )

# =============================================================================
# MODEL BEHAVIOR SETTINGS
# =============================================================================

@router.get("/model-behavior")
async def get_model_behavior() -> Dict[str, Any]:
    """Get model behavior settings"""
    try:
        data = settings_service.get_model_behavior()
        return {"status": "success", "data": data}
    except Exception as e:
        print(f"Error getting model behavior: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve model behavior settings"
        )

@router.post("/model-behavior")
async def update_model_behavior(settings: ModelBehaviorSettings) -> SettingsResponse:
    """Update model behavior settings"""
    try:
        success = settings_service.update_model_behavior(settings)
        if success:
            return SettingsResponse(status="success", message="Model behavior updated")
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update model behavior"
            )
    except Exception as e:
        print(f"Error updating model behavior: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update model behavior"
        )

# =============================================================================
# VOICE DETECTION SETTINGS
# =============================================================================

@router.get("/voice-detection/wake-words")
async def get_voice_detection_wake_words():
    """Get all wake words (as array)"""
    value = settings_service.get_setting('voice_detection_wake_words', None)
    try:
        wake_words = json.loads(value) if value else []
    except Exception:
        wake_words = []
    return {"wake_words": wake_words}

@router.post("/voice-detection/wake-words")
async def set_voice_detection_wake_words(request: Request):
    """Set all wake words (as array)"""
    data = await request.json()
    wake_words = data.get('wake_words', [])
    settings_service.set_setting('voice_detection_wake_words', json.dumps(wake_words))
    return {"status": "success", "wake_words": wake_words}

@router.get("/voice-detection")
async def get_voice_detection_settings():
    """Get voice detection settings"""
    return settings_service.get_voice_detection_settings()

@router.post("/voice-detection")
async def update_voice_detection_settings(request: Request):
    """Update voice detection settings"""
    data = await request.json()
    enabled = data.get('enabled', False)
    
    # Update the enabled setting
    settings_service.set_setting('voice_detection_enabled', 'true' if enabled else 'false')
    
    return {"status": "success", "enabled": enabled}

# =============================================================================
# AUDIO SETTINGS
# =============================================================================

@router.get("/audio")
async def get_audio_settings() -> Dict[str, Any]:
    """Get audio settings"""
    try:
        data = settings_service.get_audio_settings()
        return {"status": "success", "data": data}
    except Exception as e:
        print(f"Error getting audio settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve audio settings"
        )

@router.post("/audio")
async def update_audio_settings(settings: AudioSettings) -> SettingsResponse:
    """Update audio settings"""
    try:
        success = settings_service.update_audio_settings(settings)
        if success:
            return SettingsResponse(status="success", message="Audio settings updated")
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update audio settings"
            )
    except Exception as e:
        print(f"Error updating audio settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update audio settings"
        )

# =============================================================================
# =============================================================================
# RULES MANAGEMENT
# =============================================================================

@router.get("/rules")
async def get_rules() -> Dict[str, Any]:
    """Get all rules"""
    try:
        data = settings_service.get_rules()
        return {"status": "success", "data": data}
    except Exception as e:
        print(f"Error getting rules: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve rules"
        )

@router.post("/rules")
async def add_rule(rule: RuleRequest) -> SettingsResponse:
    """Add new rule"""
    try:
        rule_id = settings_service.add_rule(rule.description)
        if rule_id:
            return SettingsResponse(
                status="success", 
                message="Rule added successfully",
                data={"id": rule_id}
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to add rule"
            )
    except Exception as e:
        print(f"Error adding rule: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add rule"
        )

@router.delete("/rules/{rule_id}")
async def delete_rule(rule_id: str) -> SettingsResponse:
    """Delete rule"""
    try:
        success = settings_service.delete_rule(rule_id)
        if success:
            return SettingsResponse(status="success", message="Rule deleted successfully")
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Rule not found"
            )
    except Exception as e:
        print(f"Error deleting rule: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete rule"
        )

@router.post("/rules/{rule_id}/toggle")
async def toggle_rule(rule_id: str, enabled: bool) -> SettingsResponse:
    """Toggle rule enabled state"""
    try:
        success = settings_service.toggle_rule(rule_id, enabled)
        if success:
            return SettingsResponse(
                status="success", 
                message=f"Rule {'enabled' if enabled else 'disabled'} successfully"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Rule not found"
            )
    except Exception as e:
        print(f"Error toggling rule: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to toggle rule"
        )

# TRANSCRIPTION ENDPOINT (for desktop app)
@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribe uploaded audio file"""
    try:
        # Save uploaded file temporarily
        temp_path = f"/tmp/transcribe_{file.filename}"
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Transcribe using the service
        from services.transcription_service import transcription_service
        transcription = await transcription_service.transcribe_audio(temp_path)
        
        # Clean up temp file
        os.unlink(temp_path)
        
        return {"transcription": transcription}
        
    except Exception as e:
        print(f"Error transcribing audio: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to transcribe audio"
        ) 
@router.post("/transcribe")
async def transcribe_audio_file(audio: UploadFile = File(...)):
    """Transcribe uploaded audio file"""
    try:
        import tempfile
        import os
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            content = await audio.read()
            temp_file.write(content)
            temp_path = temp_file.name
        
        # Transcribe using the service
        from services.transcription_service import transcription_service
        transcription = await transcription_service.transcribe_audio(temp_path)
        
        # Clean up temp file
        os.unlink(temp_path)
        
        return {"transcription": transcription}
        
    except Exception as e:
        print(f"Error transcribing audio: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to transcribe audio: {str(e)}"
        )

