#!/usr/bin/env python3
"""
Simple script to view Qlippy database tables and their contents.
Run with: python view_db.py
"""

import sqlite3
import os
from datetime import datetime

def view_database():
    db_path = 'instance/qlippy.db'
    
    if not os.path.exists(db_path):
        print(f"Database file not found at {db_path}")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("=" * 60)
    print("QLIPPY DATABASE VIEWER")
    print("=" * 60)
    
    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    
    for table in tables:
        table_name = table[0]
        print(f"\n📋 TABLE: {table_name.upper()}")
        print("-" * 40)
        
        # Get table schema
        cursor.execute(f"PRAGMA table_info({table_name});")
        columns = cursor.fetchall()
        
        print("Schema:")
        for col in columns:
            col_name, col_type, not_null, default_val, pk = col[1], col[2], col[3], col[4], col[5]
            pk_str = " (PRIMARY KEY)" if pk else ""
            not_null_str = " NOT NULL" if not_null else ""
            print(f"  - {col_name}: {col_type}{not_null_str}{pk_str}")
        
        # Get row count
        cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
        count = cursor.fetchone()[0]
        print(f"\nRows: {count}")
        
        if count > 0:
            # Get sample data (limit to 5 rows)
            cursor.execute(f"SELECT * FROM {table_name} LIMIT 5;")
            rows = cursor.fetchall()
            
            print("Sample data:")
            for i, row in enumerate(rows, 1):
                print(f"  {i}. {row}")
            
            if count > 5:
                print(f"  ... and {count - 5} more rows")
        
        print()
    
    conn.close()
    print("=" * 60)
    print("Database viewer completed!")
    print("=" * 60)

if __name__ == "__main__":
    view_database() 