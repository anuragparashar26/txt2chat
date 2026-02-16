const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'electron-preload.js'),
      contextIsolation: true,
    },
    icon: path.join(__dirname, 'build', 'icon.png'),
  });

  mainWindow.loadFile(path.join('build', 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('select-chat-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Chat Folder',
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const folderPath = result.filePaths[0];
  // Check for chat.txt
  const chatPath = path.join(folderPath, 'chat.txt');
  if (!fs.existsSync(chatPath)) return { error: 'chat.txt not found in selected folder.' };
  // List media files
  const mediaDir = path.join(folderPath, 'media');
  let mediaFiles = [];
  if (fs.existsSync(mediaDir)) {
    mediaFiles = fs.readdirSync(mediaDir).map(f => path.join('media', f));
  }
  return { folderPath, chatPath, mediaFiles };
});

ipcMain.handle('read-chat-file', async (event, chatPath) => {
  try {
    const text = fs.readFileSync(chatPath, 'utf-8');
    return { success: true, text };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
