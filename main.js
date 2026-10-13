const { app, BrowserWindow, Menu, ipcMain, Notification, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const { execFile } = require('child_process')
const backend = require('./database/backend.js')

let goalEvaluationInterval = null
let settingsCache = null

function settingsFilePath() {
  return path.join(app.getPath('userData'), 'kaizen-settings.json')
}

function loadAppSettings() {
  if (settingsCache) return settingsCache
  const defaults = { notifications: true, soundEnabled: true, remindersEnabled: false, reminderTime: '20:00', companion: 'kai' }
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
    fs.mkdirSync(app.getPath('userData'), { recursive: true })
    backend.setDBPath(path.join(app.getPath('userData'), 'kaizen.db'))
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
      preload: path.join(__dirname, 'src/preload.js'),
      nodeIntegration: false,
      contextIsolation: true
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
      await runReminderCheck(win).catch(err => console.error('Reminder check error:', err))
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

// In-memory per-date sent keys so reminders never double-fire within a day (e.g. DST fall-back repeats an hour).
const reminderSentKeys = new Set()
let lastReminderTick = null // { day, hm } of the previous check

function reminderHM() {
  const n = new Date()
  return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`
}

async function runReminderCheck(win) {
  const today = backend.getLocalDateString()
  const hm = reminderHM()
  // Fire anything whose time fell in (prev, hm], so setInterval drift skipping a minute can't drop a reminder.
  // First tick backfills nothing; a new day starts from midnight; a clock moved back fires nothing.
  const prev = !lastReminderTick ? hm : lastReminderTick.day !== today ? '' : lastReminderTick.hm
  lastReminderTick = { day: today, hm }
  const isDue = (t) => !!t && prev < t && t <= hm

  const settings = loadAppSettings()
  if (!settings.remindersEnabled) return
  if (!Notification.isSupported()) return

  const open = await backend.getTodayOpenGoals()

  // Daily summary at the user's chosen time.
  const summaryKey = `summary_${today}`
  if (isDue(settings.reminderTime) && !reminderSentKeys.has(summaryKey)) {
    reminderSentKeys.add(summaryKey)
    if (open.length > 0) {
      const names = open.slice(0, 3).map(g => g.title).join(', ') + (open.length > 3 ? ` +${open.length - 3} more` : '')
      new Notification({
        title: '⏰ Kaizen Reminder',
        body: `${open.length} goal(s) still open today: ${names}`
      }).show()
    }
  }

  // Per-goal reminder at each goal's own time window.
  for (const g of open) {
    if (!isDue(g.time)) continue
    const key = `goal_${g.id}_${today}`
    if (reminderSentKeys.has(key)) continue
    reminderSentKeys.add(key)
    new Notification({
      title: `🎯 ${g.title}`,
      body: `Time to check in: ${g.title}`
    }).show()
  }
}

async function setupKaiFirstLaunch(win) {
  const settings = loadAppSettings()
  if (settings.kaiModelReady || settings.kaiModelPrompted) return

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

  // Ask for consent before downloading a ~1.5GB model. Only prompt once.
  saveAppSettings({ kaiModelPrompted: true })

  let choice
  try {
    const { response } = await dialog.showMessageBox(win, {
      type: 'question',
      buttons: ['Download now', 'Skip for now'],
      defaultId: 0,
      cancelId: 1,
      title: 'Kai AI Companion',
      message: 'Download the Kai AI model?',
      detail: 'Kai works completely offline through Ollama, but the model (~1.5GB) must be downloaded once. You can keep using Kaizen while it downloads, or skip this and download later from the Companion page.'
    })
    choice = response
  } catch (err) {
    console.error('Kai setup prompt error:', err)
    return
  }

  if (choice !== 0) return

  execFile(ollamaExe, ['serve'], (err) => {
    if (err) console.log('Ollama serve note:', err.message)
  })

  await new Promise(r => setTimeout(r, 2000))

  if (Notification.isSupported()) {
    new Notification({
      title: '🤖 Setting up Kai...',
      body: 'Downloading AI model (~1.5GB). Kaizen is fully usable while this runs!'
    }).show()
  }

  const pull = execFile(ollamaExe, ['pull', 'llama3.2:latest'])

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
    } else {
      console.log('Ollama pull exited with code', code)
    }
  })
}

// ==================== OLLAMA IPC HANDLERS ====================

ipcMain.handle('check-ollama-installed', () => {
  return new Promise((resolve) => {
    execFile('ollama', ['--version'], (error) => {
      resolve(!error) // true = installed, false = not installed
    })
  })
})

ipcMain.handle('pull-ollama-model', (event, model = 'llama3.2:latest') => {
  return new Promise((resolve, reject) => {
    // Validate model name — it goes straight into an execFile argv, never a shell
    if (typeof model !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:\/-]*$/.test(model)) {
      reject(new Error('Invalid model name'))
      return
    }
    const child = execFile('ollama', ['pull', model])
    child.on('close', (code) => {
      if (code === 0) {
        saveAppSettings({ kaiModelReady: true })
        resolve(true)
      } else {
        reject(new Error(`Pull failed with code ${code}`))
      }
    })
  })
})

/**
 * ==================== IPC HANDLERS ====================
 */

// Contributions
ipcMain.handle('get-contribution-data', () => backend.getContributionData())
ipcMain.handle('get-streak-stats', () => backend.getStreakStats())
ipcMain.handle('get-weekly-summary', () => backend.getWeeklySummary())

// Journal
ipcMain.handle('add-journal-entry', (event, content, mood, time, date, goalId) => backend.addJournalEntry(content, mood, time, date, goalId))
ipcMain.handle('has-journal-for-date', (event, date, goalId) => backend.hasJournalForDate(date, goalId))
ipcMain.handle('get-today-journal', () => backend.getTodayJournal())
ipcMain.handle('get-journal-by-date', (event, date) => backend.getJournalByDate(date))
ipcMain.handle('get-all-journal-entries', (event, limit) => backend.getAllJournalEntries(limit))
ipcMain.handle('search-journal-entries', (event, query, mood, limit) => backend.searchJournalEntries(query, mood, limit))
ipcMain.handle('get-mood-analytics', (event, days) => backend.getMoodAnalytics(days))
ipcMain.handle('get-journal-entries-between', (event, start, end) => backend.getJournalEntriesBetween(start, end))
ipcMain.handle('delete-journal-entry', (event, id) => backend.deleteJournalEntry(id))

// Kai Chat
ipcMain.handle('get-kai-chat-history', (event, limit) => backend.getKaiChatHistory(limit))
ipcMain.handle('add-kai-chat-message', (event, role, content) => backend.addKaiChatMessage(role, content))
ipcMain.handle('clear-kai-chat-history', () => backend.clearKaiChatHistory())

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
ipcMain.handle('restore-goal', (event, id, newTargetDate = null) => backend.restoreGoal(id, newTargetDate))

// Goal Labels
ipcMain.handle('get-all-labels', () => backend.getAllLabels())
ipcMain.handle('add-custom-label', (event, name) => backend.addCustomLabel(name))
ipcMain.handle('delete-label', (event, id) => backend.deleteLabel(id))
ipcMain.handle('get-top-labels', (event, limit = 5) => backend.getTopLabels(limit))

// Goal Tracking Grid
ipcMain.handle('get-goal-tracking-grid', () => backend.getGoalTrackingGrid())
ipcMain.handle('toggle-goal-completion', (event, goalId, date) => backend.toggleGoalCompletion(goalId, date))
ipcMain.handle('toggle-rest-day', (event, goalId, date) => backend.toggleRestDay(goalId, date))
ipcMain.handle('get-today-goal-stats', () => backend.getTodayGoalStats())
ipcMain.handle('get-today-open-goals', () => backend.getTodayOpenGoals())

// Notifications
ipcMain.handle('get-notifications', (event, unreadOnly) => backend.getNotifications(unreadOnly))
ipcMain.handle('mark-notification-read', (event, id) => backend.markNotificationRead(id))
ipcMain.handle('evaluate-goals', () => backend.evaluateGoals())

// Stats
ipcMain.handle('get-dashboard-stats', () => backend.getDashboardStats())
ipcMain.handle('get-badge-stats', () => backend.getBadgeStats())
ipcMain.handle('reset-all-data', () => backend.resetAllData())

// Export / Import (backup & restore)
ipcMain.handle('export-data', async () => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Back up Kaizen data',
    defaultPath: `kaizen-backup-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })
  if (canceled || !filePath) return { canceled: true }
  const result = await backend.exportAllData(filePath)
  return { canceled: false, ...result }
})

