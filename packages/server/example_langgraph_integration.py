#!/usr/bin/env python3
"""
LangGraph Integration Example
Shows how to integrate the LangGraph tool-calling service with Qlippy's existing chat system
"""

import asyncio
import json
from typing import Dict, List, Any, Optional
from services.langgraph_service import langgraph_service
from services.settings_service import settings_service

class EnhancedChatService:
    """
    Enhanced chat service that combines regular LLM generation with tool-calling
    This demonstrates how to integrate LangGraph into the existing Qlippy chat flow
    """
    
    def __init__(self):
        self.langgraph_service = langgraph_service
        self.settings_service = settings_service
    
    async def process_chat_message(
        self, 
        message: str, 
        conversation_id: str,
        chat_history: Optional[List[Dict[str, str]]] = None,
        enable_tools: bool = True
    ) -> Dict[str, Any]:
        """
        Process a chat message with optional tool-calling support
        
        Args:
            message: User input message
            conversation_id: Database conversation ID
            chat_history: Previous conversation context
            enable_tools: Whether to enable tool calling for this message
            
        Returns:
            Dictionary with response, tools used, and metadata
        """
        
        # Determine if this message might need tool calling
        tool_keywords = [
            'open', 'delete', 'remove', 'file', 'folder', 'app', 'application',
            'launch', 'start', 'close', 'quit', 'calculator', 'textedit',
            'finder', 'browser', 'terminal'
        ]
        
        might_need_tools = enable_tools and any(
            keyword in message.lower() for keyword in tool_keywords
        )
        
        if might_need_tools:
            # Use LangGraph for tool-calling
            print(f"🔧 Using LangGraph for message: {message[:50]}...")
            
            try:
                result = await self.langgraph_service.run_tool_graph(
                    input_text=message,
                    chat_history=chat_history or []
                )
                
                # Save to database if successful
                if result.get('success') and conversation_id:
                    await self._save_conversation_message(
                        conversation_id, 
                        message, 
                        result['response'],
                        result.get('tools_called', [])
                    )
                
                return {
                    'response': result['response'],
                    'tools_used': result.get('tools_called', []),
                    'method': 'langgraph',
                    'success': result.get('success', False),
                    'conversation_updated': bool(conversation_id)
                }
                
            except Exception as e:
                print(f"❌ LangGraph failed, falling back to regular LLM: {e}")
                # Fall back to regular LLM generation
                return await self._regular_llm_response(message, conversation_id, chat_history)
        
        else:
            # Use regular LLM generation for non-tool messages
            print(f"💬 Using regular LLM for message: {message[:50]}...")
            return await self._regular_llm_response(message, conversation_id, chat_history)
    
    async def _regular_llm_response(
        self, 
        message: str, 
        conversation_id: str,
        chat_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """Generate response using the regular LLM service"""
        
        # This would integrate with your existing LLM service
        # For now, return a placeholder response
        
        response = f"I understand you said: '{message}'. This would normally use the regular LLM service."
        
        # Save to database
        if conversation_id:
            await self._save_conversation_message(conversation_id, message, response, [])
        
        return {
            'response': response,
            'tools_used': [],
            'method': 'regular_llm',
            'success': True,
            'conversation_updated': bool(conversation_id)
        }
    
    async def _save_conversation_message(
        self, 
        conversation_id: str, 
        user_message: str, 
        ai_response: str,
        tools_used: List[str]
    ):
        """Save conversation messages to database"""
        try:
            # Add user message
            self.settings_service.add_message(conversation_id, "user", user_message)
            
            # Add AI response with tool metadata
            response_with_metadata = ai_response
            if tools_used:
                response_with_metadata += f"\n\n[Tools used: {', '.join(tools_used)}]"
            
            self.settings_service.add_message(conversation_id, "assistant", response_with_metadata)
            
        except Exception as e:
            print(f"Error saving conversation: {e}")

# =============================================================================
# EXAMPLE USAGE SCENARIOS
# =============================================================================

async def example_tool_conversation():
    """Example: Conversation that uses tools"""
    
    chat_service = EnhancedChatService()
    
    print("🔧 TOOL-CALLING CONVERSATION EXAMPLE")
    print("=" * 50)
    
    # Simulate a conversation ID (in real usage, this comes from your database)
    conversation_id = "example_conv_1"
    chat_history = []
    
    # User asks to open a file
    response1 = await chat_service.process_chat_message(
        message="Can you open the Calculator app for me?",
        conversation_id=conversation_id,
        chat_history=chat_history
    )
    
    print(f"User: Can you open the Calculator app for me?")
    print(f"Assistant: {response1['response']}")
    print(f"Tools used: {response1['tools_used']}")
    print(f"Method: {response1['method']}")
    print("-" * 30)
    
    # Update chat history
    chat_history.extend([
        {"role": "user", "content": "Can you open the Calculator app for me?"},
        {"role": "assistant", "content": response1['response']}
    ])
    
    # User continues conversation
    response2 = await chat_service.process_chat_message(
        message="Thanks! Now can you help me with a math problem?",
        conversation_id=conversation_id,
        chat_history=chat_history
    )
    
    print(f"User: Thanks! Now can you help me with a math problem?")
    print(f"Assistant: {response2['response']}")
    print(f"Tools used: {response2['tools_used']}")
    print(f"Method: {response2['method']}")
    print("-" * 50)

async def example_regular_conversation():
    """Example: Regular conversation without tools"""
    
    chat_service = EnhancedChatService()
    
    print("💬 REGULAR CONVERSATION EXAMPLE")
    print("=" * 50)
    
    conversation_id = "example_conv_2"
    
    response = await chat_service.process_chat_message(
        message="What's the weather like today?",
        conversation_id=conversation_id,
        chat_history=[]
    )
    
    print(f"User: What's the weather like today?")
    print(f"Assistant: {response['response']}")
    print(f"Tools used: {response['tools_used']}")
    print(f"Method: {response['method']}")
    print("-" * 50)

async def example_mixed_conversation():
    """Example: Mixed conversation with both tools and regular chat"""
    
    chat_service = EnhancedChatService()
    
    print("🔀 MIXED CONVERSATION EXAMPLE")
    print("=" * 50)
    
    conversation_id = "example_conv_3"
    chat_history = []
    
    messages = [
        "Hello! How are you today?",
        "Can you open TextEdit for me?",
        "Great! What's your favorite color?",
        "Now delete the file /tmp/test.txt",
        "Thanks for your help!"
    ]
    
    for i, message in enumerate(messages, 1):
        response = await chat_service.process_chat_message(
            message=message,
            conversation_id=conversation_id,
            chat_history=chat_history
        )
        
        print(f"Turn {i}:")
        print(f"  User: {message}")
        print(f"  Assistant: {response['response'][:100]}{'...' if len(response['response']) > 100 else ''}")
        print(f"  Tools used: {response['tools_used']}")
        print(f"  Method: {response['method']}")
        print()
        
        # Update chat history
        chat_history.extend([
            {"role": "user", "content": message},
            {"role": "assistant", "content": response['response']}
        ])
    
    print("-" * 50)

# =============================================================================
# INTEGRATION WITH FASTAPI ROUTE
# =============================================================================

def create_enhanced_chat_route():
    """
    Example of how to create a FastAPI route that uses the enhanced chat service
    This would replace or supplement your existing chat generation endpoint
    """
    
    from fastapi import APIRouter
    from pydantic import BaseModel
    
    router = APIRouter()
    chat_service = EnhancedChatService()
    
    class EnhancedChatRequest(BaseModel):
        message: str
        conversation_id: str
        chat_history: Optional[List[Dict[str, str]]] = None
        enable_tools: bool = True
    
    @router.post("/enhanced-chat")
    async def enhanced_chat_endpoint(request: EnhancedChatRequest):
        """Enhanced chat endpoint with tool-calling support"""
        
        result = await chat_service.process_chat_message(
            message=request.message,
            conversation_id=request.conversation_id,
            chat_history=request.chat_history,
            enable_tools=request.enable_tools
        )
        
        return {
            "status": "success" if result['success'] else "error",
            "response": result['response'],
            "tools_used": result['tools_used'],
            "method": result['method'],
            "conversation_updated": result['conversation_updated']
        }
    
    return router

async def main():
    """Run all integration examples"""
    
    print("🚀 QLIPPY LANGGRAPH INTEGRATION EXAMPLES")
    print("=" * 60)
    print("Demonstrating how to integrate LangGraph with existing chat functionality")
    print("=" * 60)
    
    try:
        await example_tool_conversation()
        await example_regular_conversation()
        await example_mixed_conversation()
        
        print("✅ All integration examples completed successfully!")
        print("\n📋 INTEGRATION STEPS:")
        print("1. Install dependencies: pip install langchain langchain-core langgraph")
        print("2. Import the LangGraph service in your chat handler")
        print("3. Use the enhanced chat service pattern shown above")
        print("4. Add the enhanced chat route to your FastAPI app")
        print("5. Configure tool-calling keywords based on your needs")
        
        print("\n🔧 API ENDPOINTS:")
        print("- GET  /api/langgraph/tools - List available tools")
        print("- POST /api/langgraph/execute - Execute tool-calling workflow")
        print("- POST /api/langgraph/chat - Chat with tool-calling support")
        
    except Exception as e:
        print(f"❌ Integration example failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main()) 