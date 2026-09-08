import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { fork } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let backendProcess = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function startBackend() {
  const serverPath = path.join(__dirname, '../Backend/server.js');
  console.log(`🚀 [Electron] Starting local offline Express backend from: ${serverPath}`);

  backendProcess = fork(serverPath, [], {
    env: { ...process.env, PORT: '3000', NODE_ENV: isDev ? 'development' : 'production' },
    silent: false,
  });

  backendProcess.on('message', (msg) => {
    console.log('[Backend msg]:', msg);
  });

  backendProcess.on('exit', (code) => {
    console.log(`[Backend] Process exited with code ${code}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 720,
    title: 'Child Forensic Trauma Scanner (PFT-Sim)',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#0A0F1D',
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // In production, serve index.html directly from built Frontend/dist
    mainWindow.loadFile(path.join(__dirname, '../Frontend/dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startBackend();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    console.log('🛑 [Electron] Terminating local backend process...');
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
