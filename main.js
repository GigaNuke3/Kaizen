const { app, BrowserWindow, Menu, ipcMain, Notification } = require('electron')
const path = require('path')
const fs = require('fs')
const { exec } = require('child_process')
const backend = require('./database/backend.js')

let goalEvaluationInterval = null
let settingsCache = null

function settingsFilePath() {
  return path.join(app.getPath('userData'), 'kaizen-settings.json')
}

function loadAppSettings() {
  if (settingsCache) return settingsCache
  const defaults = { notifications: true }
  try {
    const file = settingsFilePath()
    if (fs.existsSync(file)) {
      settingsCache = { ...defaults, ...JSON.parse(fs.readFileSync(file, 'utf8')) }
      return settingsCache
    }
  } catch (err) {
    console.error('Failed to load settings:', err)
  }
  settingsCache = { ...defaults }
  return settingsCache
}

function saveAppSettings(patch) {
  const next = { ...loadAppSettings(), ...patch }
  settingsCache = next
  const file = settingsFilePath()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(next, null, 2), 'utf8')
  return next
}

async function createWindow() {
  if (app.isPackaged) {
    const userDb = path.join(app.getPath('userData'), 'kaizen.db')
    const bundledDb = path.join(__dirname, 'database', 'kaizen.db')
    if (!fs.existsSync(userDb) && fs.existsSync(bundledDb)) {
      fs.mkdirSync(path.dirname(userDb), { recursive: true })
      fs.copyFileSync(bundledDb, userDb)
    }
    backend.setDBPath(userDb)
  }

  // Initialize database
  await backend.getDB()

  // Evaluate goals immediately on startup — catches any goals that failed/completed
  // while the app was closed (overnight, across days, etc.)
  try {
    await backend.evaluateGoals()
    console.log('✅ Startup goal evaluation complete')
  } catch (err) {
    console.error('Startup evaluateGoals error:', err)
  }

  // Remove menu bar completely
  Menu.setApplicationMenu(null)

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Kaizen',
    icon: path.join(__dirname, 'assets/icons/desktop/kaizen_desktop_icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  win.loadFile('index.html')

  // Start Kai setup after window is ready (non-blocking)
  win.webContents.once('did-finish-load', () => {
    setupKaiFirstLaunch(win).catch(err => {
      console.error('Kai setup error:', err)
    })
  })

  if (goalEvaluationInterval) {
    clearInterval(goalEvaluationInterval)
  }

  // Periodic goal evaluation every 60 seconds
  goalEvaluationInterval = setInterval(async () => {
    try {
      const result = await backend.evaluateGoals()
      if (result.failed > 0 || result.completed > 0) {
        if (loadAppSettings().notifications && Notification.isSupported()) {
          new Notification({
            title: 'Kaizen Goals Update',
            body: `${result.completed} goal(s) completed, ${result.failed} goal(s) failed.`
          }).show()
        }
        // Notify frontend to refresh goal-related pages
        const focused = BrowserWindow.getFocusedWindow() || win
        focused?.webContents.send('goals-updated', result)
      }
    } catch (err) {
      console.error('Goal evaluation error:', err)
    }
  }, 60000) // every 60 seconds

  win.on('closed', () => {
    if (BrowserWindow.getAllWindows().length === 0 && goalEvaluationInterval) {
      clearInterval(goalEvaluationInterval)
      goalEvaluationInterval = null
    }
  })
}

// App event listeners
app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length === 0) {
    createWindow()
  }
})

async function setupKaiFirstLaunch(win) {
  const settings = loadAppSettings()
  if (settings.kaiModelReady) return

  // Cross-platform ollama paths
  const isWin = process.platform === 'win32'
  const ollamaPaths = isWin
    ? [
        `${process.env.LOCALAPPDATA}\\Programs\\Ollama\\ollama.exe`,
        `${process.env.LOCALAPPDATA}\\Ollama\\ollama.exe`,
        'ollama'
      ]
    : [
        '/usr/local/bin/ollama',
        '/usr/bin/ollama',
        `${process.env.HOME}/.local/bin/ollama`,
        'ollama'
      ]

  let ollamaExe = null
  for (const p of ollamaPaths) {
    if (p === 'ollama') { ollamaExe = 'ollama'; break }
    if (fs.existsSync(p)) { ollamaExe = p; break }
  }

  if (!ollamaExe) {
    console.log('⚠️ Ollama not found, skipping Kai setup')
    return
  }

  exec(`"${ollamaExe}" serve`, (err) => {
    if (err) console.log('Ollama serve note:', err.message)
  })

  await new Promise(r => setTimeout(r, 2000))

  if (Notification.isSupported()) {
    new Notification({
      title: '🤖 Setting up Kai...',
      body: 'Downloading AI model (~1.5GB). Kaizen is fully usable while this runs!'
    }).show()
  }

  const pull = exec(`"${ollamaExe}" pull llama3.2:latest`)

  pull.on('close', (code) => {
    if (code === 0) {
      saveAppSettings({ kaiModelReady: true })
      if (Notification.isSupported()) {
        new Notification({
          title: '🤖 Kai is ready!',
          body: 'Your AI companion is now active. Write a journal entry to chat!'
        }).show()
      }
      win?.webContents.send('kai-ready')
    }
  })
}

