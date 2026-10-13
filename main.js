const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, Notification, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { execFile, spawn } = require('child_process')
const backend = require('./database/backend.js')

let goalEvaluationInterval = null
let settingsCache = null
let mainWindow = null
let tray = null
let isQuitting = false
const ICON_PATH = path.join(__dirname, 'assets/icons/desktop/kaizen_desktop_icon.png')

function settingsFilePath() {
  return path.join(app.getPath('userData'), 'kaizen-settings.json')
}

function loadAppSettings() {
  if (settingsCache) return settingsCache
  const defaults = { notifications: true, soundEnabled: true, remindersEnabled: false, reminderTime: '20:00', companion: 'kai', closeToTray: true, launchAtLogin: false, autoBackup: true, weeklyReview: true, theme: 'dark' }
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

  // No menu bar on Windows/Linux. macOS keeps a minimal menu: without it Cmd+C/V/X/A/Q stop working
  Menu.setApplicationMenu(process.platform === 'darwin'
    ? Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'windowMenu' }])
    : null)

  const win = mainWindow = new BrowserWindow({
    show: !startHidden(), // autostart launches straight to the tray
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Kaizen',
    icon: ICON_PATH,
    webPreferences: {
      preload: path.join(__dirname, 'src/preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  win.loadFile('index.html')

  // Close hides to the tray so reminders keep firing; Quit lives in the tray menu
  win.on('close', (e) => {
    if (!isQuitting && loadAppSettings().closeToTray) {
      e.preventDefault()
      win.hide()
    }
  })

  createTray()
  runDailyBackup().catch(err => console.error('Auto-backup error:', err))

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
      await updateTrayMenu().catch(err => console.error('Tray update error:', err))
      await runDailyBackup().catch(err => console.error('Auto-backup error:', err))
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
if (process.platform === 'win32') app.setAppUserModelId('com.kaizen.app') // Windows needs this for notifications

/** Launched by login autostart? (Windows/Linux pass --hidden; macOS reports it via login item settings) */
function startHidden() {
  return process.argv.includes('--hidden') ||
    (process.platform === 'darwin' && app.getLoginItemSettings().wasOpenedAsHidden)
}

// One instance only: launching Kaizen again just shows the running window
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', showMainWindow)
  app.on('ready', createWindow)
}

app.on('before-quit', () => { isQuitting = true })

function showMainWindow() {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

// ==================== TRAY ====================

function createTray() {
  if (tray) return
  const size = process.platform === 'linux' ? 22 : 16 // Windows tray and macOS menu bar use 16px icons
  tray = new Tray(nativeImage.createFromPath(ICON_PATH).resize({ width: size, height: size }))
  tray.setToolTip('Kaizen')
  tray.on('click', showMainWindow)
  updateTrayMenu().catch(err => console.error('Tray update error:', err))
}

/** Tray menu lists what's still open today, so a glance is enough */
async function updateTrayMenu() {
  if (!tray) return
  const [stats, open] = await Promise.all([backend.getTodayGoalStats(), backend.getTodayOpenGoals()])
  const today = stats.scheduled > 0 ? `Today: ${stats.completed}/${stats.scheduled} checked in` : 'Nothing scheduled today'
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Kaizen', click: showMainWindow },
    { type: 'separator' },
    { label: today, enabled: false },
    ...open.slice(0, 5).map(g => ({ label: `○ ${g.title}`, click: showMainWindow })),
    { type: 'separator' },
    { label: 'Quit Kaizen', click: () => { isQuitting = true; app.quit() } }
  ]))
}

// ==================== LAUNCH AT LOGIN ====================

function applyLaunchAtLogin(enabled) {
  if (process.platform !== 'linux') {
    app.setLoginItemSettings({ openAtLogin: enabled, openAsHidden: enabled, args: ['--hidden'] }) // args: Windows, openAsHidden: macOS
    return
  }
  // Linux has no login-item API; use an XDG autostart entry
  const file = path.join(app.getPath('home'), '.config', 'autostart', 'kaizen.desktop')
  if (!enabled) {
    fs.rmSync(file, { force: true })
    return
  }
  const exe = process.env.APPIMAGE || process.execPath
  const flags = process.argv.slice(1).filter(a => a.startsWith('--') && a !== '--hidden').join(' ') // e.g. --ozone-platform=x11
  const cmd = (app.isPackaged ? `"${exe}"` : `"${exe}" "${app.getAppPath()}"`) + (flags ? ' ' + flags : '')
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, `[Desktop Entry]\nType=Application\nName=Kaizen\nExec=${cmd} --hidden\nIcon=${ICON_PATH}\nX-GNOME-Autostart-enabled=true\n`)
}

