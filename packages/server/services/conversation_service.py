"""
ConversationService
Handles all conversation and message database operations
Properly separated from settings and other concerns
"""

import sqlite3
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any


class ConversationService:
    """Service for managing conversations and messages"""
    
    def __init__(self, db_path: str = "qlippy.db"):
        self.db_path = db_path
        self.conn = None
        self._connect()
    
    def _connect(self):
        """Connect to database with proper configuration"""
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA foreign_keys = ON")
    
    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()
    
    # =============================================================================
    # CONVERSATIONS MANAGEMENT
    # =============================================================================
    
    def get_conversations(self) -> List[Dict[str, Any]]:
        """Get all conversations"""
        try:
            cursor = self.conn.execute("""
                SELECT c.id, c.title, c.created_at, c.updated_at,
                       COUNT(m.id) as message_count
                FROM conversations c
                LEFT JOIN messages m ON c.id = m.conversation_id
                GROUP BY c.id, c.title, c.created_at, c.updated_at
                ORDER BY c.updated_at DESC
            """)
            
            conversations = []
            for row in cursor:
                conversations.append({
                    'id': row['id'],
                    'title': row['title'],
                    'lastUpdated': datetime.fromisoformat(row['updated_at']),
                    'message_count': row['message_count'],
                })
            return conversations
        except Exception as e:
            print(f"Error getting conversations: {e}")
            return []
    
    def get_conversation_messages(self, conversation_id: str) -> List[Dict[str, Any]]:
        """Get messages for a conversation"""
        try:
            cursor = self.conn.execute("""
                SELECT id, role, content, created_at
                FROM messages 
                WHERE conversation_id = ?
                ORDER BY created_at
            """, (conversation_id,))
            
            messages = []
            for row in cursor:
                messages.append({
                    'id': row['id'],
                    'role': row['role'],
                    'content': row['content'],
                    'timestamp': datetime.fromisoformat(row['created_at']),
                })
            return messages
        except Exception as e:
            print(f"Error getting conversation messages: {e}")
            return []
    
    def create_conversation(self, title: str) -> Optional[str]:
        """Create new conversation"""
        try:
            conversation_id = str(uuid.uuid4())
            self.conn.execute("""
                INSERT INTO conversations (id, title, created_at, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, (conversation_id, title))
            self.conn.commit()
            return conversation_id
        except Exception as e:
            print(f"Error creating conversation: {e}")
            return None
    
    def add_message(self, conversation_id: str, role: str, content: str) -> Optional[str]:
        """Add message to conversation"""
        try:
            message_id = str(uuid.uuid4())
            self.conn.execute("""
                INSERT INTO messages (id, conversation_id, role, content, created_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            """, (message_id, conversation_id, role, content))
            self.conn.commit()
            return message_id
        except Exception as e:
            print(f"Error adding message: {e}")
            return None
    
    def update_message(self, message_id: str, content: str) -> bool:
        """Update message content"""
        try:
            self.conn.execute("""
                UPDATE messages SET content = ? WHERE id = ?
            """, (content, message_id))
            self.conn.commit()
            return True
        except Exception as e:
            print(f"Error updating message: {e}")
            return False
    
    def update_conversation_title(self, conversation_id: str, title: str) -> bool:
        """Update conversation title"""
        try:
            self.conn.execute("""
                UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            """, (title, conversation_id))
            self.conn.commit()
            return True
        except Exception as e:
            print(f"Error updating conversation title: {e}")
            return False

    def delete_conversation(self, conversation_id: str) -> bool:
        """Delete conversation and all messages"""
        try:
            self.conn.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))
            self.conn.commit()
            return True
        except Exception as e:
            print(f"Error deleting conversation: {e}")
            return False


# Create service instance
conversation_service = ConversationService() 