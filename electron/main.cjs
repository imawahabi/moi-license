const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Load the local React app
  // Load the local React app or the built version
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173'); // Development URL
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html')); // Production path
  }

  // Open the DevTools.
  // win.webContents.openDevTools();
}

const { exec } = require('child_process');

app.whenReady().then(() => {
  // Start the backend server
  const backendProcess = exec('npm run dev:backend', { cwd: path.join(__dirname, '..') });

  backendProcess.stdout.on('data', (data) => {
    console.log(`Backend stdout: ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`Backend stderr: ${data}`);
  });

  backendProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
  });

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