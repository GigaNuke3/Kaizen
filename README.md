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

### 🎨 Pixel Look
- Every icon is an animated 16×16 pixel sprite (`src/js/pixel-icons.js`); edit the row strings to change the art
- Mood emojis are Kai/Zun faces; dark, light, or match-system theme (Profile → Settings)
- Pixel-styled dialogs and an Undo toast instead of "Are you sure?" for deletes

### 🌱 Living Companion & Kaizen Compounding
- Pick Kai or Zun in Profile — a pixel companion whose mood reacts to your real progress on the Dashboard
- Journal replies mirror the mood you chose for the entry
- Kaizen meter: 1% better on every day you check in, compounded (`1.01^days`)
- Companion ranks up at 7 / 30 / 100 / 365 check-in days (Apprentice → Adept → Master → Sensei)
- Year in Pixels: 12 months × 31 days, each square colored by that day's mood

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
- Toggle desktop notifications, navigation sounds, and daily reminders on/off
- Back up or restore all app data as JSON
- Clear all app data (irreversible)

### 🔥 Streaks & Weekly Summary
- Current streak and all-time longest streak on the Dashboard
- This Week card: check-ins, journal entries, goal completion %, top mood

### 📊 Mood Analytics & Journal Search
- Mood trend chart (last 90 days) and mood distribution on the Journal page
- Search journal entries by text and filter by mood

### 🏅 Achievement Badges
- 12 badges: first goal, check-in milestones, streaks, completed goals, journaling, perfect week
- Dedicated Badges page showing locked/unlocked progress

### 🌴 Rest Days
- Mark any past missed or today's scheduled slot as a rest day (reversible)
- Excused days are removed from goal progress — missed days no longer permanently sink a goal

