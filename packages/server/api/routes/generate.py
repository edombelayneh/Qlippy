from fastapi import APIRouter, Request, HTTPException, status
from fastapi.responses import StreamingResponse
from services.llm_service import llm_service
from services.settings_service import settings_service
from config.models import GenerateRequest
from pydantic import BaseModel
import asyncio
import json
from typing import Optional, List, Dict, Any

router = APIRouter()

class SaveMessageRequest(BaseModel):
    conversation_id: str
    role: str
    content: str


async def enhanced_stream_generator(prompt: str, conversation_id: Optional[str] = None):
    """Enhanced wrapper with memory and RAG context"""
    
    # Get conversation history if conversation_id is provided
    conversation_history = []
    if conversation_id:
        try:
            messages = settings_service.get_conversation_messages(conversation_id)
            # Convert to format suitable for context
            for msg in messages[-10:]:  # Last 10 messages for context
                conversation_history.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })
        except Exception as e:
            print(f"⚠️ Failed to retrieve conversation history: {e}")
    
    # Get RAG context if available
    rag_context = ""
    rag_chunks = []
    if conversation_id:
        try:
            from services.rag_retriever_service import rag_retriever_service
            # Check if conversation has RAG contexts
            contexts = rag_retriever_service.get_conversation_contexts(conversation_id)
            if contexts:
                # Retrieve relevant context
                rag_context, rag_chunks = await rag_retriever_service.retrieve_and_format_context(
                    query=prompt,
                    conversation_id=conversation_id,
                    max_context_length=4000  # Reserve space for conversation history
                )
                if rag_context:
                    print(f"🔍 Enhanced generate: Added RAG context with {len(rag_chunks)} chunks")
        except Exception as e:
            print(f"⚠️ RAG context retrieval failed: {e}")
    
    # Get model behavior settings
    model_behavior = settings_service.get_model_behavior()
    system_prompt = model_behavior.get("system_prompt", "")
    
    # Build enhanced prompt with conversation history and RAG context
    enhanced_prompt = _build_enhanced_prompt(
        system_prompt=system_prompt,
        rag_context=rag_context,
        conversation_history=conversation_history,
        current_prompt=prompt
    )
    
    print(f"🔍 Enhanced prompt length: {len(enhanced_prompt)} characters")
    
    # Yield metadata about context used
    if rag_chunks or conversation_history:
        context_info = {
            "type": "context_info",
            "rag_chunks": len(rag_chunks),
            "conversation_history": len(conversation_history),
            "sources": [chunk.get("file_path", "") for chunk in rag_chunks] if rag_chunks else []
        }
        yield json.dumps(context_info) + "\n"
    
    # Stream the enhanced response (skip RAG since we handle it here)
    async for chunk in llm_service.generate_stream(enhanced_prompt, conversation_id, skip_rag=True):
        yield chunk


def _build_enhanced_prompt(
    system_prompt: str,
    rag_context: str,
    conversation_history: List[Dict[str, str]],
    current_prompt: str
) -> str:
    """Build an enhanced prompt with memory and RAG context"""
    
    prompt_parts = []
    
    # Start with system prompt
    if system_prompt:
        prompt_parts.append(system_prompt)
    
    # Add RAG context if available
    if rag_context:
        prompt_parts.append("\n[File/Document Context (RAG)]")
        prompt_parts.append("Relevant file/document content and metadata retrieved for this query:")
        prompt_parts.append("---")
        prompt_parts.append(rag_context)
        prompt_parts.append("---")
    
    # Add conversation history if available
    if conversation_history:
        prompt_parts.append("\n[Conversation History]")
        prompt_parts.append("Previous conversation context:")
        
        for msg in conversation_history:
            role = msg["role"]
            content = msg["content"]
            
            if role == "user":
                prompt_parts.append(f"Human: {content}")
            elif role == "assistant":
                prompt_parts.append(f"Assistant: {content}")
            elif role == "system":
                prompt_parts.append(f"System: {content}")
    
    # Add current user input
    prompt_parts.append(f"\n[Current Query]")
    prompt_parts.append(f"Human: {current_prompt}")
    prompt_parts.append("\nAssistant:")
    
    return "\n".join(prompt_parts)


