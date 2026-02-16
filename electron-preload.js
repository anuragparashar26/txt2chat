const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectChatFolder: () => ipcRenderer.invoke('select-chat-folder'),
  readChatFile: (chatPath) => ipcRenderer.invoke('read-chat-file', chatPath),
});
