const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1280,
    minHeight: 800,
    webPreferences: {
      contextIsolation: true,
    },
  });

  // Dev server during development
  win.loadURL("http://localhost:3000");

  // For production build:
  // win.loadFile(path.join(__dirname, "out/index.html"));
}

app.whenReady().then(createWindow);