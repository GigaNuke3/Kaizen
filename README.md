# 改善 Kaizen - Self-Improvement App

Your personal self-improvement companion built with Electron. Track goals, journal your progress, and review your achievements — all stored locally, no cloud, no tracking.

---

## 🎯 Features

### 📊 Dashboard
- GitHub-style contribution grid showing activity across the last 12 months
- Radar/spider chart of your top 5 goal labels
- Today's journal entry preview
- Real-time stats: checkmarks done, today's actions, journal entries

### 🎯 Goals
- Create goals with a title, label, frequency, color, and time window
- Five frequency types: Daily, Weekdays, Weekends, 3x per week, Custom days
- Checklist Opens (Start Date) and Checklist Closes (Target Date) — both validated against your chosen frequency so invalid dates are caught before saving
- Progress calculated against total scheduled days across the full goal window
- Labels power the dashboard spider chart — group goals by category (Fitness, Study, etc.)

### 📝 CheckMarked — Goal Tracking Grid
- All active goals displayed as rows in a tracking grid spanning each goal's date window
- Slots open only on scheduled frequency days within the goal's date window
- Each slot requires a journal entry written specifically for that goal before it can be checked
- Checked slots are permanent — cannot be unchecked
- Past unchecked slots are permanently closed after midnight
- Goals with shorter windows stop at their own target date; layout stays aligned

### 📓 Journal
- Write daily reflections linked to specific goals
- Mood tracking: 😢 😐 🙂 😄 🚀
- Each journal entry is tied to a goal when written from the CheckMarked flow
- Kai AI companion responds below each saved entry (requires Ollama running locally)

### 🤖 Kai — AI Companion
- Powered by Ollama running `llama3.2:latest` locally
- Reads your journal entry and responds with empathy in 2–3 sentences
- Works completely offline after initial model download
- Shows offline state gracefully when Ollama is not running

### ✅ Completed Goals
- Goals move here automatically when their target date passes and all scheduled slots are filled
- Displays completion rate, duration, frequency, and completion date
- Goals can be restored to active or permanently deleted

### ❌ Failed Goals
- Shows goals with missed (permanently closed) slots
- Displays failure rate (100 - completion%) and missed day count
- Hard-failed goals (deadline passed) shown with DEADLINE PASSED badge
- Goals can be restored to active or permanently deleted

### 🔔 Notifications
- Desktop notifications when goals are completed or failed
- In-app notification list with unread badges in sidebar
- Notifications can be toggled off in Profile settings

### 👤 Profile
- Edit name and tagline
- View stats: active goals, completed goals, journal entries, today's actions
- Toggle desktop notifications on/off
- Clear all app data (irreversible)

---

## 🚀 Getting Started

### Installation
```bash
cd /home/eco/Kaizen
npm install
npm start
```

### Fresh Start (reset database)
```bash
rm database/kaizen.db
npm start
```

---

## 🔄 Switching Between Operating Systems

Electron bundles a platform-specific binary. When switching OS, always refresh `node_modules`:

**Windows → Linux (Fish shell):**
```fish
rm -rf node_modules
npm install
npm start
```

**Linux → Windows (CMD):**
```cmd
rd /s /q node_modules
npm install
npm start
```

Your code, database, and assets are untouched — only `node_modules` needs to be rebuilt.

---

## 🔄 Workflow

### Daily Check-in
1. Open app → Dashboard shows today's status
2. Go to **CheckMarked** — see today's open goal slots
3. Click a goal slot → prompted to write a journal entry for that goal
4. Write your entry → slot is checked automatically
5. Repeat for each goal that has an open slot today

### Weekly Review
1. Go to **Goals** — review active goals and progress percentages
2. Go to **Completed Goals** — see what you've achieved
3. Go to **Failed Goals** — review missed slots and failure rates
4. Adjust or restore goals as needed

### Creating a Goal
1. Go to **Goals** → click **+ New Goal**
2. Enter title, select a label, choose frequency
3. Pick a color and time window
4. Set Checklist Opens (Start Date) — must land on a valid frequency day
5. Set Checklist Closes (Target Date) — must land on a valid frequency day
6. Save — goal appears in CheckMarked immediately

