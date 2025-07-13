const { app } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");
const { getAppWindow } = require("./windowManager");
const { PvRecorder } = require("@picovoice/pvrecorder-node");

let isRecording = false;
let isSpeaking = false;
let ffmpegProcess = null;
let recordingTimeout = null;

const MAX_RECORDING_DURATION = 10000;
const outputPath = path.join(app.getPath("temp"), "recording.wav");

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

async function enumerateInputDevices() {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-f",
      "avfoundation",
      "-list_devices",
      "true",
      "-i",
      "",
    ]);

    let devices = "";
    ffmpeg.stderr.on("data", (data) => {
      devices += data.toString();
    });

    ffmpeg.on("close", (code) => {
      // Parse FFmpeg output for input devices
      const inputDevices = [];
      const lines = devices.split("\n");
      let inInputSection = false;
      for (const line of lines) {
        if (line.includes("AVFoundation audio devices:")) {
          inInputSection = true;
          continue;
        }
        if (inInputSection) {
          const match = line.match(/\[(\d+)\] (.+)$/);
          if (match) {
            inputDevices.push({ index: match[1], label: match[2].trim() });
          } else if (line.trim() === "") {
            break;
          }
        }
      }
      resolve(inputDevices);
    });

    ffmpeg.on("error", (err) => {
      reject(err);
    });
  });
}

function isDeviceIndexAvailable(index) {
  // Synchronously check if the index is in the current device list
  // (for simplicity, re-enumerate devices each time)
  const devices = require('child_process').spawnSync('ffmpeg', [
    '-f', 'avfoundation', '-list_devices', 'true', '-i', ''
  ]).stderr.toString();
  const lines = devices.split('\n');
  let inInputSection = false;
  for (const line of lines) {
    if (line.includes('AVFoundation audio devices:')) {
      inInputSection = true;
      continue;
    }
    if (inInputSection) {
      const match = line.match(/\[(\d+)\] (.+)$/);
      if (match && match[1] === String(index)) {
        return true;
      } else if (line.trim() === '') {
        break;
      }
    }
  }
  return false;
}

const getAudioDevice = (frameLength) => {
  const prefs = loadAudioPreferences();
  let deviceIndex = prefs.selected_microphone ? parseInt(prefs.selected_microphone) : -1;
  if (!isDeviceIndexAvailable(deviceIndex)) {
    deviceIndex = 0;
    // Notify renderer if possible
    const appWindow = getAppWindow && getAppWindow();
    if (appWindow) {
      appWindow.webContents.send('recording-error', 'Selected microphone not available, using default device.');
    }
  }
  try {
    return new PvRecorder(frameLength, deviceIndex);
  } catch (error) {
    console.error("Failed to create audio device:", error);
    throw error;
  }
};

const listAudioDevices = async () => {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-f",
      "avfoundation",
      "-list_devices",
      "true",
      "-i",
      "",
    ]);

    let devices = "";
    ffmpeg.stderr.on("data", (data) => {
      devices += data.toString();
    });

    ffmpeg.on("close", (code) => {
      resolve(devices);
    });

    ffmpeg.on("error", (err) => {
      reject(err);
    });
  });
};

const startRecording = async () => {
  if (isRecording) return;

  try {
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

    await listAudioDevices();

    isRecording = true;
    const appWindow = getAppWindow();
    if (appWindow) {
      appWindow.webContents.send("recording-started");
    }

    const prefs = loadAudioPreferences();
    let deviceIndex = prefs.selected_microphone ? prefs.selected_microphone : "0";
    if (!isDeviceIndexAvailable(deviceIndex)) {
      deviceIndex = "0";
      if (appWindow) {
        appWindow.webContents.send('recording-error', 'Selected microphone not available, using default device.');
      }
    }

    ffmpegProcess = spawn("ffmpeg", [
      "-f",
      "avfoundation",
      "-i",
      `:${deviceIndex}`,
      "-acodec",
      "pcm_s16le",
      "-ar",
      "16000",
      "-ac",
      "1",
      "-af",
      "volume=2.0",  // Add volume boost to match backend
      "-y",  // Overwrite output file
      "-v",
      "error",  // Less verbose logging
      outputPath,
    ]);

    ffmpegProcess.on("error", (error) => {
      if (getAppWindow()) {
        getAppWindow().webContents.send("recording-error", error.message);
      }
      stopRecording();
    });

    recordingTimeout = setTimeout(() => {
      stopRecording();
    }, MAX_RECORDING_DURATION);
  } catch (error) {
    if (getAppWindow()) {
      getAppWindow().webContents.send("recording-error", error.message);
    }
    stopRecording();
  }
};

