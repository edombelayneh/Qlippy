"""
Models API Routes
Clean API endpoints for model management
"""

from fastapi import APIRouter, HTTPException, status
from typing import List, Dict, Any
from services.settings_service import settings_service
from config.models import ModelRequest, SettingsResponse

router = APIRouter()

# =============================================================================
# MODELS MANAGEMENT
# =============================================================================

@router.get("/")
async def get_models() -> Dict[str, Any]:
    """Get all available models"""
    try:
        data = settings_service.get_models()
        return {"status": "success", "data": data}
    except Exception as e:
        print(f"Error getting models: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve models"
        )

@router.post("/")
async def add_model(model: ModelRequest) -> SettingsResponse:
    """Add a new model"""
    try:
        success = settings_service.add_model(
            model.name, 
            model.file_path, 
            model.file_size_display
        )
        if success:
            return SettingsResponse(
                status="success", 
                message="Model added successfully"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to add model"
            )
    except Exception as e:
        print(f"Error adding model: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add model"
        )

@router.delete("/{model_id}")
async def delete_model(model_id: str) -> SettingsResponse:
    """Delete a model"""
    try:
        success = settings_service.delete_model(model_id)
        if success:
            return SettingsResponse(status="success", message="Model deleted successfully")
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Model not found"
            )
    except Exception as e:
        print(f"Error deleting model: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete model"
        )

@router.post("/{model_id}/activate")
async def activate_model(model_id: str) -> SettingsResponse:
    """Activate a model"""
    try:
        success = settings_service.activate_model(model_id)
        if success:
            return SettingsResponse(
                status="success", 
                message="Model activated successfully",
                data={"model_id": model_id, "loaded": True}
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to activate model"
            )
    except Exception as e:
        print(f"Error activating model: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to activate model"
        )

@router.post("/{model_id}/tool-calling")
async def update_model_tool_calling(model_id: str, enabled: bool) -> SettingsResponse:
    """Update tool calling setting for a model"""
    try:
        success = settings_service.update_model_tool_calling(model_id, enabled)
        if success:
            return SettingsResponse(
                status="success", 
                message="Tool calling setting updated successfully"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Model not found"
            )
    except Exception as e:
        print(f"Error updating model tool calling: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update model tool calling"
        )

@router.get("/loading-status")
async def get_model_loading_status() -> Dict[str, Any]:
    """Get model loading status"""
    try:
        data = settings_service.get_model_loading_status()
        return {"status": "success", "data": data}
    except Exception as e:
        print(f"Error getting model loading status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve model loading status"
        ) 