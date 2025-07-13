// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

const qlippy = document.getElementById("qlippy");
const statusText = document.getElementById("status-text");

// Default state, show activation message
qlippy.addEventListener('click', () => {
    window.electron.send('open-main-app');
});

// --- State Management ---
function resetState() {
    qlippy.classList.remove('active', 'recording', 'speaking', 'error');
    statusText.textContent = "Hey! How can I help?";
    statusText.className = 'status-text';
}

function setActive() {
    resetState();
    qlippy.classList.add('active');
    statusText.textContent = "Listening...";
    statusText.className = 'status-text active';
}

function setRecording() {
    resetState();
    qlippy.classList.add('recording');
    statusText.textContent = "Recording...";
    statusText.className = 'status-text recording';
}

function setSpeaking() {
    resetState();
    qlippy.classList.add('speaking');
    statusText.textContent = "Speaking...";
    statusText.className = 'status-text speaking';
}

function setError() {
    resetState();
    qlippy.classList.add('error');
    statusText.textContent = "Error!";
    statusText.className = 'status-text error';
    setTimeout(resetState, 2000); // Reset after 2s
}

// --- IPC Event Handlers ---
if (window.electron) {
    window.electron.on('voice-command', (command) => {
        if (command === 'activate') {
            setActive();
        }
    });

    window.electron.on('recording-started', () => {
        setRecording();
    });

    window.electron.on('recording-stopped', () => {
        resetState();
    });

    window.electron.on('processing-complete', ({ success }) => {
        if (success) {
            setSpeaking();
        } else {
            setError();
        }
    });

    window.electron.on('recording-error', (error) => {
        console.error('Recording Error:', error);
        setError();
    });
} else {
    console.error("Electron API not found! Is preload.js configured correctly?");
}

// Set initial state
resetState();