const stopRecording = async () => {
  if (!isRecording) return;

  isRecording = false;
  if (getAppWindow()) {
    getAppWindow().webContents.send("recording-stopped");
  }

  if (recordingTimeout) {
    clearTimeout(recordingTimeout);
    recordingTimeout = null;
  }

  if (ffmpegProcess) {
    ffmpegProcess.stdin.write("q");
    ffmpegProcess.kill();
    ffmpegProcess = null;
  }

  await new Promise((resolve) => setTimeout(resolve, 1000));

  if (!fs.existsSync(outputPath)) {
    if (getAppWindow()) {
      getAppWindow().webContents.send(
        "recording-error",
        "Recording failed - no output file",
      );
    }
    return null;
  }

  const stats = fs.statSync(outputPath);
  if (stats.size === 0) {
    if (getAppWindow()) {
      getAppWindow().webContents.send(
        "recording-error",
        "Recording failed - empty file",
      );
    }
    return null;
  }

  if (getAppWindow()) {
    getAppWindow().webContents.send("processing-complete");
  }

  // Get transcription and return it
  const transcription = await transcribeAudio();
  return transcription;
};

const transcribeAudio = async () => {
  try {
    console.log("Starting transcription via backend service...");
    
    // Use the backend's WebSocket transcription service
    // Create FormData to send the audio file
    const fetch = require('node-fetch');
    const FormData = require('form-data');
    
    // Read the audio file
    const audioBuffer = fs.readFileSync(outputPath);
    
    // Create form data
    const formData = new FormData();
    formData.append('audio', audioBuffer, {
      filename: 'recording.wav',
      contentType: 'audio/wav'
    });
    
    // Send to backend (we'll create this endpoint)
    const response = await fetch('http://127.0.0.1:11434/api/transcribe', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      // Fallback: try the existing backend transcription service
      console.log("Direct transcription failed, falling back to temp file approach");
      
      // Copy file to backend temp directory and use existing service
      const tempDir = '/tmp';
      const tempPath = path.join(tempDir, 'desktop_recording.wav');
      fs.copyFileSync(outputPath, tempPath);
      
      // Make a simple request to trigger transcription
      const transcribeResponse = await fetch('http://127.0.0.1:11434/api/health');
      
      if (transcribeResponse.ok) {
        // For now, return a placeholder until we set up the endpoint
        console.log("Audio file copied to backend, transcription needs backend endpoint");
        return "Audio recorded successfully"; // Temporary response
      }
      
      throw new Error(`Backend not available: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.transcription && result.transcription.trim()) {
      console.log("Transcription result:", result.transcription);
      return result.transcription.trim();
    } else {
      console.log("No transcription returned from service");
      return null;
    }
    
  } catch (error) {
    console.error("Transcription error:", error);
    
    // Temporary fallback: check if audio file was created successfully
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      console.log(`Audio file created: ${stats.size} bytes`);
      
      if (stats.size > 1000) {
        return "Audio captured but transcription service unavailable";
      }
    }
    
    return null;
  }
};

const speakResponse = async (text) => {
  if (isSpeaking) return;

  try {
    isSpeaking = true;
    if (getAppWindow()) {
      getAppWindow().webContents.send("speaking-started");
    }

    // Use macOS built-in 'say' command for TTS
    const sayProcess = spawn("say", [text]);

    sayProcess.on("error", (error) => {
      isSpeaking = false;
      if (getAppWindow()) {
        getAppWindow().webContents.send("speaking-error", error.message);
      }
    });

    sayProcess.on("close", (code) => {
      isSpeaking = false;
      if (getAppWindow()) {
        if (code === 0) {
          getAppWindow().webContents.send("speaking-complete");
        } else {
          getAppWindow().webContents.send("speaking-error", "TTS failed");
        }
      }
    });
  } catch (error) {
    isSpeaking = false;
    if (getAppWindow()) {
      getAppWindow().webContents.send("speaking-error", error.message);
    }
  }
};

module.exports = {
  getAudioDevice,
  startRecording,
  stopRecording,
  speakResponse,
  enumerateInputDevices,
}; 