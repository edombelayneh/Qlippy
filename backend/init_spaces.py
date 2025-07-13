#!/usr/bin/env python3
"""
Initialize default spaces in the database
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from models import db, Space

def init_spaces():
    app = create_app()
    
    with app.app_context():
        # Check if spaces already exist
        existing_spaces = Space.query.all()
        if existing_spaces:
            print(f"Found {len(existing_spaces)} existing spaces. Skipping initialization.")
            return
        
        # Create default spaces
        default_spaces = [
            {"name": "Work", "icon": "💼", "color": "blue"},
            {"name": "Personal", "icon": "👤", "color": "green"},
            {"name": "Side Projects", "icon": "🚀", "color": "purple"},
            {"name": "Hobbies", "icon": "🎨", "color": "orange"},
        ]
        
        for space_data in default_spaces:
            space = Space(**space_data)
            db.session.add(space)
        
        db.session.commit()
        print(f"Created {len(default_spaces)} default spaces")

if __name__ == "__main__":
    init_spaces() 