const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron');
const path = require('path');
const { PvRecorder } = require('@picovoice/pvrecorder-node');
const { spawn } = require('child_process');
const { Porcupine } = require('@picovoice/porcupine-node');
const fs = require('fs');

// Load environment variables from .env file
require('dotenv').config();
// Remove the dependency on electron.js recordingWindow
// const { mainWindow: recordingWindow } = require('./electron');

let mainWindow = null; // This is the avatar window
let appWindow = null; // This is the main application window
let tray = null;
let recorder = null;
let porcupine = null;
let isListening = false;
let isRecording = false;
let ffmpegProcess = null;
let recordingTimeout = null;
let isSpeaking = false;

// Audio recording settings
const MAX_RECORDING_DURATION = 10000; // 10 seconds
const outputPath = path.join(app.getPath('temp'), 'recording.wav');

// Wake word responses removed - avatar only shows without spoken greeting

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

// Create the main application window
const createAppWindow = () => {
  if (appWindow) {
    appWindow.show();
    appWindow.focus();
    // Stop wake word detection when bringing existing app to focus
    console.log('🛑 App brought to focus - stopping wake word detection');
    stopVoiceDetection();
    return;
  }

  const preloadPath = path.resolve(__dirname, 'preload.js');
  console.log('Loading preload script from:', preloadPath);
  console.log('Preload script exists:', fs.existsSync(preloadPath));

  appWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1280,
    minHeight: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadPath,
      enableRemoteModule: false,
      webSecurity: true
    },
    show: false // Don't show until ready
  });

  // Add debugging for window events
  appWindow.webContents.on('dom-ready', () => {
    console.log('✅ App window DOM ready');
  });

  appWindow.webContents.on('did-finish-load', () => {
    console.log('✅ App window finished loading');
  });

  appWindow.webContents.on('preload-error', (event, preloadPath, error) => {
    console.error('❌ Preload script error:', preloadPath, error);
  });

  // Add focus-based wake word control
  appWindow.on('focus', () => {
    console.log('🎯 Main app gained focus - stopping wake word detection');
    stopVoiceDetection();
    updateTrayMenu();
  });

  appWindow.on('blur', () => {
    console.log('👋 Main app lost focus - starting wake word detection');
    startVoiceDetection();
  });

  appWindow.on('minimize', () => {
    console.log('📦 Main app minimized - starting wake word detection');
    startVoiceDetection();
  });

  appWindow.on('restore', () => {
    console.log('📤 Main app restored - stopping wake word detection');
    stopVoiceDetection();
    updateTrayMenu();
  });

  // Try loading the development server first
  appWindow.loadURL("http://localhost:3000").then(() => {
    console.log('✅ Successfully loaded Next.js dev server');
    appWindow.show();
    
    // Stop wake word detection when app opens
    console.log('🛑 Stopping wake word detection - app is now open');
    stopVoiceDetection();
    
    // Always open DevTools for debugging this issue
    appWindow.webContents.openDevTools();
  }).catch((error) => {
    console.error('❌ Failed to load app window:', error);
    // Try loading the production build if dev server fails
    appWindow.loadFile(path.join(__dirname, '.next', 'server', 'app', 'index.html')).then(() => {
      console.log('✅ Successfully loaded production build');
      appWindow.show();
      appWindow.webContents.openDevTools();
    }).catch((err) => {
      console.error('❌ Failed to load production build:', err);
      // If both fail, show an error page
      appWindow.loadFile(path.join(__dirname, 'index.html')).then(() => {
        console.log('✅ Successfully loaded fallback page');
        appWindow.show();
        appWindow.webContents.openDevTools();
      }).catch((e) => {
        console.error('❌ Failed to load error page:', e);
      });
    });
  });

  // Handle window state
  appWindow.on('closed', () => {
    console.log('🚪 App window closed - resuming wake word detection');
    appWindow = null;
    // Resume wake word detection when app is closed
    startVoiceDetection();
  });
};

// Create the avatar window
const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 150,
    height: 150,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.setVisibleOnAllWorkspaces(true);
  mainWindow.hide(); // Hide by default

  // Click handling is done in renderer.js via IPC
};

