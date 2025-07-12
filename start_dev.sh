#!/bin/bash

# Qlippy Development Startup Script
# This script starts both the frontend and backend servers

echo "🚀 Starting Qlippy Development Environment"
echo "=========================================="

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if Python is installed
if ! command_exists python3; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Check if Node.js is installed
if ! command_exists node; then
    echo "❌ Node.js is not installed. Please install Node.js."
    exit 1
fi

# Check if npm is installed
if ! command_exists npm; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Function to start backend
start_backend() {
    echo "🐍 Starting Flask Backend..."
    cd backend
    
    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        echo "📦 Creating virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Install dependencies if requirements.txt is newer than venv
    if [ ! -f "venv/installed" ] || [ "requirements.txt" -nt "venv/installed" ]; then
        echo "📦 Installing Python dependencies..."
        pip install -r requirements.txt
        touch venv/installed
    fi
    
    # Start the backend server
    echo "🚀 Starting backend server on http://localhost:5001"
    python run.py &
    BACKEND_PID=$!
    echo $BACKEND_PID > backend.pid
    
    cd ..
}

# Function to start frontend
start_frontend() {
    echo "⚛️  Starting Next.js Frontend..."
    
    # Install dependencies if node_modules doesn't exist or package.json is newer
    if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
        echo "📦 Installing Node.js dependencies..."
        npm install
    fi
    
    # Start the frontend server
    echo "🚀 Starting frontend server on http://localhost:3000"
    npm run dev &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > frontend.pid
}

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    
    # Kill backend if running
    if [ -f "backend/backend.pid" ]; then
        BACKEND_PID=$(cat backend/backend.pid)
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            kill $BACKEND_PID
            echo "✅ Backend server stopped"
        fi
        rm -f backend/backend.pid
    fi
    
    # Kill frontend if running
    if [ -f "frontend.pid" ]; then
        FRONTEND_PID=$(cat frontend.pid)
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            kill $FRONTEND_PID
            echo "✅ Frontend server stopped"
        fi
        rm -f frontend.pid
    fi
    
    echo "👋 Development environment stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start servers
start_backend
sleep 3  # Give backend time to start

start_frontend
sleep 3  # Give frontend time to start

echo ""
echo "🎉 Qlippy Development Environment Started!"
echo "=========================================="
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:5001"
echo "📊 Health Check: http://localhost:5001/api/health"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for user to stop
wait 