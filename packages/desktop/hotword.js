const { app, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const {
  createTray,
  destroyTray,
  updateTrayMenu,
} = require("./src/trayManager");
const {
  createMainWindow,
  getMainWindow,
  closeAllsWindows,
} = require("./src/windowManager");
const { startVoiceDetection, isVoiceDetectionEnabled } = require("./src/voice-detection");
const { initializeIpcHandlers, handleWakeWord } = require("./src/ipcHandlers");
const { initializeAvatarController } = require("./src/avatarController");
const userDataPath = app.getPath("userData");

let voiceDetectionCheckInterval = null;
let currentVoiceDetectionState = true;

const setupUserDataDirectory = () => {
  const requiredDirs = ["plugins", "models", "wake-words"];
  requiredDirs.forEach((dir) => {
    const dirPath = path.join(userDataPath, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });

  // Copy default wake word if it doesn't exist
  const defaultWakeWordDir = path.join(__dirname, "assets", "wake-words");
  const userWakeWordDir = path.join(userDataPath, "wake-words");
  fs.readdirSync(defaultWakeWordDir).forEach((file) => {
    const source = path.join(defaultWakeWordDir, file);
    const dest = path.join(userWakeWordDir, file);
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(source, dest);
    }
  });
};

// Function to check and manage voice detection based on settings
const checkAndManageVoiceDetection = async () => {
  try {
    const enabled = await isVoiceDetectionEnabled();
    
    if (enabled !== currentVoiceDetectionState) {
      console.log(`Voice detection setting changed: ${currentVoiceDetectionState} -> ${enabled}`);
      currentVoiceDetectionState = enabled;
      
      if (enabled) {
        // Start voice detection
        const mainWindow = getMainWindow();
        if (mainWindow) {
          const updateTrayMenuWrapper = createUpdateTrayMenuWrapper();
          startVoiceDetection(mainWindow, updateTrayMenuWrapper, handleWakeWord);
        }
      } else {
        // Stop voice detection
        const voiceDetection = require("./src/voice-detection");
        const updateTrayMenuWrapper = createUpdateTrayMenuWrapper();
        voiceDetection.stopVoiceDetection(updateTrayMenuWrapper);
      }
    }
  } catch (error) {
    console.error("Error checking voice detection setting:", error);
  }
};

// Helper function to create the updateTrayMenu wrapper
const createUpdateTrayMenuWrapper = () => {
  return () => {
    const appWindow = require("./src/windowManager").getAppWindow();
    const voiceDetection = require("./src/voice-detection");
    const isListening = voiceDetection.isListening();
    const cleanup = voiceDetection.cleanup;
    
    // Create wrapper functions that handle the parameters internally
    const startVoiceDetectionWrapper = () => {
      startVoiceDetection(getMainWindow(), createUpdateTrayMenuWrapper(), handleWakeWord);
    };
    
    const stopVoiceDetectionWrapper = () => {
      voiceDetection.stopVoiceDetection(createUpdateTrayMenuWrapper());
    };
    
    updateTrayMenu(appWindow, isListening, startVoiceDetectionWrapper, stopVoiceDetectionWrapper, cleanup);
  };
};

app.on("ready", async () => {
  setupUserDataDirectory();
  createMainWindow();
  
  // Initialize avatar controller
  initializeAvatarController();

  const mainWindow = getMainWindow();

  createTray(app, mainWindow);

  const updateTrayMenuWrapper = createUpdateTrayMenuWrapper();

  // Check initial voice detection setting and start if enabled
  const enabled = await isVoiceDetectionEnabled();
  currentVoiceDetectionState = enabled;
  
  if (enabled) {
    startVoiceDetection(mainWindow, updateTrayMenuWrapper, handleWakeWord);
  } else {
    console.log("Voice detection is disabled, not starting wake word detection");
  }
  
  // Set up periodic check for voice detection setting changes (every 5 seconds)
  voiceDetectionCheckInterval = setInterval(checkAndManageVoiceDetection, 5000);
  
  initializeIpcHandlers(ipcMain, mainWindow);
});

app.on("activate", async () => {
  if (getMainWindow() === null) {
    createMainWindow();
    
    // Check voice detection setting and restart if needed
    const mainWindow = getMainWindow();
    const { isListening } = require("./src/voice-detection");
    const enabled = await isVoiceDetectionEnabled();
    
    if (mainWindow && !isListening() && enabled) {
      const updateTrayMenuWrapper = createUpdateTrayMenuWrapper();
      startVoiceDetection(mainWindow, updateTrayMenuWrapper, handleWakeWord);
    }
  }
});

app.on("window-all-closed", () => {
  // Clear the voice detection check interval
  if (voiceDetectionCheckInterval) {
    clearInterval(voiceDetectionCheckInterval);
    voiceDetectionCheckInterval = null;
  }
  
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  // Clear the voice detection check interval
  if (voiceDetectionCheckInterval) {
    clearInterval(voiceDetectionCheckInterval);
    voiceDetectionCheckInterval = null;
  }
  
  destroyTray();
  closeAllsWindows();
});