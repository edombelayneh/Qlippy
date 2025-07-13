const { app, BrowserWindow, screen, ipcMain } = require("electron");
const path = require("path");
const { Porcupine } = require("@picovoice/porcupine-node");
const { PvRecorder } = require("@picovoice/pvrecorder-node");
const { spawn } = require("child_process");
require('dotenv').config();
const fs = require("fs");
const os = require("os");

const accessKey = process.env.PORCUPINE_ACCESS_KEY || "YOUR_ACCESS_KEY_HERE";

let mainWindow;
let avatarWindow;
let isRecording = false;
let recordingProcess = null;
let audioFilePath = null;
let backendProcess = null;
let frontendProcess = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1280,
    minHeight: 800,
    webPreferences: {
      contextIsolation: true,
    },
  });

  // Dev server during development
  mainWindow.loadURL("http://localhost:3000");

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Function to list available audio devices
async function listAudioDevices() {
  return new Promise((resolve, reject) => {
    console.log('Listing available audio devices...');
    const isWindows = process.platform === 'win32';
    const args = isWindows 
      ? ['-list_devices', 'true', '-f', 'dshow', '-i', 'dummy']
      : ['-f', 'avfoundation', '-list_devices', 'true', '-i', ''];
      
    const ffmpeg = spawn('ffmpeg', args);
    
    let devices = '';
    ffmpeg.stderr.on('data', (data) => {
      const output = data.toString();
      console.log('Device list:', output);
      devices += output;
    });
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(devices);
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });
    
    ffmpeg.on('error', (error) => {
      reject(error);
    });
  });
}

function waitForBackend() {
  return new Promise((resolve, reject) => {
    const http = require('http');
    const options = {
      hostname: 'localhost',
      port: 5001,
      path: '/api/health',
      method: 'GET',
      timeout: 30000
    };
    
    const req = http.request(options, (res) => {
      if (res.statusCode === 200) {
        console.log('✅ Backend is ready');
        resolve();
      } else {
        reject(new Error(`Backend responded with status: ${res.statusCode}`));
      }
    });
    
    req.on('error', (err) => {
      console.log('Waiting for backend to be ready...');
      setTimeout(() => waitForBackend().then(resolve).catch(reject), 1000);
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      console.log('Backend timeout, retrying...');
      setTimeout(() => waitForBackend().then(resolve).catch(reject), 1000);
    });
    
    req.end();
  });
}

// Function to parse audio devices from ffmpeg output
function parseAudioDevices(data, platform) {
  const lines = data.split('\n');
  const devices = [];
  if (platform === 'win32') {
    const regex = /"([^"]+)"/g;
    for (const line of lines) {
      // This is to skip the line that says "DirectShow audio devices"
      if (line.includes('DirectShow audio devices')) continue;

      // Find all quoted strings in the line
      let match;
      while ((match = regex.exec(line)) !== null) {
        devices.push(match[1]);
      }
    }
  } else { // darwin
    const regex = /\[(\d+)\]\s(.+)/;
    let inAudio = false;
    for (const line of lines) {
      if (line.includes('AVFoundation audio devices:')) {
        inAudio = true;
        continue;
      }
      if (inAudio) {
        const match = line.match(regex);
        if (match) {
          devices.push({ index: match[1], name: match[2].trim() });
        }
      }
    }
  }
  return devices;
}

// Handle recording start
ipcMain.on('start-recording', async () => {
  if (isRecording) return;
  
  console.log('Starting recording...');
  isRecording = true;
  mainWindow.webContents.send('recording-started');

  // Start ffmpeg recording
  console.log('Launching ffmpeg process...');
  console.log('Output path:', outputPath);
  
  // Remove existing recording file if it exists
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }

  // Get the list of devices first
  let audioDevice = '';
  const isWindows = process.platform === 'win32';
  try {
    const deviceListStr = await listAudioDevices();
    const devices = parseAudioDevices(deviceListStr, process.platform);
    
    if (devices.length > 0) {
      if (isWindows) {
        const mic = devices.find(d => d.toLowerCase().includes('microphone'));
        audioDevice = mic || devices[0];
      } else { // darwin
        const mic = devices.find(d => d.name.toLowerCase().includes('microphone'));
        audioDevice = mic ? mic.index : devices[0].index;
      }
      console.log(`Using audio device: ${audioDevice}`);
    } else {
      console.error('No audio devices found.');
    }
  } catch (error) {
    console.error('Failed to list or parse devices:', error);
  }

  if (!audioDevice) {
    mainWindow.webContents.send('recording-error', 'No audio devices found.');
    isRecording = false;
    return;
  }
  
  const ffmpegArgs = isWindows
    ? [
        '-f', 'dshow',
        '-i', `audio=${audioDevice}`,
        '-acodec', 'pcm_s16le',
        '-ar', '16000',
        '-ac', '1',
        '-af', 'volume=2.0',
        '-y',
        '-v', 'debug',
        outputPath
      ]
    : [
        '-f', 'avfoundation',
        '-i', `none:${audioDevice}`, // On macOS, we can use device index
        '-acodec', 'pcm_s16le',
        '-ar', '16000',
        '-ac', '1',
        '-af', 'volume=2.0',
        '-y',
        '-v', 'debug',
        outputPath
      ];

  ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

  ffmpegProcess.stderr.on('data', (data) => {
    console.log(`ffmpeg: ${data}`);
  });

  ffmpegProcess.stdout.on('data', (data) => {
    console.log(`ffmpeg stdout: ${data}`);
  });

  ffmpegProcess.on('error', (error) => {
    console.error('Failed to start recording:', error);
    mainWindow.webContents.send('recording-error', error.message);
    isRecording = false;
  });
});