ipcMain.handle('import-data', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Restore Kaizen data',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })
  if (canceled || !filePaths || filePaths.length === 0) return { canceled: true }
  await backend.importAllData(filePaths[0])
  return { canceled: false, success: true }
})

ipcMain.handle('get-settings', () => {
  const s = loadAppSettings()
  return {
    notifications: s.notifications,
    soundEnabled: s.soundEnabled,
    remindersEnabled: s.remindersEnabled,
    reminderTime: s.reminderTime,
    companion: s.companion
  }
})
ipcMain.handle('set-settings', (_event, settings) => {
  const patch = {}
  if (typeof settings.notifications === 'boolean') patch.notifications = settings.notifications
  if (typeof settings.soundEnabled === 'boolean') patch.soundEnabled = settings.soundEnabled
  if (typeof settings.remindersEnabled === 'boolean') patch.remindersEnabled = settings.remindersEnabled
  if (typeof settings.reminderTime === 'string') patch.reminderTime = settings.reminderTime
  if (settings.companion === 'kai' || settings.companion === 'zun') patch.companion = settings.companion
  const s = saveAppSettings(patch)
  return {
    notifications: s.notifications,
    soundEnabled: s.soundEnabled,
    remindersEnabled: s.remindersEnabled,
    reminderTime: s.reminderTime,
    companion: s.companion
  }
})