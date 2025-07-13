# Speech Improvements for Qlippy Chat

## Overview

This document describes the improvements made to the speech functionality in the Qlippy chat application to address three main issues:

1. **TTS Toggle Problem** - The TTS button would toggle back immediately after clicking
2. **UI Layout** - Stop button placement during AI generation
3. **Microphone Permissions** - Request permission before recording

## Changes Made

### 1. Fixed TTS Toggle Issue

**Problem**: The TTS implementation was using the backend `/api/speak` endpoint which returns immediately, causing the playback state to be incorrect.

**Solution**: Switched to using the browser's native Web Speech Synthesis API with proper event tracking:

```javascript
// In assistant-message.tsx
const utterance = new SpeechSynthesisUtterance(content)

// Track playback state with events
utterance.onstart = () => {
  setIsPlayingTTS(true)
}

utterance.onend = () => {
  setIsPlayingTTS(false)
  utteranceRef.current = null
}

utterance.onerror = (event) => {
  setIsPlayingTTS(false)
  utteranceRef.current = null
  toast.error("Failed to play audio")
}

window.speechSynthesis.speak(utterance)
```

**Benefits**:
- Accurate playback state tracking
- Proper toggle behavior
- Better error handling
- No backend dependency for TTS

### 2. Improved UI Layout for Stop Button

**Problem**: The stop button was appearing in the message list during generation, which was confusing UX.

**Solution**: Moved the stop button to replace the voice/send button during AI generation:

```javascript
// In chat-input.tsx
{isGenerating ? (
  // Show stop button during generation
  <Button onClick={handleStopGeneration}>
    <Square className="h-4 w-4 mr-1" />
    <span>Stop</span>
  </Button>
) : currentMessage.trim() ? (
  // Show send button when there's text
  <Button onClick={handleSendMessage}>
    <Send className="mr-1 h-3 w-3" />
    <span>Send</span>
  </Button>
) : (
  // Show voice button when no text
  <Button onClick={handleVoiceInput}>
    <Mic className="mr-1 h-3 w-3" />
    <span>Voice</span>
  </Button>
)}
```

**Benefits**:
- Cleaner UI with single action button
- Logical button placement
- Better user experience

### 3. Added Microphone Permission Request

**Problem**: The app wasn't requesting microphone permission before attempting to record.

**Solution**: Added permission check before starting WebSocket connection:

```javascript
// In use-voice.ts
try {
  // Request microphone permission first
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    await navigator.mediaDevices.getUserMedia({ audio: true })
  }
} catch (error) {
  toast.error("Microphone access denied. Please allow microphone access to use voice input.", {
    duration: 5000,
  })
  return
}
```

**Benefits**:
- Better user experience with clear permission flow
- Proper error messaging if permission denied
- Prevents WebSocket connection if no mic access

## Testing

A test demo file has been created at `packages/web/test-tts-demo.html` to verify the TTS implementation works correctly. You can open this file directly in a browser to test:

1. Open the file in your browser
2. Click "Play Audio" to start TTS
3. Click "Stop Audio" to stop playback
4. Check console for voice information

## Browser Compatibility

- **TTS**: Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- **Voice Input**: Requires Chrome or Edge (uses WebSocket for transcription)
- **Microphone Permission**: Standard Web API supported in all modern browsers

## Future Improvements

1. **Voice Selection**: Allow users to choose from available voices
2. **Speech Rate Control**: Add controls for speech speed
3. **Offline Support**: Cache voices for offline TTS
4. **Enhanced Error Handling**: More detailed error messages for specific failures 