// Handle recording stop
ipcMain.on('stop-recording', async () => {
  if (!isRecording) return;
  
  console.log('Stopping recording...');
  isRecording = false;
  mainWindow.webContents.send('recording-stopped');

  // Stop ffmpeg
  if (ffmpegProcess) {
    console.log('Stopping ffmpeg process...');
    ffmpegProcess.stdin.write('q');
    ffmpegProcess.kill();
    ffmpegProcess = null;
  }

  // Wait a bit for the file to be fully written
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Verify the recording file exists and has content
  if (!fs.existsSync(outputPath)) {
    console.error('Recording file does not exist');
    mainWindow.webContents.send('recording-error', 'Recording failed - no output file');
    return;
  }

  const stats = fs.statSync(outputPath);
  if (stats.size === 0) {
    console.error('Recording file is empty');
    mainWindow.webContents.send('recording-error', 'Recording failed - empty file');
    return;
  }

  console.log('Recording file size:', stats.size, 'bytes');

  // Process with Whisper using Python
  try {
    console.log('Starting Whisper transcription...');
    const pythonScript = `
import os
import ssl
import whisper
import sys
import wave
import numpy as np

# Disable SSL verification for downloading the model
ssl._create_default_https_context = ssl._create_unverified_context

# Set environment variable to disable certificate verification
os.environ['CURL_CA_BUNDLE'] = ''

try:
    # Verify the wav file
    print("Verifying audio file...", file=sys.stderr)
    with wave.open("${outputPath}", 'rb') as wav_file:
        print(f"Audio file details:", file=sys.stderr)
        print(f"- Number of channels: {wav_file.getnchannels()}", file=sys.stderr)
        print(f"- Sample width: {wav_file.getsampwidth()}", file=sys.stderr)
        print(f"- Frame rate: {wav_file.getframerate()}", file=sys.stderr)
        print(f"- Number of frames: {wav_file.getnframes()}", file=sys.stderr)
        print(f"- Duration: {wav_file.getnframes() / wav_file.getframerate():.2f} seconds", file=sys.stderr)
        
        # Read the audio data
        frames = wav_file.readframes(wav_file.getnframes())
        audio_data = np.frombuffer(frames, dtype=np.int16)
        
        # Calculate audio metrics
        max_amplitude = np.max(np.abs(audio_data))
        mean_amplitude = np.mean(np.abs(audio_data))
        print(f"- Max amplitude: {max_amplitude}", file=sys.stderr)
        print(f"- Mean amplitude: {mean_amplitude}", file=sys.stderr)

    print("Loading Whisper model...", file=sys.stderr)
    model = whisper.load_model("base")
    
    const req = http.request(options, (res) => {
      if (res.statusCode === 200) {
        console.log('✅ Backend is ready');
        resolve();
      } else {
        reject(new Error(`Backend responded with status: ${res.statusCode}`));
      }
    });
    
    req.on('error', (err) => {
      console.log('Waiting for backend to be ready...');
      setTimeout(() => waitForBackend().then(resolve).catch(reject), 1000);
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      console.log('Backend timeout, retrying...');
      setTimeout(() => waitForBackend().then(resolve).catch(reject), 1000);
    });
    
    req.end();
  });
}

function startBackend() {
  console.log('🚀 Starting Flask backend...');
  const backendPath = path.join(__dirname, 'backend');
  
  // Use the virtual environment's Python
  const pythonPath = path.join(backendPath, 'venv', 'bin', 'python');
  
  backendProcess = spawn(pythonPath, ['app.py'], {
    cwd: backendPath,
    stdio: 'pipe'
  });
  
  backendProcess.stdout.on('data', (data) => {
    console.log('Backend:', data.toString().trim());
  });
  
  backendProcess.stderr.on('data', (data) => {
    console.log('Backend Error:', data.toString().trim());
  });
  
  backendProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
  });
  
  // Wait a bit for backend to start
  return new Promise((resolve) => {
    setTimeout(resolve, 2000);
  });
}

function startFrontend() {
  console.log('🚀 Starting Next.js frontend...');
  
  frontendProcess = spawn('npm', ['run', 'dev'], {
    cwd: __dirname,
    stdio: 'pipe'
  });
  
  frontendProcess.stdout.on('data', (data) => {
    console.log('Frontend:', data.toString().trim());
  });
  
  frontendProcess.stderr.on('data', (data) => {
    console.log('Frontend Error:', data.toString().trim());
  });
  
  frontendProcess.on('close', (code) => {
    console.log(`Frontend process exited with code ${code}`);
  });
  
  // Wait for frontend to be ready
  return new Promise((resolve) => {
    setTimeout(resolve, 5000);
  });
}

function createAvatarWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  avatarWindow = new BrowserWindow({
    width: 200,
    height: 200,
    x: width - 200,
    y: height - 200,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  avatarWindow.loadFile(path.join(__dirname, "index.html"));

  avatarWindow.on("closed", () => {
    avatarWindow = null;
  });
}

function startHotwordDetection() {
  try {
    if (!accessKey || accessKey === "YOUR_ACCESS_KEY_HERE") {
      console.error("❌ PORCUPINE_ACCESS_KEY not configured in .env file");
      console.log("Please add your Picovoice access key to the .env file:");
      console.log("PORCUPINE_ACCESS_KEY=your_actual_access_key_here");
      return;
    }
    
    const keywordPaths = [path.join(__dirname, "Hey-Qlippy.ppn")];
    const sensitivities = [0.5];
    const porcupine = new Porcupine(accessKey, keywordPaths, sensitivities);

    const frameLength = porcupine.frameLength;

    const recorder = new PvRecorder(frameLength, -1);
    recorder.start();

    console.log(`Using device: ${recorder.getSelectedDevice()}`);
    console.log('Listening for "Hey Qlippy"...');

    setInterval(async () => {
      const pcm = await recorder.read();
      const keywordIndex = porcupine.process(pcm);
      if (keywordIndex !== -1) {
        console.log('"Hey Qlippy" detected!');
        if (avatarWindow) {
          avatarWindow.show();
          avatarWindow.focus();
        }
      }
    }, 10);
  } catch (err) {
    console.error("Error initializing Picovoice:", err);
  }
}

// Add IPC handlers for voice recording (for voice button in chat)
ipcMain.on("start-recording", () => {
  startVoiceRecording();
});

ipcMain.on("stop-recording", () => {
  stopVoiceRecording();
});

ipcMain.on("voice-command-processed", (event, command) => {
  console.log('Voice command processed:', command);
});

// Cleanup function to stop all processes
function cleanup() {
  console.log('🧹 Cleaning up processes...');
  
  if (backendProcess) {
    console.log('Stopping backend...');
    backendProcess.kill('SIGTERM');
  }
  
  if (frontendProcess) {
    console.log('Stopping frontend...');
    frontendProcess.kill('SIGTERM');
  }
  
  if (recordingProcess) {
    console.log('Stopping recording...');
    recordingProcess.kill('SIGTERM');
  }
}

// Handle app quit
app.on('before-quit', () => {
  cleanup();
});

// Handle window closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    cleanup();
    app.quit();
  }
});

// Handle process termination
process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  cleanup();
  process.exit(0);
});

app.whenReady().then(async () => {
  console.log('🎯 Qlippy is starting up...');
  
  try {
    // Start backend first
    await startBackend();
    console.log('✅ Backend started successfully');
    
    // Wait for backend to be ready
    await waitForBackend();
    
    // Start frontend
    await startFrontend();
    console.log('✅ Frontend started successfully');
    
    // Create avatar window
    createAvatarWindow();
    
    // Check if access key is configured
    if (!accessKey || accessKey === "YOUR_ACCESS_KEY_HERE") {
      console.log("⚠️  Hotword detection disabled - access key not configured");
      console.log("💡 To enable wake word detection:");
      console.log("   1. Get a free access key from https://console.picovoice.ai/");
      console.log("   2. Add it to your .env file: PORCUPINE_ACCESS_KEY=your_key_here");
      console.log("   3. Restart the app");
    } else {
      startHotwordDetection();
    }
    
    console.log("✅ Voice button in chat is still available for voice input");
    console.log("🎉 Qlippy is ready! Open the main app to start chatting.");
    
  } catch (error) {
    console.error('❌ Error starting services:', error);
  }
});

ipcMain.on("open-main-app", () => {
  if (!mainWindow) {
    createMainWindow();
  }
  if (avatarWindow) {
    avatarWindow.close();
  }
});
