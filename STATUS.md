# 改善 Kaizen — Project Status

**Last Updated:** June 16, 2026
**Version:** 1.0.0
**Status:** 🔧 ACTIVE DEVELOPMENT — Core mechanics fixed, pending test run

---

## Current State

All core systems have been audited and fixed. The app is past initial scaffolding and into a stable, logic-correct state. A full test run on Fedora KDE Plasma is the next step before any distribution consideration.

---

## ✅ What's Working

### Backend (`database/backend.js`)
- ✅ Database initialization with sql.js SQLite
- ✅ Auto-migration on startup — adds missing columns to existing DBs without requiring a reset
- ✅ `goals` table: explicit `SELECT` columns, `label` column, `label_id` migration
- ✅ `journal` table: `goal_id` column links each entry to a specific goal
- ✅ `toggleGoalCompletion`: enforces 3 hard rules (today-only, no-uncheck, per-goal journal gate)
- ✅ `recalculateGoalProgress`: denominator is total scheduled days across full window (start → target)
- ✅ `hasJournalForDate(date, goalId)`: per-goal journal check
- ✅ `addJournalEntry(content, mood, time, date, goalId)`: stores goal link
- ✅ `getTopLabels`: queries real `label` column — powers dashboard spider chart
- ✅ `evaluateGoals`: called on startup + every 60 seconds via interval
- ✅ 50+ async functions with try-catch error handling
- ✅ Persistent storage in `database/kaizen.db`

### Frontend (`src/js/`)
- ✅ Dashboard: contribution grid, radar chart (real label data), journal preview, stats
- ✅ Goals: create/edit modal with label, frequency, color, time window, start/end dates
- ✅ Goals: date validation — start and end dates must land on valid frequency days
- ✅ Goals: Save button disabled with inline errors until dates are valid
- ✅ CheckMarked: 365-day tracking grid, per-goal frequency rendering
- ✅ CheckMarked: each slot requires its own journal entry before check-in
- ✅ CheckMarked: past slots permanently closed, checked slots cannot be undone
- ✅ CheckMarked: goals stop rendering at their own target_date (hidden cells for layout alignment)
- ✅ CheckMarked: auto-scrolls to today's column on load
- ✅ Completed Goals: uses correct `cg-*` CSS classes from `completed_goals.css`
- ✅ Failed Goals: shows failure rate (100 - progress%) not completion rate
- ✅ Journal: entries saved with `goal_id` when triggered from CheckMarked flow
- ✅ Notifications: unread count badge uses correct array index `n[5]`
- ✅ Sidebar badges: all three broken badges fixed (notifications, checkmarked, journal)
- ✅ Profile: settings, stats, clear data

### Main Process (`main.js`)
- ✅ `setupKaiFirstLaunch`: cross-platform ollama paths (Windows + Linux)
- ✅ `setupKaiFirstLaunch`: uses settings file instead of missing `electron-store`
- ✅ `setupKaiFirstLaunch`: wired into `did-finish-load` — actually called now
- ✅ `exec` required at top of file, not mid-file
- ✅ IPC handlers for `add-journal-entry` and `has-journal-for-date` pass `goalId`
- ✅ Goal evaluation interval runs every 60 seconds

### Kai AI Companion (`ollama.js` / `ollama_journal.js`)
- ✅ Streaming response with blinking cursor
- ✅ Graceful offline state when Ollama not running
- ✅ Responds after each journal save in the journal flow

---

## 🗑️ Removed / Obsolete

- ❌ **Habits page** — removed entirely. No habits table references remain in active pages.
- ❌ **electron-store** — removed as a dependency. Settings now use a local JSON file via `loadAppSettings()` / `saveAppSettings()`
- ❌ `db.js` — legacy DB helper, unused, can be deleted
- ❌ `CHECKMARKED_REBUILD.md` — deleted, superseded by this status doc

---

## 📁 Current File Structure

```
/home/eco/Kaizen/
├── main.js                        # Electron main process
├── index.html                     # App shell
├── package.json
├── src/
│   ├── js/
│   │   ├── api.js                 # IPC wrapper
│   │   ├── dashboard.js           # Dashboard
│   │   ├── goals.js               # Goals + modal with date validation
│   │   ├── checkmarked.js         # CheckMarked grid
│   │   ├── completed_goals.js     # Completed Goals (cg-* classes)
│   │   ├── failed_goals.js        # Failed Goals (failure rate display)
│   │   ├── journal.js             # Journal (goal_id linked entries)
│   │   ├── notification.js        # Notifications
│   │   ├── profile.js             # Profile + settings
│   │   ├── sidebar-badges.js      # Sidebar badge counts
│   │   ├── ollama.js              # Kai AI core
│   │   └── ollama_journal.js      # Kai page renderer
│   └── css/
│       ├── style.css
│       ├── layout.css
│       ├── dashboard.css
│       ├── goals.css
│       ├── checkmarked.css
│       ├── completed_goals.css
│       ├── failed_goals.css
│       ├── journal.css
│       ├── notification.css
│       └── profile.css
├── database/
│   ├── backend.js
│   └── kaizen.db                  # Auto-created on first run
└── assets/
    └── icons/
```

---

## 🗄️ Database Tables

| Table | Key Columns | Notes |
|-------|------------|-------|
| `goals` | `id, title, label, frequency, scheduled_days, start_date, target_date, completed, failed, progress, color, icon, time` | `label` added via migration |
| `goal_completions` | `id, goal_id, date, is_completed` | Immutable once `is_completed = 1` |
| `goal_labels` | `id, name, is_custom` | Drives label dropdown in goal modal |
| `journal` | `id, content, date, time, mood, goal_id` | `goal_id` added via migration |
| `notifications` | `id, goal_id, message, type, created_at, read` | type = 'completed' or 'failed' |
| `user_profile` | `id, name, tagline` | Single row |

---

## 🔧 Technology Stack

| Tool | Version | Role |
|------|---------|------|
| Electron | v42.0.0 | Desktop framework |
| sql.js | v1.14.1 | Pure JS SQLite |
| Chart.js | v4.5.1 | Radar chart |
| node-cron | v4.2.1 | Goal evaluation scheduling |
| Ollama | llama3.2:latest | Local AI (Kai companion) |
| Node.js | v22.x | Runtime |

---

## ⚠️ Known Limitations

- Single-user only — no authentication
- Profile name/tagline stored in `localStorage` (survives DB reset)
- No data export yet
- node-cron only used for `evaluateGoals` interval — time-based reminders not yet wired
- Ollama requires manual install and `ollama serve` to be running for Kai

---

## 🚀 Quick Commands

```fish
# Start (Linux/Fedora)
npm start

# Fresh start — wipes all data
rm database/kaizen.db && npm start

# Switch OS — rebuild node_modules
rm -rf node_modules && npm install && npm start

# Check Electron version
npx electron --version
```

---

## 🔜 Next Steps

1. **Test run** on Fedora KDE Plasma — `rm database/kaizen.db && rm -rf node_modules && npm install && npm start`
2. Verify CheckMarked grid slot locking and journal gate end-to-end
3. Verify goal date validation in create/edit modal
4. Verify spider chart populates with real label data
5. Verify sidebar badges update correctly
6. Extended testing before any distribution consideration

---

**Philosophy:** Kaizen (改善) — continuous improvement through small, incremental changes.