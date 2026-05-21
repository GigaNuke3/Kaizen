/**
 * Failed Goals Page
 * Section 1 — Failed Goals: goals rows where failed = 1.
 * Section 2 — Overdue Checkmarks: checkmark rows where completed = 0
 *             AND due_date exists AND due_date < today (auto-detected as failed,
 *             no backend flag needed).
 *
 * Data flows:
 *   goals table      → window.api.getAllGoals()      → filtered for failed = 1
 *   checkmarks table → window.api.getAllCheckmarks() → filtered for overdue
 *
 * Checkmarks column indices (SELECT * order):
 *   [0]=id  [1]=title  [2]=description  [3]=category
 *   [4]=completed  [5]=failed  [6]=priority  [7]=due_date  [8]=created_at
 */

async function renderFailedGoals() {
  const content = document.getElementById('main-content')
  if (!content) {
    console.error('❌ Error: main-content element not found')
    return
  }

  content.innerHTML = ''

  try {
    // ── Fetch both data sources in parallel ──────────────────────────────────
    const [allGoals, allCheckmarks] = await Promise.all([
      window.api.getAllGoals(),
      window.api.getAllCheckmarks()
    ])

    // Goals: failed = 1  (index 6)
    const failedGoals = allGoals.filter(g => g[6] === 1)

    // Checkmarks: not completed + has a past due_date
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const overdueCheckmarks = allCheckmarks.filter(c => {
      if (c[4] === 1) return false          // already completed — skip
      const due = c[7]                       // due_date column
      if (!due) return false                 // no due date — skip
      return new Date(due) < today
    })

    // ── Outer container ──────────────────────────────────────────────────────
    const container = document.createElement('div')
    container.className = 'failed-goals-container'

    // ── Page header ──────────────────────────────────────────────────────────
    const header = document.createElement('div')
    header.className = 'failed-goals-header'
    header.innerHTML = `
      <h2>❌ Failed &amp; Overdue</h2>
      <div style="display:flex; gap:12px;">
        <span class="badge-count" style="background:#ff6b6b22; color:#ff6b6b; border:1px solid #ff6b6b55;
              padding:4px 12px; border-radius:20px; font-size:0.85rem;">
          ${failedGoals.length} failed goal${failedGoals.length !== 1 ? 's' : ''}
        </span>
        <span class="badge-count" style="background:#f9a82522; color:#f9a825; border:1px solid #f9a82555;
              padding:4px 12px; border-radius:20px; font-size:0.85rem;">
          ${overdueCheckmarks.length} overdue task${overdueCheckmarks.length !== 1 ? 's' : ''}
        </span>
      </div>
    `
    container.appendChild(header)

    // ════════════════════════════════════════════════════════════════════════
    // SECTION 1 — Failed Goals
    // ════════════════════════════════════════════════════════════════════════
    const goalsSection = document.createElement('div')
    goalsSection.style.marginBottom = '32px'

    const goalsSectionTitle = document.createElement('h3')
    goalsSectionTitle.style.cssText = 'color:#ff6b6b; margin-bottom:14px; font-size:1rem; letter-spacing:0.05em; text-transform:uppercase;'
    goalsSectionTitle.textContent = `🎯 Failed Goals (${failedGoals.length})`
    goalsSection.appendChild(goalsSectionTitle)

    if (failedGoals.length === 0) {
      const empty = document.createElement('p')
      empty.className = 'empty-msg'
      empty.textContent = 'No failed goals. Keep up the great work!'
      goalsSection.appendChild(empty)
    } else {
      const grid = document.createElement('div')
      grid.className = 'failed-goals-grid'

      failedGoals.forEach(goal => {
        // goals column indices: [0]=id [1]=title [2]=description [3]=start_date
        // [4]=target_date [5]=completed [6]=failed [7]=progress [8]=frequency
        // [9]=scheduled_days [10]=created_at [11]=completion_date [12]=color [13]=icon
        const id          = goal[0]
        const title       = goal[1] || 'Untitled Goal'
        const description = goal[2] || ''
        const targetDate  = goal[4]
        const icon        = goal[13] || '🎯'

        const targetStr = targetDate
          ? new Date(targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : null

        const card = document.createElement('div')
        card.className = 'failed-goal-card'
        card.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <h3>${icon} ${title}</h3>
            <button
              class="icon-btn"
              title="Restore to active"
              onclick="restoreFailedGoalConfirm(${id}, '${title.replace(/'/g, "\\'")}')"
              style="flex-shrink:0; margin-left:8px;"
            >🔄</button>
          </div>
          ${description ? `<p>${description}</p>` : ''}
          <div class="meta">
            ${targetStr ? `<span>⏰ Target date: ${targetStr}</span>` : '<span>No target date</span>'}
          </div>
        `
        grid.appendChild(card)
      })

      goalsSection.appendChild(grid)
    }

    container.appendChild(goalsSection)

    // ════════════════════════════════════════════════════════════════════════
    // SECTION 2 — Overdue Checkmarks
    // ════════════════════════════════════════════════════════════════════════
    const checkSection = document.createElement('div')

    const checkSectionTitle = document.createElement('h3')
    checkSectionTitle.style.cssText = 'color:#f9a825; margin-bottom:14px; font-size:1rem; letter-spacing:0.05em; text-transform:uppercase;'
    checkSectionTitle.textContent = `📋 Overdue Checkmarks (${overdueCheckmarks.length})`
    checkSection.appendChild(checkSectionTitle)

    if (overdueCheckmarks.length === 0) {
      const empty = document.createElement('p')
      empty.className = 'empty-msg'
      empty.textContent = 'No overdue tasks. Everything is on track!'
      checkSection.appendChild(empty)
    } else {
      const grid = document.createElement('div')
      grid.className = 'failed-goals-grid'

      overdueCheckmarks.forEach(c => {
        const id          = c[0]
        const title       = c[1] || 'Untitled Task'
        const description = c[2] || ''
        const category    = c[3] || 'general'
        const priority    = c[6] || 0
        const dueDate     = c[7]

        const dueStr = new Date(dueDate).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric'
        })

        // How many days overdue?
        const daysOverdue = Math.floor((today - new Date(dueDate)) / 86400000)

        const priorityLabel = priority >= 2 ? '🔴 High' : priority === 1 ? '🟡 Medium' : '🟢 Low'

        const card = document.createElement('div')
        card.className = 'failed-goal-card'
        // Amber left-border to visually distinguish from goal cards
        card.style.borderLeftColor = '#f9a825'
        card.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
            <h3 style="color:#f9a825; margin:0;">📋 ${title}</h3>
            <button
              class="icon-btn"
              title="Mark as complete"
              onclick="completeOverdueCheckmark(${id})"
              style="flex-shrink:0;"
            >✅</button>
          </div>
          ${description ? `<p>${description}</p>` : ''}
          <div class="meta" style="display:flex; flex-direction:column; gap:4px;">
            <span>📂 ${category} &nbsp;·&nbsp; ${priorityLabel}</span>
            <span style="color:#ff6b6b;">⏰ Due: ${dueStr} &nbsp;·&nbsp; ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue</span>
          </div>
        `
        grid.appendChild(card)
      })

      checkSection.appendChild(grid)
    }

    container.appendChild(checkSection)
    content.appendChild(container)

  } catch (error) {
    console.error('❌ Error rendering failed goals:', error)
    content.innerHTML = `
      <div class="error-state" style="padding:40px; text-align:center;">
        <h2>❌ Failed to load page</h2>
        <p>${error.message || 'Unknown error occurred'}</p>
      </div>
    `
  }
}

/**
 * Restore a failed goal back to active.
 */
async function restoreFailedGoalConfirm(goalId, title) {
  if (!confirm(`Restore "${title}" to active? Progress will be reset to 0.`)) return
  try {
    await window.api.restoreGoal(goalId)
    await renderFailedGoals()
  } catch (err) {
    console.error('Error restoring goal:', err)
    alert('Could not restore goal: ' + err.message)
  }
}

/**
 * Mark an overdue checkmark as complete directly from this page.
 */
async function completeOverdueCheckmark(checkmarkId) {
  try {
    await window.api.completeCheckmark(checkmarkId)
    await renderFailedGoals()
  } catch (err) {
    console.error('Error completing checkmark:', err)
    alert('Could not complete task: ' + err.message)
  }
}