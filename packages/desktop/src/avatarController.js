const { app } = require("electron");
const { 
  showFloatingAvatar, 
  hideFloatingAvatar, 
  sendToAvatar,
  isFloatingAvatarActive,
  setAvatarTimeout,
  getFloatingAvatarWindow
} = require("./floatingAvatar");
const { getAppWindow } = require("./windowManager");
const { speakResponse } = require("./audio");
const { 
  createConversation, 
  addMessageToConversation,
  getActiveConversation,
  setActiveConversation
} = require("./conversationService");
const voiceLoopService = require("./voiceLoopService");

let isAppFocused = false;
let currentConversationId = null;
let isSpeaking = false;

// Track app focus state
const updateAppFocusState = () => {
  const appWindow = getAppWindow();
  const floatingWindow = getFloatingAvatarWindow();
  
  // If no app window exists, consider app as not focused
  isAppFocused = appWindow ? appWindow.isFocused() : false;
  
  console.log(`updateAppFocusState: appWindow exists: ${!!appWindow}, isAppFocused: ${isAppFocused}`);
  
  // If app becomes focused while avatar is active, hide it
  // But make sure we're not hiding because the floating avatar got focus
  if (isAppFocused && isFloatingAvatarActive() && floatingWindow && !floatingWindow.isFocused()) {
    console.log("Main app is focused (not avatar), hiding avatar");
    hideFloatingAvatar();
    voiceLoopService.stop();
  }
};

// Handle wake word detection based on focus state
const handleWakeWordForAvatar = async () => {
  console.log("handleWakeWordForAvatar called");
  updateAppFocusState();
  
  if (isAppFocused) {
    // App is focused, don't show avatar
    console.log("App is focused, ignoring wake word for avatar");
    return false;
  }
  
  console.log("App not focused, showing floating avatar");
  
  // Random greetings
  const greetings = [
    "How may I help you today?",
    "I'm here to assist! What can I do for you?",
    "Hello! What's on your mind?",
    "Ready to help! What do you need?",
    "Hi there! How can I assist you?"
  ];
  
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];
  
  // Show avatar with greeting
  showFloatingAvatar(greeting);
  
  // Create or continue conversation
  if (!currentConversationId) {
    const conversation = await createConversation("Voice Chat " + new Date().toLocaleString());
    currentConversationId = conversation.id;
    setActiveConversation(currentConversationId);
  }
  
  // Speak the greeting
  try {
    isSpeaking = true;
    sendToAvatar("avatar-speaking", { isSpeaking: true });
    await speakResponse(greeting);
    sendToAvatar("avatar-speaking", { isSpeaking: false });
    isSpeaking = false;
    
    // Start 15-second timeout after greeting
    setAvatarTimeout(15000);
    
    // Start voice loop after greeting
    startVoiceLoop();
  } catch (error) {
    console.error("Error speaking greeting:", error);
    isSpeaking = false;
    // Start voice loop even if TTS fails
    startVoiceLoop();
  }
  
  return true;
};

// Start the voice loop
const startVoiceLoop = () => {
  if (!currentConversationId) return;
  
  // Set up voice loop event handlers
  voiceLoopService.removeAllListeners();
  
  voiceLoopService.on("transcription", async (transcription) => {
    await handleAvatarInput(transcription, "voice");
  });
  
  // Start the voice loop
  voiceLoopService.start(currentConversationId);
};