// ==================== DAILY AUTO-BACKUP ====================

const BACKUPS_TO_KEEP = 7

function backupDir() {
  return path.join(app.getPath('userData'), 'backups')
}

/** One JSON backup per day; keeps the newest BACKUPS_TO_KEEP */
async function runDailyBackup() {
  if (!loadAppSettings().autoBackup) return
  const dir = backupDir()
  const file = path.join(dir, `kaizen-${backend.getLocalDateString()}.json`)
  if (fs.existsSync(file)) return
  fs.mkdirSync(dir, { recursive: true })
  await backend.exportAllData(file)
  const old = fs.readdirSync(dir).filter(f => /^kaizen-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().reverse().slice(BACKUPS_TO_KEEP)
  for (const f of old) fs.rmSync(path.join(dir, f))
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
  else showMainWindow()
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
  if (!Notification.isSupported()) return

  // Sunday weekly review, at the reminder time; clicking opens the review page
  const reviewKey = `review_${today}`
  if (settings.weeklyReview && new Date().getDay() === 0 && isDue(settings.reminderTime) && !reminderSentKeys.has(reviewKey)) {
    reminderSentKeys.add(reviewKey)
    const n = new Notification({ title: '🗓 Your weekly review is ready', body: 'Two minutes to look back and adjust one thing.' })
    n.on('click', () => { showMainWindow(); mainWindow?.webContents.send('open-page', 'review') })
    n.show()
  }

  if (!settings.remindersEnabled) return

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

let ollamaServer = null // the `ollama serve` we started (stopped when Kaizen quits)

// Apps opened from the Dock/Start menu don't get the shell's PATH, so check the usual install locations first
const OLLAMA_PATHS = {
  win32: [
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Ollama', 'ollama.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Ollama', 'ollama.exe'),
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Ollama', 'ollama.exe')
  ],
  darwin: ['/Applications/Ollama.app/Contents/Resources/ollama', '/opt/homebrew/bin/ollama', '/usr/local/bin/ollama'],
  linux: ['/usr/local/bin/ollama', '/usr/bin/ollama', path.join(app.getPath('home'), '.local', 'bin', 'ollama'), '/snap/bin/ollama']
}

function findOllama() {
  return (OLLAMA_PATHS[process.platform] || OLLAMA_PATHS.linux).find(p => fs.existsSync(p)) || 'ollama' // fall back to PATH
}

async function isOllamaServing() {
  try {
    return (await fetch('http://127.0.0.1:11434/api/tags', { signal: AbortSignal.timeout(1500) })).ok
  } catch {
    return false
  }
}

/** `ollama pull` and the chat both need the local server; start it if nothing is listening */
async function ensureOllamaServer(exe = findOllama()) {
  if (await isOllamaServing()) return true
  if (!ollamaServer) {
    ollamaServer = spawn(exe, ['serve'], { stdio: 'ignore' }) // ignore output: execFile would kill it past 1MB of logs
    ollamaServer.on('error', (err) => { console.log('Ollama serve error:', err.message); ollamaServer = null })
    ollamaServer.on('exit', () => { ollamaServer = null })
  }
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500))
    if (await isOllamaServing()) return true
    if (!ollamaServer) return false // failed to start (not installed, crashed)
  }
  return false
}

/** Run `ollama pull`; on failure, reject with Ollama's own last output line */
function pullOllamaModel(exe, model) {
  return new Promise((resolve, reject) => {
    const child = spawn(exe, ['pull', model], { stdio: ['ignore', 'pipe', 'pipe'] })
    let tail = '' // progress output is huge, keep only the end
    const keep = (d) => { tail = (tail + d).slice(-600) }
    child.stdout.on('data', keep)
    child.stderr.on('data', keep)
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) return resolve()
      const lastLine = tail.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '').split(/[\r\n]+/).map(l => l.trim()).filter(Boolean).pop()
      reject(new Error(lastLine || `ollama pull exited with code ${code}`))
    })
  })
}

app.on('will-quit', () => ollamaServer?.kill())

