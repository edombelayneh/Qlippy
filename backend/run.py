#!/usr/bin/env python3
"""
Qlippy Backend Server
Run this script to start the Flask backend server.
"""

import os
import sys
from app import create_app

def main():
    # Set environment variables
    os.environ.setdefault('FLASK_ENV', 'development')
    
    # Create and run the app
    app = create_app()
    
    print("🚀 Starting Qlippy Backend Server...")
    print("📍 Server will be available at: http://localhost:5000")
    print("🔗 API endpoints available at: http://localhost:5000/api")
    print("💾 Database: SQLite (qlippy.db)")
    print("📊 Health check: http://localhost:5000/api/health")
    print("\nPress Ctrl+C to stop the server\n")
    
    app.run(debug=True, host='0.0.0.0', port=5001)

if __name__ == '__main__':
    main() 