const { PvRecorder } = require("@picovoice/pvrecorder-node");
const { Porcupine } = require("@picovoice/porcupine-node");
const { getAudioDevice } = require("./audio");
const path = require("path");
const { app } = require("electron");
const fs = require("fs");
const fetch = require("node-fetch");

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

let recorder = null;
let porcupine = null;
let isListening = false;
let wakeWordHandler = null;

// Check if voice detection is enabled via backend API
const isVoiceDetectionEnabled = async () => {
  try {
    const response = await fetch("http://127.0.0.1:11434/api/settings/voice-detection");
    if (!response.ok) {
      console.warn("Failed to fetch voice detection settings, defaulting to enabled");
      return true; // Default to enabled if API fails
    }
    const data = await response.json();
    return data.enabled || false;
  } catch (error) {
    console.warn("Error checking voice detection settings:", error);
    return true; // Default to enabled if API fails
  }
};

const initVoiceDetection = async () => {
  try {
    porcupine = new Porcupine(
      process.env.PORCUPINE_ACCESS_KEY ||
        "HHPwuTWXXe2cG7I9hSY+cWRriEIJwTxfaG22678ChfRcYCoCOOz6Nw==",
      ["Hey-Qlippy.ppn"],
      [0.7],
    );

    recorder = new PvRecorder(porcupine.frameLength, -1);
  } catch (error) {
    throw error;
  }
};

const startVoiceDetection = async (mainWindow, updateTrayMenu, handleWakeWordCallback) => {
  // Check if voice detection is enabled before starting
  const enabled = await isVoiceDetectionEnabled();
  if (!enabled) {
    console.log("Voice detection is disabled, skipping wake word detection");
    return;
  }

  const keywordPaths = [
    path.join(userDataPath, "wake-words", "Hey-Qlippy.ppn"),
  ];

  // Store the wake word handler
  wakeWordHandler = handleWakeWordCallback;

  try {
    // Use the hardcoded access key if no environment variable is set
    const accessKey = process.env.PICOVOICE_API_KEY || "HHPwuTWXXe2cG7I9hSY+cWRriEIJwTxfaG22678ChfRcYCoCOOz6Nw==";
    
    porcupine = new Porcupine(
      accessKey,
      keywordPaths,
      [0.65]
    );

    const prefs = loadAudioPreferences();
    const deviceIndex = prefs.selected_microphone ? parseInt(prefs.selected_microphone) : -1;
    recorder = new PvRecorder(porcupine.frameLength, deviceIndex);

    await recorder.start();
    isListening = true;
    if (updateTrayMenu) {
      updateTrayMenu();
    }

    processAudio();
    console.log("Voice detection started successfully");
  } catch (error) {
    console.error("Voice detection failed:", error);
    stopVoiceDetection(updateTrayMenu);
  }
};

const stopVoiceDetection = (updateTrayMenu) => {
  isListening = false;
  updateTrayMenu();

  if (recorder) {
    recorder.stop();
  }
  console.log("Voice detection stopped");
};

const processAudio = async () => {
  while (isListening) {
    try {
      const pcm = await recorder.read();
      const keywordIndex = porcupine.process(pcm);

      if (keywordIndex !== -1 && wakeWordHandler) {
        wakeWordHandler();
      }
    } catch (error) {
      if (isListening) {
        stopVoiceDetection(() => {});
      }
      break;
    }
  }
};

const cleanup = () => {
  stopVoiceDetection(() => {});
  if (porcupine) {
    porcupine.release();
    porcupine = null;
  }
  if (recorder) {
    recorder.release();
    recorder = null;
  }
};

module.exports = {
  initVoiceDetection,
  startVoiceDetection,
  stopVoiceDetection,
  cleanup,
  isListening: () => isListening,
  isVoiceDetectionEnabled,
}; 