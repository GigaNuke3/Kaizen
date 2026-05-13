/**
 * Frontend API wrapper for IPC calls to backend
 * Usage: window.api.addHabit('Morning Run', 'Get fit')
 */

const { ipcRenderer } = require('electron')

const api = {
  // ==================== HABITS ====================
  addHabit: (name, description = '', color = '#6ee7b7') => 
    ipcRenderer.invoke('add-habit', name, description, color),
  
  getAllHabits: () => 
    ipcRenderer.invoke('get-all-habits'),
  
  updateHabit: (id, name, description = '', color = '#6ee7b7') => 
    ipcRenderer.invoke('update-habit', id, name, description, color),
  
  deleteHabit: (id) => 
    ipcRenderer.invoke('delete-habit', id),

  // ==================== DAILY CHECKLIST ====================
  markHabitComplete: (habitId, date = null) => 
    ipcRenderer.invoke('mark-habit-complete', habitId, date),
  
  unmarkHabitComplete: (habitId, date = null) => 
    ipcRenderer.invoke('unmark-habit-complete', habitId, date),
  
  getTodayChecklist: () => 
    ipcRenderer.invoke('get-today-checklist'),
  
  getChecklistByDate: (date) => 
    ipcRenderer.invoke('get-checklist-by-date', date),

  // ==================== STREAK & CONTRIBUTIONS ====================
  getCurrentStreak: (habitId) => 
    ipcRenderer.invoke('get-current-streak', habitId),
  
  getContributionData: (year = null) => 
    ipcRenderer.invoke('get-contribution-data', year),
  
  getStreakAllHabits: () => 
    ipcRenderer.invoke('get-streak-all-habits'),

  // ==================== JOURNAL ====================
  addJournalEntry: (content, mood = 'neutral') => 
    ipcRenderer.invoke('add-journal-entry', content, mood),
  
  getTodayJournal: () => 
    ipcRenderer.invoke('get-today-journal'),
  
  getJournalByDate: (date) => 
    ipcRenderer.invoke('get-journal-by-date', date),
  
  getAllJournalEntries: (limit = 50) => 
    ipcRenderer.invoke('get-all-journal-entries', limit),
  
  deleteJournalEntry: (id) => 
    ipcRenderer.invoke('delete-journal-entry', id),

  // ==================== GOALS ====================
  addGoal: (title, description = '', targetDate = null) => 
    ipcRenderer.invoke('add-goal', title, description, targetDate),
  
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

  // ==================== GOAL TRACKING GRID ====================
  getGoalTrackingGrid: (daysBack = 365) => 
    ipcRenderer.invoke('get-goal-tracking-grid', daysBack),
  
  toggleGoalCompletion: (goalId, date) => 
    ipcRenderer.invoke('toggle-goal-completion', goalId, date),
  
  getTodayGoalStats: () => 
    ipcRenderer.invoke('get-today-goal-stats'),

  // ==================== HABIT KEYWORDS & DETECTION ====================
  addHabitKeyword: (habitId, keyword) => 
    ipcRenderer.invoke('add-habit-keyword', habitId, keyword),
  
  getHabitKeywords: (habitId) => 
    ipcRenderer.invoke('get-habit-keywords', habitId),
  
  detectHabitsFromJournal: (content) => 
    ipcRenderer.invoke('detect-habits-from-journal', content),
  
  getHabitStatsFromJournal: () => 
    ipcRenderer.invoke('get-habit-stats-from-journal'),

  // ==================== TODOS ====================
  addTodo: (title, category = 'general', priority = 0, dueDate = null, description = '') => 
    ipcRenderer.invoke('add-todo', title, category, priority, dueDate, description),
  
  getAllTodos: () => 
    ipcRenderer.invoke('get-all-todos'),
  
  getActiveTodos: () => 
    ipcRenderer.invoke('get-active-todos'),
  
  getTodosByCategory: (category) => 
    ipcRenderer.invoke('get-todos-by-category', category),
  
  completeTodo: (id) => 
    ipcRenderer.invoke('complete-todo', id),
  
  uncompleteTodo: (id) => 
    ipcRenderer.invoke('uncomplete-todo', id),
  
  updateTodo: (id, title, category = 'general', priority = 0, dueDate = null, description = '') => 
    ipcRenderer.invoke('update-todo', id, title, category, priority, dueDate, description),
  
  deleteTodo: (id) => 
    ipcRenderer.invoke('delete-todo', id),

  // ==================== STATS ====================
  getDashboardStats: () => 
    ipcRenderer.invoke('get-dashboard-stats')
}

// Make it globally accessible
window.api = api