// Create system tray
const createTray = () => {
  tray = new Tray(path.join(__dirname, 'clippy-avatar.png'));
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Open Qlippy',
      click: () => createAppWindow()
    },
    { type: 'separator' },
    { 
      label: 'Voice Assistant Status',
      enabled: false,
      icon: path.join(__dirname, 'clippy-avatar.png')
    },
    { type: 'separator' },
    {
      label: 'Listening for "Hey Qlippy"',
      type: 'checkbox',
      checked: isListening,
      click: (menuItem) => {
        if (menuItem.checked) {
          startVoiceDetection();
        } else {
          stopVoiceDetection();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        cleanup();
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Qlippy Voice Assistant');
  tray.setContextMenu(contextMenu);

  // Handle clicks on the tray icon
  tray.on('click', () => {
    createAppWindow();
  });
};

const initVoiceDetection = async () => {
  try {
    const accessKey = process.env.PORCUPINE_ACCESS_KEY;
    
    if (!accessKey || accessKey === 'your_new_access_key_here') {
      console.error('❌ Porcupine access key not configured!');
      console.error('📝 Please follow these steps:');
      console.error('1. Visit https://console.picovoice.ai/');
      console.error('2. Sign up for a free account');
      console.error('3. Generate an access key');
      console.error('4. Update your .env file with: PORCUPINE_ACCESS_KEY=your_actual_key');
      console.error('5. Restart the application');
      throw new Error('Porcupine access key not configured. Please see console for instructions.');
    }

    // Initialize Porcupine for wake word detection
    porcupine = new Porcupine(
      accessKey,
      ['Hey-Qlippy.ppn'],  // Using the custom wake word model
      [0.7]  // Wake word sensitivity - increased for better detection
    );

    // Initialize audio recorder
    recorder = new PvRecorder(porcupine.frameLength, -1); // -1 for default device
    console.log('✅ Voice detection initialized successfully');
    
  } catch (error) {
    console.error('❌ Failed to initialize voice detection:', error);
    
    if (error.message.includes('00000136')) {
      console.error('🔑 This error indicates your access key has reached its activation limit.');
      console.error('📝 To fix this:');
      console.error('1. Visit https://console.picovoice.ai/');
      console.error('2. Generate a new access key');
      console.error('3. Update your .env file');
      console.error('4. Restart the application');
    }
    
    throw error;
  }
};

const startVoiceDetection = async () => {
  if (isListening) return;
  
  try {
    if (!recorder || !porcupine) {
      await initVoiceDetection();
    }
    
    await recorder.start();
    isListening = true;
    updateTrayMenu();
    console.log('Listening for "Hey Qlippy"...');
    
    processAudio();
  } catch (error) {
    console.error('Failed to start voice detection:', error);
    stopVoiceDetection();
  }
};

const stopVoiceDetection = () => {
  isListening = false;
  updateTrayMenu();
  
  if (recorder) {
    recorder.stop();
  }
};

const processAudio = async () => {
  while (isListening) {
    try {
      const pcm = await recorder.read();
      const keywordIndex = porcupine.process(pcm);
      
      if (keywordIndex !== -1) {
        console.log('Wake word detected!');
        handleWakeWord();
      }
    } catch (error) {
      if (isListening) {
        console.error('Error processing audio:', error);
        stopVoiceDetection();
      }
      break;
    }
  }
};

const startRecording = async () => {
  if (isRecording) return;
  
  try {
    // Remove existing recording file if it exists
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

    // Get the list of devices first
    await listAudioDevices();
    
    console.log('Starting recording...');
    isRecording = true;
    if (appWindow) {
      appWindow.webContents.send('recording-started');
    }

    // Start ffmpeg recording
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
      if (appWindow) {
        appWindow.webContents.send('recording-error', error.message);
      }
      stopRecording();
    });

    // Set timeout to stop recording
    recordingTimeout = setTimeout(() => {
      console.log('Recording timeout reached');
      stopRecording();
    }, MAX_RECORDING_DURATION);

  } catch (error) {
    console.error('Error starting recording:', error);
    if (appWindow) {
      appWindow.webContents.send('recording-error', error.message);
    }
    stopRecording();
  }
};

const stopRecording = async () => {
  if (!isRecording) return;
  
  console.log('Stopping recording...');
  isRecording = false;
  if (appWindow) {
    appWindow.webContents.send('recording-stopped');
  }

  // Clear recording timeout
  if (recordingTimeout) {
    clearTimeout(recordingTimeout);
    recordingTimeout = null;
  }

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
    if (appWindow) {
      appWindow.webContents.send('recording-error', 'Recording failed - no output file');
    }
    return;
  }

  const stats = fs.statSync(outputPath);
  if (stats.size === 0) {
    console.error('Recording file is empty');
    if (appWindow) {
      appWindow.webContents.send('recording-error', 'Recording failed - empty file');
    }
    return;
  }

  console.log('Recording file size:', stats.size, 'bytes');
  if (appWindow) {
    appWindow.webContents.send('processing-complete');
  }

  // TODO: Add actual Whisper processing here
  // For now, simulate processing and send a voice command to the main app
  setTimeout(async () => {
    const simulatedTranscription = "Hello, this is a simulated voice command";
    
    // Send voice command to main app
    if (appWindow) {
      appWindow.webContents.send('voice-command', simulatedTranscription);
    }
    
    const response = "I heard you! This is a simulated response. We'll connect this to the actual LLM processing soon.";
    await speakResponse(response);
  }, 1000);

  // Clean up recording file
  try {
    fs.unlinkSync(outputPath);
  } catch (error) {
    console.error('Error cleaning up recording file:', error);
  }
};

