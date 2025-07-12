const { app, BrowserWindow, screen, ipcMain } = require("electron");
const path = require("path");
const { Porcupine } = require("@picovoice/porcupine-node");
const { PvRecorder } = require("@picovoice/pvrecorder-node");
const { spawn } = require('child_process');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

const accessKey = process.env.PORCUPINE_ACCESS_KEY;

let mainWindow;
let avatarWindow;
let isRecording = false;
let ffmpegProcess = null;
const outputPath = path.join(app.getPath('temp'), 'recording.wav');

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
    // Check if access key is configured
    if (!accessKey) {
      console.error("❌ Porcupine access key not configured!");
      console.error("Please set the PORCUPINE_ACCESS_KEY environment variable.");
      console.error("1. Copy .env.example to .env");
      console.error("2. Get a free access key from: https://console.picovoice.ai/");
      console.error("3. Add your access key to the .env file");
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

// Function to list available audio devices
async function listAudioDevices() {
  return new Promise((resolve, reject) => {
    console.log('Listing available audio devices...');
    const ffmpeg = spawn('ffmpeg', ['-f', 'avfoundation', '-list_devices', 'true', '-i', '']);
    
    let devices = '';
    ffmpeg.stderr.on('data', (data) => {
      const output = data.toString();
      console.log('Device list:', output);
      devices += output;
    });

    ffmpeg.on('close', (code) => {
      resolve(devices);
    });

    ffmpeg.on('error', (err) => {
      console.error('Error listing devices:', err);
      reject(err);
    });
  });
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
  try {
    await listAudioDevices();
  } catch (error) {
    console.error('Failed to list devices:', error);
  }
  
  ffmpegProcess = spawn('ffmpeg', [
    '-f', 'avfoundation',    // Use avfoundation for macOS
    '-i', 'none:1',          // Format is "video_device:audio_device" - 'none' skips video device
    '-acodec', 'pcm_s16le',  // 16-bit PCM
    '-ar', '16000',          // 16kHz sample rate
    '-ac', '1',              // Mono audio
    '-af', 'volume=2.0',     // Increase volume
    '-y',                    // Overwrite output file
    '-v', 'debug',           // Verbose output for debugging
    outputPath
  ]);

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
    
    print("Starting transcription...", file=sys.stderr)
    result = model.transcribe(
        "${outputPath}",
        language="en",
        initial_prompt="The following is a voice command or message:",
        condition_on_previous_text=False
    )
    
    print("Transcription complete!", file=sys.stderr)
    if result["text"].strip():
        print(result["text"].strip())
    else:
        print("No speech detected", file=sys.stderr)
        sys.exit(1)
except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1)
    `;

    const tempScriptPath = path.join(app.getPath('temp'), 'whisper_script.py');
    console.log('Writing temporary Python script to:', tempScriptPath);
    fs.writeFileSync(tempScriptPath, pythonScript);

    console.log('Launching Python process...');
    const whisperProcess = spawn('python3', [tempScriptPath]);

    let transcription = '';
    
    whisperProcess.stdout.on('data', (data) => {
      console.log('Received transcription data:', data.toString());
      transcription += data.toString();
    });

    whisperProcess.stderr.on('data', (data) => {
      console.log(`whisper stderr: ${data}`);
    });

    whisperProcess.on('close', (code) => {
      console.log('Whisper process closed with code:', code);
      // Clean up temporary script
      fs.unlink(tempScriptPath, () => {
        console.log('Cleaned up temporary Python script');
      });
      
      if (code === 0 && transcription.trim()) {
        console.log('Sending transcription to renderer:', transcription.trim());
        // Send transcription to renderer
        mainWindow.webContents.send('voice-command', transcription.trim());
        mainWindow.webContents.send('processing-complete');
        
        // Clean up recording file
        fs.unlink(outputPath, () => {
          console.log('Cleaned up recording file');
        });
      } else {
        console.error(`Transcription failed or empty`);
        mainWindow.webContents.send('recording-error', 'No speech detected or transcription failed');
      }
    });

    whisperProcess.on('error', (error) => {
      console.error('Failed to start Python process:', error);
      mainWindow.webContents.send('recording-error', error.message);
      fs.unlink(tempScriptPath, () => {
        console.log('Cleaned up temporary Python script after error');
      }); // Clean up on error
    });
  } catch (error) {
    console.error('Failed to start Whisper:', error);
    mainWindow.webContents.send('recording-error', error.message);
  }
});

app.whenReady().then(() => {
  createAvatarWindow();
  startHotwordDetection();
});

ipcMain.on("open-main-app", () => {
  if (!mainWindow) {
    createMainWindow();
  }
  if (avatarWindow) {
    avatarWindow.close();
  }
});

// Export mainWindow for use in other modules
module.exports = { mainWindow };
