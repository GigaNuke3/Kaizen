async function renderCompletedGoals() {
  const content = document.getElementById('main-content')
  if (!content) return

  content.innerHTML = '<div style="padding:40px;text-align:center;color:#888;">Loading completed goals...</div>'

  try {
    await window.api.evaluateGoals()

    const allGoals = await window.api.getAllGoals()

    // [0]=id [1]=title [2]=desc [3]=start_date [4]=target_date
    // [5]=completed [6]=failed [7]=progress [8]=frequency [9]=scheduled_days
    // [10]=created_at [11]=completion_date [12]=color [13]=icon [14]=time
    const completedGoals = allGoals.filter(g => g[5] === 1 && g[6] === 0)

    // Goals at 100% but deadline not yet passed — eligible for manual completion
    const today = getLocalDateStringCG()
    const readyGoals = allGoals.filter(g =>
      g[5] === 0 && g[6] === 0 && g[7] >= 100 && (!g[4] || g[4] >= today)
    )

    completedGoals.sort((a, b) => {
      const da = a[11] || a[10] || ''
      const db = b[11] || b[10] || ''
      return db.localeCompare(da)
    })

    const container = document.createElement('div')
    container.className = 'goals-container'

    // ── HEADER ────────────────────────────────────────────────────────────
    const header = document.createElement('div')
    header.className = 'goals-header'
    header.innerHTML = `
      <div class="goals-header-content">
        <h2>✅ Completed Goals</h2>
      </div>
    `
    container.appendChild(header)

    // ── READY TO COMPLETE BANNER ──────────────────────────────────────────
    // Shows goals that hit 100% but deadline hasn't passed yet
    if (readyGoals.length > 0) {
      const banner = document.createElement('div')
      banner.style.cssText = `
        background: linear-gradient(135deg, #052e16, #064e3b);
        border: 1px solid #6ee7b7;
        border-radius: 10px;
        padding: 16px 20px;
        margin-bottom: 24px;
      `
      banner.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
          <span style="font-size:1.3rem;">🎉</span>
          <strong style="color:#6ee7b7;font-size:0.95rem;">
            ${readyGoals.length} goal${readyGoals.length !== 1 ? 's' : ''} hit 100% — mark as complete?
          </strong>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;" id="ready-goals-list"></div>
      `
      const list = banner.querySelector('#ready-goals-list')
      for (const g of readyGoals) {
        const row = document.createElement('div')
        row.style.cssText = `
          display:flex;align-items:center;justify-content:space-between;
          background:rgba(110,231,183,0.06);border-radius:6px;padding:8px 12px;
        `
        row.innerHTML = `
          <span style="color:#ccc;font-size:0.88rem;">
            ${g[13] || '🎯'} <strong style="color:#fff;">${escapeHtmlCG(g[1])}</strong>
          </span>
          <button
            class="btn-force-complete"
            data-id="${g[0]}"
            data-title="${escapeHtmlCG(g[1])}"
            style="
              background:#6ee7b7;color:#000;border:none;border-radius:6px;
              padding:5px 14px;font-size:0.82rem;font-weight:600;cursor:pointer;
              transition:opacity 0.15s;
            "
          >Mark Complete ✓</button>
        `
        list.appendChild(row)
      }
      container.appendChild(banner)
    }

    // ── SUMMARY ───────────────────────────────────────────────────────────
    let totalDaysTracked = 0
    for (const g of completedGoals) {
      if (g[3] && g[4]) {
        const diff = new Date(g[4] + 'T12:00:00') - new Date(g[3] + 'T12:00:00')
        totalDaysTracked += Math.max(0, Math.round(diff / 86400000) + 1)
      }
    }

    const summary = document.createElement('div')
    summary.className = 'stats-row page-summary-stats'
    summary.innerHTML = `
      <div class="stat-card">
        <span class="stat-num">${completedGoals.length}</span>
        <span class="stat-label">Goals Achieved</span>
      </div>
      <div class="stat-card">
        <span class="stat-num">${totalDaysTracked}</span>
        <span class="stat-label">Days Tracked</span>
      </div>
      <div class="stat-card">
        <span class="stat-num" style="font-size:1.5rem;">🏆</span>
        <span class="stat-label">Keep it up!</span>
      </div>
    `
    container.appendChild(summary)

    // ── EMPTY STATE ───────────────────────────────────────────────────────
    if (completedGoals.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'empty-state'
      empty.innerHTML = `
        <p style="font-size:2.5rem;margin-bottom:12px;">🎯</p>
        <p style="color:#888;font-size:1rem;">No completed goals yet.</p>
        <p style="color:#555;font-size:0.85rem;margin-top:8px;line-height:1.6;">
          Goals appear here once their deadline passes and all scheduled<br>
          check-ins are done. Keep tracking in
          <strong style="color:#6ee7b7;">CheckMarked</strong>!
        </p>
      `
      container.appendChild(empty)
      content.innerHTML = ''
      content.appendChild(container)
      attachCompletedGoalsEvents(content)
      return
    }

    // ── GOALS GRID ────────────────────────────────────────────────────────
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

    // ── MOUNT ─────────────────────────────────────────────────────────────
    content.innerHTML = ''
    content.appendChild(container)
    attachCompletedGoalsEvents(content)

  } catch (err) {
    console.error('Error rendering completed goals:', err)
    content.innerHTML = `
      <div class="error-state">
        <h2>❌ Error Loading Completed Goals</h2>
        <p><strong>${escapeHtmlCG(err.message || 'Unknown error')}</strong></p>
        <pre>${escapeHtmlCG(err.stack || 'No stack trace')}</pre>
      </div>
    `
  }
}

function attachCompletedGoalsEvents(content) {
  content.addEventListener('click', async (e) => {
    // Force-complete a ready goal
    const forceBtn = e.target.closest('.btn-force-complete')
    if (forceBtn) {
      const id    = Number(forceBtn.dataset.id)
      const title = forceBtn.dataset.title
      if (!confirm(`Mark "${title}" as complete now?\n\nThis will move it to Completed Goals.`)) return
      try {
        await window.api.forceCompleteGoal(id)
        renderCompletedGoals()
      } catch (err) {
        alert('Could not complete goal: ' + err.message)
      }
      return
    }

    // Restore
    const restoreBtn = e.target.closest('.restore-cg-btn')
    if (restoreBtn) {
      const id    = Number(restoreBtn.dataset.id)
      const title = restoreBtn.dataset.title
      if (!confirm(`Restore "${title}" back to active?\n\nNote: Progress will be recalculated from your existing check-ins.`)) return
      try {
        await window.api.restoreGoal(id)
        renderCompletedGoals()
      } catch (err) {
        alert('Could not restore goal: ' + err.message)
      }
      return
    }

    // Delete
    const deleteBtn = e.target.closest('.delete-cg-btn')
    if (deleteBtn) {
      const id    = Number(deleteBtn.dataset.id)
      const title = deleteBtn.dataset.title
      if (!confirm(`Permanently delete "${title}"?\n\nThis cannot be undone.`)) return
      try {
        await window.api.deleteGoal(id)
        renderCompletedGoals()
      } catch (err) {
        alert('Could not delete goal: ' + err.message)
      }
    }
  })
}

function escapeHtmlCG(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function fmtDateCG(d) {
  if (!d) return null
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric'
  })
}

function getLocalDateStringCG(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function buildCompletedGoalCard(goal) {
  const id             = goal[0]
  const title          = goal[1]  || 'Untitled Goal'
  const description    = goal[2]  || ''
  const startDate      = goal[3]
  const targetDate     = goal[4]
  const progress       = goal[7]  || 100
  const frequency      = goal[8]  || 'daily'
  const completionDate = goal[11]
  const color          = goal[12] || '#6ee7b7'
  const icon           = goal[13] || '🎯'

  const startStr      = fmtDateCG(startDate)
  const targetStr     = fmtDateCG(targetDate)
  const completedStr  = fmtDateCG(completionDate)

  let durationStr = ''
  if (startDate && targetDate) {
    const days = Math.round(
      (new Date(targetDate + 'T12:00:00') - new Date(startDate + 'T12:00:00')) / 86400000
    ) + 1
    durationStr = `${days} day${days !== 1 ? 's' : ''}`
  }

  const freqMap = {
    daily:    '📅 Every Day',
    weekdays: '💼 Weekdays (Mon–Fri)',
    weekends: '🎉 Weekends (Sat–Sun)',
    '3x':     '⭐ 3× per week',
    custom:   '📍 Custom days',
  }
  const freqLabel = freqMap[frequency] || frequency

  const card = document.createElement('div')
  card.className = 'goal-card completed'
  card.style.borderColor = color

  card.innerHTML = `
    <div class="goal-card-header">
      <div class="goal-card-title">
        <span class="goal-card-icon">${icon}</span>
        <h4>✓ ${escapeHtmlCG(title)}</h4>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;">
        <button
          class="icon-btn restore-cg-btn"
          data-id="${id}"
          data-title="${escapeHtmlCG(title)}"
          title="Restore to active"
        >🔄</button>
        <button
          class="icon-btn delete-cg-btn"
          data-id="${id}"
          data-title="${escapeHtmlCG(title)}"
          title="Delete permanently"
        >🗑️</button>
      </div>
    </div>

    ${description ? `
      <div class="goal-labels" style="margin-bottom:10px;">
        <span class="goal-label-badge">${escapeHtmlCG(description)}</span>
      </div>
    ` : ''}

    <div class="goal-card-meta">
      <span>${freqLabel}</span>
      ${startStr && targetStr ? `<span>📆 ${startStr} → ${targetStr}</span>` : ''}
      ${durationStr ? `<span>⏳ Duration: <strong style="color:#ccc;">${durationStr}</strong></span>` : ''}
      ${completedStr
        ? `<span style="color:#6ee7b7;font-weight:600;margin-top:2px;">🏆 Completed on ${completedStr}</span>`
        : `<span style="color:#6ee7b7;font-weight:600;margin-top:2px;">🏆 Completed</span>`
      }
    </div>

    <div class="progress-container">
      <div class="progress-bar">
        <div class="progress-fill" style="width:100%;background:linear-gradient(90deg,${color},#39d353);"></div>
      </div>
      <div class="progress-text">
        <span>100% Complete</span>
      </div>
    </div>
  `

  return card
}