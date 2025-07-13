const { BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow = null;
let appWindow = null;

const createAppWindow = (startVoiceDetection, stopVoiceDetection, updateTrayMenu) => {
  if (appWindow) {
    appWindow.show();
    appWindow.focus();
    if (stopVoiceDetection) {
      stopVoiceDetection();
    }
    return;
  }

  const preloadPath = path.resolve(__dirname, "..", "preload.js");

  appWindow = new BrowserWindow({
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

  appWindow.on("focus", () => {
    if (stopVoiceDetection) {
      stopVoiceDetection();
    }
    if (updateTrayMenu) {
      updateTrayMenu();
    }
  });

  appWindow.on("blur", () => {
    if (startVoiceDetection) {
      startVoiceDetection();
    }
  });

  appWindow.on("minimize", () => {
    if (startVoiceDetection) {
      startVoiceDetection();
    }
  });

  appWindow.on("restore", () => {
    if (stopVoiceDetection) {
      stopVoiceDetection();
    }
    if (updateTrayMenu) {
      updateTrayMenu();
    }
  });

  appWindow
    .loadURL("http://localhost:3000")
    .then(() => {
      appWindow.show();
      stopVoiceDetection();
    })
    .catch(() => {
      appWindow
        .loadFile(path.join(__dirname, "..", ".next", "server", "app", "index.html"))
        .then(() => {
          appWindow.show();
        })
        .catch(() => {
          appWindow
            .loadFile(path.join(__dirname, "..", "index.html"))
            .then(() => {
              appWindow.show();
            })
            .catch(() => {});
        });
    });

  appWindow.on("closed", () => {
    appWindow = null;
    if (startVoiceDetection) {
      startVoiceDetection();
    }
  });

  return appWindow;
};

const createMainWindow = () => {
  if (mainWindow) return;

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "..", "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(
      __dirname,
      "..",
      "web",
      "public",
      "qlippy-avatar.png"
    ),
  });

  mainWindow.loadURL("http://localhost:3000");

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
};

const closeAllsWindows = () => {
  if (mainWindow) {
    mainWindow.close();
    mainWindow = null;
  }
  if (appWindow) {
    appWindow.close();
    appWindow = null;
  }
};

module.exports = {
  createAppWindow,
  createMainWindow,
  getMainWindow: () => mainWindow,
  getAppWindow: () => appWindow,
  closeAllsWindows,
}; 