---

## 💾 Data Storage

All data is stored locally in `database/kaizen.db` using SQLite via `sql.js`:
- No cloud uploads, no tracking, no accounts
- Back up by copying `database/kaizen.db`
- Delete `kaizen.db` to start completely fresh

---

## 🏗️ Architecture

```
Frontend (HTML / CSS / Vanilla JS)
            ↓
    Preload (contextBridge / window.api)
            ↓
    IPC Bridge (Electron)
            ↓
    Backend (Node.js)
            ↓
  Database (SQLite / sql.js)
```

The renderer runs with `contextIsolation: true` and `nodeIntegration: false`; all privileged operations go through `src/preload.js`.

### Technology Stack

| Tool | Version | Role |
|------|---------|------|
| Electron | v42.0.0 | Desktop app framework |
| sql.js | v1.14.1 | Pure JS SQLite (no native bindings) |
| Chart.js | v4.5.1 | Radar/spider chart on dashboard |
| Node.js `setInterval` | — | Scheduled goal evaluation (every 60s) |
| Ollama | llama3.2 | Local AI for Kai companion |

### Database Tables

| Table | Purpose |
|-------|---------|
| `goals` | Goal definitions with frequency, dates, label, color, progress |
| `goal_completions` | Per-day check-in records per goal |
| `goal_labels` | Label definitions (custom + defaults) |
| `journal` | Journal entries linked to goals via `goal_id` |
| `notifications` | Goal completed/failed notification log |
| `user_profile` | Name and tagline |

---

## 📁 File Structure

```
/home/eco/Kaizen/
├── main.js                        # Electron main process + IPC handlers
├── index.html                     # App shell + page loader
├── package.json
├── src/
│   ├── preload.js                 # contextBridge API exposed to renderer
│   ├── js/
│   │   ├── utils.js               # Shared helpers (dates, HTML escaping)
│   │   ├── dashboard.js           # Dashboard page
│   │   ├── goals.js               # Goals page + create/edit modal
│   │   ├── checkmarked.js         # CheckMarked tracking grid
│   │   ├── completed_goals.js     # Completed Goals page
│   │   ├── failed_goals.js        # Failed Goals page
│   │   ├── journal.js             # Journal page
│   │   ├── notification.js        # Notifications page
│   │   ├── profile.js             # Profile page
│   │   ├── sidebar-badges.js      # Live badge counts on sidebar nav
│   │   ├── ollama.js              # Ollama API + Kai response streaming
│   │   └── ollama_journal.js      # Kai companion page renderer
│   └── css/
│       ├── style.css              # Base/global styles + app layout
│       ├── dashboard.css
│       ├── goals.css
│       ├── checkmarked.css
│       ├── completed_goals.css
│       ├── failed_goals.css
│       ├── journal.css
│       ├── notification.css
│       └── profile.css
├── database/
│   ├── backend.js                 # All DB functions (50+ async)
│   └── kaizen.db                  # Auto-created SQLite database
└── assets/
    └── icons/
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|---------|
| App won't start | `rm -rf node_modules && npm install && npm start` |
| Blank screen / JS error | Open DevTools in `main.js` by uncommenting `win.webContents.openDevTools()` |
| Database errors | `rm database/kaizen.db` then `npm start` for a fresh schema |
| Kai is offline | Run `ollama serve` in a terminal, then restart the app |
| Wrong platform binary | `rm -rf node_modules && npm install` after switching OS |

---

## 📈 Planned Future Features

- 🔔 Time-based reminders via node-cron
- 📊 Advanced analytics: streak tracking, weekly summaries
- 🎖️ Achievement badges
- 📤 Data export (JSON / CSV)
- 🎨 Multiple theme options
- 🗂️ Database backup and restore UI

---

## 📄 License

Personal project — free to use and modify.

## 🙏 Philosophy

Built on the philosophy of **Kaizen** (改善) — continuous improvement through small, consistent, incremental steps.

---

*Last Updated: June 16, 2026*
*Version: 1.0.0*