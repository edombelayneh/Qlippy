// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const { ipcRenderer } = require("electron");

const clippy = document.getElementById("clippy");
const statusText = document.getElementById("status-text");

// Handle recording states
ipcRenderer.on('recording-started', () => {
  console.log('Recording started');
  clippy.classList.add('recording');
  statusText.textContent = 'Listening...';
  statusText.classList.add('visible');
});

ipcRenderer.on('recording-stopped', () => {
  console.log('Recording stopped');
  clippy.classList.remove('recording');
  clippy.classList.add('processing');
  statusText.textContent = 'Processing...';
});

// Handle when processing is complete
ipcRenderer.on('processing-complete', () => {
  clippy.classList.remove('processing');
  statusText.classList.remove('visible');
  
  // Hide the avatar window after a short delay
  setTimeout(() => {
    ipcRenderer.send('close-avatar');
  }, 1000);
});

// Handle errors
ipcRenderer.on('recording-error', (event, error) => {
  console.error('Recording error:', error);
  clippy.classList.remove('recording', 'processing');
  statusText.textContent = 'Error';
  statusText.classList.add('visible');
  
  setTimeout(() => {
    statusText.classList.remove('visible');
  }, 2000);
});

// Click handler to open main app
clippy.addEventListener("click", () => {
  ipcRenderer.send("open-main-app");
});

// Add keyboard shortcut to stop recording (Escape key)
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    ipcRenderer.send('stop-recording');
  }
});
