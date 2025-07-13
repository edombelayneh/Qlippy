const fs = require('fs/promises');
const os = require('os');
const path = require('path');

function registerFileSystemHandlers(ipcMain) {
  ipcMain.handle('fs:listFiles', async (event, dirPath) => {
    try {
      let finalPath = dirPath;

      if (!finalPath) {
        // If no path is provided, default to the user's home directory.
        finalPath = os.homedir();
      } else if (!path.isAbsolute(finalPath)) {
        // If the provided path is relative, join it with the home directory.
        finalPath = path.join(os.homedir(), finalPath);
      }

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

  // We can add more handlers here for other fs operations
  // ipcMain.handle('fs:readFile', async (event, filePath) => { ... });
  // ipcMain.handle('fs:writeFile', async (event, filePath, content) => { ... });
}

module.exports = {
  registerFileSystemHandlers,
}; 