const initSqlJs = require('sql.js')
const path = require('path')
const fs = require('fs')

let DB_PATH = path.join(__dirname, 'kaizen.db')
let db = null

function setDBPath(newPath) {
  DB_PATH = newPath
  db = null
}

/** Calendar date in local timezone (YYYY-MM-DD) */
function getLocalDateString(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

async function hasJournalForDate(date) {
  const database = await getDB()
  const result = database.exec(
    'SELECT id FROM journal WHERE date = ? AND time IS NOT NULL AND time != "" LIMIT 1',
    [date]
  )
  return result.length > 0 && result[0].values.length > 0
}

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
      time TEXT,
      mood TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      start_date TEXT,
      target_date TEXT,
      completed INTEGER DEFAULT 0,
      failed INTEGER DEFAULT 0,
      progress INTEGER DEFAULT 0,
      frequency TEXT DEFAULT 'daily',
      scheduled_days TEXT,
      created_at TEXT DEFAULT (date('now')),
      completion_date TEXT,
      color TEXT DEFAULT '#6ee7b7',
      icon TEXT DEFAULT '🎯'
    );

    CREATE TABLE IF NOT EXISTS goal_completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      is_completed INTEGER DEFAULT 0,
      is_failed INTEGER DEFAULT 0,
      UNIQUE(goal_id, date),
      FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS checkmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      completed INTEGER DEFAULT 0,
      failed INTEGER DEFAULT 0,
      priority INTEGER DEFAULT 0,
      due_date TEXT,
      created_at TEXT DEFAULT (date('now'))
    );

    CREATE TABLE IF NOT EXISTS daily_checklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER NOT NULL,
      date TEXT DEFAULT (date('now')),
      completed INTEGER DEFAULT 0,
      failed INTEGER DEFAULT 0,
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

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id INTEGER,
      message TEXT NOT NULL,
      type TEXT NOT NULL, -- 'completed' or 'failed'
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      read INTEGER DEFAULT 0,
      FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE SET NULL
    );
  `)

  // Migration: add missing columns if they don't exist
  const goalColumns = db.exec("PRAGMA table_info(goals)")[0]?.values?.map(r => r[1]) || []
  if (!goalColumns.includes('frequency'))
    db.run("ALTER TABLE goals ADD COLUMN frequency TEXT DEFAULT 'daily'")
  if (!goalColumns.includes('scheduled_days'))
    db.run("ALTER TABLE goals ADD COLUMN scheduled_days TEXT")
  if (!goalColumns.includes('icon'))
    db.run("ALTER TABLE goals ADD COLUMN icon TEXT DEFAULT '🎯'")
  if (!goalColumns.includes('description'))
    db.run("ALTER TABLE goals ADD COLUMN description TEXT")
  if (!goalColumns.includes('target_date'))
    db.run("ALTER TABLE goals ADD COLUMN target_date TEXT")
  if (!goalColumns.includes('progress'))
    db.run("ALTER TABLE goals ADD COLUMN progress INTEGER DEFAULT 0")
  if (!goalColumns.includes('color'))
    db.run("ALTER TABLE goals ADD COLUMN color TEXT DEFAULT '#6ee7b7'")
  if (!goalColumns.includes('start_date'))
    db.run("ALTER TABLE goals ADD COLUMN start_date TEXT")
  if (!goalColumns.includes('completion_date'))
    db.run("ALTER TABLE goals ADD COLUMN completion_date TEXT")
  if (!goalColumns.includes('time')) {
    db.run("ALTER TABLE goals ADD COLUMN time TEXT")
  }
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
    database.run('INSERT OR REPLACE INTO daily_checklist (habit_id, date, completed, failed) VALUES (?, ?, 1, 0)', [habitId, targetDate])
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

async function getContributionData(startDate = null, endDate = null) {
  const database = await getDB()
  
  // Default to rolling 12-month window
  const today = new Date()
  const end = endDate ? new Date(endDate) : today
  const start = startDate ? new Date(startDate) : new Date(today)
  start.setFullYear(start.getFullYear() - 1)
  
  const startDateStr = start.toISOString().split('T')[0]
  const endDateStr = end.toISOString().split('T')[0]
  
  // Get habit completions
  const habitResult = database.exec(`
    SELECT 
      date,
      COUNT(*) as count
    FROM daily_checklist
    WHERE completed = 1
    AND date >= ?
    AND date <= ?
    GROUP BY date
    ORDER BY date
  `, [startDateStr, endDateStr])
  
  // Get goal completions
  const goalResult = database.exec(`
    SELECT 
      date,
      COUNT(*) as count
    FROM goal_completions
    WHERE is_completed = 1
    AND date >= ?
    AND date <= ?
    GROUP BY date
    ORDER BY date
  `, [startDateStr, endDateStr])
  
  const data = {}
  
  // Merge habit contributions
  if (habitResult.length > 0) {
    habitResult[0].values.forEach(([date, count]) => {
      data[date] = (data[date] || 0) + count
    })
  }
  
  // Merge goal contributions
  if (goalResult.length > 0) {
    goalResult[0].values.forEach(([date, count]) => {
      data[date] = (data[date] || 0) + count
    })
  }
  
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

async function addJournalEntry(content, mood, time, date = null) {
  const database = await getDB()
  const entryDate = date || getLocalDateString()
  database.run('INSERT INTO journal (content, mood, date, time) VALUES (?, ?, ?, ?)', [content, mood, entryDate, time])
  saveDB()
  return getJournalByDate(entryDate)
}

async function getTodayJournal() {
  const database = await getDB()
  const today = getLocalDateString()
  
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
 * ==================== NOTIFICATION FUNCTIONS ====================
 */

async function addNotification(goalId, message, type) {
  const database = await getDB()
  database.run(
    'INSERT INTO notifications (goal_id, message, type) VALUES (?, ?, ?)',
    [goalId, message, type]
  )
  saveDB()
}

async function getNotifications(unreadOnly = false) {
  const database = await getDB()
  const query = unreadOnly
    ? 'SELECT * FROM notifications WHERE read = 0 ORDER BY created_at DESC'
    : 'SELECT * FROM notifications ORDER BY created_at DESC'
  const result = database.exec(query)
  return result.length > 0 ? result[0].values : []
}

async function markNotificationRead(id) {
  const database = await getDB()
  database.run('UPDATE notifications SET read = 1 WHERE id = ?', [id])
  saveDB()
}

/**
 * ==================== GOAL EVALUATION (AUTO COMPLETE/FAIL) ====================
 */
async function evaluateGoals() {
  const database = await getDB()
  const today = new Date().toISOString().split('T')[0]
  let failedCount = 0
  let completedCount = 0

  // 0. Recalculate progress for all active goals to fix any old "windowEnd" progress bugs
  const activeResult = database.exec(`
    SELECT id FROM goals WHERE completed = 0 AND failed = 0
  `)
  if (activeResult.length > 0) {
    for (const row of activeResult[0].values) {
      await recalculateGoalProgress(row[0])
    }
  }

  // 1. Mark goals as failed if target_date < today AND progress < 100 and not completed and not failed
  //    Wait, we'll first mark completions, then failures.

  // 2. Mark goals as completed if target_date < today AND progress >= 100 (or just completed)
  // Wait, if they do all checks, progress = 100.
  // The user requested: "in the tracking grid the goals must stay until the the date end only it would stop. not immdietly aftre checking."
  // Which means even if progress is 100%, we ONLY complete it once the target date has passed.
  const completedResult = database.exec(`
    SELECT id, title FROM goals
    WHERE progress >= 100 AND target_date < ? AND completed = 0 AND failed = 0
  `, [today])
  
  if (completedResult.length > 0) {
    for (const goal of completedResult[0].values) {
      const goalId = goal[0]
      const title = goal[1]
      database.run('UPDATE goals SET completed = 1, completion_date = ? WHERE id = ?', [today, goalId])
      const message = `Congratulations! You completed the goal "${title}".`
      await addNotification(goalId, message, 'completed')
      completedCount++
    }
  }

  // 1. Mark goals as failed if target_date < today, not completed, and not failed
  const failedResult = database.exec(`
    SELECT id, title FROM goals
    WHERE target_date < ? AND completed = 0 AND failed = 0
  `, [today])
  
  if (failedResult.length > 0) {
    for (const goal of failedResult[0].values) {
      const goalId = goal[0]
      const title = goal[1]
      database.run('UPDATE goals SET failed = 1 WHERE id = ?', [goalId])
      const message = `Goal "${title}" has failed (deadline passed).`
      await addNotification(goalId, message, 'failed')
      failedCount++
    }
  }
  
  saveDB()
  return { failed: failedCount, completed: completedCount }
}

/**
 * ==================== GOALS ====================
 */

async function addGoal(title, description = '', targetDate = null, frequency = 'daily', scheduledDays = null, startDate = null, time = null) {
  const database = await getDB()
  const start = startDate || new Date().toISOString().split('T')[0]
  database.run('INSERT INTO goals (title, description, start_date, target_date, frequency, scheduled_days, time) VALUES (?, ?, ?, ?, ?, ?, ?)', 
    [title, description, start, targetDate, frequency, scheduledDays, time])
  saveDB()
  return getAllGoals()
}

async function updateGoal(id, title, description = '', targetDate = null, frequency = 'daily', scheduledDays = null, startDate = null, time = null) {
  const database = await getDB()
  database.run('UPDATE goals SET title = ?, description = ?, target_date = ?, start_date = ?, frequency = ?, scheduled_days = ?, time = ? WHERE id = ?', 
    [title, description, targetDate, startDate, frequency, scheduledDays, time, id])
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
  const result = database.exec('SELECT * FROM goals WHERE completed = 0 AND failed = 0 ORDER BY created_at DESC')
  return result.length > 0 ? result[0].values : []
}

async function updateGoalProgress(id, progress) {
  const database = await getDB()
  
  if (progress >= 100) {
    const today = new Date().toISOString().split('T')[0]
    database.run('UPDATE goals SET progress = 100, completed = 1, completion_date = ? WHERE id = ?', [today, id])
  } else {
    database.run('UPDATE goals SET progress = ?, completed = 0, completion_date = NULL WHERE id = ?', [progress, id])
  }
  
  saveDB()
  return getAllGoals()
}

async function completeGoal(id) {
  const database = await getDB()
  const today = new Date().toISOString().split('T')[0]
  
  // *** JOURNAL REQUIREMENT ***
  // Check if there is a journal entry for today with a non-empty time
  const journalCheck = database.exec(
    'SELECT id FROM journal WHERE date = ? AND time IS NOT NULL AND time != "" LIMIT 1',
    [today]
  )
  if (!journalCheck.length || journalCheck[0].values.length === 0) {
    throw new Error('You must write a journal entry with a time for today before completing a goal.')
  }
  
  database.run('UPDATE goals SET completed = 1, progress = 100, completion_date = ? WHERE id = ?', [today, id])
  saveDB()
  return getAllGoals()
}

// Add this to backend.js after completeGoal()
async function forceCompleteGoal(id) {
  const database = await getDB()
  const today = new Date().toISOString().split('T')[0]
  database.run(
    'UPDATE goals SET completed = 1, failed = 0, progress = 100, completion_date = ? WHERE id = ?',
    [today, id]
  )
  saveDB()
  return getAllGoals()
}

// Also fix evaluateGoals() — change progress >= 100 check to also catch within-window goals:
// Replace the completedResult query block with this:
async function evaluateGoals() {
  const database = await getDB()
  const today = new Date().toISOString().split('T')[0]
  let failedCount = 0
  let completedCount = 0

  // Recalculate progress for all active goals
  const activeResult = database.exec(`SELECT id FROM goals WHERE completed = 0 AND failed = 0`)
  if (activeResult.length > 0) {
    for (const row of activeResult[0].values) {
      await recalculateGoalProgress(row[0])
    }
  }

  // Mark completed: progress >= 100 AND target_date <= today (on or after deadline)
  const completedResult = database.exec(`
    SELECT id, title FROM goals
    WHERE progress >= 100 AND target_date <= ? AND completed = 0 AND failed = 0
  `, [today])

  if (completedResult.length > 0) {
    for (const goal of completedResult[0].values) {
      const goalId = goal[0]
      const title  = goal[1]
      database.run('UPDATE goals SET completed = 1, completion_date = ? WHERE id = ?', [today, goalId])
      await addNotification(goalId, `Congratulations! You completed "${title}".`, 'completed')
      completedCount++
    }
  }

  // Mark failed: target_date < today, not completed, not failed
  const failedResult = database.exec(`
    SELECT id, title FROM goals
    WHERE target_date < ? AND completed = 0 AND failed = 0
  `, [today])

  if (failedResult.length > 0) {
    for (const goal of failedResult[0].values) {
      const goalId = goal[0]
      const title  = goal[1]
      database.run('UPDATE goals SET failed = 1 WHERE id = ?', [goalId])
      await addNotification(goalId, `Goal "${title}" has failed (deadline passed).`, 'failed')
      failedCount++
    }
  }

  saveDB()
  return { failed: failedCount, completed: completedCount }
}

async function deleteGoal(id) {
  const database = await getDB()
  database.run('DELETE FROM goals WHERE id = ?', [id])
  saveDB()
  return getAllGoals()
}

async function restoreGoal(id) {
  const database = await getDB()
  database.run(
    'UPDATE goals SET completed = 0, failed = 0, progress = 0, completion_date = NULL WHERE id = ?',
    [id]
  )
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
    const result = database.exec('SELECT * FROM goal_labels WHERE name = ?', [label])
    if (result.length === 0) {
      database.run('INSERT INTO goal_labels (name, is_custom) VALUES (?, ?)', [label, 0])
    }
  }
  saveDB()
}

async function getAllLabels() {
  const database = await getDB()
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

async function forceCompleteGoal(id) {
  const database = await getDB()
  const today = new Date().toISOString().split('T')[0]
  database.run(
    'UPDATE goals SET completed = 1, failed = 0, progress = 100, completion_date = ? WHERE id = ?',
    [today, id]
  )
  saveDB()
  return getAllGoals()
}

async function getTopLabels(limit = 5) {
  const database = await getDB()
  try {
    // Count goals by description (which acts as the label)
    const result = database.exec(`
      SELECT description, COUNT(*) as count
      FROM goals
      WHERE description IS NOT NULL AND description != ''
      GROUP BY description
      ORDER BY count DESC
      LIMIT ?
    `, [limit])
    
    if (result.length === 0) return []
    
    return result[0].values.map(row => ({
      label: row[0],
      count: row[1]
    }))
  } catch (error) {
    console.error('Error getting top labels:', error)
    return []
  }
}

/**
 * ==================== GOAL TRACKING GRID ====================
 */

async function getGoalTrackingGrid() {
  const database = await getDB()
  
  // Exclude completed AND failed goals
  const goalsResult = database.exec(`
    SELECT 
      id, title, description, start_date, target_date,
      completed, failed, progress, frequency, scheduled_days,
      created_at, completion_date, color, icon, time
    FROM goals WHERE completed = 0 AND failed = 0 ORDER BY created_at ASC
  `)
  const goals = goalsResult.length > 0 ? goalsResult[0].values.map(row => ({
    id: row[0], title: row[1], description: row[2], start_date: row[3], target_date: row[4],
    completed: row[5], failed: row[6], progress: row[7], frequency: row[8], scheduled_days: row[9],
    created_at: row[10], completion_date: row[11], color: row[12], icon: row[13], time: row[14]
  })) : []
  
  if (goals.length === 0) {
    return { goals: [], dates: [], completions: {} }
  }
  
  let earliestStart = new Date()
  let latestEnd = new Date()

  for (const goal of goals) {
    if (goal.start_date) {
      const sd = new Date(goal.start_date)
      if (sd < earliestStart) earliestStart = sd
    }
    if (goal.target_date) {
      const td = new Date(goal.target_date)
      if (td > latestEnd) latestEnd = td
    }
  }

  const dates = []
  earliestStart.setHours(0, 0, 0, 0)
  latestEnd.setHours(0, 0, 0, 0)

  for (let d = new Date(earliestStart); d <= latestEnd; d.setDate(d.getDate() + 1)) {
    dates.push(getLocalDateString(d))
  }
  
  // Guard against empty dates array
  if (dates.length === 0) {
    return { goals, dates: [], completions: {} }
  }
  
  // Use range query instead of IN() to avoid SQLite's 999-parameter limit
  const completionsResult = database.exec(
    'SELECT goal_id, date, is_completed FROM goal_completions WHERE date >= ? AND date <= ? ORDER BY date DESC',
    [dates[0], dates[dates.length - 1]]
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
  
  const existsResult = database.exec(
    'SELECT id, is_completed FROM goal_completions WHERE goal_id = ? AND date = ?',
    [goalId, date]
  )
  
  if (existsResult.length > 0 && existsResult[0].values.length > 0) {
    const currentState = existsResult[0].values[0][1]
    if (currentState === 0) {
      database.run(
        'UPDATE goal_completions SET is_completed = 1 WHERE goal_id = ? AND date = ?',
        [goalId, date]
      )
    }
  } else {
    database.run(
      'INSERT INTO goal_completions (goal_id, date, is_completed) VALUES (?, ?, 1)',
      [goalId, date]
    )
  }
  
  saveDB()
  await recalculateGoalProgress(goalId)
  return true
}

async function recalculateGoalProgress(goalId) {
  const database = await getDB()

  const goalResult = database.exec(
    'SELECT start_date, target_date, frequency, scheduled_days FROM goals WHERE id = ?',
    [goalId]
  )
  if (!goalResult.length || !goalResult[0].values.length) return

  const [startDate, targetDate, frequency, scheduledDays] = goalResult[0].values[0]
  if (!startDate || !targetDate) return

  const start = new Date(startDate)
  const end = new Date(targetDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)

  let totalScheduledCount = 0
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (isDayScheduled(d.getDay(), frequency, scheduledDays)) totalScheduledCount++
  }

  if (totalScheduledCount === 0) return

  const completedResult = database.exec(
    `SELECT COUNT(*) FROM goal_completions
     WHERE goal_id = ? AND is_completed = 1
     AND date >= ? AND date <= ?`,
    [goalId, startDate, targetDate]
  )
  const completedCount = completedResult[0]?.values[0][0] || 0

  const progress = Math.min(100, Math.round((completedCount / totalScheduledCount) * 100))

  // Just update progress. evaluateGoals() will handle marking completed/failed.
  database.run(
    'UPDATE goals SET progress = ? WHERE id = ?',
    [progress, goalId]
  )

  saveDB()
}

function isDayScheduled(dayOfWeek, frequency, scheduledDaysStr) {
  switch (frequency) {
    case 'daily': return true
    case 'weekdays': return dayOfWeek >= 1 && dayOfWeek <= 5
    case 'weekends': return dayOfWeek === 0 || dayOfWeek === 6
    case '3x': {
      const days = scheduledDaysStr ? JSON.parse(scheduledDaysStr) : [1, 3, 5]
      return days.includes(dayOfWeek)
    }
    case 'custom': {
      if (!scheduledDaysStr) return true
      return JSON.parse(scheduledDaysStr).includes(dayOfWeek)
    }
    default: return true
  }
}

async function getTodayGoalStats() {
  const database = await getDB()
  const today = new Date().toISOString().split('T')[0]
  
  const goalsResult = database.exec('SELECT id FROM goals WHERE completed = 0 AND failed = 0')
  const goalIds = goalsResult.length > 0 ? goalsResult[0].values.map(row => row[0]) : []
  
  if (goalIds.length === 0) {
    return { completed: 0, scheduled: 0, percentage: 0 }
  }
  
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
    
    if (contentLower.includes(habitName.toLowerCase())) {
      detectedHabits.push(habitId)
      continue
    }
    
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
  
  const journalResult = database.exec('SELECT content FROM journal')
  const journalEntries = journalResult.length > 0 ? journalResult[0].values.map(row => row[0]) : []
  
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
  
  const habitsResult = database.exec('SELECT COUNT(*) as count FROM habits')
  const habitCount = habitsResult.length > 0 ? habitsResult[0].values[0][0] : 0
  
  const checkmarksResult = database.exec('SELECT COUNT(*) as count FROM checkmarks WHERE completed = 1')
  const checkmarksCount = checkmarksResult.length > 0 ? checkmarksResult[0].values[0][0] : 0
  
  const journalResult = database.exec('SELECT COUNT(*) as count FROM journal')
  const journalCount = journalResult.length > 0 ? journalResult[0].values[0][0] : 0
  
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

async function resetAllData() {
  const database = await getDB()
  const tables = [
    'notifications',
    'goal_completions',
    'goals',
    'checkmarks',
    'daily_checklist',
    'habit_keywords',
    'journal',
    'habits',
    'goal_labels',
    'user_profile'
  ]
  for (const table of tables) {
    database.run(`DELETE FROM ${table}`)
  }
  await getAllLabels()
  saveDB()
  return true
}

module.exports = {
  getDB,
  saveDB,
  setDBPath,
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
  getLocalDateString,
  hasJournalForDate,
  addJournalEntry,
  getTodayJournal,
  getJournalByDate,
  getAllJournalEntries,
  deleteJournalEntry,
  // Notifications
  addNotification,
  getNotifications,
  markNotificationRead,
  // Goal Evaluation
  evaluateGoals,
  // Goals
  addGoal,
  updateGoal,
  getAllGoals,
  getActiveGoals,
  updateGoalProgress,
  completeGoal,
  deleteGoal,
  restoreGoal,
  // Goal Labels
  initializeDefaultLabels,
  getAllLabels,
  addCustomLabel,
  deleteLabel,
  getTopLabels,
  forceCompletedGoal,
  // Goal Tracking Grid
  getGoalTrackingGrid,
  toggleGoalCompletion,
  recalculateGoalProgress,
  isDayScheduled,
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
  getDashboardStats,
  resetAllData
}