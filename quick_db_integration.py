#!/usr/bin/env python3
"""
Qlippy MVP Database Integration
Quick and simple database manager for 5-hour MVP development
"""

import sqlite3
import json
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from pathlib import Path

class QlippyDB:
    """Simple database manager for Qlippy MVP"""
    
    def __init__(self, db_path: str = "qlippy.db"):
        self.db_path = db_path
        self.conn = None
        self.connect()
    
    def connect(self):
        """Connect to database"""
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
    
    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()
    
    def execute_script(self, script_path: str):
        """Execute SQL script file"""
        with open(script_path, 'r') as f:
            self.conn.executescript(f.read())
        self.conn.commit()
    
    # =============================================================================
    # SETTINGS (Key-Value Store)
    # =============================================================================
    
    def get_setting(self, key: str, default: Any = None) -> Any:
        """Get setting value"""
        cursor = self.conn.execute("SELECT value FROM settings WHERE key = ?", (key,))
        result = cursor.fetchone()
        if result:
            value = result['value']
            # Try to parse as JSON for complex values
            try:
                return json.loads(value)
            except:
                return value
        return default
    
    def set_setting(self, key: str, value: Any):
        """Set setting value"""
        if isinstance(value, (dict, list)):
            value = json.dumps(value)
        else:
            value = str(value)
        
        self.conn.execute("""
            INSERT OR REPLACE INTO settings (key, value, updated_at) 
            VALUES (?, ?, CURRENT_TIMESTAMP)
        """, (key, value))
        self.conn.commit()
    
    def get_settings_by_prefix(self, prefix: str) -> Dict[str, Any]:
        """Get all settings starting with prefix"""
        cursor = self.conn.execute("""
            SELECT key, value FROM settings WHERE key LIKE ?
        """, (f"{prefix}%",))
        
        settings = {}
        for row in cursor:
            key = row['key']
            value = row['value']
            try:
                settings[key] = json.loads(value)
            except:
                settings[key] = value
        return settings
    
    # =============================================================================
    # THEME SETTINGS (Quick Integration)
    # =============================================================================
    
    def get_theme_settings(self) -> Dict[str, Any]:
        """Get theme settings for AppearanceSettings component"""
        return {
            'theme': self.get_setting('theme', 'system'),
        }
    
    def update_theme_settings(self, theme: str):
        """Update theme settings"""
        self.set_setting('theme', theme)
    
    # =============================================================================
    # TTS SETTINGS (Quick Integration)
    # =============================================================================
    
    def get_tts_settings(self) -> Dict[str, Any]:
        """Get TTS settings for TextToSpeechSettings component"""
        return {
            'selectedVoice': self.get_setting('tts_selected_voice', 'en-US-neural-aria'),
            'playbackSpeed': float(self.get_setting('tts_playback_speed', '1.0')),
            'testText': self.get_setting('tts_test_text', 'Hello! This is a test of the text-to-speech system. How does this sound to you?'),
        }
    
    def update_tts_settings(self, selected_voice: str, playback_speed: float, test_text: str):
        """Update TTS settings"""
        self.set_setting('tts_selected_voice', selected_voice)
        self.set_setting('tts_playback_speed', playback_speed)
        self.set_setting('tts_test_text', test_text)
    
    # =============================================================================
    # MODEL BEHAVIOR (Quick Integration)
    # =============================================================================
    
    def get_model_behavior(self) -> Dict[str, Any]:
        """Get model behavior settings for ModelBehaviorSettings component"""
        cursor = self.conn.execute("""
            SELECT temperature, top_p, top_k, max_tokens, stop_sequences, system_prompt
            FROM model_behavior WHERE id = 1
        """)
        result = cursor.fetchone()
        
        if result:
            stop_sequences = json.loads(result['stop_sequences']) if result['stop_sequences'] else []
            return {
                'temperature': result['temperature'],
                'top_p': result['top_p'],
                'top_k': result['top_k'],
                'max_tokens': result['max_tokens'],
                'stop_sequences': stop_sequences,
                'system_prompt': result['system_prompt'],
            }
        
        # Default values
        return {
            'temperature': 0.7,
            'top_p': 0.9,
            'top_k': 40,
            'max_tokens': 512,
            'stop_sequences': [],
            'system_prompt': '',
        }
    
    def update_model_behavior(self, temperature: float, top_p: float, top_k: int, 
                            max_tokens: int, stop_sequences: List[str], system_prompt: str):
        """Update model behavior settings"""
        self.conn.execute("""
            INSERT OR REPLACE INTO model_behavior 
            (id, temperature, top_p, top_k, max_tokens, stop_sequences, system_prompt, updated_at)
            VALUES (1, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """, (temperature, top_p, top_k, max_tokens, json.dumps(stop_sequences), system_prompt))
        self.conn.commit()
    
    # =============================================================================
    # VOICE DETECTION (Quick Integration)
    # =============================================================================
    
    def get_voice_detection_settings(self) -> Dict[str, Any]:
        """Get voice detection settings for VoiceDetectionSettings component"""
        return {
            'wake_word': self.get_setting('voice_detection_wake_word', None),
            'file_path': self.get_setting('voice_detection_file_path', None),
            'enabled': self.get_setting('voice_detection_enabled', 'false') == 'true',
        }
    
    def update_voice_detection_settings(self, wake_word: str, file_path: str, enabled: bool):
        """Update voice detection settings"""
        self.set_setting('voice_detection_wake_word', wake_word)
        self.set_setting('voice_detection_file_path', file_path)
        self.set_setting('voice_detection_enabled', enabled)
    
    # =============================================================================
    # AUDIO DEVICES (Quick Integration)
    # =============================================================================
    
    def get_audio_settings(self) -> Dict[str, Any]:
        """Get audio settings for AudioDevicesSettings component"""
        return {
            'speaker_volume': float(self.get_setting('audio_speaker_volume', '0.75')),
            'mic_volume': float(self.get_setting('audio_mic_volume', '0.8')),
            'selected_speaker': self.get_setting('audio_selected_speaker', None),
            'selected_microphone': self.get_setting('audio_selected_microphone', None),
        }
    
    def update_audio_settings(self, speaker_volume: float, mic_volume: float, 
                            selected_speaker: str = None, selected_microphone: str = None):
        """Update audio settings"""
        self.set_setting('audio_speaker_volume', speaker_volume)
        self.set_setting('audio_mic_volume', mic_volume)
        if selected_speaker is not None:
            self.set_setting('audio_selected_speaker', selected_speaker)
        if selected_microphone is not None:
            self.set_setting('audio_selected_microphone', selected_microphone)
    
    # =============================================================================
    # MODELS (Quick Integration)
    # =============================================================================
    
    def get_models(self) -> List[Dict[str, Any]]:
        """Get all models for ManageModelsSettings component"""
        cursor = self.conn.execute("""
            SELECT id, name, file_path, file_size_display, is_active, created_at
            FROM models ORDER BY created_at DESC
        """)
        
        models = []
        for row in cursor:
            models.append({
                'id': row['id'],
                'name': row['name'],
                'size': row['file_size_display'],
                'type': 'GGUF',
                'file_path': row['file_path'],
                'is_active': bool(row['is_active']),
            })
        return models
    
    def add_model(self, name: str, file_path: str, file_size_display: str) -> str:
        """Add new model"""
        model_id = str(uuid.uuid4())
        self.conn.execute("""
            INSERT INTO models (id, name, file_path, file_size_display, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """, (model_id, name, file_path, file_size_display, False))
        self.conn.commit()
        return model_id
    
    def delete_model(self, model_id: str):
        """Delete model"""
        self.conn.execute("DELETE FROM models WHERE id = ?", (model_id,))
        self.conn.commit()
    
    def set_active_model(self, model_id: str):
        """Set active model"""
        # Deactivate all models
        self.conn.execute("UPDATE models SET is_active = FALSE")
        # Activate selected model
        self.conn.execute("UPDATE models SET is_active = TRUE WHERE id = ?", (model_id,))
        self.conn.commit()
    
    # =============================================================================
    # RULES (Quick Integration)
    # =============================================================================
    
    def get_rules(self) -> List[Dict[str, Any]]:
        """Get all rules for RulesSettings component"""
        cursor = self.conn.execute("""
            SELECT id, description, is_enabled, created_at
            FROM rules ORDER BY created_at
        """)
        
        rules = []
        for row in cursor:
            rules.append({
                'id': row['id'],
                'description': row['description'],
                'is_enabled': bool(row['is_enabled']),
            })
        return rules
    
    def add_rule(self, description: str) -> str:
        """Add new rule"""
        rule_id = str(uuid.uuid4())
        self.conn.execute("""
            INSERT INTO rules (id, description, is_enabled, created_at)
            VALUES (?, ?, TRUE, CURRENT_TIMESTAMP)
        """, (rule_id, description))
        self.conn.commit()
        return rule_id
    
    def delete_rule(self, rule_id: str):
        """Delete rule"""
        self.conn.execute("DELETE FROM rules WHERE id = ?", (rule_id,))
        self.conn.commit()
    
    def toggle_rule(self, rule_id: str, enabled: bool):
        """Toggle rule enabled state"""
        self.conn.execute("UPDATE rules SET is_enabled = ? WHERE id = ?", (enabled, rule_id))
        self.conn.commit()
    
    # =============================================================================
    # CONVERSATIONS (Quick Integration)
    # =============================================================================
    
    def get_conversations(self) -> List[Dict[str, Any]]:
        """Get all conversations for chat history"""
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
                'messages': [],  # Will be loaded separately
                'lastUpdated': datetime.fromisoformat(row['updated_at']),
                'message_count': row['message_count'],
            })
        return conversations
    
    def get_conversation_messages(self, conversation_id: str) -> List[Dict[str, Any]]:
        """Get messages for a conversation"""
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
    
    def create_conversation(self, title: str) -> str:
        """Create new conversation"""
        conversation_id = str(uuid.uuid4())
        self.conn.execute("""
            INSERT INTO conversations (id, title, created_at, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """, (conversation_id, title))
        self.conn.commit()
        return conversation_id
    
    def add_message(self, conversation_id: str, role: str, content: str) -> str:
        """Add message to conversation"""
        message_id = str(uuid.uuid4())
        self.conn.execute("""
            INSERT INTO messages (id, conversation_id, role, content, created_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        """, (message_id, conversation_id, role, content))
        self.conn.commit()
        return message_id
    
    def delete_conversation(self, conversation_id: str):
        """Delete conversation and all messages"""
        self.conn.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))
        self.conn.commit()
    
    # =============================================================================
    # TOOLS (Quick Integration)
    # =============================================================================
    
    def get_tools(self) -> List[Dict[str, Any]]:
        """Get all tools"""
        cursor = self.conn.execute("""
            SELECT id, name, description, script_content, is_enabled, created_at
            FROM tools ORDER BY created_at DESC
        """)
        
        tools = []
        for row in cursor:
            tools.append({
                'id': row['id'],
                'name': row['name'],
                'description': row['description'],
                'script_content': row['script_content'],
                'enabled': bool(row['is_enabled']),
            })
        return tools
    
    def add_tool(self, name: str, description: str, script_content: str) -> str:
        """Add new tool"""
        tool_id = str(uuid.uuid4())
        self.conn.execute("""
            INSERT INTO tools (id, name, description, script_content, is_enabled, created_at)
            VALUES (?, ?, ?, ?, TRUE, CURRENT_TIMESTAMP)
        """, (tool_id, name, description, script_content))
        self.conn.commit()
        return tool_id
    
    def delete_tool(self, tool_id: str):
        """Delete tool"""
        self.conn.execute("DELETE FROM tools WHERE id = ?", (tool_id,))
        self.conn.commit()
    
    def toggle_tool(self, tool_id: str, enabled: bool):
        """Toggle tool enabled state"""
        self.conn.execute("UPDATE tools SET is_enabled = ? WHERE id = ?", (enabled, tool_id))
        self.conn.commit()


