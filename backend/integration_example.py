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
        self.user_id = None
    
    def create_user(self, username):
        """Create a new user"""
        response = requests.post(f"{self.base_url}/users", json={"username": username})
        if response.status_code == 201:
            user_data = response.json()
            self.user_id = user_data['id']
            return user_data
        else:
            raise Exception(f"Failed to create user: {response.text}")
    
    def get_conversations(self):
        """Get all conversations for the current user"""
        if not self.user_id:
            raise Exception("No user ID set. Create a user first.")
        
        response = requests.get(f"{self.base_url}/users/{self.user_id}/conversations")
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Failed to get conversations: {response.text}")
    
    def create_conversation(self, title="New Conversation", folder=None):
        """Create a new conversation"""
        if not self.user_id:
            raise Exception("No user ID set. Create a user first.")
        
        data = {"title": title}
        if folder:
            data["folder"] = folder
        
        response = requests.post(f"{self.base_url}/users/{self.user_id}/conversations", json=data)
        if response.status_code == 201:
            return response.json()
        else:
            raise Exception(f"Failed to create conversation: {response.text}")
    
    def get_conversation(self, conversation_id):
        """Get a specific conversation with all messages"""
        response = requests.get(f"{self.base_url}/conversations/{conversation_id}")
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Failed to get conversation: {response.text}")
    
    def add_message(self, conversation_id, role, content):
        """Add a message to a conversation"""
        response = requests.post(
            f"{self.base_url}/conversations/{conversation_id}/messages",
            json={"role": role, "content": content}
        )
        if response.status_code == 201:
            return response.json()
        else:
            raise Exception(f"Failed to add message: {response.text}")
    
    def update_conversation(self, conversation_id, title=None, folder=None):
        """Update conversation title or folder"""
        data = {}
        if title:
            data["title"] = title
        if folder:
            data["folder"] = folder
        
        response = requests.put(f"{self.base_url}/conversations/{conversation_id}", json=data)
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Failed to update conversation: {response.text}")
    
    def delete_conversation(self, conversation_id):
        """Delete a conversation"""
        response = requests.delete(f"{self.base_url}/conversations/{conversation_id}")
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Failed to delete conversation: {response.text}")
    
    def get_plugins(self):
        """Get all plugins for the current user"""
        if not self.user_id:
            raise Exception("No user ID set. Create a user first.")
        
        response = requests.get(f"{self.base_url}/users/{self.user_id}/plugins")
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Failed to get plugins: {response.text}")
    
    def create_plugin(self, name, description="", enabled=True):
        """Create a new plugin"""
        if not self.user_id:
            raise Exception("No user ID set. Create a user first.")
        
        response = requests.post(
            f"{self.base_url}/users/{self.user_id}/plugins",
            json={"name": name, "description": description, "enabled": enabled}
        )
        if response.status_code == 201:
            return response.json()
        else:
            raise Exception(f"Failed to create plugin: {response.text}")

def example_usage():
    """Example of how to use the API from the frontend"""
    print("🚀 Qlippy Backend Integration Example")
    print("=" * 50)
    
    # Initialize API client
    api = QlippyAPI()
    
    try:
        # Create a user
        print("👤 Creating user...")
        user = api.create_user("demo_user")
        print(f"✅ User created: {user['username']}")
        
        # Create a conversation
        print("\n💬 Creating conversation...")
        conversation = api.create_conversation("My First Chat", "personal")
        print(f"✅ Conversation created: {conversation['title']}")
        
        # Add some messages
        print("\n💭 Adding messages...")
        api.add_message(conversation['id'], "user", "Hello! How are you today?")
        api.add_message(conversation['id'], "assistant", "Hello! I'm doing great, thank you for asking. How can I help you today?")
        api.add_message(conversation['id'], "user", "Can you help me with a coding project?")
        api.add_message(conversation['id'], "assistant", "Of course! I'd be happy to help you with your coding project. What kind of project are you working on?")
        
        # Get the conversation with messages
        print("\n📖 Retrieving conversation...")
        full_conversation = api.get_conversation(conversation['id'])
        print(f"✅ Conversation retrieved with {len(full_conversation['messages'])} messages")
        
        # Create a plugin
        print("\n🔌 Creating plugin...")
        plugin = api.create_plugin("Code Assistant", "Helps with programming tasks", True)
        print(f"✅ Plugin created: {plugin['name']}")
        
        # Get all conversations
        print("\n📋 Getting all conversations...")
        conversations = api.get_conversations()
        print(f"✅ Found {len(conversations)} conversations")
        
        # Get all plugins
        print("\n🔌 Getting all plugins...")
        plugins = api.get_plugins()
        print(f"✅ Found {len(plugins)} plugins")
        
        print("\n" + "=" * 50)
        print("🎉 Integration example completed successfully!")
        print("This shows how your frontend can interact with the backend API.")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    example_usage() 