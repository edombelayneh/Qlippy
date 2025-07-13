"""
Settings Service
Handles all database operations for application settings ONLY
Following the separation of concerns pattern used in the codebase
"""

import sqlite3
import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from pathlib import Path
from config.models import (
    ThemeSettings, TTSSettings, ModelBehaviorSettings, 
    VoiceDetectionSettings, AudioSettings
)


class SettingsService:
    """Service for managing application settings ONLY"""
    
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
    # CORE SETTINGS OPERATIONS
    # =============================================================================
    
    def get_setting(self, key: str, default: Any = None) -> Any:
        """Get a single setting value"""
        try:
            cursor = self.conn.execute("SELECT value FROM settings WHERE key = ?", (key,))
            result = cursor.fetchone()
            if result:
                value = result['value']
                # Try to parse as JSON for complex values
                try:
                    return json.loads(value)
                except (json.JSONDecodeError, TypeError):
                    return value
            return default
        except Exception as e:
            print(f"Error getting setting {key}: {e}")
            return default
    
    def set_setting(self, key: str, value: Any) -> bool:
        """Set a single setting value"""
        try:
            if isinstance(value, (dict, list)):
                value = json.dumps(value)
            else:
                value = str(value)
            
            self.conn.execute("""
                INSERT OR REPLACE INTO settings (key, value, updated_at) 
                VALUES (?, ?, CURRENT_TIMESTAMP)
            """, (key, value))
            self.conn.commit()
            return True
        except Exception as e:
            print(f"Error setting {key}: {e}")
            return False
    
    # =============================================================================
    # THEME SETTINGS
    # =============================================================================
    
    def get_theme_settings(self) -> Dict[str, Any]:
        """Get theme settings"""
        return {
            'theme': self.get_setting('theme', 'system'),
        }
    
    def update_theme_settings(self, settings: ThemeSettings) -> bool:
        """Update theme settings"""
        return self.set_setting('theme', settings.theme)
    
    # =============================================================================
    # TTS SETTINGS
    # =============================================================================
    
    def get_tts_settings(self) -> Dict[str, Any]:
        """Get TTS settings"""
        return {
            'selectedVoice': self.get_setting('tts_selected_voice', 'en-US-neural-aria'),
            'playbackSpeed': float(self.get_setting('tts_playback_speed', '1.0')),
            'testText': self.get_setting('tts_test_text', 'Hello! This is a test of the text-to-speech system. How does this sound to you?'),
        }
    
    def update_tts_settings(self, settings: TTSSettings) -> bool:
        """Update TTS settings"""
        try:
            self.set_setting('tts_selected_voice', settings.selectedVoice)
            self.set_setting('tts_playback_speed', settings.playbackSpeed)
            self.set_setting('tts_test_text', settings.testText)
            return True
        except Exception as e:
            print(f"Error updating TTS settings: {e}")
            return False
    
    # =============================================================================
    # MODEL BEHAVIOR SETTINGS
    # =============================================================================
    
    def get_model_behavior(self) -> Dict[str, Any]:
        """Get model behavior settings with integrated user rules"""
        try:
            cursor = self.conn.execute("""
                SELECT temperature, top_p, top_k, max_tokens, stop_sequences, system_prompt
                FROM model_behavior WHERE id = 1
            """)
            result = cursor.fetchone()
            
            if result:
                stop_sequences = json.loads(result['stop_sequences']) if result['stop_sequences'] else []
                base_system_prompt = result['system_prompt'] or ''
                
                # Get user rules and append to system prompt
                rules_cursor = self.conn.execute("""
                    SELECT description FROM rules WHERE is_enabled = TRUE ORDER BY created_at
                """)
                rules = rules_cursor.fetchall()
                
                # Combine system prompt with user rules
                combined_prompt = base_system_prompt
                if rules:
                    rules_text = "\n\nADDITIONAL RULES:\n" + "\n".join([f"- {rule['description']}" for rule in rules])
                    combined_prompt += rules_text
                
                return {
                    'temperature': result['temperature'],
                    'top_p': result['top_p'],
                    'top_k': result['top_k'],
                    'max_tokens': result['max_tokens'],
                    'stop_sequences': stop_sequences,
                    'system_prompt': combined_prompt,
                }
            
            # Return defaults if no settings found
            default_prompt = '''You are Qlippy, a helpful AI assistant. Follow these guidelines:

FORMATTING:
- Use markdown for code blocks: ```language
- Keep responses clear and concise
- Use bullet points for lists
- Bold **important** concepts

BEHAVIOR:
- Be direct and informative
- Ask clarifying questions when needed
- Provide working code examples when requested
- Explain complex concepts simply

CONSTRAINTS:
- Keep responses under 800 tokens when possible
- Prioritize accuracy over length
- If a topic is complex, offer to break it into parts'''
            
            return {
                'temperature': 0.7,
                'top_p': 0.9,
                'top_k': 40,
                'max_tokens': 512,
                'stop_sequences': [],
                'system_prompt': default_prompt,
            }
        except Exception as e:
            print(f"Error getting model behavior: {e}")
            return {}
    
    def update_model_behavior(self, settings: ModelBehaviorSettings) -> bool:
        """Update model behavior settings"""
        try:
            self.conn.execute("""
                INSERT OR REPLACE INTO model_behavior 
                (id, temperature, top_p, top_k, max_tokens, stop_sequences, system_prompt, updated_at)
                VALUES (1, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """, (
                settings.temperature, 
                settings.top_p, 
                settings.top_k, 
                settings.max_tokens, 
                json.dumps(settings.stop_sequences), 
                settings.system_prompt
            ))
            self.conn.commit()
            return True
        except Exception as e:
            print(f"Error updating model behavior: {e}")
            return False
    
    # =============================================================================
    # VOICE DETECTION SETTINGS
    # =============================================================================
    
    def get_voice_detection_settings(self) -> Dict[str, Any]:
        """Get voice detection settings"""
        return {
            'wake_word': self.get_setting('voice_detection_wake_word', None),
            'file_path': self.get_setting('voice_detection_file_path', None),
            'enabled': self.get_setting('voice_detection_enabled', 'false') == 'true',
        }
    
    def update_voice_detection_settings(self, settings: VoiceDetectionSettings) -> bool:
        """Update voice detection settings"""
        try:
            if settings.wake_word:
                self.set_setting('voice_detection_wake_word', settings.wake_word)
            if settings.file_path:
                self.set_setting('voice_detection_file_path', settings.file_path)
            self.set_setting('voice_detection_enabled', settings.enabled)
            return True
        except Exception as e:
            print(f"Error updating voice detection settings: {e}")
            return False
    
    # =============================================================================
    # AUDIO SETTINGS
    # =============================================================================
    
    def get_audio_settings(self) -> Dict[str, Any]:
        """Get audio settings"""
        return {
            'speaker_volume': float(self.get_setting('audio_speaker_volume', '0.75')),
            'mic_volume': float(self.get_setting('audio_mic_volume', '0.8')),
            'selected_speaker': self.get_setting('audio_selected_speaker', None),
            'selected_microphone': self.get_setting('audio_selected_microphone', None),
        }
    
    def update_audio_settings(self, settings: AudioSettings) -> bool:
        """Update audio settings"""
        try:
            self.set_setting('audio_speaker_volume', settings.speaker_volume)
            self.set_setting('audio_mic_volume', settings.mic_volume)
            
            if settings.selected_speaker is not None:
                self.set_setting('audio_selected_speaker', settings.selected_speaker)
            if settings.selected_microphone is not None:
                self.set_setting('audio_selected_microphone', settings.selected_microphone)
            return True
        except Exception as e:
            print(f"Error updating audio settings: {e}")
            return False


# Create service instance
settings_service = SettingsService() 