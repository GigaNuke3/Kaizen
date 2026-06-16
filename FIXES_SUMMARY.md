# Kaizen — Fixes Summary

**Session Date:** June 16, 2026
**Scope:** Full system audit and fix pass — core mechanics, UI, data integrity, cross-platform

---

## Priority 1 — `backend.js`: `toggleGoalCompletion` (Core Mechanic)

**Problem:** The slot toggle was a free flip — past slots could be edited, checked slots could be unchecked, and no journal was required. The entire CheckMarked system was broken by design.

**Fix — Three enforced rules:**

1. **Today-only gate:** `date !== today` throws immediately. Past and future slots cannot be touched.
2. **No-uncheck:** If `is_completed = 1` already exists for this `goal_id + date`, throws. Permanent.
3. **Per-goal journal gate:** A journal entry linked to this specific `goal_id` must exist for today before the slot can be checked. One journal per goal per day — not one journal unlocking all goals.

**Files:** `backend.js`, `checkmarked.js`, `journal.js`, `api.js`, `main.js`

---

## Priority 2 — `backend.js`: `recalculateGoalProgress`

**Problem:** Denominator was ambiguous — the old code used `SELECT *` positional indices which were fragile and previously caused real bugs.

**Fix:** Denominator is now explicitly the **total scheduled days across the full goal window** (start → target). Future days are not excluded — missed past days permanently reduce the final score. This is Option A (accurate, unforgiving).

Example: Gym goal Mon–Sun (7 days), 3 checked = 43%. The number only goes up as more days are checked.

**Files:** `backend.js`

---

## Priority 3 — `checkmarked.js`: Grid Rendering

**Problem:** Goals rendered clickable cells beyond their own `target_date`. Pending checks from previous days were never discarded. Cell clicks always showed the journal modal even when a journal already existed.

**Fixes:**
- Cells beyond a goal's `target_date` are `visibility:hidden` — invisible but take up space for layout alignment
- Pending check from a previous day (`pending.date !== today`) is discarded immediately on load — that slot is permanently closed
- Today cell click first checks `hasJournalForDate(date, goal.id)` — if journal exists, calls `toggleGoalCompletion` directly. Only shows the modal if no journal exists yet
- Grid auto-scrolls to today's column on render via `requestAnimationFrame`

**Files:** `checkmarked.js`

---

## Priority 4 — `completed_goals.js`: CSS Class Mismatch

**Problem:** `completed_goals.js` used `failed-goals-*` CSS classes throughout. `completed_goals.css` defined its own `cg-*` classes that were never used. The page looked identical to Failed Goals.

**Fix:** Full rewrite of `completed_goals.js` to use all `cg-*` classes — `cg-container`, `cg-header`, `cg-grid`, `cg-card`, `cg-btn-restore`, `cg-btn-delete`, `cg-stats-row`, `cg-empty`, `cg-error`, etc. Dead code (`getLocalDateStringCG`) removed.

**Files:** `completed_goals.js`

---

## Priority 5 — `failed_goals.js`: Wrong Metric Displayed

**Problem:** Failed Goals cards showed `progress%` (completion rate) — the wrong number for a failure page.

**Fix:**
- Progress bar now fills `100 - progress`% in red — visually shows how much was missed
- Meta row shows **Failure Rate** (red) and **Completion Rate** (gray) side by side
- Status badge now includes failure rate inline: `⚠️ 3 DAYS MISSED · 40% failed`

**Files:** `failed_goals.js`

---

## Priority 6 — Labels Not Saved to Goals

**Problem:** The `description` column was being misused as a label field. `getTopLabels` queried `description` and grouped by it — polluting the spider chart with freeform text. Labels selected in the goal modal were never actually saved to the database correctly.

**Fix:**
- Added `label TEXT DEFAULT ''` column to `goals` table via auto-migration
- `addGoal` / `updateGoal` now write to `label` column, not `description`
- `getAllGoals` / `getActiveGoals` use explicit `SELECT` column list — no more `SELECT *`
- `getTopLabels` now queries `GROUP BY label` on the `goals` table — spider chart shows real data
- `goals.js` card reads `goal[15]` for label (not `goal[2]`)
- `editGoal` restores label dropdown from `goal[15]`

**Files:** `backend.js`, `goals.js`, `api.js`

---

## Secondary 1 — `sidebar-badges.js`: Three Broken Badges

**Problem:** Three badge updaters were broken in different ways.

| Badge | Bug | Fix |
|-------|-----|-----|
| Notifications | Checked `n.read` (object property) on array row | Now checks `n[5]` |
| Checkmarked | Called `.filter()` on `{goals, dates, completions}` object | Now reads `grid.goals` and checks `grid.completions[goalId_today]` |
| Journal | Called `window.api.getJournalEntries()` which doesn't exist | Now calls `getAllJournalEntries(100)` and reads date from `entry[2]` |

**Files:** `sidebar-badges.js`

---

## Secondary 2 — `main.js`: Kai Setup Crash on Linux

**Problem:** `setupKaiFirstLaunch` used `new Store()` (electron-store never imported), `process.env.LOCALAPPDATA` (Windows-only), and was never called anywhere. Would crash on Linux.

