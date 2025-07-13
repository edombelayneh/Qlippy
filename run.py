#!/usr/bin/env python3
"""
Qlippy Backend Server Runner
This script starts the Flask backend server for the Qlippy application.
"""

import os
import sys
import subprocess
from pathlib import Path

def main():
    # Get the directory where this script is located
    script_dir = Path(__file__).parent.absolute()
    backend_dir = script_dir / "backend"
    
    # Check if backend directory exists
    if not backend_dir.exists():
        print(f"❌ Backend directory not found: {backend_dir}")
        sys.exit(1)
    
    # Change to backend directory
    os.chdir(backend_dir)
    
    # Check if virtual environment exists
    venv_path = backend_dir / "venv"
    if not venv_path.exists():
        print("❌ Virtual environment not found. Please run setup-env.sh first.")
        sys.exit(1)
    
    # Activate virtual environment and run the Flask app
    if os.name == 'nt':  # Windows
        python_path = venv_path / "Scripts" / "python.exe"
        activate_script = venv_path / "Scripts" / "activate.bat"
    else:  # Unix/Linux/macOS
        python_path = venv_path / "bin" / "python"
        activate_script = venv_path / "bin" / "activate"
    
    if not python_path.exists():
        print(f"❌ Python executable not found in virtual environment: {python_path}")
        sys.exit(1)
    
    print("🚀 Starting Qlippy Backend Server...")
    print(f"📁 Working directory: {backend_dir}")
    print(f"🐍 Python executable: {python_path}")
    
    try:
        # Run the Flask app using the virtual environment's Python
        subprocess.run([str(python_path), "run.py"], check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to start backend server: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n🛑 Backend server stopped by user")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 