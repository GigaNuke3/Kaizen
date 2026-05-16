/**
 * Completed Goals Page
 * Displays all goals where completed = 1, pulled from the goals table.
 * Data flows: goals table (backend) → window.api.getAllGoals() → filtered here
 */

async function renderCompletedGoals() {
  const content = document.getElementById('main-content')
  content.innerHTML = ''

  try {
    const allGoals = await window.api.getAllGoals()

    // goal row indices (matches goals table SELECT * ORDER):
    // [0]=id [1]=title [2]=description [3]=start_date [4]=target_date
    // [5]=completed [6]=progress [7]=frequency [8]=scheduled_days
    // [9]=created_at [10]=completion_date [11]=color [12]=icon
    const completedGoals = allGoals.filter(g => g[5] === 1)

    const container = document.createElement('div')
    container.className = 'goals-container'

    // ── Header ──────────────────────────────────────────────────────────────
    const header = document.createElement('div')
    header.className = 'goals-header'
    header.innerHTML = `
      <div class="goals-header-content">
        <h2>✅ Completed Goals</h2>
      </div>
    `
    container.appendChild(header)

    // ── Summary bar ─────────────────────────────────────────────────────────
    const summary = document.createElement('div')
    summary.style.cssText = `
      display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 8px;
    `
    summary.innerHTML = `
      <div class="stat-card" style="flex:1; min-width:140px;">
        <span class="stat-num">${completedGoals.length}</span>
        <span class="stat-label">Goals Achieved</span>
      </div>
      <div class="stat-card" style="flex:1; min-width:140px;">
        <span class="stat-num" style="font-size:1.5rem;">🏆</span>
        <span class="stat-label">Keep it up!</span>
      </div>
    `
    container.appendChild(summary)

    // ── Empty state ──────────────────────────────────────────────────────────
    if (completedGoals.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'empty-state'
      empty.innerHTML = `
        <p style="font-size:2.5rem; margin-bottom: 12px;">🎯</p>
        <p style="color:#888;">No completed goals yet.</p>
        <p style="color:#555; font-size:0.85rem; margin-top:6px;">
          Finish a goal in the <strong style="color:#6ee7b7;">Goals</strong> page and it will appear here.
        </p>
      `
      container.appendChild(empty)
      content.appendChild(container)
      return
    }

    // ── Goals grid ───────────────────────────────────────────────────────────
    const section = document.createElement('div')
    section.className = 'goals-section'
    section.innerHTML = `<h3>🏅 Completed (${completedGoals.length})</h3>`

    const grid = document.createElement('div')
    grid.className = 'goals-grid'

    for (const goal of completedGoals) {
      grid.appendChild(buildCompletedGoalCard(goal))
    }

    section.appendChild(grid)
    container.appendChild(section)
    content.appendChild(container)

  } catch (err) {
    console.error('Error rendering completed goals:', err)
    content.innerHTML = `
      <div class="error-state" style="padding:40px; text-align:center;">
        <h2>❌ Error Loading Completed Goals</h2>
        <p><strong>${err.message || 'Unknown error'}</strong></p>
        <pre style="text-align:left; background:#1a1a1a; padding:12px; border-radius:6px; overflow-x:auto; margin-top:12px;">
${err.stack || 'No stack trace'}</pre>
      </div>
    `
  }
}

/**
 * Build a single completed-goal card element.
 */
function buildCompletedGoalCard(goal) {
  const [
    id, title, description, startDate, targetDate,
    , , frequency, , ,
    completionDate, color, icon
  ] = goal

  const card = document.createElement('div')
  card.className = 'goal-card completed'
  card.style.borderColor = color || '#6ee7b7'
  card.style.opacity = '1' // override the 0.6 default for completed in goals.css

  // Format dates
  const fmt = (d) => d
    ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  const startStr      = fmt(startDate)
  const targetStr     = fmt(targetDate)
  const completedStr  = fmt(completionDate)

  // Frequency label
  const freqMap = {
    daily:    '📅 Every Day',
    weekdays: '💼 Weekdays (Mon–Fri)',
    weekends: '🎉 Weekends (Sat–Sun)',
    '3x':     '⭐ 3× per week',
    custom:   '📍 Custom days',
  }
  const freqLabel = freqMap[frequency] || frequency || '—'

  card.innerHTML = `
    <div class="goal-card-header">
      <div class="goal-card-title">
        <span class="goal-card-icon">${icon || '🎯'}</span>
        <h4 style="color:#fff;">✓ ${title || 'Untitled Goal'}</h4>
      </div>
      <div style="display:flex; gap:6px;">
        <button
          class="icon-btn"
          title="Restore to active"
          onclick="restoreGoalConfirm(${id})"
        >🔄</button>
        <button
          class="icon-btn"
          title="Delete permanently"
          onclick="deleteCompletedGoalConfirm(${id}, '${(title || '').replace(/'/g, "\\'")}')"
        >🗑️</button>
      </div>
    </div>

    ${description ? `
      <div class="goal-labels">
        <span class="goal-label-badge">${description}</span>
      </div>` : ''}

    <div style="display:flex; flex-direction:column; gap:4px; font-size:0.85rem; color:#888;">
      <span>${freqLabel}</span>
      ${startStr && targetStr
        ? `<span>⏱️ Window: ${startStr} → ${targetStr}</span>`
        : ''}
      ${completedStr
        ? `<span style="color:#6ee7b7; font-weight:600;">🏆 Completed on ${completedStr}</span>`
        : ''}
    </div>

    <!-- 100% progress bar -->
    <div class="progress-container">
      <div class="progress-bar">
        <div class="progress-fill" style="width:100%; background: linear-gradient(90deg, ${color || '#6ee7b7'}, #39d353);"></div>
      </div>
      <div class="progress-text">
        <span style="color:#6ee7b7; font-weight:600;">100% Complete</span>
      </div>
    </div>
  `

  return card
}

/**
 * Restore a completed goal back to active (progress reset to 0).
 */
async function restoreGoalConfirm(goalId) {
  if (!confirm('Restore this goal to active? Progress will be reset to 0.')) return

  try {
    const allGoals = await window.api.getAllGoals()
    const goal = allGoals.find(g => g[0] === goalId)
    if (!goal) { alert('Goal not found.'); return }

    // Re-save the goal (this does NOT change completed flag, so we
    // rely on updateGoalProgress(0) to reset it since the backend
    // only auto-completes at >= 100, setting 0 is safe).
    await window.api.updateGoal(
      goalId,
      goal[1],  // title
      goal[2],  // description
      goal[4],  // target_date
      goal[7],  // frequency
      goal[8],  // scheduled_days
      goal[3]   // start_date
    )

    // Setting progress to 0 resets the completed flag via the backend
    await window.api.updateGoalProgress(goalId, 0)

    await renderCompletedGoals()
  } catch (err) {
    console.error('Error restoring goal:', err)
    alert('Could not restore goal: ' + err.message)
  }
}

/**
 * Delete a completed goal permanently.
 */
async function deleteCompletedGoalConfirm(goalId, title) {
  if (!confirm(`Delete "${title}" permanently? This cannot be undone.`)) return
  try {
    await window.api.deleteGoal(goalId)
    await renderCompletedGoals()
  } catch (err) {
    console.error('Error deleting goal:', err)
    alert('Could not delete goal: ' + err.message)
  }
}