async def stream_generator(prompt: str, conversation_id: Optional[str] = None):
    """Original wrapper to ensure proper streaming without buffering"""
    async for chunk in llm_service.generate_stream(prompt, conversation_id):
        # Yield each chunk immediately
        yield chunk
        # The newline is already included in the chunk


@router.post("/generate")
async def generate(request: Request):
    try:
        data = await request.json()
        prompt = data.get("prompt", "")
        conversation_id = data.get("conversation_id", None)
        use_enhanced_memory = data.get("use_enhanced_memory", True)  # Default to enhanced
        
        if not prompt.strip():
            return StreamingResponse(
                iter([f'{{"error": "Empty prompt provided"}}\n']),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "X-Accel-Buffering": "no",
                }
            )
        
        print(f"📝 Received prompt: {prompt[:100]}{'...' if len(prompt) > 100 else ''}")
        if conversation_id:
            print(f"📝 With conversation ID: {conversation_id}")
            print(f"📝 Enhanced memory: {use_enhanced_memory}")
        
        # Choose generator based on enhanced memory setting
        generator = enhanced_stream_generator if use_enhanced_memory else stream_generator
        
        return StreamingResponse(
            generator(prompt, conversation_id),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache, no-transform",
                "X-Accel-Buffering": "no",  # Disable Nginx buffering
                "Connection": "keep-alive",
                "Transfer-Encoding": "chunked",  # Explicitly set chunked transfer
            }
        )
        
    except Exception as e:
        print(f"❌ Error in generate endpoint: {e}")
        return StreamingResponse(
            iter([f'{{"error": "Server error: {str(e)}"}}\n']),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            }
        )


async def sse_generator(prompt: str):
    """SSE format generator with explicit event structure"""
    # Send initial event to establish connection
    yield f"event: start\ndata: {{}}\n\n"
    
    async for chunk in llm_service.generate_stream(prompt):
        # For SSE, we need the "data: " prefix
        yield f"data: {chunk}"
        # Chunk already includes newline, add extra for SSE format
        yield "\n"
    
    # Send completion event
    yield f"event: done\ndata: {{}}\n\n"


@router.post("/generate-sse")
async def generate_sse(request: Request):
    """Alternative SSE endpoint with explicit event source format"""
    try:
        data = await request.json()
        prompt = data.get("prompt", "")
        
        if not prompt.strip():
            return StreamingResponse(
                iter([f'event: error\ndata: {{"error": "Empty prompt provided"}}\n\n']),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "X-Accel-Buffering": "no",
                }
            )
        
        print(f"📝 SSE Received prompt: {prompt[:100]}{'...' if len(prompt) > 100 else ''}")
        
        return StreamingResponse(
            sse_generator(prompt),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache, no-transform",
                "X-Accel-Buffering": "no",
                "Connection": "keep-alive",
            }
        )
        
    except Exception as e:
        print(f"❌ Error in SSE generate endpoint: {e}")
        return StreamingResponse(
            iter([f'event: error\ndata: {{"error": "Server error: {str(e)}"}}\n\n']),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            }
        )


@router.post("/save-message")
async def save_message(request: SaveMessageRequest):
    """Save a message to a conversation"""
    try:
        message_id = settings_service.add_message(
            request.conversation_id,
            request.role,
            request.content
        )
        
        if message_id:
            return {
                "status": "success",
                "message_id": message_id,
                "message": "Message saved successfully"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save message"
            )
    except Exception as e:
        print(f"❌ Error saving message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save message: {str(e)}"
        )


@router.get("/test-stream")
async def test_stream():
    """Test endpoint to verify streaming works properly"""
    async def generate_test_stream():
        """Generate test data with delays to verify streaming"""
        for i in range(10):
            yield f'{{"token": "Token {i} ", "index": {i}}}\n'
            await asyncio.sleep(0.1)  # 100ms delay between tokens
        yield '{"done": true}\n'
    
    return StreamingResponse(
        generate_test_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        }
    )