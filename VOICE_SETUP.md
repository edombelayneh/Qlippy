# Voice Command Integration Setup

This guide will help you set up the voice command feature for Qlippy.

## Prerequisites

1. **ffmpeg** - For audio recording
2. **Whisper** - For speech-to-text processing

## Installation

### 1. Install ffmpeg
```bash
# On macOS with Homebrew
brew install ffmpeg

# On Ubuntu/Debian
sudo apt update
sudo apt install ffmpeg

# On Windows with Chocolatey
choco install ffmpeg
```

### 2. Install Whisper
```bash
pip install openai-whisper
```

### 3. Install additional dependencies
```bash
pip install numpy torch
```

## How it Works

1. **User clicks the "Voice" button** in the chat interface
2. **Recording starts** with visual feedback (button turns red and pulses)
3. **User speaks** their message
4. **Recording stops** automatically after 10 seconds or when user clicks again
5. **Whisper processes** the audio locally
6. **Transcribed text** appears in the chat input field
7. **User can edit** and send the message

## Usage

1. Start your app: `npm run electron`
2. Navigate to the chat interface
3. Click the "Voice" button (microphone icon)
4. Speak your message
5. Wait for transcription to complete
6. Edit if needed and send

## Troubleshooting

### Common Issues

1. **"ffmpeg not found"**
   - Make sure ffmpeg is installed and in your PATH
   - Try running `ffmpeg -version` in terminal

2. **"whisper not found"**
   - Make sure Whisper is installed: `pip install openai-whisper`
   - Try running `whisper --help` in terminal

3. **No audio recording**
   - Check microphone permissions
   - Ensure microphone is not muted
   - Try different audio input devices

4. **Poor transcription quality**
   - Speak clearly and at normal volume
   - Reduce background noise
   - Try using a better microphone

## Technical Details

- **Audio Format**: 16kHz, 16-bit PCM, mono
- **Recording Duration**: 10 seconds maximum
- **Whisper Model**: "base" model for speed/accuracy balance
- **Processing**: All done locally, no internet required

## Customization

You can modify the following in `electron.js`:

- **Recording duration**: Change the timeout in `startVoiceRecording()`
- **Audio quality**: Modify ffmpeg parameters
- **Whisper model**: Change `--model` parameter (tiny, base, small, medium, large) 