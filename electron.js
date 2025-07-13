const { app, BrowserWindow, screen, ipcMain } = require("electron");
const path = require("path");
const { Porcupine } = require("@picovoice/porcupine-node");
const { PvRecorder } = require("@picovoice/pvrecorder-node");
const { spawn } = require("child_process");
require('dotenv').config();
const fs = require("fs");
const os = require("os");

const accessKey = process.env.PORCUPINE_ACCESS_KEY || "YOUR_ACCESS_KEY_HERE";
console.log('🔑 Loaded access key:', accessKey ? accessKey.substring(0, 2) + '...' : 'undefined');

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
      console.log('⏳ Waiting for backend to be ready...');
      setTimeout(() => waitForBackend().then(resolve).catch(reject), 1000);
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      console.log('⏳ Backend timeout, retrying...');
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
  
  // Check if virtual environment exists
  if (!require('fs').existsSync(pythonPath)) {
    console.error('❌ Virtual environment not found. Please run setup-env.sh first.');
    throw new Error('Virtual environment not found');
  }
  
  // Use run.py instead of app.py for proper startup
  backendProcess = spawn(pythonPath, ['run.py'], {
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
  
  backendProcess.on('error', (err) => {
    console.error('❌ Failed to start backend:', err.message);
    throw err;
  });
  
  // Wait a bit for backend to start
  return new Promise((resolve) => {
    setTimeout(resolve, 3000);
  });
}

function startFrontend() {
  console.log('🚀 Starting Next.js frontend...');
  
  // Check if node_modules exists
  const nodeModulesPath = path.join(__dirname, 'node_modules');
  if (!require('fs').existsSync(nodeModulesPath)) {
    console.error('❌ Node modules not found. Please run npm install first.');
    throw new Error('Node modules not found');
  }
  
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
  
  frontendProcess.on('error', (err) => {
    console.error('❌ Failed to start frontend:', err.message);
    throw err;
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
  console.log('=' * 50);
  
  try {
    // Start backend first
    console.log('📋 Step 1: Starting backend server...');
    await startBackend();
    console.log('✅ Backend started successfully');
    
    // Wait for backend to be ready
    console.log('📋 Step 2: Waiting for backend to be ready...');
    await waitForBackend();
    
    // Start frontend
    console.log('📋 Step 3: Starting frontend server...');
    await startFrontend();
    console.log('✅ Frontend started successfully');
    
    // Create avatar window
    console.log('📋 Step 4: Creating avatar window...');
    createAvatarWindow();
    
    // Check if access key is configured
    if (!accessKey || accessKey === "YOUR_ACCESS_KEY_HERE") {
      console.log("⚠️  Hotword detection disabled - access key not configured");
      console.log("💡 To enable wake word detection:");
      console.log("   1. Get a free access key from https://console.picovoice.ai/");
      console.log("   2. Add it to your .env file: PORCUPINE_ACCESS_KEY=your_key_here");
      console.log("   3. Restart the app");
    } else {
      console.log('📋 Step 5: Starting hotword detection...');
      startHotwordDetection();
    }
    
    console.log("✅ Voice button in chat is still available for voice input");
    console.log("🎉 Qlippy is ready! Open the main app to start chatting.");
    console.log("📍 Frontend: http://localhost:3000");
    console.log("🔗 Backend API: http://localhost:5001/api");
    
  } catch (error) {
    console.error('❌ Error starting services:', error);
    console.log('💡 Troubleshooting tips:');
    console.log('   1. Run ./setup-env.sh to set up the environment');
    console.log('   2. Run npm install to install dependencies');
    console.log('   3. Check that ports 3000 and 5001 are not in use');
    process.exit(1);
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