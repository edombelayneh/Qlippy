#!/usr/bin/env python3
"""
Test script for Qlippy Backend API
Run this to test all the main endpoints
"""

import requests
import json
import sys

BASE_URL = "http://localhost:5001/api"

def test_health():
    """Test the health endpoint"""
    print("🔍 Testing health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            print("✅ Health check passed")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure the backend is running.")
        return False

def test_user_creation():
    """Test user creation"""
    print("\n👤 Testing user creation...")
    user_data = {"username": "testuser"}
    try:
        response = requests.post(f"{BASE_URL}/users", json=user_data)
        if response.status_code == 201:
            user = response.json()
            print(f"✅ User created: {user['username']} (ID: {user['id']})")
            return user['id']
        else:
            print(f"❌ User creation failed: {response.status_code}")
            print(response.text)
            return None
    except Exception as e:
        print(f"❌ Error creating user: {e}")
        return None

def test_conversation_creation(user_id):
    """Test conversation creation"""
    print(f"\n💬 Testing conversation creation for user {user_id}...")
    conv_data = {"title": "Test Conversation", "folder": "test"}
    try:
        response = requests.post(f"{BASE_URL}/users/{user_id}/conversations", json=conv_data)
        if response.status_code == 201:
            conversation = response.json()
            print(f"✅ Conversation created: {conversation['title']} (ID: {conversation['id']})")
            return conversation['id']
        else:
            print(f"❌ Conversation creation failed: {response.status_code}")
            print(response.text)
            return None
    except Exception as e:
        print(f"❌ Error creating conversation: {e}")
        return None

def test_message_creation(conversation_id):
    """Test message creation"""
    print(f"\n💭 Testing message creation for conversation {conversation_id}...")
    
    # Test user message
    user_message = {"role": "user", "content": "Hello, this is a test message!"}
    try:
        response = requests.post(f"{BASE_URL}/conversations/{conversation_id}/messages", json=user_message)
        if response.status_code == 201:
            message = response.json()
            print(f"✅ User message created: {message['content'][:50]}...")
        else:
            print(f"❌ User message creation failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error creating user message: {e}")
        return False
    
    # Test assistant message
    assistant_message = {"role": "assistant", "content": "Hello! I'm the AI assistant. How can I help you today?"}
    try:
        response = requests.post(f"{BASE_URL}/conversations/{conversation_id}/messages", json=assistant_message)
        if response.status_code == 201:
            message = response.json()
            print(f"✅ Assistant message created: {message['content'][:50]}...")
            return True
        else:
            print(f"❌ Assistant message creation failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error creating assistant message: {e}")
        return False

def test_conversation_retrieval(conversation_id):
    """Test conversation retrieval with messages"""
    print(f"\n📖 Testing conversation retrieval for {conversation_id}...")
    try:
        response = requests.get(f"{BASE_URL}/conversations/{conversation_id}")
        if response.status_code == 200:
            conversation = response.json()
            print(f"✅ Conversation retrieved: {conversation['title']}")
            print(f"   Messages: {len(conversation['messages'])}")
            for msg in conversation['messages']:
                print(f"   - {msg['role']}: {msg['content'][:30]}...")
            return True
        else:
            print(f"❌ Conversation retrieval failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error retrieving conversation: {e}")
        return False

def test_plugin_creation(user_id):
    """Test plugin creation"""
    print(f"\n🔌 Testing plugin creation for user {user_id}...")
    plugin_data = {
        "name": "Test Plugin",
        "description": "A test plugin for the Qlippy backend",
        "enabled": True
    }
    try:
        response = requests.post(f"{BASE_URL}/users/{user_id}/plugins", json=plugin_data)
        if response.status_code == 201:
            plugin = response.json()
            print(f"✅ Plugin created: {plugin['name']} (ID: {plugin['id']})")
            return plugin['id']
        else:
            print(f"❌ Plugin creation failed: {response.status_code}")
            print(response.text)
            return None
    except Exception as e:
        print(f"❌ Error creating plugin: {e}")
        return None

def main():
    """Run all tests"""
    print("🧪 Starting Qlippy Backend API Tests")
    print("=" * 50)
    
    # Test health endpoint
    if not test_health():
        print("\n❌ Health check failed. Exiting.")
        sys.exit(1)
    
    # Test user creation
    user_id = test_user_creation()
    if not user_id:
        print("\n❌ User creation failed. Exiting.")
        sys.exit(1)
    
    # Test conversation creation
    conversation_id = test_conversation_creation(user_id)
    if not conversation_id:
        print("\n❌ Conversation creation failed. Exiting.")
        sys.exit(1)
    
    # Test message creation
    if not test_message_creation(conversation_id):
        print("\n❌ Message creation failed. Exiting.")
        sys.exit(1)
    
    # Test conversation retrieval
    if not test_conversation_retrieval(conversation_id):
        print("\n❌ Conversation retrieval failed. Exiting.")
        sys.exit(1)
    
    # Test plugin creation
    plugin_id = test_plugin_creation(user_id)
    if not plugin_id:
        print("\n❌ Plugin creation failed. Exiting.")
        sys.exit(1)
    
    print("\n" + "=" * 50)
    print("🎉 All tests passed! The backend is working correctly.")
    print(f"📊 Test Summary:")
    print(f"   - User ID: {user_id}")
    print(f"   - Conversation ID: {conversation_id}")
    print(f"   - Plugin ID: {plugin_id}")
    print(f"   - API Base URL: {BASE_URL}")

if __name__ == "__main__":
    main() 