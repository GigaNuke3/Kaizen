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

async function hasJournalForDate(date, goalId = null) {
  const database = await getDB()
  try {
    if (goalId) {
      // Check if a journal entry exists for this specific goal on this date
      const result = database.exec(
        'SELECT id FROM journal WHERE date = ? AND goal_id = ? AND time IS NOT NULL AND time != "" LIMIT 1',
        [date, goalId]
      )
      return result.length > 0 && result[0].values.length > 0
    } else {
      // Fallback: any journal entry for this date (used by journal.js pending check)
      const result = database.exec(
        'SELECT id FROM journal WHERE date = ? AND time IS NOT NULL AND time != "" LIMIT 1',
        [date]
      )
      return result.length > 0 && result[0].values.length > 0
    }
  } catch (err) {
    console.error('hasJournalForDate error:', err)
    return false
  }
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

    CREATE TABLE IF NOT EXISTS kai_chat (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
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
  if (!goalColumns.includes('label')) {
    db.run("ALTER TABLE goals ADD COLUMN label TEXT DEFAULT ''")
  }

  // Journal migrations
  const journalColumns = db.exec("PRAGMA table_info(journal)")[0]?.values?.map(r => r[1]) || []
  if (!journalColumns.includes('goal_id')) {
    db.run("ALTER TABLE journal ADD COLUMN goal_id INTEGER REFERENCES goals(id) ON DELETE SET NULL")
  }

  // Goal completions migrations
  const completionColumns = db.exec("PRAGMA table_info(goal_completions)")[0]?.values?.map(r => r[1]) || []
  if (!completionColumns.includes('is_excused')) {
    db.run("ALTER TABLE goal_completions ADD COLUMN is_excused INTEGER DEFAULT 0")
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

/**
 * ==================== STREAK & CONTRIBUTIONS ====================
 */

async function getContributionData(startDate = null, endDate = null) {
  const database = await getDB()

  // Default to rolling 12-month window
  const today = new Date()
  const end = endDate ? new Date(endDate) : today
  const start = startDate ? new Date(startDate) : new Date(today)
  start.setFullYear(start.getFullYear() - 1)

  const startDateStr = getLocalDateString(start)
  const endDateStr = getLocalDateString(end)

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

  if (goalResult.length > 0) {
    goalResult[0].values.forEach(([date, count]) => {
      data[date] = (data[date] || 0) + count
    })
  }

  return data
}

/**
 * ==================== STREAK & WEEKLY SUMMARY ====================
 */

async function getStreakStats() {
  const database = await getDB()
  const result = database.exec(
    'SELECT DISTINCT date FROM goal_completions WHERE is_completed = 1 ORDER BY date ASC'
  )
  const dates = result.length > 0 ? result[0].values.map(r => r[0]) : []
  const dateSet = new Set(dates)

  // Current streak: consecutive days ending today. If today has no check-in
  // yet, the streak is still alive through yesterday.
  let current = 0
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  if (!dateSet.has(getLocalDateString(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
  }
  while (dateSet.has(getLocalDateString(cursor))) {
    current++
    cursor.setDate(cursor.getDate() - 1)
  }

  // Longest streak: longest run of consecutive dates.
  let longest = 0
  let run = 0
  let prev = null
  for (const d of dates) {
    if (prev) {
      const prevDate = new Date(prev + 'T12:00:00')
      const curDate = new Date(d + 'T12:00:00')
      const diff = Math.round((curDate - prevDate) / 86400000)
      run = diff === 1 ? run + 1 : 1
    } else {
      run = 1
    }
    if (run > longest) longest = run
    prev = d
  }

  return { current, longest }
}

async function getWeeklySummary() {
  const database = await getDB()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dow = today.getDay()
  const monday = new Date(today)
  monday.setDate(monday.getDate() + (dow === 0 ? -6 : 1 - dow))
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  const mondayStr = getLocalDateString(monday)
  const sundayStr = getLocalDateString(sunday)

  const checkinsRes = database.exec(
    'SELECT COUNT(*) FROM goal_completions WHERE is_completed = 1 AND date >= ? AND date <= ?',
    [mondayStr, sundayStr]
  )
  const checkins = checkinsRes[0]?.values[0][0] || 0

  const journalRes = database.exec(
    'SELECT COUNT(*) FROM journal WHERE date >= ? AND date <= ?',
    [mondayStr, sundayStr]
  )
  const journalEntries = journalRes[0]?.values[0][0] || 0

  const moods = { sad: 0, neutral: 0, good: 0, happy: 0, excited: 0 }
  const moodsRes = database.exec(
    'SELECT mood, COUNT(*) FROM journal WHERE date >= ? AND date <= ? GROUP BY mood',
    [mondayStr, sundayStr]
  )
  if (moodsRes.length > 0) {
    for (const [mood, count] of moodsRes[0].values) {
      if (moods[mood] !== undefined) moods[mood] = count
    }
  }

  // Scheduled slots this week across every goal whose window overlaps this week
  // (include completed goals — they still had required slots earlier in the week).
  const goalsRes = database.exec(
    'SELECT id, start_date, target_date, frequency, scheduled_days FROM goals'
  )
  const goals = goalsRes.length > 0 ? goalsRes[0].values : []
  let scheduled = 0
  for (const row of goals) {
    const [, startDate, targetDate, frequency, scheduledDays] = row
    for (let d = new Date(monday); d <= sunday; d.setDate(d.getDate() + 1)) {
      const ds = getLocalDateString(d)
      if (startDate && ds < startDate) continue
      if (targetDate && ds > targetDate) continue
      if (isDayScheduled(d.getDay(), frequency, scheduledDays)) scheduled++
    }
  }

  let topMood = null
  let topCount = 0
  for (const [mood, count] of Object.entries(moods)) {
    if (count > topCount) {
      topCount = count
      topMood = mood
    }
  }

  return {
    checkins,
    journalEntries,
    scheduled,
    completionPct: scheduled > 0 ? Math.min(100, Math.round((checkins / scheduled) * 100)) : 0,
    moods,
    topMood: topCount > 0 ? topMood : null
  }
}

/**
 * ==================== JOURNAL ====================
 */

async function addJournalEntry(content, mood, time, date = null, goalId = null) {
  const database = await getDB()
  const entryDate = date || getLocalDateString()
  database.run(
    'INSERT INTO journal (content, mood, date, time, goal_id) VALUES (?, ?, ?, ?, ?)',
    [content, mood, entryDate, time, goalId || null]
  )
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

async function searchJournalEntries(query = '', mood = null, limit = 200) {
  const database = await getDB()
  let sql = 'SELECT * FROM journal WHERE 1=1'
  const params = []
  const q = query ? String(query).trim() : ''
  if (q) {
    sql += ' AND content LIKE ?'
    params.push(`%${q}%`)
  }
  if (mood && mood !== 'all') {
    sql += ' AND mood = ?'
    params.push(mood)
  }
  sql += ' ORDER BY date DESC, created_at DESC LIMIT ?'
  params.push(limit)
  const result = database.exec(sql, params)
  return result.length > 0 ? result[0].values : []
}

async function getMoodAnalytics(days = 90) {
  const database = await getDB()
  const start = new Date()
  start.setDate(start.getDate() - (days - 1))
  const startStr = getLocalDateString(start)
  const result = database.exec(
    'SELECT date, mood FROM journal WHERE date >= ? ORDER BY date ASC, created_at ASC',
    [startStr]
  )
  const rows = result.length > 0 ? result[0].values : []
  const distribution = { sad: 0, neutral: 0, good: 0, happy: 0, excited: 0 }
  for (const [, mood] of rows) {
    if (distribution[mood] !== undefined) distribution[mood]++
  }
  return { trend: rows, distribution }
}

async function getJournalEntriesBetween(startDate, endDate) {
  const database = await getDB()
  const result = database.exec(
    'SELECT * FROM journal WHERE date >= ? AND date <= ? ORDER BY date ASC, created_at ASC',
    [startDate, endDate]
  )
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
 * ==================== KAI CHAT ====================
 */

async function getKaiChatHistory(limit = 100) {
  const database = await getDB()
  const result = database.exec(
    'SELECT * FROM (SELECT * FROM kai_chat ORDER BY id DESC LIMIT ?) ORDER BY id ASC',
    [limit]
  )
  return result.length > 0 ? result[0].values : []
}

async function addKaiChatMessage(role, content) {
  const database = await getDB()
  database.run('INSERT INTO kai_chat (role, content) VALUES (?, ?)', [role, content])
  saveDB()
  return true
}

async function clearKaiChatHistory() {
  const database = await getDB()
  database.run('DELETE FROM kai_chat')
  saveDB()
  return true
}

/**
 * ==================== GOAL EVALUATION (AUTO COMPLETE/FAIL) ====================
 */
async function evaluateGoals() {
  const database = await getDB()
  const today = getLocalDateString()
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

  // Mark completed: progress >= 100 (regardless of whether deadline has passed yet)
  const completedResult = database.exec(`
    SELECT id, title FROM goals
    WHERE progress >= 100 AND completed = 0 AND failed = 0
  `)

  if (completedResult.length > 0) {
    for (const goal of completedResult[0].values) {
      const goalId = goal[0]
      const title  = goal[1]
      database.run('UPDATE goals SET completed = 1, completion_date = ? WHERE id = ?', [today, goalId])
      await addNotification(goalId, `Congratulations! You completed "${title}".`, 'completed')
      completedCount++
    }
  }

  // Mark failed: target_date < today, progress < 100, not completed, not failed.
  // Goals whose scheduled days are all excused have no measurable days and are skipped.
  const failedResult = database.exec(`
    SELECT id, title FROM goals
    WHERE target_date < ? AND progress < 100 AND completed = 0 AND failed = 0
  `, [today])

  if (failedResult.length > 0) {
    for (const goal of failedResult[0].values) {
      const goalId = goal[0]
      const title  = goal[1]
      const measurable = await getMeasurableDayCount(goalId)
      if (measurable <= 0) continue
      database.run('UPDATE goals SET failed = 1 WHERE id = ?', [goalId])
      await addNotification(goalId, `Goal "${title}" has failed (deadline passed).`, 'failed')
      failedCount++
    }
  }

  saveDB()
  return { failed: failedCount, completed: completedCount }
}

/**
 * ==================== GOALS ====================
 */

async function addGoal(title, label = '', targetDate = null, frequency = 'daily', scheduledDays = null, startDate = null, time = null) {
  const database = await getDB()
  const start = startDate || getLocalDateString()
  database.run(
    'INSERT INTO goals (title, label, start_date, target_date, frequency, scheduled_days, time) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [title, label, start, targetDate, frequency, scheduledDays, time]
  )
  saveDB()
  return getAllGoals()
}

async function updateGoal(id, title, label = '', targetDate = null, frequency = 'daily', scheduledDays = null, startDate = null, time = null) {
  const database = await getDB()
  database.run(
    'UPDATE goals SET title = ?, label = ?, target_date = ?, start_date = ?, frequency = ?, scheduled_days = ?, time = ? WHERE id = ?',
    [title, label, targetDate, startDate, frequency, scheduledDays, time, id]
  )
  saveDB()
  return getAllGoals()
}

async function getAllGoals() {
  const database = await getDB()
  // Explicit columns: [0]=id [1]=title [2]=description [3]=start_date [4]=target_date
  // [5]=completed [6]=failed [7]=progress [8]=frequency [9]=scheduled_days
  // [10]=created_at [11]=completion_date [12]=color [13]=icon [14]=time [15]=label
  const result = database.exec(`
    SELECT id, title, description, start_date, target_date,
           completed, failed, progress, frequency, scheduled_days,
           created_at, completion_date, color, icon, time, label
    FROM goals ORDER BY created_at DESC
  `)
  return result.length > 0 ? result[0].values : []
}

async function getActiveGoals() {
  const database = await getDB()
  const result = database.exec(`
    SELECT id, title, description, start_date, target_date,
           completed, failed, progress, frequency, scheduled_days,
           created_at, completion_date, color, icon, time, label
    FROM goals WHERE completed = 0 AND failed = 0 ORDER BY created_at DESC
  `)
  return result.length > 0 ? result[0].values : []
}

async function updateGoalProgress(id, progress) {
  const database = await getDB()
  
  if (progress >= 100) {
    const today = getLocalDateString()
    database.run('UPDATE goals SET progress = 100, completed = 1, completion_date = ? WHERE id = ?', [today, id])
  } else {
    database.run('UPDATE goals SET progress = ?, completed = 0, completion_date = NULL WHERE id = ?', [progress, id])
  }
  
  saveDB()
  return getAllGoals()
}

async function completeGoal(id) {
  const database = await getDB()
  const today = getLocalDateString()
  
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

// ✅ forceCompleteGoal defined only once
async function forceCompleteGoal(id) {
  const database = await getDB()
  const today = getLocalDateString()
  database.run(
    'UPDATE goals SET completed = 1, failed = 0, progress = 100, completion_date = ? WHERE id = ?',
    [today, id]
  )
  saveDB()
  return getAllGoals()
}

async function deleteGoal(id) {
  const database = await getDB()
  // sql.js does not enforce FOREIGN KEY ... ON DELETE CASCADE (PRAGMA foreign_keys is never enabled),
  // so related rows must be cleaned up explicitly or they're orphaned permanently.
  // Journal entries are personal reflections — unlink them instead of deleting them.
  database.run('UPDATE journal SET goal_id = NULL WHERE goal_id = ?', [id])
  database.run('DELETE FROM goal_completions WHERE goal_id = ?', [id])
  database.run('DELETE FROM notifications WHERE goal_id = ?', [id])
  database.run('DELETE FROM goals WHERE id = ?', [id])
  saveDB()
  return getAllGoals()
}

async function restoreGoal(id, newTargetDate = null) {
  const database = await getDB()
  const today = getLocalDateString()

  // If a deadline has already passed, the goal would instantly re-fail on the
  // next evaluateGoals() pass. Allow the caller to provide a new target date,
  // and as a safety net auto-extend expired failed goals by 7 days.
  const goalResult = database.exec('SELECT target_date, failed FROM goals WHERE id = ?', [id])
  if (goalResult.length > 0 && goalResult[0].values.length > 0) {
    const [currentTarget, wasFailed] = goalResult[0].values[0]
    if (newTargetDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(newTargetDate)) {
        throw new Error('Invalid date format. Use YYYY-MM-DD.')
      }
      if (newTargetDate < today) {
        throw new Error('New target date must be today or later.')
      }
      database.run('UPDATE goals SET target_date = ? WHERE id = ?', [newTargetDate, id])
    } else if (currentTarget && currentTarget < today && wasFailed === 1) {
      const extended = new Date()
      extended.setDate(extended.getDate() + 7)
      database.run('UPDATE goals SET target_date = ? WHERE id = ?', [getLocalDateString(extended), id])
    }
  }

  database.run(
    'UPDATE goals SET completed = 0, failed = 0, completion_date = NULL WHERE id = ?',
    [id]
  )
  saveDB()
  // Recalculate real progress from existing check-ins so the grid stays accurate
  await recalculateGoalProgress(id)
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

async function getTopLabels(limit = 5) {
  const database = await getDB()
  try {
    const result = database.exec(`
      SELECT label, COUNT(*) as count
      FROM goals
      WHERE label IS NOT NULL AND label != ''
      GROUP BY label
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
    return { goals: [], dates: [], completions: {}, excused: {} }
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
    return { goals, dates: [], completions: {}, excused: {} }
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

  // Rest days: separate map so the UI can distinguish excused from missed.
  const excusedResult = database.exec(
    'SELECT goal_id, date, is_excused FROM goal_completions WHERE date >= ? AND date <= ? AND is_excused = 1',
    [dates[0], dates[dates.length - 1]]
  )
  const excused = {}
  if (excusedResult.length > 0) {
    excusedResult[0].values.forEach(row => {
      excused[`${row[0]}_${row[1]}`] = row[2]
    })
  }

  return {
    goals,
    dates,
    completions,
    excused
  }
}

async function toggleGoalCompletion(goalId, date) {
  const database = await getDB()
  const today = getLocalDateString()

  // ── Rule 1: Only today's slot can be checked ─────────────────────────────
  if (date !== today) {
    throw new Error('Only today\'s slot can be checked. Past slots are permanently closed.')
  }

  // ── Rule 2: Slot cannot be unchecked once checked ─────────────────────────
  const existsResult = database.exec(
    'SELECT id, is_completed, is_excused FROM goal_completions WHERE goal_id = ? AND date = ?',
    [goalId, date]
  )
  if (existsResult.length > 0 && existsResult[0].values.length > 0) {
    const [, currentState, isExcused] = existsResult[0].values[0]
    if (currentState === 1) {
      throw new Error('This slot has already been checked and cannot be undone.')
    }
    if (isExcused === 1) {
      throw new Error('This day is marked as a rest day. Remove the rest day first.')
    }
  }

  // ── Rule 3: A journal entry for THIS SPECIFIC GOAL must exist today ───────
  const journalCheck = database.exec(
    'SELECT id FROM journal WHERE date = ? AND goal_id = ? AND time IS NOT NULL AND time != "" LIMIT 1',
    [today, goalId]
  )
  if (!journalCheck.length || journalCheck[0].values.length === 0) {
    throw new Error('You must write a journal entry for this goal before checking it in.')
  }

  // ── All rules passed: mark as completed ──────────────────────────────────
  if (existsResult.length > 0 && existsResult[0].values.length > 0) {
    database.run(
      'UPDATE goal_completions SET is_completed = 1 WHERE goal_id = ? AND date = ?',
      [goalId, date]
    )
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

async function toggleRestDay(goalId, date) {
  const database = await getDB()
  const today = getLocalDateString()

  if (date > today) {
    throw new Error('You cannot mark a future day as a rest day.')
  }

  const goalResult = database.exec('SELECT completed, failed FROM goals WHERE id = ?', [goalId])
  if (!goalResult.length || !goalResult[0].values.length) {
    throw new Error('Goal not found.')
  }
  const [completed, failed] = goalResult[0].values[0]
  if (completed === 1 || failed === 1) {
    throw new Error('Rest days can only be set for active goals.')
  }

  const existing = database.exec(
    'SELECT id, is_completed, is_excused FROM goal_completions WHERE goal_id = ? AND date = ?',
    [goalId, date]
  )
  if (existing.length > 0 && existing[0].values.length > 0) {
    const [rowId, isCompleted, isExcused] = existing[0].values[0]
    if (isCompleted === 1) {
      throw new Error('This slot is already checked and cannot be changed.')
    }
    if (isExcused === 1) {
      // Undo rest day — remove the row entirely since nothing else is stored.
      database.run('DELETE FROM goal_completions WHERE id = ?', [rowId])
    } else {
      database.run('UPDATE goal_completions SET is_excused = 1 WHERE id = ?', [rowId])
    }
  } else {
    database.run(
      'INSERT INTO goal_completions (goal_id, date, is_completed, is_excused) VALUES (?, ?, 0, 1)',
      [goalId, date]
    )
  }

  saveDB()
  await recalculateGoalProgress(goalId)
  return true
}

async function getTodayOpenGoals() {
  const database = await getDB()
  const today = getLocalDateString()
  const now = new Date()

  const goalsResult = database.exec(
    'SELECT id, title, time, start_date, target_date, frequency, scheduled_days FROM goals WHERE completed = 0 AND failed = 0'
  )
  const goals = goalsResult.length > 0 ? goalsResult[0].values : []
  const open = []

  for (const row of goals) {
    const [id, title, time, startDate, targetDate, frequency, scheduledDays] = row
    if (startDate && startDate > today) continue
    if (targetDate && targetDate < today) continue
    if (!isDayScheduled(now.getDay(), frequency, scheduledDays)) continue

    const state = database.exec(
      'SELECT is_completed, is_excused FROM goal_completions WHERE goal_id = ? AND date = ?',
      [id, today]
    )
    const isCompleted = state.length > 0 && state[0].values.length > 0 && state[0].values[0][0] === 1
    const isExcused = state.length > 0 && state[0].values.length > 0 && state[0].values[0][1] === 1
    if (isCompleted || isExcused) continue

    open.push({ id, title, time })
  }

  return open
}

async function getMeasurableDayCount(goalId) {
  const database = await getDB()
  const goalResult = database.exec(
    'SELECT start_date, target_date, frequency, scheduled_days FROM goals WHERE id = ?',
    [goalId]
  )
  if (!goalResult.length || !goalResult[0].values.length) return 0
  const [startDate, targetDate, frequency, scheduledDays] = goalResult[0].values[0]
  if (!startDate || !targetDate) return 0

  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(targetDate + 'T00:00:00')
  let scheduled = 0
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (isDayScheduled(d.getDay(), frequency, scheduledDays)) scheduled++
  }
  if (scheduled === 0) return 0

  const excusedRes = database.exec(
    'SELECT COUNT(*) FROM goal_completions WHERE goal_id = ? AND is_excused = 1 AND date >= ? AND date <= ?',
    [goalId, startDate, targetDate]
  )
  const excused = excusedRes[0]?.values[0][0] || 0
  return Math.max(0, scheduled - excused)
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

  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(targetDate + 'T00:00:00')

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

  // Rest days are removed from the denominator — they don't count against progress.
  const excusedResult = database.exec(
    'SELECT COUNT(*) FROM goal_completions WHERE goal_id = ? AND is_excused = 1 AND date >= ? AND date <= ?',
    [goalId, startDate, targetDate]
  )
  const excusedCount = excusedResult[0]?.values[0][0] || 0
  const measurableCount = totalScheduledCount - excusedCount

  if (measurableCount <= 0) {
    // Every scheduled day is excused — nothing to measure, never auto-fail.
    database.run('UPDATE goals SET progress = 0 WHERE id = ?', [goalId])
    saveDB()
    return
  }

  const progress = Math.min(100, Math.round((completedCount / measurableCount) * 100))

  // Just update progress. evaluateGoals() will handle marking completed/failed.
  database.run(
    'UPDATE goals SET progress = ? WHERE id = ?',
    [progress, goalId]
  )

  saveDB()
}

function isDayScheduled(dayOfWeek, frequency, scheduledDaysStr) {
  const parseDays = (str, fallback) => {
    try {
      const parsed = str ? JSON.parse(str) : fallback
      return Array.isArray(parsed) ? parsed : fallback
    } catch {
      return fallback
    }
  }

  switch (frequency) {
    case 'daily': return true
    case 'weekdays': return dayOfWeek >= 1 && dayOfWeek <= 5
    case 'weekends': return dayOfWeek === 0 || dayOfWeek === 6
    case '3x': {
      const days = parseDays(scheduledDaysStr, [1, 3, 5])
      return days.includes(dayOfWeek)
    }
    case 'custom': {
      if (!scheduledDaysStr) return true
      return parseDays(scheduledDaysStr, []).includes(dayOfWeek)
    }
    default: return true
  }
}

async function getTodayGoalStats() {
  const database = await getDB()
  const today = getLocalDateString()
  const now = new Date()

  // Count only goals that actually have a slot today:
  // active + within start/target window + scheduled for this weekday.
  const goalsResult = database.exec(`
    SELECT id, start_date, target_date, frequency, scheduled_days
    FROM goals WHERE completed = 0 AND failed = 0
  `)
  const goals = goalsResult.length > 0 ? goalsResult[0].values : []

  if (goals.length === 0) {
    return { completed: 0, scheduled: 0, percentage: 0 }
  }

  const scheduledIds = goals
    .filter(row => {
      const [id, startDate, targetDate, frequency, scheduledDays] = row
      if (startDate && startDate > today) return false
      if (targetDate && targetDate < today) return false
      return isDayScheduled(now.getDay(), frequency, scheduledDays)
    })
    .map(row => row[0])

  if (scheduledIds.length === 0) {
    return { completed: 0, scheduled: 0, percentage: 0 }
  }

  // Rest days don't count as required slots today.
  const excusedResult = database.exec(
    'SELECT COUNT(*) FROM goal_completions WHERE goal_id IN (' +
    scheduledIds.map(() => '?').join(',') + ') AND date = ? AND is_excused = 1',
    [...scheduledIds, today]
  )
  const excused = excusedResult.length > 0 ? excusedResult[0].values[0][0] : 0
  const effectiveScheduled = scheduledIds.length - excused
  if (effectiveScheduled <= 0) {
    return { completed: 0, scheduled: 0, percentage: 0 }
  }

  const completedResult = database.exec(
    'SELECT COUNT(*) as count FROM goal_completions WHERE goal_id IN (' +
    scheduledIds.map(() => '?').join(',') + ') AND date = ? AND is_completed = 1',
    [...scheduledIds, today]
  )
  const completed = completedResult.length > 0 ? completedResult[0].values[0][0] : 0

  return {
    completed: completed,
    scheduled: effectiveScheduled,
    percentage: Math.round((completed / effectiveScheduled) * 100)
  }
}

/**
 * ==================== STATS ====================
 */

async function getDashboardStats() {
  const database = await getDB()

  // All-time checked slots across all goals (real CheckMarked data, not the obsolete `checkmarks` table)
  const checkmarksResult = database.exec('SELECT COUNT(*) as count FROM goal_completions WHERE is_completed = 1')
  const checkmarksCount = checkmarksResult.length > 0 ? checkmarksResult[0].values[0][0] : 0

  const journalResult = database.exec('SELECT COUNT(*) as count FROM journal')
  const journalCount = journalResult.length > 0 ? journalResult[0].values[0][0] : 0

  const today = getLocalDateString()
  const contributionResult = database.exec('SELECT COUNT(*) as count FROM goal_completions WHERE date = ? AND is_completed = 1', [today])
  const contributionCount = contributionResult.length > 0 ? contributionResult[0].values[0][0] : 0

  return {
    checkmarks_done: checkmarksCount,
    journal_entries: journalCount,
    contributions_today: contributionCount
  }
}

/**
 * ==================== ACHIEVEMENT BADGES ====================
 */

const BADGE_DEFS = [
  { id: 'first-goal',           name: 'First Goal',        description: 'Create your first goal',             icon: '🎯', target: 1,   metric: 'goals' },
  { id: 'first-checkin',        name: 'First Check-in',    description: 'Complete your first check-in',       icon: '✅', target: 1,   metric: 'checkins' },
  { id: 'checkins-10',          name: 'Getting Consistent',description: 'Complete 10 check-ins',              icon: '🔟', target: 10,  metric: 'checkins' },
  { id: 'checkins-50',          name: 'Habit Builder',     description: 'Complete 50 check-ins',              icon: '🏗️', target: 50,  metric: 'checkins' },
  { id: 'checkins-100',         name: 'Kaizen Spirit',     description: 'Complete 100 check-ins',             icon: '💯', target: 100, metric: 'checkins' },
  { id: 'streak-7',             name: '7-Day Warrior',     description: 'Achieve a 7-day streak',             icon: '🔥', target: 7,   metric: 'longest_streak' },
  { id: 'streak-30',            name: 'Unstoppable',       description: 'Achieve a 30-day streak',            icon: '🚀', target: 30,  metric: 'longest_streak' },
  { id: 'first-completed-goal', name: 'Goal Crusher',      description: 'Complete your first goal',           icon: '🏆', target: 1,   metric: 'completed_goals' },
  { id: 'goals-5',              name: 'Goal Getter',       description: 'Complete 5 goals',                   icon: '🏅', target: 5,   metric: 'completed_goals' },
  { id: 'journals-10',          name: 'Reflector',         description: 'Write 10 journal entries',           icon: '📓', target: 10,  metric: 'journals' },
  { id: 'journals-25',          name: 'Deep Thinker',      description: 'Write 25 journal entries',           icon: '🧠', target: 25,  metric: 'journals' },
  { id: 'perfect-week',         name: 'Perfect Week',      description: 'Check in on all 7 days of a week',   icon: '🌟', target: 1,   metric: 'perfect_weeks' }
]

async function getBadgeStats() {
  const database = await getDB()

  const goalsRes = database.exec('SELECT COUNT(*) FROM goals')
  const goals = goalsRes[0]?.values[0][0] || 0

  const checkinsRes = database.exec('SELECT COUNT(*) FROM goal_completions WHERE is_completed = 1')
  const checkins = checkinsRes[0]?.values[0][0] || 0

  const completedRes = database.exec('SELECT COUNT(*) FROM goals WHERE completed = 1')
  const completedGoals = completedRes[0]?.values[0][0] || 0

  const journalsRes = database.exec('SELECT COUNT(*) FROM journal')
  const journals = journalsRes[0]?.values[0][0] || 0

  const { longest } = await getStreakStats()

  // Perfect weeks: any Mon-Sun week (last 12 months) with a check-in on all 7 days.
  const start = new Date()
  start.setFullYear(start.getFullYear() - 1)
  const startStr = getLocalDateString(start)
  const datesRes = database.exec(
    'SELECT DISTINCT date FROM goal_completions WHERE is_completed = 1 AND date >= ?',
    [startStr]
  )
  const dates = datesRes.length > 0 ? datesRes[0].values.map(r => r[0]) : []
  const weekCounts = new Map()
  for (const ds of dates) {
    const d = new Date(ds + 'T12:00:00')
    const dow = d.getDay()
    const monday = new Date(d)
    monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
    const key = getLocalDateString(monday)
    weekCounts.set(key, (weekCounts.get(key) || 0) + 1)
  }
  let perfectWeeks = 0
  for (const count of weekCounts.values()) {
    if (count === 7) perfectWeeks++
  }

  const metrics = {
    goals,
    checkins,
    completed_goals: completedGoals,
    journals,
    longest_streak: longest,
    perfect_weeks: perfectWeeks
  }

  return BADGE_DEFS.map(def => {
    const value = metrics[def.metric] || 0
    return {
      ...def,
      unlocked: value >= def.target,
      progress: Math.min(value, def.target)
    }
  })
}

/**
 * ==================== EXPORT / IMPORT ====================
 */

const EXPORT_TABLES = ['goal_labels', 'user_profile', 'goals', 'goal_completions', 'journal', 'notifications', 'kai_chat']
const IMPORT_DELETE_ORDER = ['notifications', 'goal_completions', 'journal', 'kai_chat', 'goals', 'goal_labels', 'user_profile']

function isSafeIdentifier(name) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name)
}

async function exportAllData(filePath) {
  const database = await getDB()
  const out = {
    app: 'kaizen',
    version: 1,
    exported_at: new Date().toISOString(),
    tables: {}
  }
  for (const table of EXPORT_TABLES) {
    const colsRes = database.exec(`PRAGMA table_info(${table})`)
    const columns = colsRes.length > 0 ? colsRes[0].values.map(r => r[1]) : []
    const rowsRes = database.exec(`SELECT * FROM ${table}`)
    const rows = rowsRes.length > 0 ? rowsRes[0].values : []
    out.tables[table] = { columns, rows }
  }
  fs.writeFileSync(filePath, JSON.stringify(out, null, 2), 'utf8')
  return { filePath, tables: EXPORT_TABLES }
}

async function importAllData(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8')
  let data
  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error('This file is not valid JSON.')
  }
  if (!data || data.app !== 'kaizen' || !data.tables || typeof data.tables !== 'object') {
    throw new Error('Invalid Kaizen backup file.')
  }
  for (const table of EXPORT_TABLES) {
    const t = data.tables[table]
    if (!t || !Array.isArray(t.columns) || !Array.isArray(t.rows)) {
      throw new Error(`Backup is missing table: ${table}`)
    }
    for (const col of t.columns) {
      if (!isSafeIdentifier(col)) {
        throw new Error(`Backup has an invalid column name in ${table}.`)
      }
    }
  }

  const database = await getDB()
  for (const table of IMPORT_DELETE_ORDER) {
    database.run(`DELETE FROM ${table}`)
  }
  for (const table of EXPORT_TABLES) {
    const { columns, rows } = data.tables[table]
    if (columns.length === 0) continue
    const placeholders = columns.map(() => '?').join(', ')
    const colList = columns.join(', ')
    const stmt = `INSERT INTO ${table} (${colList}) VALUES (${placeholders})`
    for (const row of rows) {
      database.run(stmt, row)
    }
  }
  saveDB()
  await initializeDefaultLabels()
  await evaluateGoals()
  return true
}

async function resetAllData() {
  const database = await getDB()
  const tables = [
    'notifications',
    'goal_completions',
    'goals',
    'journal',
    'goal_labels',
    'user_profile',
    'kai_chat'
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
  // Streak & Contributions
  getContributionData,
  getStreakStats,
  getWeeklySummary,
  // Journal
  getLocalDateString,
  hasJournalForDate,
  addJournalEntry,
  getTodayJournal,
  getJournalByDate,
  getAllJournalEntries,
  searchJournalEntries,
  getMoodAnalytics,
  getJournalEntriesBetween,
  deleteJournalEntry,
  // Notifications
  addNotification,
  getNotifications,
  markNotificationRead,
  // Kai Chat
  getKaiChatHistory,
  addKaiChatMessage,
  clearKaiChatHistory,
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
  forceCompleteGoal,   // ✅ fixed typo
  // Goal Labels
  initializeDefaultLabels,
  getAllLabels,
  addCustomLabel,
  deleteLabel,
  getTopLabels,
  // Goal Tracking Grid
  getGoalTrackingGrid,
  toggleGoalCompletion,
  toggleRestDay,
  recalculateGoalProgress,
  isDayScheduled,
  getTodayGoalStats,
  getTodayOpenGoals,
  getMeasurableDayCount,
  // Stats
  getDashboardStats,
  getBadgeStats,
  exportAllData,
  importAllData,
  resetAllData
}