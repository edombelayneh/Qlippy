// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const { ipcRenderer } = require("electron");

const clippy = document.getElementById("clippy");
const statusText = document.getElementById("status-text");

// Handle clicks on Qlippy
clippy.addEventListener('click', () => {
  console.log('Avatar clicked - opening main app');
  ipcRenderer.send('open-main-app');
  
  // Hide the avatar after opening the main app
  setTimeout(() => {
    console.log('Hiding avatar after opening main app');
    clippy.classList.remove('active', 'recording', 'speaking');
    statusText.classList.remove('visible');
    ipcRenderer.send('close-avatar');
  }, 1000); // Wait 1 second for the main app to open
});

// Handle wake word detection
ipcRenderer.on('wake-word-detected', () => {
  console.log('Wake word detected');
  clippy.classList.add('active');
  // No text content - avatar only
  statusText.classList.add('visible');
  
  // Play activation sound
  const audio = new Audio('activate.mp3');
  audio.play().catch(console.error);
});

// Handle speaking states
ipcRenderer.on('speaking-started', () => {
  console.log('Speaking started');
  clippy.classList.add('speaking');
  clippy.classList.remove('recording', 'active');
});

ipcRenderer.on('speaking-complete', () => {
  console.log('Speaking complete');
  clippy.classList.remove('speaking');
  
  // Keep Qlippy visible for a moment after speaking
  setTimeout(() => {
    clippy.classList.remove('active', 'recording', 'speaking');
    statusText.classList.remove('visible');
    
    // Only hide after a brief pause
    setTimeout(() => {
      ipcRenderer.send('close-avatar');
    }, 800);
  }, 500);
});

ipcRenderer.on('speaking-error', (event, error) => {
  console.error('Speaking error:', error);
  clippy.classList.remove('speaking');
  clippy.classList.add('error');
  // No text content - avatar only
  
  setTimeout(() => {
    clippy.classList.remove('error');
    ipcRenderer.send('close-avatar');
  }, 2000);
});

// Handle recording states
ipcRenderer.on('recording-started', () => {
  console.log('Recording started');
  clippy.classList.remove('active', 'speaking');
  clippy.classList.add('recording');
  // No text content - avatar only
  statusText.classList.add('visible');
});

ipcRenderer.on('recording-stopped', () => {
  console.log('Recording stopped');
  clippy.classList.remove('recording');
  // No text content - avatar only
});

ipcRenderer.on('processing-complete', () => {
  console.log('Processing complete');
  // No text content - avatar only
});

ipcRenderer.on('recording-error', (event, error) => {
  console.error('Recording error:', error);
  // No text content - avatar only
  clippy.classList.add('error');
  clippy.classList.remove('recording', 'speaking');
  
  // Reset UI after error
  setTimeout(() => {
    clippy.classList.remove('error', 'active', 'recording', 'speaking');
    statusText.classList.remove('visible');
    ipcRenderer.send('close-avatar');
  }, 3000);
});

// Add keyboard shortcut to stop recording (Escape key)
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    ipcRenderer.send('stop-recording');
  }
});
