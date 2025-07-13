#!/usr/bin/env python3
"""
LangGraph Tool-Calling Test Runner
Demonstrates the LangGraph service capabilities with various test scenarios
"""

import asyncio
import sys
import json
from pathlib import Path
import os

# Add current directory to path for imports
sys.path.append(str(Path(__file__).parent))

from services.langgraph_service import langgraph_service

async def test_basic_conversation():
    """Test basic conversation without tools"""
    print("🗣️  Testing basic conversation...")
    
    result = await langgraph_service.run_tool_graph(
        input_text="Hello! How are you today?",
        chat_history=[]
    )
    
    print(f"Response: {result['response']}")
    print(f"Tools called: {result['tools_called']}")
    print(f"Success: {result['success']}")
    print("-" * 50)
    
    return result

async def test_file_operations():
    """Test file operation tools"""
    print("📁 Testing file operations...")
    
    # Test opening a file
    result1 = await langgraph_service.run_tool_graph(
        input_text="Please open the file '/tmp/test.txt' for me",
        chat_history=[]
    )
    
    print(f"Open file response: {result1['response']}")
    print(f"Tools called: {result1['tools_called']}")
    print("-" * 30)
    
    # Test creating and deleting a file
    # First create a test file
    test_file = Path("/tmp/qlippy_test.txt")
    test_file.write_text("This is a test file for Qlippy LangGraph tool testing.")
    
    result2 = await langgraph_service.run_tool_graph(
        input_text=f"Delete the file {test_file}",
        chat_history=[]
    )
    
    print(f"Delete file response: {result2['response']}")
    print(f"Tools called: {result2['tools_called']}")
    print("-" * 50)
    
    return result2

async def test_app_operations():
    """Test application management tools"""
    print("🚀 Testing application operations...")
    
    # Test opening an application
    result1 = await langgraph_service.run_tool_graph(
        input_text="Open Calculator app for me",
        chat_history=[]
    )
    
    print(f"Open app response: {result1['response']}")
    print(f"Tools called: {result1['tools_called']}")
    print("-" * 30)
    
    # Wait a bit then close the app
    await asyncio.sleep(2)
    
    result2 = await langgraph_service.run_tool_graph(
        input_text="Close Calculator app",
        chat_history=[]
    )
    
    print(f"Close app response: {result2['response']}")
    print(f"Tools called: {result2['tools_called']}")
    print("-" * 50)
    
    return result2

async def test_conversation_with_tools():
    """Test multi-turn conversation with tool usage"""
    print("💬 Testing multi-turn conversation with tools...")
    
    chat_history = []
    
    # First turn
    result1 = await langgraph_service.run_tool_graph(
        input_text="Hi! I'm working on a project. Can you help me?",
        chat_history=chat_history
    )
    
    print(f"Turn 1: {result1['response']}")
    chat_history.extend(result1['messages'])
    
    # Second turn with tool usage
    result2 = await langgraph_service.run_tool_graph(
        input_text="Yes, can you open TextEdit for me so I can start writing?",
        chat_history=chat_history
    )
    
    print(f"Turn 2: {result2['response']}")
    print(f"Tools used: {result2['tools_called']}")
    chat_history.extend(result2['messages'])
    
    # Third turn
    result3 = await langgraph_service.run_tool_graph(
        input_text="Great! Thanks for your help.",
        chat_history=chat_history
    )
    
    print(f"Turn 3: {result3['response']}")
    print(f"Final conversation length: {len(chat_history)} messages")
    print("-" * 50)
    
    return result3

async def test_error_handling():
    """Test error handling with invalid operations"""
    print("⚠️  Testing error handling...")
    
    # Test with non-existent file
    result1 = await langgraph_service.run_tool_graph(
        input_text="Delete the file '/non/existent/path/file.txt'",
        chat_history=[]
    )
    
    print(f"Non-existent file response: {result1['response']}")
    print(f"Tools called: {result1['tools_called']}")
    print("-" * 30)
    
    # Test with invalid app name
    result2 = await langgraph_service.run_tool_graph(
        input_text="Open NonExistentApp123 application",
        chat_history=[]
    )
    
    print(f"Invalid app response: {result2['response']}")
    print(f"Tools called: {result2['tools_called']}")
    print("-" * 50)
    
    return result2

async def test_tool_information():
    """Test tool information retrieval"""
    print("🔧 Available tools in LangGraph service:")
    
    for tool in langgraph_service.tools:
        print(f"  • {tool.name}: {tool.description}")
    
    print("-" * 50)

def print_test_summary(results):
    """Print a summary of all test results"""
    print("📊 TEST SUMMARY")
    print("=" * 50)
    
    total_tools_called = sum(len(result.get('tools_called', [])) for result in results)
    successful_tests = sum(1 for result in results if result.get('success', False))
    
    print(f"Total tests run: {len(results)}")
    print(f"Successful tests: {successful_tests}")
    print(f"Total tools called: {total_tools_called}")
    print(f"Success rate: {successful_tests/len(results)*100:.1f}%")
    
    print("\nTools usage summary:")
    all_tools = {}
    for result in results:
        for tool in result.get('tools_called', []):
            all_tools[tool] = all_tools.get(tool, 0) + 1
    
    for tool, count in all_tools.items():
        print(f"  • {tool}: {count} times")

async def main():
    """Run all tests"""
    print("🧪 QLIPPY LANGGRAPH TOOL-CALLING TESTS")
    print("=" * 60)
    print("Testing LangGraph integration with file operations and app management")
    print("=" * 60)
    
    try:
        # Run all tests
        results = []
        
        # Test basic functionality
        await test_tool_information()
        
        result1 = await test_basic_conversation()
        results.append(result1)
        
        result2 = await test_file_operations()
        results.append(result2)
        
        result3 = await test_app_operations()
        results.append(result3)
        
        result4 = await test_conversation_with_tools()
        results.append(result4)
        
        result5 = await test_error_handling()
        results.append(result5)
        
        # Print summary
        print_test_summary(results)
        
        print("\n✅ All tests completed!")
        print("\n🔗 To test via API:")
        print("  POST http://127.0.0.1:11434/api/langgraph/execute")
        print("  GET  http://127.0.0.1:11434/api/langgraph/tools")
        print("  POST http://127.0.0.1:11434/api/langgraph/chat")
        
    except Exception as e:
        print(f"❌ Test execution failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Ensure we're in the right directory
    os.chdir(Path(__file__).parent)
    
    # Run the tests
    asyncio.run(main()) 