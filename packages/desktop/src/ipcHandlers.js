const { ipcMain, screen } = require("electron");
const { getMainWindow, createAppWindow } = require("./windowManager");
const { startRecording, stopRecording, speakResponse, enumerateInputDevices } = require("./audio");
const { startVoiceDetection, stopVoiceDetection } = require("./voice-detection");
const { updateTrayMenu } = require("./trayManager");
const { spawn } = require("child_process");
const { 
  handleWakeWordForAvatar, 
  handleAvatarInput, 
  isAppFocused 
} = require("./avatarController");
const { getFloatingAvatarWindow } = require("./floatingAvatar");
const fs = require("fs");
const path = require("path");

// Audio preferences storage (simple JSON file in userData)
const { app } = require("electron");
const userDataPath = app.getPath("userData");
const audioPrefsPath = path.join(userDataPath, "audio-preferences.json");

function loadAudioPreferences() {
  try {
    if (fs.existsSync(audioPrefsPath)) {
      return JSON.parse(fs.readFileSync(audioPrefsPath, "utf-8"));
    }
  } catch (e) {}
  return {
    speaker_volume: 0.75,
    mic_volume: 0.8,
    selected_speaker: null,
    selected_microphone: null,
  };
}

function saveAudioPreferences(prefs) {
  fs.writeFileSync(audioPrefsPath, JSON.stringify(prefs, null, 2));
}

const responses = [
  "I'm here to help! What can I do for you?",
  "How can I assist you today?",
  "I'm listening, what do you need?",
  "Ready to help! What's on your mind?",
];

const handleWakeWord = async () => {
  console.log("Wake word detected!");
  
  // Check if we should show avatar instead
  const showedAvatar = await handleWakeWordForAvatar();
  if (showedAvatar) {
    return; // Avatar handled it
  }
  
  // Original behavior for when app is focused
  const mainWindow = getMainWindow();
  if (!mainWindow) {
    console.log("No main window found");
    return;
  }

  const screenWidth = screen.getPrimaryDisplay().workAreaSize.width;
  mainWindow.setPosition(screenWidth - 200, 100);
  mainWindow.show();
  mainWindow.webContents.send("wake-word-detected");

  const greeting = responses[Math.floor(Math.random() * responses.length)];
  console.log("Speaking greeting:", greeting);
  await speakResponse(greeting);

  console.log("Starting recording...");
  startRecording();
};

const initializeIpcHandlers = (ipcMain, mainWindow, avatarWindow) => {
  // Original handlers
  ipcMain.on("start-recording", () => {
    startRecording();
  });

  ipcMain.on("stop-recording", () => {
    stopRecording();
  });

  ipcMain.on("close-avatar", () => {
    if (mainWindow) {
      mainWindow.hide();
    }
  });

  ipcMain.on("speak-text", (event, text) => {
    speakResponse(text);
  });

  ipcMain.on("stop-speaking", () => {
    spawn("killall", ["say"]);
    const appWindow = require("./windowManager").getAppWindow();
    if (appWindow) {
      appWindow.webContents.send("speaking-complete");
    }
  });

  ipcMain.on("open-app", () => {
    createAppWindow();
  });
  
  // New avatar handlers
  ipcMain.on("avatar-input", async (event, { input, type }) => {
    await handleAvatarInput(input, type);
  });
  
  ipcMain.on("start-avatar-recording", async () => {
    const avatarWindow = getFloatingAvatarWindow();
    if (!avatarWindow) return;
    
    try {
      await startRecording();
      // Don't send response here, let voice loop handle it
    } catch (error) {
      console.error("Failed to start avatar recording:", error);
      avatarWindow.webContents.send("avatar-error", { error: error.message });
    }
  });
  
  ipcMain.on("stop-avatar-recording", async () => {
    const avatarWindow = getFloatingAvatarWindow();
    if (!avatarWindow) return;
    
    try {
      const transcription = await stopRecording();
      if (transcription) {
        avatarWindow.webContents.send("avatar-voice-input", { transcription });
      } else {
        avatarWindow.webContents.send("avatar-status", { status: "No speech detected" });
      }
    } catch (error) {
      console.error("Failed to stop avatar recording:", error);
      avatarWindow.webContents.send("avatar-error", { error: error.message });
    }
  });

  ipcMain.on("get-audio-preferences", (event) => {
    const prefs = loadAudioPreferences();
    event.sender.send("audio-preferences-updated", prefs);
  });

  ipcMain.on("set-audio-preferences", (event, prefs) => {
    saveAudioPreferences(prefs);
    if (mainWindow) mainWindow.webContents.send("audio-preferences-updated", prefs);
    if (avatarWindow) avatarWindow.webContents.send("audio-preferences-updated", prefs);
  });

  ipcMain.on("list-audio-input-devices", async (event) => {
    try {
      const devices = await enumerateInputDevices();
      event.sender.send("audio-input-devices-list", devices);
    } catch (err) {
      event.sender.send("audio-input-devices-list", []);
    }
  });
};

module.exports = {
  initializeIpcHandlers,
  handleWakeWord,
}; 