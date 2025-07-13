"""
Tools API Routes
API endpoints for managing custom Python tools
"""

from fastapi import APIRouter, HTTPException, status
from typing import List, Dict, Any
from services.settings_service import settings_service
from config.models import SettingsResponse
from pydantic import BaseModel
import re
import ast

router = APIRouter()

class ToolRequest(BaseModel):
    name: str
    description: str
    script: str
    filename: str = None

class ToolValidationResponse(BaseModel):
    valid: bool
    errors: List[str] = []
    warnings: List[str] = []

def validate_langchain_tool(script: str) -> ToolValidationResponse:
    """Validate that the script follows Langchain tool format"""
    errors = []
    warnings = []
    
    try:
        # Parse the Python code to check syntax
        ast.parse(script)
    except SyntaxError as e:
        errors.append(f"Syntax error: {str(e)}")
        return ToolValidationResponse(valid=False, errors=errors)
    
    # Check for required imports
    required_imports = [
        ("langchain.tools", "BaseTool"),
        ("pydantic", "BaseModel"),
        ("typing", "Type")
    ]
    
    for module, item in required_imports:
        if f"from {module} import" not in script or item not in script:
            errors.append(f"Missing required import: 'from {module} import {item}'")
    
    # Check for BaseTool inheritance
    if "class" not in script or "BaseTool" not in script:
        errors.append("Tool must inherit from BaseTool")
    
    # Check for required methods
    required_methods = ["_run", "name", "description"]
    for method in required_methods:
        if method not in script:
            if method.startswith("_"):
                errors.append(f"Missing required method: '{method}'")
            else:
                errors.append(f"Missing required attribute: '{method}'")
    
    # Check for input schema
    if "args_schema" not in script:
        warnings.append("Consider adding 'args_schema' for better tool documentation")
    
    # Check for async method
    if "_arun" not in script:
        warnings.append("Consider adding '_arun' method for async support")
    
    # Check for proper docstrings
    if '"""' not in script:
        warnings.append("Consider adding docstrings to your tool class and methods")
    
    return ToolValidationResponse(
        valid=len(errors) == 0,
        errors=errors,
        warnings=warnings
    )

# =============================================================================
# TOOLS MANAGEMENT
# =============================================================================

@router.get("/")
async def get_tools() -> Dict[str, Any]:
    """Get all tools"""
    try:
        data = settings_service.get_tools()
        return {"status": "success", "data": data}
    except Exception as e:
        print(f"Error getting tools: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve tools"
        )

@router.post("/")
async def create_tool(tool: ToolRequest) -> SettingsResponse:
    """Create new tool"""
    try:
        # Validate the tool first
        validation = validate_langchain_tool(tool.script)
        if not validation.valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tool validation failed: {', '.join(validation.errors)}"
            )
        
        tool_id = settings_service.create_tool(
            tool.name, 
            tool.description, 
            tool.script,
            tool.filename
        )
        if tool_id:
            return SettingsResponse(
                status="success", 
                message="Tool created successfully",
                data={"id": tool_id}
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create tool"
            )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating tool: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create tool"
        )

@router.get("/{tool_id}")
async def get_tool(tool_id: str) -> Dict[str, Any]:
    """Get specific tool"""
    try:
        data = settings_service.get_tool(tool_id)
        if data:
            return {"status": "success", "data": data}
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tool not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting tool: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve tool"
        )

@router.put("/{tool_id}")
async def update_tool(tool_id: str, tool: ToolRequest) -> SettingsResponse:
    """Update tool"""
    try:
        # Validate the tool first
        validation = validate_langchain_tool(tool.script)
        if not validation.valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tool validation failed: {', '.join(validation.errors)}"
            )
        
        success = settings_service.update_tool(
            tool_id,
            tool.name, 
            tool.description, 
            tool.script,
            tool.filename
        )
        if success:
            return SettingsResponse(status="success", message="Tool updated successfully")
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tool not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating tool: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update tool"
        )

@router.delete("/{tool_id}")
async def delete_tool(tool_id: str) -> SettingsResponse:
    """Delete tool"""
    try:
        success = settings_service.delete_tool(tool_id)
        if success:
            return SettingsResponse(status="success", message="Tool deleted successfully")
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tool not found"
            )
    except Exception as e:
        print(f"Error deleting tool: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete tool"
        )

@router.post("/validate")
async def validate_tool(tool: ToolRequest) -> Dict[str, Any]:
    """Validate tool script"""
    try:
        validation = validate_langchain_tool(tool.script)
        return {
            "status": "success",
            "data": validation.dict()
        }
    except Exception as e:
        print(f"Error validating tool: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to validate tool"
        ) 