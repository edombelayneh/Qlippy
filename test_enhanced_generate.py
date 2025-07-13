#!/usr/bin/env python3
"""
Test script for enhanced generate endpoint functionality
"""

import asyncio
import json
from services.settings_service import settings_service
from api.routes.generate import enhanced_stream_generator, _build_enhanced_prompt

async def test_enhanced_generate():
    """Test the enhanced generate functionality"""
    
    print("🧪 Testing Enhanced Generate Functionality")
    print("=" * 50)
    
    # Create a test conversation
    conv_id = settings_service.create_conversation('Enhanced Generate Test')
    print(f"✅ Created conversation: {conv_id}")
    
    # Add some conversation history
    settings_service.add_message(conv_id, 'user', 'Hello, I need help with Python programming')
    settings_service.add_message(conv_id, 'assistant', 'I can help you with Python! What specifically would you like to learn about?')
    settings_service.add_message(conv_id, 'user', 'I want to understand decorators')
    settings_service.add_message(conv_id, 'assistant', 'Decorators are a powerful Python feature that allows you to modify functions or classes without permanently modifying their code.')
    
    print("✅ Added conversation history")
    
    # Test conversation history retrieval
    messages = settings_service.get_conversation_messages(conv_id)
    print(f"✅ Retrieved {len(messages)} messages from conversation")
    
    # Test enhanced prompt building
    system_prompt = "You are Qlippy, a helpful AI assistant."
    rag_context = """
---
Source: python_docs.md (chunk 1)
Decorators in Python are a design pattern that allows you to modify or extend the behavior of functions or classes without permanently modifying their code.
---
Source: examples.py (chunk 2)
@property
def name(self):
    return self._name
---
"""
    
    conversation_history = [
        {"role": "user", "content": "Hello, I need help with Python programming"},
        {"role": "assistant", "content": "I can help you with Python! What specifically would you like to learn about?"},
        {"role": "user", "content": "I want to understand decorators"}
    ]
    
    enhanced_prompt = _build_enhanced_prompt(
        system_prompt=system_prompt,
        rag_context=rag_context,
        conversation_history=conversation_history,
        current_prompt="Can you give me a practical example of a decorator?"
    )
    
    print("✅ Built enhanced prompt")
    print(f"📝 Enhanced prompt preview (first 500 chars):")
    print(enhanced_prompt[:500] + "..." if len(enhanced_prompt) > 500 else enhanced_prompt)
    print()
    
    # Test context info generation
    rag_chunks = [
        {"file_path": "python_docs.md", "chunk_index": 0},
        {"file_path": "examples.py", "chunk_index": 1}
    ]
    
    context_info = {
        "type": "context_info",
        "rag_chunks": len(rag_chunks),
        "conversation_history": len(conversation_history),
        "sources": [chunk.get("file_path", "") for chunk in rag_chunks]
    }
    
    print("✅ Generated context info:")
    print(json.dumps(context_info, indent=2))
    print()
    
    # Test enhanced stream generator (without actual LLM)
    print("🔄 Testing enhanced stream generator structure...")
    
    # Mock the LLM service to avoid loading actual model
    class MockLLMService:
        async def generate_stream(self, prompt, conversation_id=None, skip_rag=False):
            yield json.dumps({"token": "This is a test response"}) + "\n"
            yield json.dumps({"done": True}) + "\n"
    
    # Temporarily replace the LLM service
    import api.routes.generate as generate_module
    original_llm_service = generate_module.llm_service
    generate_module.llm_service = MockLLMService()
    
    try:
        print("📤 Testing enhanced stream generator...")
        response_chunks = []
        async for chunk in enhanced_stream_generator("Test prompt", conv_id):
            response_chunks.append(chunk)
        
        print(f"✅ Generated {len(response_chunks)} response chunks")
        for i, chunk in enumerate(response_chunks):
            print(f"  Chunk {i}: {chunk.strip()}")
        
    finally:
        # Restore original LLM service
        generate_module.llm_service = original_llm_service
    
    print()
    print("🎉 Enhanced generate functionality test completed!")

if __name__ == "__main__":
    asyncio.run(test_enhanced_generate()) 