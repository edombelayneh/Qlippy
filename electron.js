const { app, BrowserWindow, screen, ipcMain, shell } = require("electron");
const path = require("path");
const { registerFileSystemHandlers } = require('./backend/file-system-handler.js')

// const { Porcupine } = require("@picovoice/porcupine-node");
// const { PvRecorder } = require("@picovoice/pvrecorder-node");

// const accessKey = "eDGFUBlFfqwPu09E2Umkne947P+RobsTREdrWjsERC61iYgk16vy7w==";

let mainWindow;
let avatarWindow;

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

function createAvatarWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  avatarWindow = new BrowserWindow({
    width: 200,
    height: 250,
    x: width - 210,
    y: height - 260,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    show: false,
    resizable: false,
    focusable: true, // Ensure the window can receive focus
    titleBarStyle: 'hidden', // This is the key setting for frameless windows
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

// function startHotwordDetection() {
//   try {
//     const keywordPaths = [path.join(__dirname, "Hey-Qlippy.ppn")];
//     const sensitivities = [0.5];
//     const porcupine = new Porcupine(accessKey, keywordPaths, sensitivities);
//     const frameLength = porcupine.frameLength;
//     const recorder = new PvRecorder(frameLength, -1);
//     recorder.start();

//     console.log(`Using device: ${recorder.getSelectedDevice()}`);
//     console.log('Listening for "Hey Qlippy"...');

//     setInterval(async () => {
//       const pcm = await recorder.read();
//       const keywordIndex = porcupine.process(pcm);
//       if (keywordIndex !== -1) {
//         console.log('"Hey Qlippy" detected!');
//         if (avatarWindow) {
//           avatarWindow.show();
//           avatarWindow.focus();
//         }
//       }
//     }, 10);
//   } catch (err) {
//     console.error("Error initializing Picovoice:", err);
//   }
// }

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
    createAvatarWindow();
    // For testing, show the avatar window immediately since hotword is disabled.
    if (avatarWindow) {
      avatarWindow.show();
      avatarWindow.focus(); // Force focus after showing
    }
    // startHotwordDetection();
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

ipcMain.on("open-main-app", () => {
  if (!mainWindow) {
    createMainWindow();
  }
  if (avatarWindow) {
    avatarWindow.close();
  }
});

ipcMain.on("close-avatar", () => {
  if (avatarWindow) {
    avatarWindow.close();
  }
});
