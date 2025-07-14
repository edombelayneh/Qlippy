const { app, BrowserWindow, screen, ipcMain, shell } = require("electron");
const path = require("path");
const { registerFileSystemHandlers } = require('./backend/file-system-handler.js')

const { Porcupine } = require("@picovoice/porcupine-node");
const { PvRecorder } = require("@picovoice/pvrecorder-node");

const accessKey = "bfcJpM8gWrVEuzU6We6fuKEeElkasMAoni2knfCRbCssZTo8ZhqO7w==";

let mainWindow;
let companionWindow;

function createMainWindow() {
  if (mainWindow) {
    mainWindow.focus();
    return;
  }
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1280,
    minHeight: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });

  const loadUrlWithRetries = () => {
    mainWindow.loadURL("http://localhost:3000").catch(() => {
      console.log("Failed to load URL, retrying in 1 second...");
      setTimeout(loadUrlWithRetries, 1000);
    });
  };

  loadUrlWithRetries();

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createCompanionWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  companionWindow = new BrowserWindow({
    width: 384, // 96 * 4
    height: 640, // More height for a chat UI
    x: width - 400,
    y: height - 680,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    show: false,
    resizable: false,
    focusable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      // contextIsolation should be true for security, and we can use the preload script
      contextIsolation: true, 
    },
  });

  companionWindow.loadURL("http://localhost:3000/companion");

  companionWindow.on("closed", () => {
    companionWindow = null;
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
        if (companionWindow) {
          companionWindow.show();
          companionWindow.focus();
        }
      }
    }, 10);
  } catch (err) {
    console.error("Error initializing Picovoice:", err);
  }
}

// Ensure only one instance of the app can run
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createCompanionWindow();
    // For testing, show the companion window immediately
    if (companionWindow) {
      companionWindow.show();
      companionWindow.focus();
    }
    startHotwordDetection();
    registerFileSystemHandlers(ipcMain, shell);
  });
}

// Quit when all windows are closed, except on macOS.
app.on("window-all-closed", () => {
  if (process.platform !== 'darwin') {
    // On Windows, do not quit when the window is closed.
    // The app will continue running in the tray.
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

ipcMain.on("open-main-from-companion", () => {
  if (!mainWindow) {
    createMainWindow();
  }
  if (companionWindow) {
    companionWindow.close();
  }
});

ipcMain.on("close-companion-window", () => {
  if (companionWindow) {
    companionWindow.close();
  }
});

ipcMain.on("open-main-app", () => {
  if (!mainWindow) {
    createMainWindow();
  }
  if (companionWindow) {
    companionWindow.close();
  }
});

ipcMain.on("close-avatar", () => {
  if (companionWindow) {
    companionWindow.close();
  }
});
