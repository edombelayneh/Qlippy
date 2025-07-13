"""
RulesService
Handles all rules management database operations
Properly separated from settings and other concerns
"""

import sqlite3
import uuid
from typing import Dict, List, Optional, Any


class RulesService:
    """Service for managing system rules"""
    
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
    # RULES MANAGEMENT
    # =============================================================================
    
    def get_rules(self) -> List[Dict[str, Any]]:
        """Get all rules"""
        try:
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
        except Exception as e:
            print(f"Error getting rules: {e}")
            return []
    
    def add_rule(self, description: str) -> Optional[str]:
        """Add new rule"""
        try:
            rule_id = str(uuid.uuid4())
            self.conn.execute("""
                INSERT INTO rules (id, description, is_enabled, created_at)
                VALUES (?, ?, TRUE, CURRENT_TIMESTAMP)
            """, (rule_id, description))
            self.conn.commit()
            return rule_id
        except Exception as e:
            print(f"Error adding rule: {e}")
            return None
    
    def delete_rule(self, rule_id: str) -> bool:
        """Delete rule"""
        try:
            self.conn.execute("DELETE FROM rules WHERE id = ?", (rule_id,))
            self.conn.commit()
            return True
        except Exception as e:
            print(f"Error deleting rule: {e}")
            return False
    
    def toggle_rule(self, rule_id: str, enabled: bool) -> bool:
        """Toggle rule enabled state"""
        try:
            self.conn.execute("UPDATE rules SET is_enabled = ? WHERE id = ?", (enabled, rule_id))
            self.conn.commit()
            return True
        except Exception as e:
            print(f"Error toggling rule: {e}")
            return False


# Create service instance
rules_service = RulesService() 