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

console.log('🚀 Preload script starting...', {
  contextBridge: !!contextBridge,
  ipcRenderer: !!ipcRenderer,
  window: typeof window,
  process: typeof process
});

const electronAPI = {
  on: (channel, func) => {
    console.log('📡 electron.on called with channel:', channel);
    const validChannels = ['voice-command', 'recording-started', 'recording-stopped', 'processing-complete', 'recording-error'];
    if (validChannels.includes(channel)) {
      if (typeof func !== 'function') {
        console.error('❌ Invalid function provided to electron.on');
        return;
      }
      // Create a wrapper function that can be properly removed later
      const wrapper = (event, ...args) => {
        console.log('📨 IPC message received:', channel, args);
        func(...args);
      };
      ipcRenderer.on(channel, wrapper);
      console.log('✅ Listener added for channel:', channel);
      return wrapper;
    } else {
      console.warn('⚠️ Invalid channel requested:', channel);
    }
  },
  removeListener: (channel, func) => {
    console.log('📡 electron.removeListener called with channel:', channel);
    const validChannels = ['voice-command', 'recording-started', 'recording-stopped', 'processing-complete', 'recording-error'];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeListener(channel, func);
      console.log('✅ Listener removed for channel:', channel);
    }
  },
  send: (channel, data) => {
    console.log('📤 electron.send called with channel:', channel, data);
    const validChannels = ['open-main-app', 'start-recording', 'stop-recording', 'close-avatar', 'voice-command-processed'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
      console.log('✅ Message sent to channel:', channel);
    } else {
      console.warn('⚠️ Invalid send channel:', channel);
    }
  },
  isAvailable: () => true,
  version: '1.0.0'
};

// Expose API to the renderer process
console.log('🔧 Attempting to expose electron API...');
try {
  if (contextBridge && typeof contextBridge.exposeInMainWorld === 'function') {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    console.log('✅ Successfully exposed electron API via contextBridge');
    
    // Verify it was exposed
    contextBridge.exposeInMainWorld('__electronAPITest', () => {
      console.log('🧪 Electron API test function called');
      return true;
    });
  } else {
    throw new Error('contextBridge.exposeInMainWorld not available');
  }
} catch (error) {
  console.error('❌ contextBridge failed:', error);
  console.log('🔄 Attempting direct window assignment fallback...');
  
  // This fallback only works if contextIsolation is false
  try {
    if (typeof window !== 'undefined') {
      window.electron = electronAPI;
      window.__electronAPITest = () => {
        console.log('🧪 Electron API test function called (fallback)');
        return true;
      };
      console.log('✅ Successfully exposed electron API via direct window assignment');
    } else {
      console.error('❌ Window object not available for fallback');
    }
  } catch (fallbackError) {
    console.error('❌ Fallback also failed:', fallbackError);
  }
}

console.log('🏁 Preload script completed');
