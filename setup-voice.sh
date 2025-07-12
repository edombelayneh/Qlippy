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

# Install Whisper
echo "Installing Whisper..."
pip install openai-whisper

# Install additional Python dependencies
echo "Installing additional Python dependencies..."
pip install numpy torch

echo "Setup complete! You can now run the voice command system."
echo ""
echo "To test the setup:"
echo "1. Run 'whisper --help' to verify Whisper installation"
echo "2. Run 'ffmpeg -version' to verify ffmpeg installation"
echo "3. Start your app with 'npm run electron'" 