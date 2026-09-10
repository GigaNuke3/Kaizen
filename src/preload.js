/**
 * Preload script — exposes a safe API to the renderer via contextBridge.
 * The renderer runs with contextIsolation: true and nodeIntegration: false.
 */

const { contextBridge, ipcRenderer } = require('electron')

const api = {
  // ==================== NOTIFICATIONS ====================
  getNotifications: (unreadOnly = false) =>
    ipcRenderer.invoke('get-notifications', unreadOnly),

  markNotificationRead: (id) =>
    ipcRenderer.invoke('mark-notification-read', id),

  evaluateGoals: () =>
    ipcRenderer.invoke('evaluate-goals'),

  // ==================== CONTRIBUTIONS ====================
  getContributionData: () =>
    ipcRenderer.invoke('get-contribution-data'),

  getStreakStats: () =>
    ipcRenderer.invoke('get-streak-stats'),

  getWeeklySummary: () =>
    ipcRenderer.invoke('get-weekly-summary'),

  // ==================== JOURNAL ====================
  addJournalEntry: (content, mood = 'neutral', time = null, date = null, goalId = null) =>
    ipcRenderer.invoke('add-journal-entry', content, mood, time, date, goalId),

  hasJournalForDate: (date, goalId = null) =>
    ipcRenderer.invoke('has-journal-for-date', date, goalId),

  getTodayJournal: () =>
    ipcRenderer.invoke('get-today-journal'),

  getJournalByDate: (date) =>
    ipcRenderer.invoke('get-journal-by-date', date),

  getAllJournalEntries: (limit = 50) =>
    ipcRenderer.invoke('get-all-journal-entries', limit),

  searchJournalEntries: (query = '', mood = null, limit = 200) =>
    ipcRenderer.invoke('search-journal-entries', query, mood, limit),

  getMoodAnalytics: (days = 90) =>
    ipcRenderer.invoke('get-mood-analytics', days),

  getJournalEntriesBetween: (startDate, endDate) =>
    ipcRenderer.invoke('get-journal-entries-between', startDate, endDate),

  deleteJournalEntry: (id) =>
    ipcRenderer.invoke('delete-journal-entry', id),

  // ==================== KAI CHAT ====================
  getKaiChatHistory: (limit = 100) =>
    ipcRenderer.invoke('get-kai-chat-history', limit),

  addKaiChatMessage: (role, content) =>
    ipcRenderer.invoke('add-kai-chat-message', role, content),

  clearKaiChatHistory: () =>
    ipcRenderer.invoke('clear-kai-chat-history'),

  // ==================== GOALS ====================
  addGoal: (title, label = '', targetDate = null, frequency = 'daily', scheduledDays = null, startDate = null, time = null) =>
    ipcRenderer.invoke('add-goal', title, label, targetDate, frequency, scheduledDays, startDate, time),

  updateGoal: (id, title, label = '', targetDate = null, frequency = 'daily', scheduledDays = null, startDate = null, time = null) =>
    ipcRenderer.invoke('update-goal', id, title, label, targetDate, frequency, scheduledDays, startDate, time),

  getAllGoals: () =>
    ipcRenderer.invoke('get-all-goals'),

  getActiveGoals: () =>
    ipcRenderer.invoke('get-active-goals'),

  updateGoalProgress: (id, progress) =>
    ipcRenderer.invoke('update-goal-progress', id, progress),

  completeGoal: (id) =>
    ipcRenderer.invoke('complete-goal', id),

  forceCompleteGoal: (id) =>
    ipcRenderer.invoke('force-complete-goal', id),

  deleteGoal: (id) =>
    ipcRenderer.invoke('delete-goal', id),

  restoreGoal: (id, newTargetDate = null) =>
    ipcRenderer.invoke('restore-goal', id, newTargetDate),

  // ==================== GOAL LABELS ====================
  getAllLabels: () =>
    ipcRenderer.invoke('get-all-labels'),

  addCustomLabel: (name) =>
    ipcRenderer.invoke('add-custom-label', name),

  deleteLabel: (id) =>
    ipcRenderer.invoke('delete-label', id),

  getTopLabels: (limit = 5) =>
    ipcRenderer.invoke('get-top-labels', limit),

  // ==================== GOAL TRACKING GRID ====================
  getGoalTrackingGrid: () =>
    ipcRenderer.invoke('get-goal-tracking-grid'),

  toggleGoalCompletion: (goalId, date) =>
    ipcRenderer.invoke('toggle-goal-completion', goalId, date),

  toggleRestDay: (goalId, date) =>
    ipcRenderer.invoke('toggle-rest-day', goalId, date),

  getTodayGoalStats: () =>
    ipcRenderer.invoke('get-today-goal-stats'),

  getTodayOpenGoals: () =>
    ipcRenderer.invoke('get-today-open-goals'),

  // ==================== STATS ====================
  getDashboardStats: () =>
    ipcRenderer.invoke('get-dashboard-stats'),

  getBadgeStats: () =>
    ipcRenderer.invoke('get-badge-stats'),

  exportData: () =>
    ipcRenderer.invoke('export-data'),

  importData: () =>
    ipcRenderer.invoke('import-data'),

  resetAllData: () =>
    ipcRenderer.invoke('reset-all-data'),

  getSettings: () =>
    ipcRenderer.invoke('get-settings'),

  setSettings: (settings) =>
    ipcRenderer.invoke('set-settings', settings),

  // ==================== OLLAMA / KAI ====================
  checkOllamaInstalled: () =>
    ipcRenderer.invoke('check-ollama-installed'),

  pullOllamaModel: (model = 'llama3.2:latest') =>
    ipcRenderer.invoke('pull-ollama-model', model)
}

contextBridge.exposeInMainWorld('api', api)

// Minimal event subscription for main-process broadcasts
contextBridge.exposeInMainWorld('ipcRenderer', {
  on: (channel, listener) => {
    const wrapped = (_event, ...args) => listener(...args)
    ipcRenderer.on(channel, wrapped)
    return () => ipcRenderer.removeListener(channel, wrapped)
  }
})
