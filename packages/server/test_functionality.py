#!/usr/bin/env python3
"""
Comprehensive test script to verify Chat and Voice functionality
"""

import requests
import json
import websockets
import asyncio
import tempfile
import wave
import numpy as np
from pathlib import Path

BASE_URL = "http://localhost:11434"

def test_health():
    """Test health endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"✅ Health check: {response.status_code} - {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_chat_generate():
    """Test chat generation endpoint"""
    try:
        print("\n🧪 Testing Chat Generation...")
        response = requests.post(
            f"{BASE_URL}/api/generate",
            json={"prompt": "Say hello in one sentence"},
            stream=True
        )
        
        if response.status_code != 200:
            print(f"❌ Chat generation failed: {response.status_code}")
            return False
        
        tokens = []
        for line in response.iter_lines():
            if line:
                try:
                    data = json.loads(line)
                    if "token" in data:
                        tokens.append(data["token"])
                        print(f"Token: {data['token']}", end="")
                    elif "error" in data:
                        print(f"❌ Error in response: {data['error']}")
                        return False
                except json.JSONDecodeError:
                    continue
        
        full_response = "".join(tokens)
        print(f"\n✅ Chat generation successful: {len(full_response)} characters")
        return len(full_response) > 0
        
    except Exception as e:
        print(f"❌ Chat generation failed: {e}")
        return False

def create_test_audio():
    """Create a test audio file"""
    try:
        # Create a simple test audio file (sine wave)
        sample_rate = 16000
        duration = 2.0
        frequency = 440.0
        
        t = np.linspace(0, duration, int(sample_rate * duration), False)
        audio_data = np.sin(2 * np.pi * frequency * t) * 0.3
        audio_data = (audio_data * 32767).astype(np.int16)
        
        temp_file = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
        temp_path = temp_file.name
        temp_file.close()
        
        with wave.open(temp_path, 'wb') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(audio_data.tobytes())
        
        print(f"✅ Created test audio file: {temp_path}")
        return temp_path
        
    except Exception as e:
        print(f"❌ Failed to create test audio: {e}")
        return None

async def test_websocket_voice():
    """Test WebSocket voice functionality"""
    try:
        print("\n🎙️ Testing WebSocket Voice...")
        
        uri = "ws://localhost:11434/ws/record"
        async with websockets.connect(uri) as websocket:
            print("✅ WebSocket connected")
            
            # Send start signal (implicit - connection starts recording)
            await asyncio.sleep(0.5)
            
            # Send stop signal
            await websocket.send("stop")
            print("✅ Sent stop signal")
            
            # Listen for responses
            responses = []
            timeout = 10
            
            while timeout > 0:
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                    data = json.loads(response)
                    responses.append(data)
                    print(f"📨 Received: {data.get('status', 'unknown')} - {data.get('message', '')}")
                    
                    if data.get('status') in ['success', 'error']:
                        break
                        
                except asyncio.TimeoutError:
                    timeout -= 1
                    if timeout <= 0:
                        print("⏰ WebSocket timeout")
                        break
            
            # Check results
            if responses:
                final_response = responses[-1]
                if final_response.get('status') == 'success':
                    print(f"✅ WebSocket voice test successful")
                    return True
                elif final_response.get('status') == 'error':
                    print(f"⚠️ WebSocket returned error: {final_response.get('message')}")
                    return False
            
            return False
            
    except Exception as e:
        print(f"❌ WebSocket voice test failed: {e}")
        return False

def test_settings_api():
    """Test settings API"""
    try:
        print("\n⚙️ Testing Settings API...")
        
        # Test get conversations
        response = requests.get(f"{BASE_URL}/api/settings/conversations")
        print(f"✅ Get conversations: {response.status_code}")
        
        # Test create conversation
        response = requests.post(
            f"{BASE_URL}/api/settings/conversations",
            json={"title": "Test Conversation"}
        )
        print(f"✅ Create conversation: {response.status_code}")
        
        return response.status_code == 200
        
    except Exception as e:
        print(f"❌ Settings API test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 Running Qlippy Functionality Tests...")
    print("=" * 50)
    
    tests = [
        ("Health Check", test_health),
        ("Chat Generation", test_chat_generate),
        ("Settings API", test_settings_api),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} crashed: {e}")
            results.append((test_name, False))
    
    # Run async WebSocket test
    try:
        ws_result = asyncio.run(test_websocket_voice())
        results.append(("WebSocket Voice", ws_result))
    except Exception as e:
        print(f"❌ WebSocket Voice crashed: {e}")
        results.append(("WebSocket Voice", False))
    
    # Print summary
    print("\n📊 Test Results:")
    print("=" * 50)
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1
    
    print(f"\n🎯 Summary: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("🎉 All tests passed! Your MVP is ready for demo!")
    else:
        print("⚠️ Some tests failed. Check the issues above.")

if __name__ == "__main__":
    main() 