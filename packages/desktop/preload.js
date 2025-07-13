const { contextBridge, ipcRenderer } = require('electron')

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

const electronAPI = {
  on: (channel, func) => {
    const validChannels = ['voice-command', 'recording-started', 'recording-stopped', 'processing-complete', 'recording-error', 'audio-preferences-updated'];
    if (validChannels.includes(channel)) {
      if (typeof func !== 'function') {
        return;
      }
      // Create a wrapper function that can be properly removed later
      const wrapper = (event, ...args) => {
        func(...args);
      };
      ipcRenderer.on(channel, wrapper);
      return wrapper;
    }
  },
  removeListener: (channel, func) => {
    const validChannels = ['voice-command', 'recording-started', 'recording-stopped', 'processing-complete', 'recording-error', 'audio-preferences-updated'];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeListener(channel, func);
    }
  },
  send: (channel, data) => {
    const validChannels = ['open-main-app', 'start-recording', 'stop-recording', 'close-avatar', 'voice-command-processed', 'get-audio-preferences', 'set-audio-preferences'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  isAvailable: () => true,
  version: '1.0.0'
};

// Expose API to the renderer process
try {
  if (contextBridge && typeof contextBridge.exposeInMainWorld === 'function') {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    
    // Verify it was exposed
    contextBridge.exposeInMainWorld('__electronAPITest', () => {
      return true;
    });
  } else {
    throw new Error('contextBridge.exposeInMainWorld not available');
  }
} catch (error) {
  // This fallback only works if contextIsolation is false
  try {
    if (typeof window !== 'undefined') {
      window.electron = electronAPI;
      window.__electronAPITest = () => {
        return true;
      };
    }
  } catch (fallbackError) {
    // Fallback failed
  }
}