**Fix:**
- Replaced `electron-store` with existing `loadAppSettings()` / `saveAppSettings()` — `kaiModelReady` flag now lives in `kaizen-settings.json`
- Cross-platform ollama paths: Windows checks `LOCALAPPDATA`, Linux checks `/usr/local/bin/ollama`, `/usr/bin/ollama`, `~/.local/bin/ollama`, then PATH
- `exec` moved to top of file with other requires (was required mid-file, below its first use)
- `setupKaiFirstLaunch(win)` now called inside `win.webContents.once('did-finish-load')` — actually runs on startup, non-blocking, with error catching

**Files:** `main.js`

---

## Secondary 3 — `api.js`: Parameter Naming

**Problem:** `addGoal` and `updateGoal` in `api.js` still used `description` as the second parameter name after backend renamed it to `label`.

**Fix:** Both methods updated to `label` — full call chain is now consistent: `goals.js → api.js → main.js IPC → backend.js`.

**Files:** `api.js`

---

## Secondary 4 — `dashboard.js`: Spider Chart Canvas Height

**Problem:** `maintainAspectRatio: false` with no explicit canvas height caused the chart to collapse to zero pixels. `Math.max(...data) * 1.2` produced `NaN` or `-Infinity` on empty or zero data.

**Fix:**
- Canvas height set explicitly to `340px` before Chart.js initializes
- Safe scale max: `Math.ceil(maxVal * 1.25)` with fallback of `5` if all values are zero
- `stepSize` added to keep tick marks as whole numbers

**Files:** `dashboard.js`

---

## Core Feature — Per-Goal Journal Requirement

**Problem:** The journal gate in CheckMarked was shared — one journal entry unlocked ALL goal slots for the day. Each goal should require its own dedicated journal entry.

**Fix — Full stack change:**

- `journal` table: `goal_id INTEGER` column added via auto-migration
- `hasJournalForDate(date, goalId)`: now checks per-goal when `goalId` provided
- `addJournalEntry(content, mood, time, date, goalId)`: stores `goal_id` alongside entry
- `toggleGoalCompletion` Rule 3: checks `WHERE date = ? AND goal_id = ?` — only a journal written for that specific goal unlocks its slot
- `checkmarked.js` cell click: passes `goal.id` to `hasJournalRequiredModal` and `hasJournalForDate`
- `journal.js` `saveJournalEntry`: detects pending goal check, passes `pending.goalId` to `addJournalEntry`
- IPC handlers in `main.js` updated to pass `goalId` through
- `api.js` updated to accept `goalId` on both methods

**Files:** `backend.js`, `checkmarked.js`, `journal.js`, `api.js`, `main.js`

---

## Core Feature — Goal Date Validation Against Frequency

**Problem:** The Create/Edit Goal modal allowed any start and end date regardless of frequency. A "3x per week" goal could be set to start on a Tuesday — an invalid day with no open slot.

**Fix — Hybrid validation (validate on change, block Save):**

New helper functions added to `goals.js`:
- `getScheduledDaysForFrequency(frequency, customDays)` — returns valid day numbers per frequency
- `getFrequencyDayLabel(frequency, customDays)` — human readable label for error messages
- `validateDateForFrequency(dateStr, frequency, customDays)` — returns error string or null
- `validateGoalDates()` — runs both fields, updates inline error spans, enables/disables Save button

Wired to:
- Date field `blur` and `change` events
- Frequency dropdown `change` event (re-validates existing dates)
- Custom day checkbox `change` events
- `openAddGoalModal` clears all error state on open
- `editGoal` calls `requestAnimationFrame(validateGoalDates)` so Save button is correct immediately on open

Error messages appear inline under each date field, e.g.:
`⚠️ Must be a Monday, Wednesday, or Friday`

Save button greys out and is disabled until both dates are valid scheduled days and the end date is after the start date.

**Files:** `goals.js`

---

## Removed / Deprecated

- **Habits page** — removed entirely. The habits system (`habits`, `daily_checklist` tables, `habits.js`) is obsolete. The app now centres entirely on the Goals → CheckMarked → Journal flow.
- **electron-store** — removed as a runtime dependency. Replaced by native `fs` + JSON settings file.
- **`db.js`** — legacy DB helper. Unused. Safe to delete.
- **`CHECKMARKED_REBUILD.md`** — deleted. Superseded by this document and `STATUS.md`.

---

## Files Changed This Session

| File | Change Type |
|------|------------|
| `database/backend.js` | Core fixes — toggle rules, progress calc, label column, journal goal_id, migrations |
| `src/js/checkmarked.js` | Grid rendering, slot locking, per-goal journal check, auto-scroll |
| `src/js/completed_goals.js` | Full rewrite — correct cg-* CSS classes |
| `src/js/failed_goals.js` | Failure rate display, status badge |
| `src/js/goals.js` | Label index fix, date validation, Save button gate |
| `src/js/journal.js` | goal_id linked entries, pending banner update |
| `src/js/api.js` | label param rename, goalId on journal methods |
| `src/js/dashboard.js` | Spider chart canvas height, safe scale max |
| `src/js/sidebar-badges.js` | Three broken badge updaters fixed |
| `main.js` | Kai cross-platform, exec order, IPC goalId pass-through |
| `README.md` | Full rewrite |
| `STATUS.md` | Full rewrite |
| `FIXES_SUMMARY.md` | This file |