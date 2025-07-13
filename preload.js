const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  fs: {
    listFiles: (path) => ipcRenderer.invoke('fs:listFiles', path),
    openFile: (path) => ipcRenderer.invoke('fs:openFile', path),
  },
  send: (channel, data) => {
    // Whitelist channels to prevent exposing all of ipcRenderer
    const validChannels = ['open-main-app', 'close-avatar', 'open-main-from-companion', 'close-companion-window'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  // You can add a receiver here if you need to listen for events from the main process
  // on: (channel, func) => {
  //   const validChannels = [];
  //   if (validChannels.includes(channel)) {
  //     // Deliberately strip event as it includes `sender`
  //     ipcRenderer.on(channel, (event, ...args) => func(...args));
  //   }
  // }
});


// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
window.addEventListener("DOMContentLoaded", () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  for (const type of ["chrome", "node", "electron"]) {
    replaceText(`${type}-version`, process.versions[type]);
  }
});
