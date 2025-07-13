# Qlippy Floating Avatar Assistant

## Overview

The Qlippy Floating Avatar Assistant is a background feature that activates when the main app is out of focus. It provides a non-intrusive way to interact with Qlippy using voice commands or text input.

## Features

- **Focus-aware activation**: Only appears when the app is not in focus
- **Wake word detection**: Responds to "Hey Qlippy" when app is minimized
- **Floating UI**: Appears in bottom-right corner with animated glowing effect
- **Voice & text input**: Supports both voice recording and text input
- **Auto-hide**: Disappears after 15 seconds of inactivity
- **Conversation persistence**: Creates and maintains conversations in the database
- **Streaming responses**: Real-time LLM response streaming
- **Text-to-speech**: Speaks greetings and responses

## Architecture

### Components

1. **floatingAvatar.js**
   - Manages the floating avatar window
   - Handles show/hide animations
   - Controls window positioning and timeout

2. **avatarController.js**
   - Orchestrates avatar behavior based on app focus
   - Handles wake word detection when app is out of focus
   - Manages conversation creation and message handling
   - Integrates with LLM and TTS services

3. **conversationService.js**
   - Handles conversation CRUD operations
   - Manages message history
   - Interfaces with backend API

4. **avatar.html**
   - Avatar UI with glowing orb animation
   - Chat interface with message history
   - Voice recording button
   - Text input field

### Flow

1. App loses focus → Wake word detection remains active
2. User says "Hey Qlippy" → Avatar appears with greeting
3. User provides input (voice/text) → Sent to LLM
4. LLM response streams back → Displayed and spoken
5. 15 seconds of inactivity → Avatar fades out

## API Integration

The avatar uses existing backend endpoints:

- `/api/settings/conversations` - Create/manage conversations
- `/api/settings/conversations/{id}/messages` - Add/retrieve messages
- `/api/generate` - LLM text generation
- `/api/speak` - Text-to-speech
- `/api/settings/model-behavior` - Get system prompt

## Usage

The floating avatar is automatically initialized when the Electron app starts. No manual setup required.

### Testing

1. Start the app normally
2. Minimize or switch to another window
3. Say "Hey Qlippy" to trigger the avatar
4. Interact via voice or text
5. Avatar will auto-hide after 15 seconds of inactivity

## Configuration

Wake word sensitivity and other settings can be adjusted in:
- `voice-detection.js` - Wake word threshold
- `floatingAvatar.js` - Window size, position, timeout
- `avatarController.js` - Greetings, conversation naming

## Future Enhancements

- [ ] Custom avatar animations
- [ ] Tool calling support
- [ ] RAG integration for context
- [ ] Multiple wake words
- [ ] Customizable position/size
- [ ] Voice activity detection
- [ ] Multi-language support 