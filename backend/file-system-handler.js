const fs = require('fs/promises');
const os = require('os');
const path = require('path');

async function searchFilesRecursive(dir, fileName, results = []) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const dirNameLower = entry.name.toLowerCase();
        if (dirNameLower !== 'node_modules' && dirNameLower !== 'venv' && !entry.name.startsWith('.') && dirNameLower !== 'windows' && dirNameLower !== '$recycle.bin' && dirNameLower !== 'system volume information' && dirNameLower !== 'programdata') {
          await searchFilesRecursive(fullPath, fileName, results);
        }
      } else if (entry.name.toLowerCase() === fileName.toLowerCase()) {
        results.push(fullPath);
      }
    }
  } catch (error) {
    // console.error(`Error reading directory ${dir}:`, error);
  }
  return results;
}

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

  ipcMain.handle('fs:searchFiles', async (event, { fileName, dirPath }) => {
    try {
      let finalPath = dirPath;
      const homeDir = os.homedir();

      if (!finalPath) {
        finalPath = homeDir;
      } else if (finalPath.startsWith('~')) {
        finalPath = path.join(homeDir, finalPath.substring(1));
      } else if (!path.isAbsolute(finalPath)) {
        finalPath = path.join(homeDir, finalPath);
      }

      const results = await searchFilesRecursive(finalPath, fileName);
      return { success: true, files: results };
    } catch (error) {
      console.error(`Error searching for file '${fileName}':`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('fs:openApplication', async (event, { appName }) => {
    try {
      if (os.platform() !== 'win32') {
        return { success: false, error: 'openApplication is only supported on Windows.' };
      }

      const executableName = appName.toLowerCase().endsWith('.exe') ? appName : `${appName}.exe`;
      const searchPath = 'C:\\'; // As requested by user.

      const results = await searchFilesRecursive(searchPath, executableName);

      if (results.length === 0) {
        return { success: false, error: `Application '${appName}' not found.` };
      }

      const appPath = results[0]; // Open the first one found.
      const errorMessage = await shell.openPath(appPath);
      
      if (errorMessage) {
        console.error(`Failed to open application '${appPath}': ${errorMessage}`);
        return { success: false, error: errorMessage };
      }
      
      return { success: true, path: appPath };
    } catch (error) {
      console.error(`Error opening application '${appName}':`, error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = {
  registerFileSystemHandlers,
}; 