/**
 * Frontend API wrapper for IPC calls to backend
 * Usage: window.api.addGoal('Read daily', 'Study', ...)
 */

const { ipcRenderer } = require('electron')

// Shared constants
const PENDING_GOAL_CHECK_KEY = 'kaizen_pending_goal_check'

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
  
  deleteJournalEntry: (id) => 
    ipcRenderer.invoke('delete-journal-entry', id),

  // ==================== GOALS ====================
  addGoal: (title, description = '', targetDate = null, frequency = 'daily', scheduledDays = null, startDate = null, time = null) => 
    ipcRenderer.invoke('add-goal', title, description, targetDate, frequency, scheduledDays, startDate, time),
  
  updateGoal: (id, title, description = '', targetDate = null, frequency = 'daily', scheduledDays = null, startDate = null, time = null) => 
    ipcRenderer.invoke('update-goal', id, title, description, targetDate, frequency, scheduledDays, startDate, time),
  
  getAllGoals: () => 
    ipcRenderer.invoke('get-all-goals'),
  
  getActiveGoals: () => 
    ipcRenderer.invoke('get-active-goals'),
  
  updateGoalProgress: (id, progress) => 
    ipcRenderer.invoke('update-goal-progress', id, progress),
  
  completeGoal: (id) => 
    ipcRenderer.invoke('complete-goal', id),
  
  deleteGoal: (id) => 
    ipcRenderer.invoke('delete-goal', id),
  
  restoreGoal: (id) => 
    ipcRenderer.invoke('restore-goal', id),

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
  
  getTodayGoalStats: () => 
    ipcRenderer.invoke('get-today-goal-stats'),

  // Add inside the api object, under Goals section
  forceCompleteGoal: (id) =>
    ipcRenderer.invoke('force-complete-goal', id),

  // ==================== STATS ====================
  getDashboardStats: () => 
    ipcRenderer.invoke('get-dashboard-stats'),

  resetAllData: () =>
    ipcRenderer.invoke('reset-all-data'),

  getSettings: () =>
    ipcRenderer.invoke('get-settings'),

  setSettings: (settings) =>
    ipcRenderer.invoke('set-settings', settings),

  // ==================== OLLAMA / KAI ====================
  // ✅ Now correctly inside the api object
  checkOllamaInstalled: () =>
    ipcRenderer.invoke('check-ollama-installed'),

  pullOllamaModel: (model = 'llama3.2:latest') =>
    ipcRenderer.invoke('pull-ollama-model', model)
}

// Make it globally accessible
window.api = api
window.ipcRenderer = ipcRenderer