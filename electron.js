const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let isRecording = false;
let ffmpegProcess = null;
const outputPath = path.join(app.getPath('temp'), 'recording.wav');

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
      resolve(devices);
    });

    ffmpeg.on('error', (err) => {
      console.error('Error listing devices:', err);
      reject(err);
    });
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

// Remove app lifecycle events that reference createWindow since window management
// is now handled in hotword.js

// Export mainWindow for use in other modules
module.exports = { mainWindow };