const speakResponse = async (text) => {
  if (isSpeaking) return;
  
  try {
    isSpeaking = true;
    if (appWindow) {
      appWindow.webContents.send('speaking-started');
    }
    
    // Use Python pyttsx3 for TTS
    const pythonProcess = spawn('python3', [
      path.join(__dirname, 'lib', 'tts.py'),
      text
    ]);
    
    pythonProcess.stderr.on('data', (data) => {
      console.error(`TTS error: ${data}`);
    });
    
    pythonProcess.on('error', (error) => {
      console.error('TTS error:', error);
      isSpeaking = false;
      if (appWindow) {
        appWindow.webContents.send('speaking-error', error.message);
      }
    });
    
    pythonProcess.on('close', (code) => {
      console.log('TTS completed with code:', code);
      isSpeaking = false;
      if (appWindow) {
        if (code === 0) {
          appWindow.webContents.send('speaking-complete');
        } else {
          appWindow.webContents.send('speaking-error', 'TTS failed');
        }
      }
    });
    
  } catch (error) {
    console.error('Failed to start TTS:', error);
    isSpeaking = false;
    if (appWindow) {
      appWindow.webContents.send('speaking-error', error.message);
    }
  }
};

const handleWakeWord = async () => {
  if (!mainWindow) return;
  
  // Show the avatar window
  const screenWidth = require('electron').screen.getPrimaryDisplay().workAreaSize.width;
  mainWindow.setPosition(screenWidth - 200, 100);
  mainWindow.show();
  mainWindow.webContents.send('wake-word-detected');
  
  // Start recording immediately (no spoken greeting)
  startRecording();
};

const updateTrayMenu = () => {
  if (!tray) return;
  
  const appIsOpen = appWindow && !appWindow.isDestroyed();
  const statusText = appIsOpen 
    ? (isListening ? 'Active (Background)' : 'Inactive (App Open)')
    : (isListening ? 'Active (Listening)' : 'Inactive');
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: `Qlippy Voice Assistant - ${statusText}`,
      enabled: false,
      icon: path.join(__dirname, 'clippy-avatar.png')
    },
    { type: 'separator' },
    {
      label: appIsOpen ? 'Wake word paused (app open)' : 'Listen for "Hey Qlippy"',
      type: 'checkbox',
      checked: isListening,
      enabled: !appIsOpen, // Disable manual control when app is open
      click: (menuItem) => {
        if (menuItem.checked) {
          startVoiceDetection();
        } else {
          stopVoiceDetection();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Open Qlippy',
      click: () => createAppWindow()
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        cleanup();
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
};

const cleanup = () => {
  stopVoiceDetection();
  if (porcupine) {
    porcupine.release();
    porcupine = null;
  }
  if (recorder) {
    recorder.release();
    recorder = null;
  }
};

// App lifecycle
app.on('ready', () => {
  createWindow();
  createTray();
  startVoiceDetection(); // Start listening by default
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    cleanup();
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Cleanup on exit
process.on('SIGINT', () => {
  cleanup();
  app.quit();
});

process.on('SIGTERM', () => {
  cleanup();
  app.quit();
}); 

// Add IPC handlers for manual recording control
ipcMain.on('start-recording', () => {
  startRecording();
});

ipcMain.on('stop-recording', () => {
  stopRecording();
});

ipcMain.on('close-avatar', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
}); 

// Add IPC handlers for TTS control
ipcMain.on('speak-text', (event, text) => {
  speakResponse(text);
});

ipcMain.on('stop-speaking', () => {
  // Kill any running say process
  spawn('killall', ['say']);
  isSpeaking = false;
  if (appWindow) {
    appWindow.webContents.send('speaking-complete');
  }
});

// Add IPC handler for opening the main app
ipcMain.on('open-app', () => {
  createAppWindow();
}); 