const { app, BrowserWindow, screen, ipcMain } = require("electron");
const path = require("path");
const { Porcupine } = require("@picovoice/porcupine-node");
const { PvRecorder } = require("@picovoice/pvrecorder-node");

const accessKey = "eDGFUBlFfqwPu09E2Umkne947P+RobsTREdrWjsERC61iYgk16vy7w==";

let mainWindow;
let avatarWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1280,
    minHeight: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    },
  });

  // Dev server during development
  mainWindow.loadURL("http://localhost:3000");

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createAvatarWindow() {
  const { width } = screen.getPrimaryDisplay().workAreaSize;
  
  avatarWindow = new BrowserWindow({
    width: 150,
    height: 150,
    x: width - 200,
    y: 100,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    },
  });

  avatarWindow.loadFile("index.html");
}

app.whenReady().then(createAvatarWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createAvatarWindow();
  }
});

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
        if (mainWindow) {
          mainWindow.webContents.send('voice-command', 'Hey Qlippy detected!');
        }
        if (avatarWindow) {
          avatarWindow.show();
          avatarWindow.focus();
        }
      }
    }, 10);
  } catch (err) {
    console.error("Error initializing Picovoice:", err);
    if (mainWindow) {
      mainWindow.webContents.send('recording-error', err.message);
    }
  }
}

ipcMain.on("open-main-app", () => {
  if (!mainWindow) {
    createMainWindow();
  }
  if (avatarWindow) {
    avatarWindow.close();
  }
});

startHotwordDetection();