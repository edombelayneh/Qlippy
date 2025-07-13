"""
ModelsService
Handles all model management database operations
Properly separated from settings and other concerns
"""

import sqlite3
import uuid
from typing import Dict, List, Optional, Any


class ModelsService:
    """Service for managing AI models"""
    
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
    # MODELS MANAGEMENT
    # =============================================================================
    
    def get_models(self) -> List[Dict[str, Any]]:
        """Get all models"""
        try:
            cursor = self.conn.execute("""
                SELECT id, name, file_path, file_size_display, is_active, created_at, tool_calling_enabled
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
                    'tool_calling_enabled': bool(row['tool_calling_enabled']),
                })
            return models
        except Exception as e:
            print(f"Error getting models: {e}")
            return []
    
    def add_model(self, name: str, file_path: str, file_size_display: str) -> Optional[str]:
        """Add new model"""
        try:
            model_id = str(uuid.uuid4())
            self.conn.execute("""
                INSERT INTO models (id, name, file_path, file_size_display, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """, (model_id, name, file_path, file_size_display, False))
            self.conn.commit()
            return model_id
        except Exception as e:
            print(f"Error adding model: {e}")
            return None
    
    def delete_model(self, model_id: str) -> bool:
        """Delete model"""
        try:
            self.conn.execute("DELETE FROM models WHERE id = ?", (model_id,))
            self.conn.commit()
            return True
        except Exception as e:
            print(f"Error deleting model: {e}")
            return False
    
    def set_active_model(self, model_id: str) -> bool:
        """Set active model"""
        try:
            # Deactivate all models
            self.conn.execute("UPDATE models SET is_active = FALSE")
            # Activate selected model
            self.conn.execute("UPDATE models SET is_active = TRUE WHERE id = ?", (model_id,))
            self.conn.commit()
            return True
        except Exception as e:
            print(f"Error setting active model: {e}")
            return False
    
    def update_model_tool_calling(self, model_id: str, enabled: bool) -> bool:
        """Update tool calling setting for a model"""
        try:
            self.conn.execute("""
                UPDATE models SET tool_calling_enabled = ? WHERE id = ?
            """, (enabled, model_id))
            self.conn.commit()
            return True
        except Exception as e:
            print(f"Error updating model tool calling: {e}")
            return False


# Create service instance
models_service = ModelsService() 