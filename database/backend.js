const initSqlJs = require('sql.js')
const path = require('path')
const fs = require('fs')

const DB_PATH = path.join(__dirname, 'kaizen.db')
let db = null

/**
 * Initialize and return the database instance
 */
async function getDB() {
  if (db) return db

  const SQL = await initSqlJs()
  
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  // Create tables if they don't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (date('now')),
      color TEXT DEFAULT '#6ee7b7'
    );

    CREATE TABLE IF NOT EXISTS journal (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      date TEXT DEFAULT (date('now')),
      mood TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      target_date TEXT,
      completed INTEGER DEFAULT 0,
      progress INTEGER DEFAULT 0,
      frequency TEXT DEFAULT 'daily',
      scheduled_days TEXT,
      created_at TEXT DEFAULT (date('now')),
      color TEXT DEFAULT '#6ee7b7',
      icon TEXT DEFAULT '🎯'
    );

    CREATE TABLE IF NOT EXISTS goal_completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      is_completed INTEGER DEFAULT 0,
      UNIQUE(goal_id, date),
      FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS checkmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      completed INTEGER DEFAULT 0,
      priority INTEGER DEFAULT 0,
      due_date TEXT,
      created_at TEXT DEFAULT (date('now'))
    );

    CREATE TABLE IF NOT EXISTS daily_checklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER NOT NULL,
      date TEXT DEFAULT (date('now')),
      completed INTEGER DEFAULT 0,
      UNIQUE(habit_id, date),
      FOREIGN KEY(habit_id) REFERENCES habits(id)
    );

    CREATE TABLE IF NOT EXISTS habit_keywords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER NOT NULL,
      keyword TEXT NOT NULL,
      UNIQUE(habit_id, keyword),
      FOREIGN KEY(habit_id) REFERENCES habits(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      email TEXT,
      created_at TEXT DEFAULT (date('now')),
      last_login TEXT
    );

    CREATE TABLE IF NOT EXISTS goal_labels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      is_custom INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (date('now'))
    );
  `)

  saveDB()
  console.log('✅ Database initialized')
  return db
}

/**
 * Save database to disk
 */
function saveDB() {
  if (!db) return
  const data = db.export()
  fs.writeFileSync(DB_PATH, Buffer.from(data))
}

/**
 * ==================== HABITS ====================
 */

async function addHabit(name, description = '', color = '#6ee7b7') {
  const database = await getDB()
  database.run('INSERT INTO habits (name, description, color) VALUES (?, ?, ?)', [name, description, color])
  saveDB()
  return getAllHabits()
}

async function getAllHabits() {
  const database = await getDB()
  const result = database.exec('SELECT * FROM habits ORDER BY created_at DESC')
  return result.length > 0 ? result[0].values : []
}

async function getHabitById(id) {
  const database = await getDB()
  const result = database.exec('SELECT * FROM habits WHERE id = ?', [id])
  return result.length > 0 && result[0].values.length > 0 ? result[0].values[0] : null
}

async function updateHabit(id, name, description = '', color = '#6ee7b7') {
  const database = await getDB()
  database.run('UPDATE habits SET name = ?, description = ?, color = ? WHERE id = ?', [name, description, color, id])
  saveDB()
  return getAllHabits()
}

async function deleteHabit(id) {
  const database = await getDB()
  database.run('DELETE FROM daily_checklist WHERE habit_id = ?', [id])
  database.run('DELETE FROM habits WHERE id = ?', [id])
  saveDB()
  return getAllHabits()
}

/**
 * ==================== DAILY CHECKLIST ====================
 */

async function markHabitComplete(habitId, date = null) {
  const database = await getDB()
  const targetDate = date || new Date().toISOString().split('T')[0]
  
  try {
    database.run('INSERT OR REPLACE INTO daily_checklist (habit_id, date, completed) VALUES (?, ?, 1)', [habitId, targetDate])
  } catch (e) {
    database.run('UPDATE daily_checklist SET completed = 1 WHERE habit_id = ? AND date = ?', [habitId, targetDate])
  }
  
  saveDB()
  return getTodayChecklist()
}

async function unmarkHabitComplete(habitId, date = null) {
  const database = await getDB()
  const targetDate = date || new Date().toISOString().split('T')[0]
  database.run('UPDATE daily_checklist SET completed = 0 WHERE habit_id = ? AND date = ?', [habitId, targetDate])
  saveDB()
  return getTodayChecklist()
}

async function getTodayChecklist() {
  const database = await getDB()
  const today = new Date().toISOString().split('T')[0]
  
  try {
    const result = database.exec(`
      SELECT 
        h.id,
        h.name,
        h.description,
        h.color,
        COALESCE(dc.completed, 0) as completed
      FROM habits h
      LEFT JOIN daily_checklist dc ON h.id = dc.habit_id AND dc.date = ?
      ORDER BY h.created_at DESC
    `, [today])
    
    return result.length > 0 ? result[0].values : []
  } catch (e) {
    console.error('getTodayChecklist error:', e)
    return []
  }
}

async function getChecklistByDate(date) {
  const database = await getDB()
  
  try {
    const result = database.exec(`
      SELECT 
        h.id,
        h.name,
        h.description,
        h.color,
        COALESCE(dc.completed, 0) as completed
      FROM habits h
      LEFT JOIN daily_checklist dc ON h.id = dc.habit_id AND dc.date = ?
      ORDER BY h.created_at DESC
    `, [date])
    
    return result.length > 0 ? result[0].values : []
  } catch (e) {
    console.error('getChecklistByDate error:', e)
    return []
  }
}

/**
 * ==================== STREAK & CONTRIBUTIONS ====================
 */

async function getCurrentStreak(habitId) {
  const database = await getDB()
  
  const result = database.exec(`
    SELECT COUNT(*) as streak
    FROM daily_checklist
    WHERE habit_id = ?
    AND completed = 1
    AND date >= date('now', '-' || (
      SELECT COUNT(*)
      FROM daily_checklist dc2
      WHERE dc2.habit_id = ?
      AND dc2.completed = 0
      AND dc2.date < (SELECT MAX(date) FROM daily_checklist WHERE habit_id = ? AND completed = 1)
    ) || ' days')
  `, [habitId, habitId, habitId])
  
  return result.length > 0 ? result[0].values[0][0] : 0
}

async function getContributionData(year = null) {
  const database = await getDB()
  const targetYear = year || new Date().getFullYear()
  
  const result = database.exec(`
    SELECT 
      date,
      COUNT(*) as count
    FROM daily_checklist
    WHERE completed = 1
    AND strftime('%Y', date) = ?
    GROUP BY date
    ORDER BY date
  `, [targetYear.toString()])
  
  if (result.length === 0) return {}
  
  const data = {}
  result[0].values.forEach(([date, count]) => {
    data[date] = count
  })
  return data
}

async function getStreakAcrossAllHabits() {
  const database = await getDB()
  const today = new Date().toISOString().split('T')[0]
  
  const result = database.exec(`
    SELECT COUNT(DISTINCT habit_id) as completed_habits
    FROM daily_checklist
    WHERE date = ? AND completed = 1
  `, [today])
  
  return result.length > 0 ? result[0].values[0][0] : 0
}

/**
 * ==================== JOURNAL ====================
 */

async function addJournalEntry(content, mood = 'neutral') {
  const database = await getDB()
  const date = new Date().toISOString().split('T')[0]
  database.run('INSERT INTO journal (content, date, mood) VALUES (?, ?, ?)', [content, date, mood])
  saveDB()
  return getTodayJournal()
}

async function getTodayJournal() {
  const database = await getDB()
  const today = new Date().toISOString().split('T')[0]
  
  const result = database.exec('SELECT * FROM journal WHERE date = ? ORDER BY created_at DESC', [today])
  return result.length > 0 ? result[0].values : []
}

async function getJournalByDate(date) {
  const database = await getDB()
  
  const result = database.exec('SELECT * FROM journal WHERE date = ? ORDER BY created_at DESC', [date])
  return result.length > 0 ? result[0].values : []
}

async function getAllJournalEntries(limit = 50) {
  const database = await getDB()
  
  const result = database.exec('SELECT * FROM journal ORDER BY date DESC, created_at DESC LIMIT ?', [limit])
  return result.length > 0 ? result[0].values : []
}

async function deleteJournalEntry(id) {
  const database = await getDB()
  database.run('DELETE FROM journal WHERE id = ?', [id])
  saveDB()
  return getTodayJournal()
}

/**
 * ==================== GOALS ====================
 */

async function addGoal(title, description = '', targetDate = null) {
  const database = await getDB()
  database.run('INSERT INTO goals (title, description, target_date) VALUES (?, ?, ?)', [title, description, targetDate])
  saveDB()
  return getAllGoals()
}

async function updateGoal(id, title, description = '', targetDate = null) {
  const database = await getDB()
  database.run('UPDATE goals SET title = ?, description = ?, target_date = ? WHERE id = ?', [title, description, targetDate, id])
  saveDB()
  return getAllGoals()
}

async function getAllGoals() {
  const database = await getDB()
  const result = database.exec('SELECT * FROM goals ORDER BY created_at DESC')
  return result.length > 0 ? result[0].values : []
}

async function getActiveGoals() {
  const database = await getDB()
  const result = database.exec('SELECT * FROM goals WHERE completed = 0 ORDER BY created_at DESC')
  return result.length > 0 ? result[0].values : []
}

async function updateGoalProgress(id, progress) {
  const database = await getDB()
  database.run('UPDATE goals SET progress = ? WHERE id = ?', [progress, id])
  saveDB()
  return getAllGoals()
}

async function completeGoal(id) {
  const database = await getDB()
  database.run('UPDATE goals SET completed = 1, progress = 100 WHERE id = ?', [id])
  saveDB()
  return getAllGoals()
}

async function deleteGoal(id) {
  const database = await getDB()
  database.run('DELETE FROM goals WHERE id = ?', [id])
  saveDB()
  return getAllGoals()
}

/**
 * ==================== GOAL LABELS ====================
 */

async function initializeDefaultLabels() {
  const database = await getDB()
  const defaultLabels = ['Workout', 'Learning', 'Coding']
  
  for (const label of defaultLabels) {
    // Check if label already exists
    const result = database.exec('SELECT * FROM goal_labels WHERE name = ?', [label])
    if (result.length === 0) {
      database.run('INSERT INTO goal_labels (name, is_custom) VALUES (?, ?)', [label, 0])
    }
  }
  saveDB()
}

async function getAllLabels() {
  const database = await getDB()
  // Initialize default labels if table is empty
  const result = database.exec('SELECT COUNT(*) FROM goal_labels')
  if (result.length > 0 && result[0].values[0][0] === 0) {
    const defaultLabels = ['Workout', 'Learning', 'Coding']
    for (const label of defaultLabels) {
      database.run('INSERT INTO goal_labels (name, is_custom) VALUES (?, ?)', [label, 0])
    }
    saveDB()
  }
  
  const labelsResult = database.exec('SELECT * FROM goal_labels ORDER BY is_custom ASC, name ASC')
  return labelsResult.length > 0 ? labelsResult[0].values : []
}

async function addCustomLabel(name) {
  const database = await getDB()
  try {
    database.run('INSERT INTO goal_labels (name, is_custom) VALUES (?, ?)', [name, 1])
    saveDB()
    return getAllLabels()
  } catch (error) {
    console.error('Error adding label:', error)
    return getAllLabels()
  }
}

async function deleteLabel(id) {
  const database = await getDB()
  const result = database.exec('SELECT is_custom FROM goal_labels WHERE id = ?', [id])
  
  if (result.length > 0 && result[0].values[0][0] === 1) {
    database.run('DELETE FROM goal_labels WHERE id = ?', [id])
    saveDB()
  }
  return getAllLabels()
}

/**
 * ==================== CHECKMARKS ====================
 */

async function addCheckmark(title, category = 'general', priority = 0, dueDate = null, description = '') {
  const database = await getDB()
  database.run('INSERT INTO checkmarks (title, category, priority, due_date, description) VALUES (?, ?, ?, ?, ?)', 
    [title, category, priority, dueDate, description])
  saveDB()
  return getAllCheckmarks()
}

async function getAllCheckmarks() {
  const database = await getDB()
  const result = database.exec('SELECT * FROM checkmarks ORDER BY priority DESC, created_at DESC')
  return result.length > 0 ? result[0].values : []
}

async function getActiveCheckmarks() {
  const database = await getDB()
  const result = database.exec('SELECT * FROM checkmarks WHERE completed = 0 ORDER BY priority DESC, created_at DESC')
  return result.length > 0 ? result[0].values : []
}

async function getCheckmarksByCategory(category) {
  const database = await getDB()
  const result = database.exec('SELECT * FROM checkmarks WHERE category = ? AND completed = 0 ORDER BY priority DESC', [category])
  return result.length > 0 ? result[0].values : []
}

async function completeCheckmark(id) {
  const database = await getDB()
  database.run('UPDATE checkmarks SET completed = 1 WHERE id = ?', [id])
  saveDB()
  return getAllCheckmarks()
}

async function uncompleteCheckmark(id) {
  const database = await getDB()
  database.run('UPDATE checkmarks SET completed = 0 WHERE id = ?', [id])
  saveDB()
  return getAllCheckmarks()
}

async function updateCheckmark(id, title, category, priority, dueDate, description) {
  const database = await getDB()
  database.run('UPDATE checkmarks SET title = ?, category = ?, priority = ?, due_date = ?, description = ? WHERE id = ?', 
    [title, category, priority, dueDate, description, id])
  saveDB()
  return getAllCheckmarks()
}

async function deleteCheckmark(id) {
  const database = await getDB()
  database.run('DELETE FROM checkmarks WHERE id = ?', [id])
  saveDB()
  return getAllCheckmarks()
}

/**
 * ==================== STATS ====================
 */

async function getDashboardStats() {
  const database = await getDB()
  
  // Total habits
  const habitsResult = database.exec('SELECT COUNT(*) as count FROM habits')
  const habitCount = habitsResult.length > 0 ? habitsResult[0].values[0][0] : 0
  
  // Today's checkmarks done
  const checkmarksResult = database.exec('SELECT COUNT(*) as count FROM checkmarks WHERE completed = 1')
  const checkmarksCount = checkmarksResult.length > 0 ? checkmarksResult[0].values[0][0] : 0
  
  // Journal entries
  const journalResult = database.exec('SELECT COUNT(*) as count FROM journal')
  const journalCount = journalResult.length > 0 ? journalResult[0].values[0][0] : 0
  
  // Contribution today
  const today = new Date().toISOString().split('T')[0]
  const contributionResult = database.exec('SELECT COUNT(*) as count FROM daily_checklist WHERE date = ? AND completed = 1', [today])
  const contributionCount = contributionResult.length > 0 ? contributionResult[0].values[0][0] : 0
  
  return {
    habits: habitCount,
    checkmarks_done: checkmarksCount,
    journal_entries: journalCount,
    contributions_today: contributionCount
  }
}

/**
 * ==================== GOAL TRACKING GRID ====================
 */

async function getGoalTrackingGrid(daysBack = 365) {
  const database = await getDB()
  
  // Get all active goals
  const goalsResult = database.exec('SELECT * FROM goals WHERE completed = 0 ORDER BY created_at ASC')
  const goals = goalsResult.length > 0 ? goalsResult[0].values.map(row => ({
    id: row[0], title: row[1], description: row[2], target_date: row[3],
    completed: row[4], progress: row[5], frequency: row[6], scheduled_days: row[7],
    created_at: row[8], color: row[9], icon: row[10]
  })) : []
  
  // Generate date range (last X days)
  const dates = []
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().split('T')[0])
  }
  
  // Get all goal completions for this period
  const completionsResult = database.exec(
    'SELECT goal_id, date, is_completed FROM goal_completions WHERE date IN (' + 
    dates.map(() => '?').join(',') + ') ORDER BY date DESC',
    dates
  )
  const completions = {}
  if (completionsResult.length > 0) {
    completionsResult[0].values.forEach(row => {
      const key = `${row[0]}_${row[1]}`
      completions[key] = row[2]
    })
  }
  
  return {
    goals,
    dates,
    completions
  }
}

async function toggleGoalCompletion(goalId, date) {
  const database = await getDB()
  
  // Check if already exists
  const existsResult = database.exec(
    'SELECT id, is_completed FROM goal_completions WHERE goal_id = ? AND date = ?',
    [goalId, date]
  )
  
  if (existsResult.length > 0 && existsResult[0].values.length > 0) {
    const currentState = existsResult[0].values[0][1]
    database.run(
      'UPDATE goal_completions SET is_completed = ? WHERE goal_id = ? AND date = ?',
      [1 - currentState, goalId, date]
    )
  } else {
    database.run(
      'INSERT INTO goal_completions (goal_id, date, is_completed) VALUES (?, ?, 1)',
      [goalId, date]
    )
  }
  
  saveDB()
  return true
}

async function getTodayGoalStats() {
  const database = await getDB()
  const today = new Date().toISOString().split('T')[0]
  
  // Get all active goals
  const goalsResult = database.exec('SELECT id FROM goals WHERE completed = 0')
  const goalIds = goalsResult.length > 0 ? goalsResult[0].values.map(row => row[0]) : []
  
  if (goalIds.length === 0) {
    return { completed: 0, scheduled: 0, percentage: 0 }
  }
  
  // Get today's completions
  const completedResult = database.exec(
    'SELECT COUNT(*) as count FROM goal_completions WHERE goal_id IN (' + 
    goalIds.map(() => '?').join(',') + ') AND date = ? AND is_completed = 1',
    [...goalIds, today]
  )
  const completed = completedResult.length > 0 ? completedResult[0].values[0][0] : 0
  
  return {
    completed: completed,
    scheduled: goalIds.length,
    percentage: goalIds.length > 0 ? Math.round((completed / goalIds.length) * 100) : 0
  }
}

async function addHabitKeyword(habitId, keyword) {
  const database = await getDB()
  try {
    database.run('INSERT OR IGNORE INTO habit_keywords (habit_id, keyword) VALUES (?, ?)', 
      [habitId, keyword.toLowerCase()])
    saveDB()
    return true
  } catch (e) {
    return false
  }
}

async function getHabitKeywords(habitId) {
  const database = await getDB()
  const result = database.exec('SELECT keyword FROM habit_keywords WHERE habit_id = ?', [habitId])
  return result.length > 0 ? result[0].values.map(row => row[0]) : []
}

async function detectHabitsFromJournal(content) {
  const database = await getDB()
  
  // Get all habits with their keywords
  const habitsResult = database.exec(`
    SELECT DISTINCT h.id, h.name FROM habits h
    LEFT JOIN habit_keywords hk ON h.id = hk.habit_id
  `)
  
  if (habitsResult.length === 0) return []
  
  const detectedHabits = []
  const contentLower = content.toLowerCase()
  
  for (const row of habitsResult[0].values) {
    const habitId = row[0]
    const habitName = row[1]
    
    // Check if habit name appears in content
    if (contentLower.includes(habitName.toLowerCase())) {
      detectedHabits.push(habitId)
      continue
    }
    
    // Check keywords
    const keywordsResult = database.exec(
      'SELECT keyword FROM habit_keywords WHERE habit_id = ?',
      [habitId]
    )
    
    if (keywordsResult.length > 0) {
      for (const kwRow of keywordsResult[0].values) {
        if (contentLower.includes(kwRow[0])) {
          detectedHabits.push(habitId)
          break
        }
      }
    }
  }
  
  return [...new Set(detectedHabits)]
}

async function getHabitStatsFromJournal() {
  const database = await getDB()
  
  // Get all journal entries
  const journalResult = database.exec('SELECT content FROM journal')
  const journalEntries = journalResult.length > 0 ? journalResult[0].values.map(row => row[0]) : []
  
  // Count habit mentions
  const habitMentions = {}
  const habitsResult = database.exec('SELECT id, name FROM habits')
  
  if (habitsResult.length > 0) {
    for (const row of habitsResult[0].values) {
      const habitId = row[0]
      const habitName = row[1]
      let count = 0
      
      for (const entry of journalEntries) {
        if (entry.toLowerCase().includes(habitName.toLowerCase())) {
          count++
        }
      }
      
      if (count > 0) {
        habitMentions[habitId] = { name: habitName, count }
      }
    }
  }
  
  return habitMentions
}

module.exports = {
  getDB,
  saveDB,
  // Habits
  addHabit,
  getAllHabits,
  getHabitById,
  updateHabit,
  deleteHabit,
  // Daily Checklist
  markHabitComplete,
  unmarkHabitComplete,
  getTodayChecklist,
  getChecklistByDate,
  // Streak & Contributions
  getCurrentStreak,
  getContributionData,
  getStreakAcrossAllHabits,
  // Journal
  addJournalEntry,
  getTodayJournal,
  getJournalByDate,
  getAllJournalEntries,
  deleteJournalEntry,
  // Goals
  addGoal,
  updateGoal,
  getAllGoals,
  getActiveGoals,
  updateGoalProgress,
  completeGoal,
  deleteGoal,
  // Goal Labels
  initializeDefaultLabels,
  getAllLabels,
  addCustomLabel,
  deleteLabel,
  // Goal Tracking Grid
  getGoalTrackingGrid,
  toggleGoalCompletion,
  getTodayGoalStats,
  // Habit Keywords & Detection
  addHabitKeyword,
  getHabitKeywords,
  detectHabitsFromJournal,
  getHabitStatsFromJournal,
  // Checkmarks
  addCheckmark,
  getAllCheckmarks,
  getActiveCheckmarks,
  getCheckmarksByCategory,
  completeCheckmark,
  uncompleteCheckmark,
  updateCheckmark,
  deleteCheckmark,
  // Stats
  getDashboardStats
}
