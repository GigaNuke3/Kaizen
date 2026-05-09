const initSqlJs = require('sql.js')
const path = require('path')
const fs = require('fs')

const DB_PATH = path.join(__dirname, 'kaizen.db')

async function initDB() {
  const SQL = await initSqlJs()
  
  // Load existing DB or create new one
  let db
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (date('now'))
    );

    CREATE TABLE IF NOT EXISTS journal (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT,
      date TEXT DEFAULT (date('now'))
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (date('now'))
    );

    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (date('now'))
    );

    CREATE TABLE IF NOT EXISTS daily_checklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER,
      date TEXT DEFAULT (date('now')),
      completed INTEGER DEFAULT 0
    );
  `)

  // Save to disk
  const data = db.export()
  fs.writeFileSync(DB_PATH, Buffer.from(data))
  
  console.log('✅ Database ready!')
  return db
}

module.exports = initDB