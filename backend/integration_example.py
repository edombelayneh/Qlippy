#!/usr/bin/env python3
"""
Integration Example for Qlippy Frontend
This script shows how to use the backend API from the frontend
"""

import requests
import json

class QlippyAPI:
    def __init__(self, base_url="http://localhost:5001/api"):
        self.base_url = base_url
    
    def get_conversations(self):
        """Get all conversations"""
        response = requests.get(f"{self.base_url}/conversations")
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Failed to get conversations: {response.text}")
    
    def create_conversation(self, title="New Conversation", folder=None):
        """Create a new conversation"""
        data = {"title": title}
        if folder:
            data["folder"] = folder
        
        response = requests.post(f"{self.base_url}/conversations", json=data)
        if response.status_code == 201:
            return response.json()
        else:
            raise Exception(f"Failed to create conversation: {response.text}")
    
    def get_conversation(self, conversation_id):
        """Get a specific conversation with messages"""
        response = requests.get(f"{self.base_url}/conversations/{conversation_id}")
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Failed to get conversation: {response.text}")
    
    def add_message(self, conversation_id, role, content):
        """Add a message to a conversation"""
        data = {"role": role, "content": content}
        response = requests.post(f"{self.base_url}/conversations/{conversation_id}/messages", json=data)
        if response.status_code == 201:
            return response.json()
        else:
            raise Exception(f"Failed to add message: {response.text}")
    
    def get_plugins(self):
        """Get all plugins"""
        response = requests.get(f"{self.base_url}/plugins")
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Failed to get plugins: {response.text}")
    
    def create_plugin(self, name, description="", enabled=True):
        """Create a new plugin"""
        data = {"name": name, "description": description, "enabled": enabled}
        response = requests.post(f"{self.base_url}/plugins", json=data)
        if response.status_code == 201:
            return response.json()
        else:
            raise Exception(f"Failed to create plugin: {response.text}")
    
    def search_conversations(self, query):
        """Search conversations"""
        response = requests.get(f"{self.base_url}/search?q={query}")
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Failed to search conversations: {response.text}")

def main():
    """Example usage of the Qlippy API"""
    api = QlippyAPI()
    
    print("🚀 Qlippy API Integration Example")
    print("=" * 40)
    
    try:
        # Get all conversations
        print("\n📋 Getting conversations...")
        conversations = api.get_conversations()
        print(f"Found {len(conversations)} conversations")
        
        # Create a new conversation
        print("\n💬 Creating new conversation...")
        new_conversation = api.create_conversation("Test Conversation", "work")
        print(f"Created conversation: {new_conversation['title']} (ID: {new_conversation['id']})")
        
        # Add messages to the conversation
        print("\n💭 Adding messages...")
        user_message = api.add_message(new_conversation['id'], "user", "Hello, how are you?")
        print(f"Added user message: {user_message['content'][:30]}...")
        
        assistant_message = api.add_message(new_conversation['id'], "assistant", "Hello! I'm doing well, thank you for asking. How can I help you today?")
        print(f"Added assistant message: {assistant_message['content'][:30]}...")
        
        # Get the conversation with messages
        print("\n📖 Getting conversation with messages...")
        conversation = api.get_conversation(new_conversation['id'])
        print(f"Conversation: {conversation['title']}")
        print(f"Messages: {len(conversation['messages'])}")
        for msg in conversation['messages']:
            print(f"  - {msg['role']}: {msg['content'][:50]}...")
        
        # Get plugins
        print("\n🔌 Getting plugins...")
        plugins = api.get_plugins()
        print(f"Found {len(plugins)} plugins")
        
        # Create a plugin
        print("\n🔌 Creating plugin...")
        new_plugin = api.create_plugin("Test Plugin", "A test plugin", True)
        print(f"Created plugin: {new_plugin['name']} (ID: {new_plugin['id']})")
        
        # Search conversations
        print("\n🔍 Searching conversations...")
        search_results = api.search_conversations("hello")
        print(f"Search results: {search_results['total_results']} conversations found")
        
        print("\n✅ All operations completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    main() 