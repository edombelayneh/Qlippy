"""
ToolsService
Handles all tools management database operations
Properly separated from settings and other concerns
"""

import sqlite3
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any


class ToolsService:
    """Service for managing custom tools"""
    
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
    # TOOLS MANAGEMENT
    # =============================================================================
    
    def get_tools(self) -> List[Dict[str, Any]]:
        """Get all tools"""
        try:
            cursor = self.conn.execute("""
                SELECT id, name, display_name, description, script_content, file_path, 
                       script_type, is_enabled, execution_count, created_at, updated_at
                FROM tools ORDER BY created_at DESC
            """)
            
            tools = []
            for row in cursor:
                tools.append({
                    'id': row['id'],
                    'name': row['name'],
                    'display_name': row['display_name'],
                    'description': row['description'],
                    'script': row['script_content'],
                    'filename': row['file_path'],
                    'script_type': row['script_type'],
                    'is_enabled': bool(row['is_enabled']),
                    'execution_count': row['execution_count'],
                    'created_at': datetime.fromisoformat(row['created_at']),
                    'updated_at': datetime.fromisoformat(row['updated_at']),
                })
            return tools
        except Exception as e:
            print(f"Error getting tools: {e}")
            return []
    
    def get_tool(self, tool_id: str) -> Optional[Dict[str, Any]]:
        """Get single tool by ID"""
        try:
            cursor = self.conn.execute("""
                SELECT id, name, display_name, description, script_content, file_path, 
                       script_type, is_enabled, execution_count, created_at, updated_at
                FROM tools WHERE id = ?
            """, (tool_id,))
            
            row = cursor.fetchone()
            if row:
                return {
                    'id': row['id'],
                    'name': row['name'],
                    'display_name': row['display_name'],
                    'description': row['description'],
                    'script': row['script_content'],
                    'filename': row['file_path'],
                    'script_type': row['script_type'],
                    'is_enabled': bool(row['is_enabled']),
                    'execution_count': row['execution_count'],
                    'created_at': datetime.fromisoformat(row['created_at']),
                    'updated_at': datetime.fromisoformat(row['updated_at']),
                }
            return None
        except Exception as e:
            print(f"Error getting tool: {e}")
            return None
    
    def create_tool(self, name: str, description: str, script: str, filename: str = None) -> Optional[str]:
        """Create new tool"""
        try:
            tool_id = str(uuid.uuid4())
            display_name = name.replace('_', ' ').title()
            script_type = 'file' if filename else 'inline'
            
            self.conn.execute("""
                INSERT INTO tools (id, name, display_name, description, script_content, file_path, 
                                 script_type, is_enabled, execution_count, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, (tool_id, name, display_name, description, script, filename, script_type))
            self.conn.commit()
            return tool_id
        except Exception as e:
            print(f"Error creating tool: {e}")
            return None
    
    def update_tool(self, tool_id: str, name: str, description: str, script: str, filename: str = None) -> bool:
        """Update tool"""
        try:
            display_name = name.replace('_', ' ').title()
            script_type = 'file' if filename else 'inline'
            
            self.conn.execute("""
                UPDATE tools SET name = ?, display_name = ?, description = ?, script_content = ?, 
                               file_path = ?, script_type = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (name, display_name, description, script, filename, script_type, tool_id))
            self.conn.commit()
            return True
        except Exception as e:
            print(f"Error updating tool: {e}")
            return False
    
    def delete_tool(self, tool_id: str) -> bool:
        """Delete tool"""
        try:
            self.conn.execute("DELETE FROM tools WHERE id = ?", (tool_id,))
            self.conn.commit()
            return True
        except Exception as e:
            print(f"Error deleting tool: {e}")
            return False


# Create service instance
tools_service = ToolsService() 