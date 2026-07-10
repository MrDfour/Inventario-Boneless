const { contextBridge, ipcRenderer } = require('electron');

// Script de Precarga para Electron
window.addEventListener('DOMContentLoaded', () => {
  // Aquí se pueden exponer APIs seguras a través de contextBridge si fuera necesario
});

contextBridge.exposeInMainWorld('electronAPI', {
  onDownloadProgress: (callback) => {
    const handler = (_event, progress) => callback(progress);
    ipcRenderer.on('download-progress', handler);
    return () => ipcRenderer.removeListener('download-progress', handler);
  }
});