// Handle user input from avatar
const handleAvatarInput = async (input, inputType = "text") => {
  try {
    // Stop voice loop while processing
    voiceLoopService.stop();
    
    sendToAvatar("avatar-processing", { isProcessing: true });
    
    // Add user message
    await addMessageToConversation(currentConversationId, "user", input);
    sendToAvatar("avatar-user-message", { message: input });
    
    // Get system prompt and settings
    const settingsResponse = await fetch("http://127.0.0.1:11434/api/settings/model-behavior");
    const settingsData = await settingsResponse.json();
    const systemPrompt = settingsData.data?.system_prompt || "You are Qlippy, a helpful AI assistant.";
    
    // Get rules
    const rulesResponse = await fetch("http://127.0.0.1:11434/api/settings/rules");
    const rulesData = await rulesResponse.json();
    const enabledRules = (rulesData.data || [])
      .filter(rule => rule.enabled)
      .map(rule => rule.content)
      .join("\n");
    
    // Build conversation history
    const messagesResponse = await fetch(`http://127.0.0.1:11434/api/settings/conversations/${currentConversationId}/messages`);
    const messagesData = await messagesResponse.json();
    const messages = messagesData.data || [];
    
    // Format conversation for LLM
    let conversationContext = systemPrompt;
    if (enabledRules) {
      conversationContext += "\n\nADDITIONAL RULES:\n" + enabledRules;
    }
    conversationContext += "\n\n";
    
    // Add conversation history
    messages.forEach(msg => {
      if (msg.role === "user") {
        conversationContext += `User: ${msg.content}\n`;
      } else if (msg.role === "assistant") {
        conversationContext += `Assistant: ${msg.content}\n`;
      }
    });
    conversationContext += `User: ${input}\nAssistant: `;
    
    // Send to LLM
    const response = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: conversationContext,
        conversation_id: currentConversationId
      })
    });
    
    if (!response.ok) {
      throw new Error(`LLM request failed: ${response.status}`);
    }
    
    // Stream response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = "";
    
    sendToAvatar("avatar-response-start", {});
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.token) {
              fullResponse += parsed.token;
              sendToAvatar("avatar-response-chunk", { chunk: parsed.token });
            } else if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (e) {
            // Ignore parse errors unless it's an actual error message
            if (line.includes("error")) {
              console.error("Stream parse error:", e, "Line:", line);
            }
          }
        }
      }
    }
    
    // Save assistant response
    await addMessageToConversation(currentConversationId, "assistant", fullResponse);
    
    sendToAvatar("avatar-response-end", { fullResponse });
    
    // Speak the response
    try {
      isSpeaking = true;
      sendToAvatar("avatar-speaking", { isSpeaking: true });
      await speakResponse(fullResponse);
      sendToAvatar("avatar-speaking", { isSpeaking: false });
      isSpeaking = false;
      
      // Reset 15-second timeout after assistant finishes speaking
      setAvatarTimeout(15000);
      
      // Resume voice loop after speaking
      voiceLoopService.onAssistantResponseComplete();
      startVoiceLoop();
    } catch (speakError) {
      console.error("Error speaking response:", speakError);
      isSpeaking = false;
      // Resume voice loop even if TTS fails
      startVoiceLoop();
    }
    
  } catch (error) {
    console.error("Error handling avatar input:", error);
    sendToAvatar("avatar-error", { error: error.message });
    
    // Resume voice loop on error
    setTimeout(() => {
      startVoiceLoop();
    }, 2000);
  } finally {
    sendToAvatar("avatar-processing", { isProcessing: false });
  }
};

// Stop avatar and clean up
const stopAvatar = () => {
  voiceLoopService.stop();
  currentConversationId = null;
  isSpeaking = false;
};

// Initialize avatar controller
const initializeAvatarController = () => {
  console.log("Initializing avatar controller");
  
  // Monitor app focus changes - but be specific about which window
  app.on("browser-window-focus", (event, window) => {
    // Get references to our windows
    const appWindow = getAppWindow();
    const floatingWindow = getFloatingAvatarWindow();
    
    // Debug logging
    console.log("browser-window-focus event:", {
      windowId: window?.id,
      appWindowId: appWindow?.id,
      floatingWindowId: floatingWindow?.id,
      isFloatingWindow: window === floatingWindow,
      isAppWindow: window === appWindow
    });
    
    // Only hide avatar if the MAIN APP window gets focus, not the floating avatar
    if (window === appWindow && window !== floatingWindow) {
      console.log("Main app window focused, checking if avatar should be hidden");
      isAppFocused = true;
      if (isFloatingAvatarActive()) {
        console.log("Avatar is active, hiding it because main app got focus");
        hideFloatingAvatar();
        stopAvatar();
      }
    } else if (window === floatingWindow) {
      console.log("Floating avatar window focused - keeping avatar active");
      // Don't hide avatar when it gets focus itself!
    }
  });
  
  app.on("browser-window-blur", (event, window) => {
    // Only update focus state if main app window loses focus
    const appWindow = getAppWindow();
    const floatingWindow = getFloatingAvatarWindow();
    
    if (window === appWindow && window !== floatingWindow) {
      console.log("Main app window blurred");
      // Small delay to ensure we don't catch temporary focus changes
      setTimeout(() => {
        updateAppFocusState();
      }, 100);
    }
  });
  
  // Clean up on avatar hide
  app.on("avatar-hidden", () => {
    console.log("Avatar hidden event received");
    stopAvatar();
  });
};

module.exports = {
  handleWakeWordForAvatar,
  handleAvatarInput,
  updateAppFocusState,
  initializeAvatarController,
  isAppFocused: () => isAppFocused
}; 