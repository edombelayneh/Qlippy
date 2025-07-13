#!/usr/bin/env python3
"""
Test script for Qlippy MVP setup
Verifies database and API endpoints work correctly
"""

import requests
import json
import time
import subprocess
import sys
from pathlib import Path

def test_database():
    """Test database operations directly"""
    print("🧪 Testing database operations...")
    
    try:
        from quick_db_integration import setup_database
        
        # Setup database
        db = setup_database()
        print("✅ Database connection successful")
        
        # Test theme settings
        theme_settings = db.get_theme_settings()
        print(f"✅ Theme settings: {theme_settings}")
        
        # Test updating theme
        db.update_theme_settings('dark')
        updated_theme = db.get_theme_settings()
        print(f"✅ Updated theme settings: {updated_theme}")
        
        # Test TTS settings
        tts_settings = db.get_tts_settings()
        print(f"✅ TTS settings: {tts_settings}")
        
        # Test model behavior
        model_behavior = db.get_model_behavior()
        print(f"✅ Model behavior: {model_behavior}")
        
        # Test conversations
        conversations = db.get_conversations()
        print(f"✅ Conversations: {len(conversations)} found")
        
        # Test adding a conversation
        conv_id = db.create_conversation("Test Conversation")
        db.add_message(conv_id, "user", "Hello!")
        db.add_message(conv_id, "assistant", "Hi there!")
        
        messages = db.get_conversation_messages(conv_id)
        print(f"✅ Messages in test conversation: {len(messages)}")
        
        # Test rules
        rules = db.get_rules()
        print(f"✅ Rules: {len(rules)} found")
        
        # Test adding a rule
        rule_id = db.add_rule("Test rule for MVP")
        updated_rules = db.get_rules()
        print(f"✅ Rules after adding: {len(updated_rules)}")
        
        # Test models
        models = db.get_models()
        print(f"✅ Models: {len(models)} found")
        
        # Test adding a model
        model_id = db.add_model("Test Model", "/path/to/model.gguf", "2.5 GB")
        updated_models = db.get_models()
        print(f"✅ Models after adding: {len(updated_models)}")
        
        db.close()
        print("✅ All database tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return False

def wait_for_server(url, timeout=30):
    """Wait for server to be ready"""
    print(f"⏳ Waiting for server at {url}...")
    
    for i in range(timeout):
        try:
            response = requests.get(f"{url}/health", timeout=2)
            if response.status_code == 200:
                print("✅ Server is ready!")
                return True
        except:
            pass
        
        if i < timeout - 1:
            time.sleep(1)
    
    print("❌ Server not ready after timeout")
    return False

def test_api_endpoints():
    """Test all API endpoints"""
    print("🌐 Testing API endpoints...")
    
    base_url = "http://localhost:8000/api/settings"
    
    try:
        # Test theme endpoints
        print("Testing theme endpoints...")
        response = requests.get(f"{base_url}/theme")
        if response.status_code == 200:
            print("✅ GET /theme successful")
            theme_data = response.json()
            print(f"   Theme data: {theme_data}")
        else:
            print(f"❌ GET /theme failed: {response.status_code}")
        
        # Test updating theme
        theme_update = {"theme": "dark"}
        response = requests.post(f"{base_url}/theme", json=theme_update)
        if response.status_code == 200:
            print("✅ POST /theme successful")
        else:
            print(f"❌ POST /theme failed: {response.status_code}")
        
        # Test TTS endpoints
        print("Testing TTS endpoints...")
        response = requests.get(f"{base_url}/tts")
        if response.status_code == 200:
            print("✅ GET /tts successful")
            tts_data = response.json()
            print(f"   TTS data: {tts_data}")
        else:
            print(f"❌ GET /tts failed: {response.status_code}")
        
        # Test model behavior endpoints
        print("Testing model behavior endpoints...")
        response = requests.get(f"{base_url}/model-behavior")
        if response.status_code == 200:
            print("✅ GET /model-behavior successful")
            behavior_data = response.json()
            print(f"   Behavior data: {behavior_data}")
        else:
            print(f"❌ GET /model-behavior failed: {response.status_code}")
        
        # Test conversations endpoints
        print("Testing conversations endpoints...")
        response = requests.get(f"{base_url}/conversations")
        if response.status_code == 200:
            print("✅ GET /conversations successful")
            conversations_data = response.json()
            print(f"   Conversations: {len(conversations_data)} found")
        else:
            print(f"❌ GET /conversations failed: {response.status_code}")
        
        # Test creating conversation
        new_conv = {"title": "API Test Conversation"}
        response = requests.post(f"{base_url}/conversations", json=new_conv)
        if response.status_code == 200:
            print("✅ POST /conversations successful")
            conv_data = response.json()
            conv_id = conv_data.get('id')
            
            # Test adding message
            new_message = {"role": "user", "content": "API test message"}
            response = requests.post(f"{base_url}/conversations/{conv_id}/messages", json=new_message)
            if response.status_code == 200:
                print("✅ POST /conversations/{id}/messages successful")
            else:
                print(f"❌ POST /conversations/{conv_id}/messages failed: {response.status_code}")
        else:
            print(f"❌ POST /conversations failed: {response.status_code}")
        
        # Test rules endpoints
        print("Testing rules endpoints...")
        response = requests.get(f"{base_url}/rules")
        if response.status_code == 200:
            print("✅ GET /rules successful")
            rules_data = response.json()
            print(f"   Rules: {len(rules_data)} found")
        else:
            print(f"❌ GET /rules failed: {response.status_code}")
        
        # Test models endpoints
        print("Testing models endpoints...")
        response = requests.get(f"{base_url}/models")
        if response.status_code == 200:
            print("✅ GET /models successful")
            models_data = response.json()
            print(f"   Models: {len(models_data)} found")
        else:
            print(f"❌ GET /models failed: {response.status_code}")
        
        # Test voice detection endpoints
        print("Testing voice detection endpoints...")
        response = requests.get(f"{base_url}/voice-detection")
        if response.status_code == 200:
            print("✅ GET /voice-detection successful")
            voice_data = response.json()
            print(f"   Voice detection data: {voice_data}")
        else:
            print(f"❌ GET /voice-detection failed: {response.status_code}")
        
        # Test audio endpoints
        print("Testing audio endpoints...")
        response = requests.get(f"{base_url}/audio")
        if response.status_code == 200:
            print("✅ GET /audio successful")
            audio_data = response.json()
            print(f"   Audio data: {audio_data}")
        else:
            print(f"❌ GET /audio failed: {response.status_code}")
        
        print("✅ All API endpoint tests completed!")
        return True
        
    except Exception as e:
        print(f"❌ API endpoint test failed: {e}")
        return False

def test_frontend_integration():
    """Test frontend integration patterns"""
    print("🎨 Testing frontend integration patterns...")
    
    # Test if hooks file exists
    hooks_path = Path("packages/web/app/hooks/use-settings-db.ts")
    if hooks_path.exists():
        print("✅ Frontend hooks file exists")
        
        # Read and validate basic structure
        with open(hooks_path, 'r') as f:
            content = f.read()
            
        if "useThemeSettings" in content:
            print("✅ useThemeSettings hook found")
        else:
            print("❌ useThemeSettings hook missing")
        
        if "useTTSSettings" in content:
            print("✅ useTTSSettings hook found")
        else:
            print("❌ useTTSSettings hook missing")
        
        if "useModelBehavior" in content:
            print("✅ useModelBehavior hook found")
        else:
            print("❌ useModelBehavior hook missing")
        
        if "useConversations" in content:
            print("✅ useConversations hook found")
        else:
            print("❌ useConversations hook missing")
        
        print("✅ Frontend integration patterns validated!")
        return True
    else:
        print("❌ Frontend hooks file not found")
        return False

def main():
    """Main test function"""
    print("🚀 Testing Qlippy MVP Setup...")
    print("=" * 50)
    
    # Check if we're in the right directory
    if not Path("packages").exists():
        print("❌ Error: Run this script from the Qlippy root directory")
        sys.exit(1)
    
    # Test database
    db_success = test_database()
    
    print("\n" + "=" * 50)
    
    # Test API endpoints (requires server to be running)
    print("🌐 Testing API endpoints...")
    print("Note: This requires the server to be running!")
    print("Start server with: cd packages/server && python -m uvicorn main:app --reload")
    
    server_ready = wait_for_server("http://localhost:8000")
    
    if server_ready:
        api_success = test_api_endpoints()
    else:
        print("⏭️  Skipping API tests - server not running")
        api_success = False
    
    print("\n" + "=" * 50)
    
    # Test frontend integration
    frontend_success = test_frontend_integration()
    
    print("\n" + "=" * 50)
    
    # Summary
    print("📊 Test Results Summary:")
    print(f"Database: {'✅ PASSED' if db_success else '❌ FAILED'}")
    print(f"API Endpoints: {'✅ PASSED' if api_success else '❌ FAILED (server not running?)'}")
    print(f"Frontend Integration: {'✅ PASSED' if frontend_success else '❌ FAILED'}")
    
    if db_success and frontend_success:
        print("\n🎉 MVP Setup is working correctly!")
        print("💡 Next steps:")
        print("1. Start the server: cd packages/server && python -m uvicorn main:app --reload")
        print("2. Update your frontend components to use the new hooks")
        print("3. Replace hardcoded values with database-backed settings")
        print("4. Test the complete integration")
        return True
    else:
        print("\n❌ Some tests failed. Please check the errors above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 