const { app, BrowserWindow, Menu } = require('electron')

async function createWindow() {
  await initDB()

  // Remove menu bar completely
  Menu.setApplicationMenu(null)

  const win = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'Kaizen',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  win.loadFile('index.html')
}