"""
Conversations API Routes
Clean API endpoints for conversation management
"""

from fastapi import APIRouter, HTTPException, status
from typing import List, Dict, Any
from services.conversation_service import conversation_service
from config.models import ConversationRequest, ConversationTitleUpdateRequest, MessageRequest, SettingsResponse

router = APIRouter()

# =============================================================================
# CONVERSATIONS MANAGEMENT
# =============================================================================

@router.get("/")
async def get_conversations() -> Dict[str, Any]:
    """Get all conversations"""
    try:
        data = conversation_service.get_conversations()
        return {"status": "success", "data": data}
    except Exception as e:
        print(f"Error getting conversations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve conversations"
        )

@router.get("/{conversation_id}/messages")
async def get_conversation_messages(conversation_id: str) -> Dict[str, Any]:
    """Get messages for a conversation"""
    try:
        data = conversation_service.get_conversation_messages(conversation_id)
        return {"status": "success", "data": data}
    except Exception as e:
        print(f"Error getting conversation messages: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve conversation messages"
        )

@router.post("/")
async def create_conversation(conversation: ConversationRequest) -> SettingsResponse:
    """Create new conversation"""
    try:
        conversation_id = conversation_service.create_conversation(conversation.title)
        if conversation_id:
            return SettingsResponse(
                status="success", 
                message="Conversation created successfully",
                data={"id": conversation_id}
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create conversation"
            )
    except Exception as e:
        print(f"Error creating conversation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create conversation"
        )

@router.put("/{conversation_id}/title")
async def update_conversation_title(
    conversation_id: str, 
    title_update: ConversationTitleUpdateRequest
) -> SettingsResponse:
    """Update conversation title"""
    try:
        success = conversation_service.update_conversation_title(conversation_id, title_update.title)
        if success:
            return SettingsResponse(
                status="success", 
                message="Conversation title updated successfully"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
    except Exception as e:
        print(f"Error updating conversation title: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update conversation title"
        )

@router.post("/{conversation_id}/messages")
async def add_message(conversation_id: str, message: MessageRequest) -> SettingsResponse:
    """Add message to conversation"""
    try:
        message_id = conversation_service.add_message(
            conversation_id, 
            message.role, 
            message.content
        )
        if message_id:
            return SettingsResponse(
                status="success", 
                message="Message added successfully",
                data={"id": message_id}
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to add message"
            )
    except Exception as e:
        print(f"Error adding message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add message"
        )

@router.put("/{conversation_id}/messages/{message_id}")
async def update_message(
    conversation_id: str, 
    message_id: str, 
    message: MessageRequest
) -> SettingsResponse:
    """Update message content"""
    try:
        success = conversation_service.update_message(
            message_id, 
            message.content
        )
        if success:
            return SettingsResponse(
                status="success", 
                message="Message updated successfully"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found"
            )
    except Exception as e:
        print(f"Error updating message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update message"
        )

@router.delete("/{conversation_id}")
async def delete_conversation(conversation_id: str) -> SettingsResponse:
    """Delete conversation and all messages"""
    try:
        success = conversation_service.delete_conversation(conversation_id)
        if success:
            return SettingsResponse(status="success", message="Conversation deleted successfully")
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
    except Exception as e:
        print(f"Error deleting conversation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete conversation"
        ) 