### 🖥️ Desktop Integration
- Closing the window keeps Kaizen in the tray (today's open goals in the tray menu) so reminders keep firing
- Optional launch at login (starts in the tray); only one Kaizen runs at a time
- Keyboard: Ctrl+1–9 switch pages, Ctrl+0 Profile, Ctrl+N new journal entry; sidebar works with Tab + Enter

### 💾 Backup, Restore & Export
- Export all data (goals, check-ins, journal, labels, notifications, Kai chat) to a JSON file
- Restore from a backup file — replaces current data after confirmation
- Automatic daily backup, last 7 kept (Profile → Open daily backups folder)
- Export the journal to Markdown or PDF (Journal → Export)

### ⏰ Daily Reminders
- Optional daily summary reminder at a time you choose
- Per-goal reminder at each goal's own time window

### 🗓️ Weekly Review
- Week at a glance, a 7-day pixel strip, per-goal results, the one goal worth adjusting, and Kai's take
- Open it from the dashboard's This Week card, or from the Sunday notification

### 🤖 Kai Chat
- Persistent multi-turn chat with Kai on the Companion page
- Weekly Insight button — Kai summarizes your last 7 days of journal + stats
- Kai knows your active goals, today's check-ins and your streak
- Kaizen starts the local Ollama server itself when Kai needs it

### 🔊 Navigation Sounds
- Synthesized page-click sounds (bell, digital, arrow, pencil, trophy, fail, book, robot) via Web Audio — no audio files needed
- Toggleable in Profile settings

---

## 🚀 Getting Started

### Download
Grab the installer for your OS from the [Releases page](https://github.com/GigaNuke3/Kaizen/releases/latest) — `.exe` (Windows), `.dmg` (macOS; `arm64` = Apple Silicon), `.AppImage` / `.deb` / `.rpm` (Linux).

### Installation
```bash
npm install
npm start      # run the app
npm test       # run the checks
npm run build  # build installers into dist/
```

### Fresh Start (reset database)
```bash
rm database/kaizen.db
npm start
```

---

## 💻 Windows, macOS & Linux

Kaizen runs on all three. `npm start` works everywhere (the `--ozone-platform=x11` flag only affects Linux).

### Installers

| OS | Installer | Build command |
|----|-----------|---------------|
| Windows | `Kaizen Setup x.y.z.exe` (NSIS) | `npm run build:win` |
| macOS | `.dmg` + `.zip` | `npm run build:mac` (must run on a Mac) |
| Linux | `.AppImage` (any distro), `.deb` (Debian/Ubuntu), `.rpm` (Fedora) | `npm run build:linux` (`.rpm` needs `rpm-build`) |

`npm run build` builds for the OS you're on. To get **all three at once**, use GitHub Actions
(`.github/workflows/build.yml`): push a tag (`git tag v1.2.0 && git push --tags`) or run
"Build installers" from the Actions tab, then download the installers from the run's Artifacts.

### Per-OS notes

- **Windows:** the installer is unsigned, so SmartScreen may warn — click *More info → Run anyway*.
- **macOS:** the app is unsigned — the first time, right-click Kaizen → *Open*. Keeps a minimal menu bar so Cmd+C/V/Q work.
- **Linux (GNOME):** the tray icon needs the *AppIndicator* extension; KDE and most other desktops show it natively.
- **Kai (Ollama):** found automatically in the default install locations on every OS (Ollama.app and Homebrew on macOS).

### Moving the project between computers

Electron downloads a platform-specific binary, so after copying the project to another OS, reinstall dependencies:
`rm -rf node_modules && npm install` (Windows CMD: `rd /s /q node_modules && npm install`).
Your code, database and assets are untouched.

---

## 🔄 Workflow

### Daily Check-in
1. Open app → Dashboard shows today's status
2. Go to **CheckMarked** — see today's open goal slots
3. Click a goal slot → prompted to write a journal entry for that goal
4. Write your entry → slot is checked automatically
5. Repeat for each goal that has an open slot today

### Weekly Review
1. On Sunday, click the **weekly review** notification (or Dashboard → This Week → Weekly review)
2. Look at the week's pixel strip and per-goal results
3. Adjust the one goal it suggests, if any
4. Ask Kai for a weekly insight

### Creating a Goal
1. Go to **Goals** → click **+ New Goal**
2. Enter title, select a label, choose frequency
3. Pick a color and time window
4. Set Checklist Opens (Start Date) — must land on a valid frequency day
5. Set Checklist Closes (Target Date) — must land on a valid frequency day
6. Save — goal appears in CheckMarked immediately

---

## 💾 Data Storage

All data is stored locally in SQLite via `sql.js` — no cloud, no tracking, no accounts:
- Development (`npm start`): `database/kaizen.db` (git-ignored)
- Installed app: `kaizen.db` in the app's user-data folder (`~/.config/Kaizen` on Linux)
- Daily backups: `backups/` next to the database (last 7 kept)
- Saves are atomic (temp file + rename), so a crash mid-save can't corrupt the database

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
| `kai_chat` | Kai companion chat history |

---

## 📁 File Structure

```
Kaizen/
├── main.js                  # Electron main process: IPC, tray, reminders, backups, Ollama
├── index.html               # App shell, sidebar, page router, shortcuts, theme
├── src/
│   ├── preload.js           # contextBridge API exposed to the renderer
│   ├── js/
│   │   ├── utils.js         # Shared helpers: dates, escaping, dialogs, undo, page header
│   │   ├── pixel-icons.js   # Pixel sprite art + px() renderer
│   │   ├── dashboard.js     # Dashboard, companion ranks, Year in Pixels
│   │   ├── review.js        # Weekly Review page
│   │   ├── goals.js · checkmarked.js · completed_goals.js · failed_goals.js
│   │   ├── journal.js · notification.js · badges.js · profile.js
│   │   ├── ollama.js · ollama_journal.js   # Kai (Ollama) chat + journal replies
│   │   └── sidebar-badges.js · sounds.js
│   └── css/                 # style.css (global) + one stylesheet per page
├── database/backend.js      # All DB functions (sql.js)
├── test/                    # npm test (node:test)
└── assets/                  # Kai/Zun sprites, Pixelify Sans font, app icon
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|---------|
| App won't start | `rm -rf node_modules && npm install && npm start` |
| Blank screen / JS error | Add `win.webContents.openDevTools()` after `win.loadFile(...)` in `main.js` |
| Database errors | `rm database/kaizen.db` then `npm start` for a fresh schema |
| Kai is offline | Install Ollama; Kaizen starts its server. If it still fails, run `ollama serve` to see why |
| Wrong platform binary | `rm -rf node_modules && npm install` after switching OS |
| No tray icon on GNOME | Install the AppIndicator extension |

---

## 📈 Planned Future Features

- 🎨 Hand-tuned light theme (today's is the dark theme inverted)
- 📱 Mobile companion app

---

## 📄 License

[MIT](LICENSE) — free to use, modify and share.

## 🙏 Philosophy

Built on the philosophy of **Kaizen** (改善) — continuous improvement through small, consistent, incremental steps.

---

*Last Updated: October 13, 2026*
*Version: 1.2.0*