// ==================== OLLAMA IPC HANDLERS ====================

ipcMain.handle('check-ollama-installed', () => {
  return new Promise((resolve) => {
    exec('ollama --version', (error) => {
      resolve(!error) // true = installed, false = not installed
    })
  })
})

ipcMain.handle('pull-ollama-model', (event, model = 'llama3.2:latest') => {
  return new Promise((resolve, reject) => {
    const process = exec(`ollama pull ${model}`)
    process.on('close', (code) => {
      if (code === 0) resolve(true)
      else reject(new Error(`Pull failed with code ${code}`))
    })
  })
})

/**
 * ==================== IPC HANDLERS ====================
 */

// Contributions
ipcMain.handle('get-contribution-data', () => backend.getContributionData())

// Journal
ipcMain.handle('add-journal-entry', (event, content, mood, time, date, goalId) => backend.addJournalEntry(content, mood, time, date, goalId))
ipcMain.handle('has-journal-for-date', (event, date, goalId) => backend.hasJournalForDate(date, goalId))
ipcMain.handle('get-today-journal', () => backend.getTodayJournal())
ipcMain.handle('get-journal-by-date', (event, date) => backend.getJournalByDate(date))
ipcMain.handle('get-all-journal-entries', (event, limit) => backend.getAllJournalEntries(limit))
ipcMain.handle('delete-journal-entry', (event, id) => backend.deleteJournalEntry(id))

// Goals
ipcMain.handle('add-goal', (event, title, description, targetDate, frequency, scheduledDays, startDate, time) => 
  backend.addGoal(title, description, targetDate, frequency, scheduledDays, startDate, time))
ipcMain.handle('update-goal', (event, id, title, description, targetDate, frequency, scheduledDays, startDate, time) => 
  backend.updateGoal(id, title, description, targetDate, frequency, scheduledDays, startDate, time))
ipcMain.handle('get-all-goals', () => backend.getAllGoals())
ipcMain.handle('get-active-goals', () => backend.getActiveGoals())
ipcMain.handle('update-goal-progress', (event, id, progress) => backend.updateGoalProgress(id, progress))
ipcMain.handle('complete-goal', (event, id) => backend.completeGoal(id))
ipcMain.handle('force-complete-goal', (event, id) => backend.forceCompleteGoal(id))
ipcMain.handle('delete-goal', (event, id) => backend.deleteGoal(id))
ipcMain.handle('restore-goal', (event, id) => backend.restoreGoal(id))

// Goal Labels
ipcMain.handle('get-all-labels', () => backend.getAllLabels())
ipcMain.handle('add-custom-label', (event, name) => backend.addCustomLabel(name))
ipcMain.handle('delete-label', (event, id) => backend.deleteLabel(id))
ipcMain.handle('get-top-labels', (event, limit = 5) => backend.getTopLabels(limit))

// Goal Tracking Grid
ipcMain.handle('get-goal-tracking-grid', () => backend.getGoalTrackingGrid())
ipcMain.handle('toggle-goal-completion', (event, goalId, date) => backend.toggleGoalCompletion(goalId, date))
ipcMain.handle('get-today-goal-stats', () => backend.getTodayGoalStats())

// Notifications
ipcMain.handle('get-notifications', (event, unreadOnly) => backend.getNotifications(unreadOnly))
ipcMain.handle('mark-notification-read', (event, id) => backend.markNotificationRead(id))
ipcMain.handle('evaluate-goals', () => backend.evaluateGoals())

// Stats
ipcMain.handle('get-dashboard-stats', () => backend.getDashboardStats())
ipcMain.handle('reset-all-data', () => backend.resetAllData())
ipcMain.handle('get-settings', () => {
  const { notifications } = loadAppSettings()
  return { notifications }
})
ipcMain.handle('set-settings', (_event, settings) => {
  if (settings.notifications !== undefined) {
    saveAppSettings({ notifications: settings.notifications })
  }
  const { notifications } = loadAppSettings()
  return { notifications }
})