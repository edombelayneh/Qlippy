"""
LangGraph API Routes
API endpoints for LangGraph tool-calling functionality
"""

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import json

from services.langgraph_service import langgraph_service

router = APIRouter()

class ToolGraphRequest(BaseModel):
    """Request model for tool graph execution"""
    input: str
    chat_history: Optional[List[Dict[str, str]]] = None

class ToolGraphResponse(BaseModel):
    """Response model for tool graph execution"""
    response: str
    tools_called: List[str]
    messages: List[Dict[str, str]]
    success: bool
    error: Optional[str] = None

class ToolListResponse(BaseModel):
    """Response model for available tools list"""
    tools: List[Dict[str, Any]]

# =============================================================================
# LANGGRAPH ENDPOINTS
# =============================================================================

@router.post("/execute", response_model=ToolGraphResponse)
async def execute_tool_graph(request: ToolGraphRequest) -> ToolGraphResponse:
    """Execute the LangGraph tool-calling workflow"""
    try:
        result = await langgraph_service.run_tool_graph(
            input_text=request.input,
            chat_history=request.chat_history
        )
        
        return ToolGraphResponse(**result)
        
    except Exception as e:
        print(f"Error executing tool graph: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute tool graph: {str(e)}"
        )

@router.get("/tools", response_model=ToolListResponse)
async def get_available_tools() -> ToolListResponse:
    """Get list of available tools"""
    try:
        tools_info = []
        
        for tool in langgraph_service.tools:
            tool_info = {
                "name": tool.name,
                "description": tool.description,
                "parameters": []
            }
            
            # Extract parameter info if available
            if hasattr(tool, 'args_schema') and tool.args_schema:
                for field_name, field_info in tool.args_schema.model_fields.items():
                    tool_info["parameters"].append({
                        "name": field_name,
                        "type": "string",  # Simplified for now
                        "description": field_info.description or f"The {field_name} parameter"
                    })
            
            tools_info.append(tool_info)
        
        return ToolListResponse(tools=tools_info)
        
    except Exception as e:
        print(f"Error getting tools: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve available tools"
        )

@router.post("/chat")
async def chat_with_tools(request: ToolGraphRequest) -> Dict[str, Any]:
    """
    Chat endpoint that automatically handles tool calling
    Returns streaming-compatible response
    """
    try:
        result = await langgraph_service.run_tool_graph(
            input_text=request.input,
            chat_history=request.chat_history
        )
        
        # Format response for compatibility with existing chat interface
        return {
            "status": "success",
            "response": result["response"],
            "tools_used": result["tools_called"],
            "conversation": result["messages"]
        }
        
    except Exception as e:
        print(f"Error in tool chat: {e}")
        return {
            "status": "error",
            "response": f"I encountered an error: {str(e)}",
            "tools_used": [],
            "conversation": []
        }

async def stream_langgraph_response(input_text: str, chat_history: Optional[List[Dict[str, str]]] = None):
    """Stream the LangGraph response with tool execution"""
    try:
        # Run the tool graph
        result = await langgraph_service.run_tool_graph(
            input_text=input_text,
            chat_history=chat_history
        )
        
        # If tools were called, yield tool information first
        if result.get("tools_called"):
            yield json.dumps({
                "type": "tools",
                "tools": result["tools_called"]
            }) + "\n"
        
        # Stream the response token by token to simulate streaming
        response_text = result.get("response", "")
        if response_text:
            # For now, we'll send the whole response at once
            # In the future, we could modify LangGraph to support true streaming
            yield json.dumps({"token": response_text}) + "\n"
        
        # Send completion signal
        yield json.dumps({"done": True}) + "\n"
        
    except Exception as e:
        print(f"Error in streaming LangGraph response: {e}")
        yield json.dumps({"error": str(e)}) + "\n"

@router.post("/stream")
async def stream_tool_graph(request: ToolGraphRequest):
    """Stream the LangGraph tool-calling workflow response"""
    return StreamingResponse(
        stream_langgraph_response(request.input, request.chat_history),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
            "Transfer-Encoding": "chunked",
        }
    ) 