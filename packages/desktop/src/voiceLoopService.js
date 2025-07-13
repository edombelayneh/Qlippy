const { startRecording, stopRecording } = require("./audio");
const { sendToAvatar, resetAvatarTimeout } = require("./floatingAvatar");
const EventEmitter = require("events");

class VoiceLoopService extends EventEmitter {
  constructor() {
    super();
    this.isActive = false;
    this.isRecording = false;
    this.isProcessing = false;
    this.recordingTimeout = null;
    this.silenceTimeout = null;
    this.conversationId = null;
    this.consecutiveFailures = 0;
    this.maxConsecutiveFailures = 3;
  }

  // Start the voice loop
  async start(conversationId) {
    if (this.isActive) return;
    
    this.isActive = true;
    this.conversationId = conversationId;
    this.consecutiveFailures = 0;
    console.log("🎤 Voice loop started for conversation:", conversationId);
    
    // Start listening immediately
    await this.startListening();
  }

  // Stop the voice loop
  stop() {
    this.isActive = false;
    this.stopListening();
    this.clearTimeouts();
    this.consecutiveFailures = 0;
    console.log("🎤 Voice loop stopped");
  }

  // Start listening for voice input
  async startListening() {
    if (!this.isActive || this.isRecording || this.isProcessing) return;
    
    try {
      this.isRecording = true;
      sendToAvatar("avatar-listening", { isListening: true });
      
      // Start recording
      await startRecording();
      
      // Auto-stop after 8 seconds (reduced from 10 for better UX)
      this.recordingTimeout = setTimeout(() => {
        this.stopListening();
      }, 8000);
      
      // Monitor for silence (stop after 2 seconds of silence)
      this.silenceTimeout = setTimeout(() => {
        this.stopListening();
      }, 2000);
      
    } catch (error) {
      console.error("Failed to start listening:", error);
      this.isRecording = false;
      this.consecutiveFailures++;
      
      if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
        sendToAvatar("avatar-error", { error: "Recording failed multiple times. Please check your microphone." });
        this.stop();
        return;
      }
      
      sendToAvatar("avatar-error", { error: "Failed to start recording. Retrying..." });
      
      // Retry after a delay if still active
      if (this.isActive) {
        setTimeout(() => this.startListening(), 1000);
      }
    }
  }

  // Stop listening and process audio
  async stopListening() {
    if (!this.isRecording) return;
    
    this.isRecording = false;
    this.clearTimeouts();
    sendToAvatar("avatar-listening", { isListening: false });
    
    try {
      this.isProcessing = true;
      sendToAvatar("avatar-processing", { isProcessing: true });
      
      // Stop recording and get transcription
      const transcription = await stopRecording();
      
      if (transcription && transcription.trim()) {
        // Valid transcription received
        console.log("🎤 Transcription:", transcription);
        this.consecutiveFailures = 0; // Reset failure count
        this.emit("transcription", transcription);
        
        // Reset avatar timeout when user speaks (extends the 15-second timer)
        resetAvatarTimeout();
      } else {
        // No speech detected
        console.log("🎤 No speech detected");
        this.consecutiveFailures++;
        
        if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
          sendToAvatar("avatar-status", { status: "No speech detected after multiple attempts. Try speaking louder or closer to the mic." });
          // Pause longer but continue trying if avatar is still active
          if (this.isActive) {
            setTimeout(() => {
              sendToAvatar("avatar-status", { status: "Still listening..." });
              this.startListening();
            }, 3000);
          }
        } else {
          sendToAvatar("avatar-status", { status: "No speech detected. Try speaking louder." });
          
          // Continue listening if still active
          if (this.isActive) {
            setTimeout(() => {
              sendToAvatar("avatar-status", { status: "Listening..." });
              this.startListening();
            }, 1500);
          }
        }
      }
    } catch (error) {
      console.error("Error processing audio:", error);
      this.consecutiveFailures++;
      sendToAvatar("avatar-error", { error: "Failed to process audio" });
      
      // Continue listening if active and not too many failures
      if (this.isActive && this.consecutiveFailures < this.maxConsecutiveFailures) {
        setTimeout(() => this.startListening(), 2000);
      }
    } finally {
      this.isProcessing = false;
      sendToAvatar("avatar-processing", { isProcessing: false });
    }
  }

  // Handle assistant response completion
  onAssistantResponseComplete() {
    // Reset failure count when assistant responds
    this.consecutiveFailures = 0;
    
    // After assistant finishes speaking, wait a bit then start listening again
    if (this.isActive) {
      setTimeout(() => {
        this.startListening();
      }, 500); // Small delay after TTS completes
    }
  }

  // Clear all timeouts
  clearTimeouts() {
    if (this.recordingTimeout) {
      clearTimeout(this.recordingTimeout);
      this.recordingTimeout = null;
    }
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
  }

  // Check if voice loop is active
  isVoiceLoopActive() {
    return this.isActive;
  }
}

// Export singleton instance
const voiceLoopService = new VoiceLoopService();
module.exports = voiceLoopService; 