const { app, BrowserWindow, Menu, ipcMain } = require('electron')
const backend = require('./database/backend.js')

async function createWindow() {
  // Initialize database
  await backend.getDB()

  // Remove menu bar completely
  Menu.setApplicationMenu(null)

  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    title: 'Kaizen',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  win.loadFile('index.html')
  // win.webContents.openDevTools()  // Comment out to hide console
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

/**
 * ==================== IPC HANDLERS ====================
 */

// Habits
ipcMain.handle('add-habit', (event, name, description, color) => backend.addHabit(name, description, color))
ipcMain.handle('get-all-habits', () => backend.getAllHabits())
ipcMain.handle('update-habit', (event, id, name, description, color) => backend.updateHabit(id, name, description, color))
ipcMain.handle('delete-habit', (event, id) => backend.deleteHabit(id))

// Daily Checklist
ipcMain.handle('mark-habit-complete', (event, habitId, date) => backend.markHabitComplete(habitId, date))
ipcMain.handle('unmark-habit-complete', (event, habitId, date) => backend.unmarkHabitComplete(habitId, date))
ipcMain.handle('get-today-checklist', () => backend.getTodayChecklist())
ipcMain.handle('get-checklist-by-date', (event, date) => backend.getChecklistByDate(date))

// Streak & Contributions
ipcMain.handle('get-current-streak', (event, habitId) => backend.getCurrentStreak(habitId))
ipcMain.handle('get-contribution-data', (event, year) => backend.getContributionData(year))
ipcMain.handle('get-streak-all-habits', () => backend.getStreakAcrossAllHabits())

// Journal
ipcMain.handle('add-journal-entry', (event, content, mood) => backend.addJournalEntry(content, mood))
ipcMain.handle('get-today-journal', () => backend.getTodayJournal())
ipcMain.handle('get-journal-by-date', (event, date) => backend.getJournalByDate(date))
ipcMain.handle('get-all-journal-entries', (event, limit) => backend.getAllJournalEntries(limit))
ipcMain.handle('delete-journal-entry', (event, id) => backend.deleteJournalEntry(id))

// Goals
ipcMain.handle('add-goal', (event, title, description, targetDate, frequency, scheduledDays, startDate) => backend.addGoal(title, description, targetDate, frequency, scheduledDays, startDate))
ipcMain.handle('update-goal', (event, id, title, description, targetDate, frequency, scheduledDays, startDate) => backend.updateGoal(id, title, description, targetDate, frequency, scheduledDays, startDate))
ipcMain.handle('get-all-goals', () => backend.getAllGoals())
ipcMain.handle('get-active-goals', () => backend.getActiveGoals())
ipcMain.handle('update-goal-progress', (event, id, progress) => backend.updateGoalProgress(id, progress))
ipcMain.handle('complete-goal', (event, id) => backend.completeGoal(id))
ipcMain.handle('delete-goal', (event, id) => backend.deleteGoal(id))

// Goal Labels
ipcMain.handle('get-all-labels', () => backend.getAllLabels())
ipcMain.handle('add-custom-label', (event, name) => backend.addCustomLabel(name))
ipcMain.handle('delete-label', (event, id) => backend.deleteLabel(id))

// Goal Tracking Grid
ipcMain.handle('get-goal-tracking-grid', () => backend.getGoalTrackingGrid())
ipcMain.handle('toggle-goal-completion', (event, goalId, date) => backend.toggleGoalCompletion(goalId, date))
ipcMain.handle('get-today-goal-stats', () => backend.getTodayGoalStats())

// Habit Keywords & Detection
ipcMain.handle('add-habit-keyword', (event, habitId, keyword) => backend.addHabitKeyword(habitId, keyword))
ipcMain.handle('get-habit-keywords', (event, habitId) => backend.getHabitKeywords(habitId))
ipcMain.handle('detect-habits-from-journal', (event, content) => backend.detectHabitsFromJournal(content))
ipcMain.handle('get-habit-stats-from-journal', () => backend.getHabitStatsFromJournal())

// Checkmarks
ipcMain.handle('add-checkmark', (event, title, category, priority, dueDate, description) => 
  backend.addCheckmark(title, category, priority, dueDate, description))
ipcMain.handle('get-all-checkmarks', () => backend.getAllCheckmarks())
ipcMain.handle('get-active-checkmarks', () => backend.getActiveCheckmarks())
ipcMain.handle('get-checkmarks-by-category', (event, category) => backend.getCheckmarksByCategory(category))
ipcMain.handle('complete-checkmark', (event, id) => backend.completeCheckmark(id))
ipcMain.handle('uncomplete-checkmark', (event, id) => backend.uncompleteCheckmark(id))
ipcMain.handle('update-checkmark', (event, id, title, category, priority, dueDate, description) => 
  backend.updateCheckmark(id, title, category, priority, dueDate, description))
ipcMain.handle('delete-checkmark', (event, id) => backend.deleteCheckmark(id))

// Stats
ipcMain.handle('get-dashboard-stats', () => backend.getDashboardStats())
