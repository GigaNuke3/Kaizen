# 改善 Kaizen — Project Status

**Last Updated:** October 13, 2026
**Version:** 1.2.0
**Status:** ✅ v1.2 — pixel UI, tray, daily backups, weekly review, journal export, light theme

---

## Current State

All core systems have been audited and fixed. The app is past initial scaffolding and into a stable, logic-correct state. A full test run on Fedora KDE Plasma is the next step before any distribution consideration.

---


## Process

Goals (created here)
    ↓
CheckMarked (daily check-in slots open based on frequency)
    ↓ each slot requires a Journal entry
Journal (written per goal, per day)
    ↓ slot gets checked after journal saved
    ↓
    ├── all slots checked before deadline → Completed Goals ✅
    └── missed slots / deadline passed → Failed Goals ❌


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
- ❌ `db.js` — legacy DB helper, deleted
- ❌ `CHECKMARKED_REBUILD.md` — deleted, superseded by this status doc

---

## 📁 Current File Structure

See the File Structure section in `README.md`.

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
| `kai_chat` | `id, role, content, created_at` | Kai companion chat history |

### v1.2 Additions (October 13, 2026)

- ✅ Pixel UI: animated 16×16 sprite icons, Mt Fuji logo/app icon, Kai/Zun mood faces, pixel scrollbars
- ✅ Shared page header on every page; redesigned Goals and Failed Goals; dark / light / system theme
- ✅ Tray + close-to-tray, single instance, launch at login (XDG autostart on Linux)
- ✅ Daily auto-backup (last 7), atomic DB saves, Content-Security-Policy
- ✅ Kai knows your goals; Ollama server auto-start; real Ollama errors shown
- ✅ Companion ranks, Year in Pixels, Weekly Review page + Sunday notification
- ✅ Journal export (Markdown / PDF), Undo toasts for deletes, in-app dialogs (fixes overdue-goal restore)
- ✅ Keyboard shortcuts and keyboard-accessible sidebar
- ✅ `npm test`: companion, pixel icons, journal export, weekly review

### v1.1 Additions (September 10, 2026)

- ✅ Dashboard: current/longest streak cards + This Week summary
- ✅ Journal: mood trend chart, mood distribution, search + mood filter
- ✅ Badges page: 12 achievement badges with progress
- ✅ Rest days: excused past/today slots excluded from progress denominator
- ✅ Backup/restore: JSON export/import via native dialogs in Profile
- ✅ Reminders: daily summary time + per-goal time notifications (app running only)
- ✅ Kai chat: persistent multi-turn chat + weekly insight generation
- ✅ Navigation sounds: Web Audio synthesis with Profile mute toggle

---

## 🔧 Technology Stack

| Tool | Version | Role |
|------|---------|------|
| Electron | v42.0.0 | Desktop framework |
| sql.js | v1.14.1 | Pure JS SQLite |
| Chart.js | v4.5.1 | Radar chart |
| Node.js `setInterval` | — | Goal evaluation scheduling (every 60s) |
| Ollama | llama3.2:latest | Local AI (Kai companion) |
| Node.js | v22.x | Runtime |

---

## ⚠️ Known Limitations

- Single-user only — no authentication
- Profile name/tagline stored in `localStorage` (survives DB reset; excluded from JSON backup)
- Reminders fire while Kaizen runs (window or tray); with launch-at-login on, that's whenever you're logged in
- Light theme is the dark theme inverted, so its colors aren't hand-tuned
- A delete is applied 6s after the Undo toast appears; quitting within those seconds cancels it
- Goal evaluation runs on a `setInterval` loop — time-based reminders use the same loop
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

1. Rebuild installers: `npm run build` (the old ones in `dist/` contain personal data)
2. If the repo is ever shared: remove `database/kaizen.db` from git history (`git filter-repo --path database/kaizen.db --invert-paths`)
3. Hand-tune the light theme by moving hardcoded colors into CSS variables

---

**Philosophy:** Kaizen (改善) — continuous improvement through small, incremental changes.