async function setupKaiFirstLaunch(win) {
  const ollamaExe = findOllama()
  // Kai needs the server on every launch, not only the first one
  const serving = await ensureOllamaServer(ollamaExe)

  const settings = loadAppSettings()
  if (settings.kaiModelReady || settings.kaiModelPrompted) return
  if (!serving) {
    console.log('⚠️ Ollama not available, skipping Kai setup')
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

  if (Notification.isSupported()) {
    new Notification({
      title: '🤖 Setting up Kai...',
      body: 'Downloading AI model (~1.5GB). Kaizen is fully usable while this runs!'
    }).show()
  }

  try {
    await pullOllamaModel(ollamaExe, 'llama3.2:latest')
    saveAppSettings({ kaiModelReady: true })
    if (Notification.isSupported()) {
      new Notification({
        title: '🤖 Kai is ready!',
        body: 'Your AI companion is now active. Write a journal entry to chat!'
      }).show()
    }
    win?.webContents.send('kai-ready')
  } catch (err) {
    console.log('Ollama pull failed:', err.message)
  }
}

// ==================== OLLAMA IPC HANDLERS ====================

ipcMain.handle('check-ollama-installed', () => {
  return new Promise((resolve) => {
    execFile(findOllama(), ['--version'], (error) => {
      resolve(!error) // true = installed, false = not installed
    })
  })
})

ipcMain.handle('pull-ollama-model', async (event, model = 'llama3.2:latest') => {
  // Validate model name — it goes straight into a spawn argv, never a shell
  if (typeof model !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:\/-]*$/.test(model)) {
    throw new Error('Invalid model name')
  }
  const exe = findOllama()
  if (!(await ensureOllamaServer(exe))) {
    throw new Error('Could not start the Ollama server. Try running "ollama serve" in a terminal, then retry.')
  }
  await pullOllamaModel(exe, model)
  saveAppSettings({ kaiModelReady: true })
  return true
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

ipcMain.handle('export-journal', async () => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Export journal',
    defaultPath: `kaizen-journal-${backend.getLocalDateString()}.md`,
    filters: [{ name: 'Markdown', extensions: ['md'] }, { name: 'PDF', extensions: ['pdf'] }]
  })
  if (canceled || !filePath) return { canceled: true }
  const rows = await backend.getJournalForExport()
  if (filePath.toLowerCase().endsWith('.pdf')) {
    // Render the HTML in a hidden window and let Chromium print it
    const pdfWin = new BrowserWindow({ show: false, webPreferences: { javascript: false } })
    try {
      await pdfWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(backend.journalToHtml(rows)))
      fs.writeFileSync(filePath, await pdfWin.webContents.printToPDF({ printBackground: true }))
    } finally {
      pdfWin.destroy()
    }
  } else {
    fs.writeFileSync(filePath, backend.journalToMarkdown(rows), 'utf8')
  }
  return { canceled: false, filePath, entries: rows.length }
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
    companion: s.companion,
    closeToTray: s.closeToTray,
    launchAtLogin: s.launchAtLogin,
    autoBackup: s.autoBackup,
    weeklyReview: s.weeklyReview,
    theme: s.theme
  }
})
ipcMain.handle('set-settings', (_event, settings) => {
  const patch = {}
  if (typeof settings.notifications === 'boolean') patch.notifications = settings.notifications
  if (typeof settings.soundEnabled === 'boolean') patch.soundEnabled = settings.soundEnabled
  if (typeof settings.remindersEnabled === 'boolean') patch.remindersEnabled = settings.remindersEnabled
  if (typeof settings.reminderTime === 'string') patch.reminderTime = settings.reminderTime
  if (settings.companion === 'kai' || settings.companion === 'zun') patch.companion = settings.companion
  if (['dark', 'light', 'system'].includes(settings.theme)) patch.theme = settings.theme
  for (const key of ['closeToTray', 'launchAtLogin', 'autoBackup', 'weeklyReview']) {
    if (typeof settings[key] === 'boolean') patch[key] = settings[key]
  }
  if ('launchAtLogin' in patch) applyLaunchAtLogin(patch.launchAtLogin)
  const s = saveAppSettings(patch)
  if (patch.autoBackup) runDailyBackup().catch(err => console.error('Auto-backup error:', err))
  return {
    notifications: s.notifications,
    soundEnabled: s.soundEnabled,
    remindersEnabled: s.remindersEnabled,
    reminderTime: s.reminderTime,
    companion: s.companion,
    closeToTray: s.closeToTray,
    launchAtLogin: s.launchAtLogin,
    autoBackup: s.autoBackup,
    weeklyReview: s.weeklyReview,
    theme: s.theme
  }
})

ipcMain.handle('open-backups-folder', async () => {
  fs.mkdirSync(backupDir(), { recursive: true })
  const err = await shell.openPath(backupDir())
  if (err) throw new Error(err)
  return backupDir()
})
