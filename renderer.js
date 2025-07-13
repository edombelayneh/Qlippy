// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const { ipcRenderer } = require("electron");

/**
 * This is the most robust click handler. It listens on the entire document
 * during the "capture" phase, which intercepts the event as early as possible.
 */
document.addEventListener('click', (event) => {
  // Check if the clicked element (or any of its parents) is the close button.
  // This is the most reliable way to check for a click on an element or its children.
  if (event.target.closest('#close-btn')) {
    ipcRenderer.send("close-avatar");
  } else {
    // For every other click anywhere in the window, open the main app.
    ipcRenderer.send("open-main-app");
  }
}, true); // The `true` sets this listener to run in the capture phase.
