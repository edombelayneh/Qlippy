const { Tray, Menu } = require("electron");
const path = require("path");
const { nativeImage } = require("electron");

let tray = null;

const createTray = (app, mainAppWindow) => {
  if (tray) return;

  const iconName = "qlippy-avatar.png";
  const iconPath = path.join(
    __dirname,
    "..",
    "..",
    "web",
    "public",
    iconName
  );
  
  try {
    tray = new Tray(nativeImage.createFromPath(iconPath));
  } catch(e) {
    console.error("Failed to create tray icon:", e);
    // Fallback or exit
    return;
  }


  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Open Qlippy",
      click: () => {
        if (mainAppWindow && !mainAppWindow.isDestroyed()) {
          mainAppWindow.show();
        }
      },
    },
    { type: "separator" },
    {
      label: "Qlippy",
      enabled: false,
      icon: nativeImage
        .createFromPath(
          path.join(
            __dirname,
            "..",
            "..",
            "web",
            "public",
            "qlippy-avatar.png"
          )
        )
        .resize({ width: 16, height: 16 }),
    },
    { type: "separator" },
    {
      label: "Restart",
      click: () => {
        app.relaunch();
        app.exit();
      },
    },
    {
      label: "Quit",
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setToolTip("Qlippy - Your AI Assistant");
  tray.setContextMenu(contextMenu);

  tray.on("click", () => {
    if (mainAppWindow && !mainAppWindow.isDestroyed()) {
      mainAppWindow.show();
    }
  });
};

const updateTrayMenu = (
  appWindow,
  isListening,
  startVoiceDetection,
  stopVoiceDetection,
  cleanup,
) => {
  if (!tray) return;

  const appIsOpen = appWindow && !appWindow.isDestroyed();
  const statusText = appIsOpen
    ? isListening
      ? "Active (Background)"
      : "Inactive (App Open)"
    : isListening
    ? "Active (Listening)"
    : "Inactive";

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `Qlippy Voice Assistant - ${statusText}`,
      enabled: false,
    },
    { type: "separator" },
    {
      label: appIsOpen
        ? "Wake word paused (app open)"
        : 'Listen for "Hey Qlippy"',
      type: "checkbox",
      checked: isListening,
      enabled: !appIsOpen,
      click: (menuItem) => {
        if (menuItem.checked) {
          startVoiceDetection();
        } else {
          stopVoiceDetection();
        }
      },
    },
    { type: "separator" },
    {
      label: "Open Qlippy",
      click: () => require("./windowManager").createAppWindow(),
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        cleanup();
        require("electron").app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
};

const destroyTray = () => {
  if (tray && !tray.isDestroyed()) {
    tray.destroy();
  }
  tray = null;
};

module.exports = { createTray, updateTrayMenu, destroyTray }; 