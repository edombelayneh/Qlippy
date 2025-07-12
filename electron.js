const { app, BrowserWindow, screen, ipcMain } = require("electron");
const path = require("path");
const { Porcupine } = require("@picovoice/porcupine-node");
const { PvRecorder } = require("@picovoice/pvrecorder-node");
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");

const accessKey = "eDGFUBlFfqwPu09E2Umkne947P+RobsTREdrWjsERC61iYgk16vy7w==";

let mainWindow;
let avatarWindow;
let isRecording = false;
let recordingProcess = null;
let audioFilePath = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1280,
    minHeight: 800,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
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

function startVoiceRecording() {
  if (isRecording) return;
  
  isRecording = true;
  audioFilePath = path.join(os.tmpdir(), `qlippy_audio_${Date.now()}.wav`);
  
  console.log('Starting voice recording...');
  
  // Use ffmpeg to record audio
  recordingProcess = spawn('ffmpeg', [
    '-f', 'avfoundation',
    '-i', ':0', // Use default audio input
    '-acodec', 'pcm_s16le',
    '-ar', '16000',
    '-ac', '1',
    '-y', // Overwrite output file
    audioFilePath
  ]);
  
  // Stop recording after 10 seconds automatically
  setTimeout(() => {
    if (isRecording) {
      stopVoiceRecording();
    }
  }, 10000);
}

function stopVoiceRecording() {
  if (!isRecording) return;
  
  isRecording = false;
  
  if (recordingProcess) {
    recordingProcess.kill('SIGTERM');
    recordingProcess = null;
  }
  
  console.log('Voice recording stopped');
  
  // Process the recorded audio with Whisper
  if (audioFilePath && fs.existsSync(audioFilePath)) {
    processAudioWithWhisper(audioFilePath);
  }
}

function processAudioWithWhisper(audioFile) {
  console.log('Processing audio with Whisper...');
  
  // Use whisper CLI to transcribe the audio
  const whisperProcess = spawn('whisper', [
    audioFile,
    '--model', 'base',
    '--output_format', 'txt',
    '--output_dir', path.dirname(audioFile)
  ]);
  
  whisperProcess.on('close', (code) => {
    if (code === 0) {
      // Read the transcription result
      const txtFile = audioFile.replace('.wav', '.txt');
      if (fs.existsSync(txtFile)) {
        const transcription = fs.readFileSync(txtFile, 'utf8').trim();
        console.log('Transcription:', transcription);
        
        // Send the transcription to the main window
        if (mainWindow) {
          mainWindow.webContents.send('voice-command', transcription);
        }
        
        // Clean up the audio file
        try {
          fs.unlinkSync(audioFile);
          fs.unlinkSync(txtFile);
        } catch (err) {
          console.error('Error cleaning up audio files:', err);
        }
      }
    } else {
      console.error('Whisper processing failed with code:', code);
    }
  });
  
  whisperProcess.stderr.on('data', (data) => {
    console.log('Whisper stderr:', data.toString());
  });
}

function startHotwordDetection() {
  try {
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
