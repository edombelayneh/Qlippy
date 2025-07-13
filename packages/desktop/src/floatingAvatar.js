const { BrowserWindow, screen, ipcMain, app } = require("electron");
const path = require("path");

let floatingAvatarWindow = null;
let avatarTimeout = null;
let isAvatarActive = false;

// Avatar window configuration
const AVATAR_CONFIG = {
  width: 100,
  height: 100,
  frame: false,
  transparent: true,
  alwaysOnTop: true,
  skipTaskbar: true,
  resizable: false,
  movable: false,
  minimizable: false,
  maximizable: false,
  closable: true,
  webPreferences: {
    nodeIntegration: true,
    contextIsolation: false,
    preload: path.join(__dirname, "..", "preload.js")
  }
};

const createFloatingAvatar = () => {
  if (floatingAvatarWindow) {
    return floatingAvatarWindow;
  }

  floatingAvatarWindow = new BrowserWindow(AVATAR_CONFIG);

  // Position in bottom-right corner
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const { width: avatarWidth, height: avatarHeight } = AVATAR_CONFIG;
  
  floatingAvatarWindow.setPosition(
    width - avatarWidth - 20,  // 20px padding from edge
    height - avatarHeight - 20
  );

  // Load avatar HTML
  const avatarPath = path.join(__dirname, "..", "avatar.html");
  floatingAvatarWindow.loadFile(avatarPath);

  // Prevent window from being closed directly
  floatingAvatarWindow.on("close", (event) => {
    if (isAvatarActive) {
      event.preventDefault();
      hideFloatingAvatar();
    }
  });

  floatingAvatarWindow.on("closed", () => {
    floatingAvatarWindow = null;
    isAvatarActive = false;
    clearAvatarTimeout();
  });

  // Initially hide the window
  floatingAvatarWindow.hide();

  return floatingAvatarWindow;
};

const showFloatingAvatar = (greeting = "How may I help?") => {
  if (!floatingAvatarWindow) {
    createFloatingAvatar();
  }

  isAvatarActive = true;
  
  // Show with animation
  floatingAvatarWindow.show();
  floatingAvatarWindow.setOpacity(0);
  
  // Fade in animation
  let opacity = 0;
  const fadeIn = setInterval(() => {
    opacity += 0.1;
    if (opacity >= 1) {
      opacity = 1;
      clearInterval(fadeIn);
    }
    floatingAvatarWindow.setOpacity(opacity);
  }, 30);

  // Send greeting to avatar
  floatingAvatarWindow.webContents.send("avatar-show", { greeting });

  // Don't start timeout here - let avatarController handle it
};

const hideFloatingAvatar = () => {
  if (!floatingAvatarWindow || !isAvatarActive) return;

  isAvatarActive = false;
  clearAvatarTimeout();

  // Fade out animation
  let opacity = 1;
  const fadeOut = setInterval(() => {
    opacity -= 0.1;
    if (opacity <= 0) {
      opacity = 0;
      clearInterval(fadeOut);
      floatingAvatarWindow.hide();
      
      // Emit event when avatar is hidden
      app.emit("avatar-hidden");
    }
    floatingAvatarWindow.setOpacity(opacity);
  }, 30);
};

const resetAvatarTimeout = () => {
  // Reset the 15-second timeout when user activity is detected
  if (isAvatarActive) {
    setAvatarTimeout(15000); // Reset to 15 seconds
  }
};

const setAvatarTimeout = (duration) => {
  clearAvatarTimeout();
  
  // Hide after specified duration
  avatarTimeout = setTimeout(() => {
    hideFloatingAvatar();
  }, duration);
};

const clearAvatarTimeout = () => {
  if (avatarTimeout) {
    clearTimeout(avatarTimeout);
    avatarTimeout = null;
  }
};

const sendToAvatar = (channel, data) => {
  if (floatingAvatarWindow && isAvatarActive) {
    floatingAvatarWindow.webContents.send(channel, data);
  }
};

const getFloatingAvatarWindow = () => floatingAvatarWindow;
const isFloatingAvatarActive = () => isAvatarActive;

module.exports = {
  createFloatingAvatar,
  showFloatingAvatar,
  hideFloatingAvatar,
  sendToAvatar,
  resetAvatarTimeout,
  setAvatarTimeout,
  getFloatingAvatarWindow,
  isFloatingAvatarActive
}; 