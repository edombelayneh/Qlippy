#!/usr/bin/env python3
"""
Reset Database Script
This script deletes the existing database file so it can be recreated with the new schema.
"""

import os
import sys

def main():
    """Reset the database by deleting the existing file"""
    db_path = "qlippy.db"
    
    print("🗑️  Resetting Qlippy Database")
    print("=" * 40)
    
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
            print(f"✅ Deleted existing database: {db_path}")
        except Exception as e:
            print(f"❌ Failed to delete database: {e}")
            sys.exit(1)
    else:
        print(f"ℹ️  Database file not found: {db_path}")
    
    print("\n✅ Database reset complete!")
    print("📝 Next steps:")
    print("   1. Start the backend server: python run.py")
    print("   2. The database will be automatically created with the new schema")
    print("   3. All user-related data has been removed")

if __name__ == "__main__":
    main() 