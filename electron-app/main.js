const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// ─── Paths ────────────────────────────────────────────────────────────────────
const isDev = !app.isPackaged;

const userDataPath = app.getPath('userData');
const dbDir = path.join(userDataPath, 'database');
const dbPath = path.join(dbDir, 'offline_pos.db');
const uploadsPath = path.join(userDataPath, 'uploads');

if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });

// Support both extraResources and inside-app packaging
const backendPath = fs.existsSync(path.join(process.resourcesPath, 'backend'))
  ? path.join(process.resourcesPath, 'backend')
  : path.join(__dirname, 'backend');

const nodeBin = isDev
  ? 'node'  // use system node in dev
  : (fs.existsSync(path.join(process.resourcesPath, 'node', 'node.exe'))
      ? path.join(process.resourcesPath, 'node', 'node.exe')
      : (fs.existsSync(path.join(process.resourcesPath, 'node.exe'))
          ? path.join(process.resourcesPath, 'node.exe')
          : 'node'));

const BACKEND_PORT = 4000;

// ─── State ────────────────────────────────────────────────────────────────────
let mainWindow = null;
let splashWindow = null;
let backendProcess = null;

// ─── Splash Screen ────────────────────────────────────────────────────────────
function createSplash() {
  splashWindow = new BrowserWindow({
    width: 480,
    height: 320,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    center: true,
    resizable: false,
    webPreferences: { nodeIntegration: false }
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
}

// ─── Main Window ──────────────────────────────────────────────────────────────
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'AEVE - Logiciel Point de vente Intelligent',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  mainWindow.on('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Backend serves both API + static frontend at port 4000
  mainWindow.loadURL(`http://localhost:${BACKEND_PORT}`);
}

// ─── Backend Launcher (uses bundled/system node.exe, NOT Electron's Node) ─────
function startBackend() {
  return new Promise((resolve) => {
    const backendIndex = path.join(backendPath, 'index.js');

    if (!fs.existsSync(backendIndex)) {
      console.error('Backend index not found at:', backendIndex);
      resolve();
      return;
    }

    const env = {
      ...process.env,
      NODE_ENV: 'production',
      _DB_OVERRIDE: dbPath,
      UPLOADS_PATH: uploadsPath,
      PORT: String(BACKEND_PORT),
      ELECTRON_APP: '1',
      RESOURCES_PATH: process.resourcesPath
    };

    // spawn uses the SYSTEM or BUNDLED node.exe — native modules work as-is
    backendProcess = spawn(nodeBin, [backendIndex], {
      cwd: backendPath,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });

    backendProcess.stdout.on('data', (data) => {
      const msg = data.toString().trim();
      console.log('[Backend]', msg);
      if (msg.includes('listening') || msg.includes('4000')) {
        resolve();
      }
    });

    backendProcess.stderr.on('data', (data) => {
      console.error('[Backend ERR]', data.toString().trim());
    });

    backendProcess.on('error', (err) => {
      console.error('[Backend spawn error]', err.message);
      resolve(); // don't block app from opening
    });

    backendProcess.on('exit', (code) => {
      console.log('[Backend] exited with code', code);
    });

    // Fallback: open window after 6s even if backend hasn't confirmed
    setTimeout(resolve, 6000);
  });
}

// ─── App Lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  createSplash();
  await startBackend();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('quit', () => {
  if (backendProcess) backendProcess.kill('SIGTERM');
});

ipcMain.handle('get-app-info', () => ({
  version: app.getVersion(),
  dataPath: userDataPath
}));
