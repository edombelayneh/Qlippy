const fs = require('fs/promises');
const os = require('os');
const path = require('path');

function registerFileSystemHandlers(ipcMain, shell) {
  ipcMain.handle('fs:listFiles', async (event, dirPath) => {
    try {
      let finalPath = dirPath;
      const homeDir = os.homedir();

      if (!finalPath) {
        // Case 1: No path is provided. Default to home directory.
        finalPath = homeDir;
      } else if (finalPath.startsWith('~')) {
        // Case 2: Path starts with a tilde. Expand it.
        finalPath = path.join(homeDir, finalPath.substring(1));
      } else if (!path.isAbsolute(finalPath)) {
        // Case 3: Path is relative. Join it with the home directory.
        finalPath = path.join(homeDir, finalPath);
      }
      // Case 4: Path is absolute. Use it as is.

      const files = await fs.readdir(finalPath, { withFileTypes: true });
      const filesList = files.map(file => ({
        name: file.name,
        isDirectory: file.isDirectory(),
      }));
      return { success: true, files: filesList };
    } catch (error) {
      console.error(`Error listing files in '${dirPath}':`, error);
      return { success: false, error: error.message };
    }
  });

  // Handler for opening a file with the default application
  ipcMain.handle('fs:openFile', async (event, filePath) => {
    try {
      const homeDir = os.homedir();
      let finalPath = filePath;

      if (!finalPath) {
        throw new Error('No file path provided');
      } else if (finalPath.startsWith('~')) {
        finalPath = path.join(homeDir, finalPath.substring(1));
      } else if (!path.isAbsolute(finalPath)) {
        finalPath = path.join(homeDir, finalPath);
      }
      
      // Open the file using the system's shell
      const errorMessage = await shell.openPath(finalPath);
      
      if (errorMessage) {
        console.error(`Failed to open file '${finalPath}': ${errorMessage}`);
        return { success: false, error: errorMessage };
      }
      
      return { success: true };
    } catch (error) {
      console.error(`Error opening file '${filePath}':`, error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = {
  registerFileSystemHandlers,
}; 