# =============================================================================
# QUICK SETUP FUNCTIONS
# =============================================================================

def setup_database(db_path: str = "qlippy.db", schema_path: str = "qlippy_mvp_schema.sql"):
    """Quick database setup for MVP"""
    # Remove existing database
    if Path(db_path).exists():
        Path(db_path).unlink()
    
    # Create new database
    db = QlippyDB(db_path)
    db.execute_script(schema_path)
    
    print(f"✅ Database created at {db_path}")
    print("✅ Schema loaded with default data")
    return db


def get_db_instance(db_path: str = "qlippy.db") -> QlippyDB:
    """Get database instance (singleton pattern for MVP)"""
    if not hasattr(get_db_instance, '_instance'):
        get_db_instance._instance = QlippyDB(db_path)
    return get_db_instance._instance


# =============================================================================
# USAGE EXAMPLES
# =============================================================================

if __name__ == "__main__":
    # Quick setup
    db = setup_database()
    
    # Test theme settings
    theme_settings = db.get_theme_settings()
    print("Theme settings:", theme_settings)
    
    # Test TTS settings
    tts_settings = db.get_tts_settings()
    print("TTS settings:", tts_settings)
    
    # Test model behavior
    model_behavior = db.get_model_behavior()
    print("Model behavior:", model_behavior)
    
    # Test conversations
    conversations = db.get_conversations()
    print("Conversations:", len(conversations))
    
    # Test adding a conversation
    conv_id = db.create_conversation("Test Conversation")
    db.add_message(conv_id, "user", "Hello!")
    db.add_message(conv_id, "assistant", "Hi there!")
    
    messages = db.get_conversation_messages(conv_id)
    print("Messages:", len(messages))
    
    db.close()
    print("✅ Database tests completed") 