#!/bin/bash

echo "Setting up voice command dependencies..."

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "Homebrew not found. Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Install ffmpeg for audio recording
echo "Installing ffmpeg..."
brew install ffmpeg

# Install Python dependencies
echo "Installing Python dependencies..."
pip install openai-whisper
pip install fastapi
pip install "uvicorn[standard]"
pip install numpy
pip install torch
pip install websockets
pip install pyttsx3

echo "Setup complete! You can now run the voice command system."
echo ""
echo "To test the setup:"
echo "1. Run 'whisper --help' to verify Whisper installation"
echo "2. Run 'ffmpeg -version' to verify ffmpeg installation"
echo "3. Start the FastAPI server with 'npm run start:server'"
echo "4. Start the hotword detection with 'npm run start:hotword'"
echo "5. Start your app with 'npm run electron'" 