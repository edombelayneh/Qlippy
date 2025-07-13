const { spawn } = require('child_process');

// Determine the correct command for npm on the current OS
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

// --- Start the Next.js Dev Server ---
const next = spawn(npmCmd, ['run', 'next:dev'], {
  stdio: 'inherit', // Pipe output to the parent terminal
  shell: true,      // Run command in a shell, fixes EINVAL error on Windows
});

next.on('error', (err) => {
  console.error('Failed to start Next.js dev server:', err);
  process.exit(1);
});

console.log('Starting Next.js dev server...');

// --- Start Electron ---
// We'll wait a bit for the Next.js server to start up before launching Electron.
// This is a simpler alternative to `wait-on` since we control both processes.
setTimeout(() => {
  const electronPath = process.platform === 'win32' 
    ? '.\\node_modules\\.bin\\electron.cmd' 
    : './node_modules/.bin/electron';
    
  const electron = spawn(electronPath, ['.'], {
    stdio: 'inherit', // Pipe output to the parent terminal
    shell: true,      // Also use shell for Electron for consistency
  });

  electron.on('error', (err) => {
    console.error('Failed to start Electron:', err);
    process.exit(1);
  });

  electron.on('close', (code) => {
    console.log(`Electron process exited with code ${code}`);
    // Optional: exit the main script when Electron closes
    process.exit(code);
  });

  console.log('Starting Electron...');

}, 5000); // 5-second delay, adjust if needed

// Handle closing the launcher script itself
process.on('SIGINT', () => {
  console.log('Stopping processes...');
  next.kill();
  process.exit();
}); 