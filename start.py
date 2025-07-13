#!/usr/bin/env python3
"""
Qlippy Application Startup Script
This script starts both the frontend and backend servers for the Qlippy application.
"""

import os
import sys
import subprocess
import signal
import time
import threading
from pathlib import Path

class QlippyStarter:
    def __init__(self):
        self.script_dir = Path(__file__).parent.absolute()
        self.backend_dir = self.script_dir / "backend"
        self.frontend_dir = self.script_dir
        self.processes = []
        
    def check_dependencies(self):
        """Check if all required dependencies are available"""
        print("🔍 Checking dependencies...")
        
        # Check if backend directory exists
        if not self.backend_dir.exists():
            print(f"❌ Backend directory not found: {self.backend_dir}")
            return False
            
        # Check if virtual environment exists
        venv_path = self.backend_dir / "venv"
        if not venv_path.exists():
            print("❌ Virtual environment not found. Please run setup-env.sh first.")
            return False
            
        # Check if node_modules exists
        node_modules = self.frontend_dir / "node_modules"
        if not node_modules.exists():
            print("❌ Node modules not found. Please run 'npm install' first.")
            return False
            
        print("✅ All dependencies found")
        return True
        
    def start_backend(self):
        """Start the Flask backend server"""
        print("🚀 Starting Backend Server...")
        
        # Change to backend directory
        os.chdir(self.backend_dir)
        
        # Get Python executable from virtual environment
        if os.name == 'nt':  # Windows
            python_path = self.backend_dir / "venv" / "Scripts" / "python.exe"
        else:  # Unix/Linux/macOS
            python_path = self.backend_dir / "venv" / "bin" / "python"
            
        if not python_path.exists():
            print(f"❌ Python executable not found: {python_path}")
            return None
            
        try:
            # Start the backend server
            process = subprocess.Popen(
                [str(python_path), "run.py"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Wait a moment for the server to start
            time.sleep(2)
            
            # Check if process is still running
            if process.poll() is None:
                print("✅ Backend server started successfully")
                return process
            else:
                stdout, stderr = process.communicate()
                print(f"❌ Backend server failed to start:")
                print(f"STDOUT: {stdout}")
                print(f"STDERR: {stderr}")
                return None
                
        except Exception as e:
            print(f"❌ Failed to start backend server: {e}")
            return None
            
    def start_frontend(self):
        """Start the Next.js frontend server"""
        print("🚀 Starting Frontend Server...")
        
        # Change back to frontend directory
        os.chdir(self.frontend_dir)
        
        try:
            # Start the frontend server
            process = subprocess.Popen(
                ["npm", "run", "dev"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Wait a moment for the server to start
            time.sleep(3)
            
            # Check if process is still running
            if process.poll() is None:
                print("✅ Frontend server started successfully")
                return process
            else:
                stdout, stderr = process.communicate()
                print(f"❌ Frontend server failed to start:")
                print(f"STDOUT: {stdout}")
                print(f"STDERR: {stderr}")
                return None
                
        except Exception as e:
            print(f"❌ Failed to start frontend server: {e}")
            return None
            
    def wait_for_backend(self, timeout=30):
        """Wait for backend to be ready"""
        print("⏳ Waiting for backend to be ready...")
        
        import requests
        
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                response = requests.get("http://localhost:5001/api/health", timeout=1)
                if response.status_code == 200:
                    print("✅ Backend is ready!")
                    return True
            except:
                pass
            time.sleep(1)
            
        print("❌ Backend failed to start within timeout")
        return False
        
    def cleanup(self, signum=None, frame=None):
        """Clean up processes on exit"""
        print("\n🛑 Shutting down servers...")
        
        for process in self.processes:
            if process and process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
                    
        print("✅ All servers stopped")
        sys.exit(0)
        
    def run(self):
        """Main run method"""
        print("🎯 Qlippy Application Starter")
        print("=" * 40)
        
        # Check dependencies
        if not self.check_dependencies():
            sys.exit(1)
            
        # Set up signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self.cleanup)
        signal.signal(signal.SIGTERM, self.cleanup)
        
        try:
            # Start backend
            backend_process = self.start_backend()
            if not backend_process:
                sys.exit(1)
            self.processes.append(backend_process)
            
            # Wait for backend to be ready
            if not self.wait_for_backend():
                self.cleanup()
                sys.exit(1)
                
            # Start frontend
            frontend_process = self.start_frontend()
            if not frontend_process:
                self.cleanup()
                sys.exit(1)
            self.processes.append(frontend_process)
            
            print("\n🎉 Qlippy is now running!")
            print("📍 Frontend: http://localhost:3000")
            print("🔗 Backend API: http://localhost:5001/api")
            print("💾 Database: SQLite (backend/instance/qlippy.db)")
            print("\nPress Ctrl+C to stop all servers\n")
            
            # Keep the main thread alive
            while True:
                time.sleep(1)
                
                # Check if any process has died
                for i, process in enumerate(self.processes):
                    if process and process.poll() is not None:
                        print(f"❌ Process {i} has stopped unexpectedly")
                        self.cleanup()
                        sys.exit(1)
                        
        except KeyboardInterrupt:
            self.cleanup()
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            self.cleanup()
            sys.exit(1)

def main():
    starter = QlippyStarter()
    starter.run()

if __name__ == "__main__":
    main() 