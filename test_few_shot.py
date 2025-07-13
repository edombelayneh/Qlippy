#!/usr/bin/env python3
import requests
import json
import time

def test_tool_calling():
    base_url = "http://127.0.0.1:11434/api/langgraph"
    
    test_cases = [
        "Can you open Slack for me?",
        "Launch Spotify",
        "Open VS Code",
        "Start Discord", 
        "Close Slack",
        "Open Finder",
        "What's the weather like?",  # Should not use tools
        "Launch Chrome"
    ]
    
    print("Testing Few-Shot Tool Calling...")
    print("=" * 50)
    
    for i, test_input in enumerate(test_cases, 1):
        print(f"\nTest {i}: {test_input}")
        print("-" * 30)
        
        payload = {
            "input": test_input,
            "chat_history": []
        }
        
        try:
            # Test execute endpoint
            response = requests.post(
                f"{base_url}/execute",
                headers={"Content-Type": "application/json"},
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"Response: {result['response'][:100]}...")
                print(f"Tools called: {result['tools_called']}")
                print(f"Success: {result['success']}")
            else:
                print(f"Error: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"Exception: {e}")
            
        time.sleep(1)  # Small delay between requests

if __name__ == "__main__":
    test_tool_calling() 