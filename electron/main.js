const { app, BrowserWindow, dialog, shell } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Configure logger for auto-updater
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
autoUpdater.autoDownload = false;

// Keep a reference to the main window to forward IPC events
let mainWindow = null;

// Auto-updater event listeners
autoUpdater.on('update-available', (info) => {
  log.info('Actualización disponible:', info);

  const changelogUrl = `https://github.com/MrDfour/Inventario-Boneless/releases/tag/v${info.version}`;

  const showUpdateDialog = async () => {
    let keepShowing = true;
    while (keepShowing) {
      const { response } = await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Actualización disponible',
        message: `Nueva versión disponible: ${info.version}`,
        detail: '¿Desea descargar e instalar la actualización ahora?',
        buttons: ['Actualizar', 'Ver cambios', 'Omitir por ahora'],
        defaultId: 0,
        cancelId: 2,
      });

      if (response === 0) {
        dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: 'Descargando actualización',
          message: 'Descarga iniciada',
          detail: 'La actualización se está descargando en segundo plano. Se le notificará cuando esté lista para instalar.',
          buttons: ['Aceptar'],
        });

        autoUpdater.downloadUpdate().catch((err) => {
          log.error('downloadUpdate() promise rejected:', err);
        });
        keepShowing = false;
      } else if (response === 1) {
        shell.openExternal(changelogUrl);
      } else {
        keepShowing = false;
      }
    }
  };

  showUpdateDialog();
});

autoUpdater.on('update-downloaded', async (info) => {
  log.info('Actualización descargada:', info);

  const { response } = await dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Actualización lista',
    message: `Se descargó la versión ${info.version}. ¿Desea reiniciar la aplicación para aplicar la actualización?`,
    buttons: ['Sí, reiniciar ahora', 'Más tarde'],
    defaultId: 0,
    cancelId: 1,
  });

  if (response === 0) {
    autoUpdater.quitAndInstall();
  }
});

autoUpdater.on('download-progress', (progressObj) => {
  log.info('Progreso de descarga:', progressObj);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('download-progress', progressObj);
  }
});

autoUpdater.on('error', (err) => {
  log.error('Error en el actualizador:', err);
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, 'Inv-Boneless.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    autoHideMenuBar: true,
    title: "Inventario de Boneless"
  });

  // Cargar el archivo index.html compilado por Vite
  mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));

  // Manejar cierres
  mainWindow.on('closed', () => {
    mainWindow = null;
    app.quit();
  });

  // Check for updates once the content finishes loading
  mainWindow.webContents.once('did-finish-load', () => {
    autoUpdater.checkForUpdates().catch((err) => {
      log.error('Error al verificar actualizaciones:', err);
    });
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
