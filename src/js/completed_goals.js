/**
 * Completed Goals Page
 * Uses cg-* CSS classes from completed_goals.css
 * [0]=id [1]=title [2]=desc [3]=start_date [4]=target_date
 * [5]=completed [6]=failed [7]=progress [8]=frequency [9]=scheduled_days
 * [10]=created_at [11]=completion_date [12]=color [13]=icon [14]=time
 */

async function renderCompletedGoals() {
  const content = document.getElementById('main-content')
  if (!content) return

  content.innerHTML = '<div style="padding:40px;text-align:center;color:#888;">Loading completed goals...</div>'

  try {
    await window.api.evaluateGoals()
    const allGoals = await window.api.getAllGoals()

    // completed = 1, not failed
    const completedGoals = allGoals.filter(g => g[5] === 1 && g[6] === 0)
    completedGoals.sort((a, b) => {
      const da = a[11] || a[10] || ''
      const db = b[11] || b[10] || ''
      return db.localeCompare(da)
    })

    // Goals at 100% progress but not yet marked completed
    const readyGoals = allGoals.filter(g => g[5] === 0 && g[6] === 0 && g[7] >= 100)

    const container = document.createElement('div')
    container.className = 'cg-container'

    // ── HEADER ────────────────────────────────────────────────────────────
    const header = document.createElement('div')
    header.className = 'cg-header'
    header.innerHTML = `
      <div class="cg-header-left">
        <h2>✅ Completed Goals</h2>
        <span class="cg-count-badge">${completedGoals.length} completed</span>
      </div>
      <button id="cg-refresh-btn" class="cg-refresh-btn">🔄 Refresh</button>
    `
    container.appendChild(header)

    // ── READY TO COMPLETE BANNER ──────────────────────────────────────────
    if (readyGoals.length > 0) {
      const banner = document.createElement('div')
      banner.style.cssText = `
        background:linear-gradient(135deg,#052e16,#064e3b);
        border:1px solid #6ee7b7;border-radius:10px;
        padding:16px 20px;margin-bottom:24px;
      `
      banner.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
          <span style="font-size:1.3rem;">🎉</span>
          <strong style="color:#6ee7b7;font-size:0.95rem;">
            ${readyGoals.length} goal${readyGoals.length !== 1 ? 's' : ''} reached 100% — mark as complete?
          </strong>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;" id="cg-ready-list"></div>
      `
      const list = banner.querySelector('#cg-ready-list')
      for (const g of readyGoals) {
        const row = document.createElement('div')
        row.style.cssText = `
          display:flex;align-items:center;justify-content:space-between;
          background:rgba(110,231,183,0.06);border-radius:6px;padding:8px 12px;
        `
        row.innerHTML = `
          <span style="color:#ccc;font-size:0.88rem;">
            ${g[13] || '🎯'} <strong style="color:#fff;">${escapeHtmlCG(g[1])}</strong>
            <span style="color:#888;font-size:0.78rem;margin-left:8px;">${g[7]}% done</span>
          </span>
          <button class="btn-force-complete" data-id="${g[0]}" data-title="${escapeHtmlCG(g[1])}"
            style="background:#6ee7b7;color:#000;border:none;border-radius:6px;
                   padding:5px 14px;font-size:0.82rem;font-weight:600;cursor:pointer;">
            Mark Complete ✓
          </button>
        `
        list.appendChild(row)
      }
      container.appendChild(banner)
    }

    // ── STATS ROW ─────────────────────────────────────────────────────────
    let totalDaysTracked = 0
    for (const g of completedGoals) {
      if (g[3] && g[4]) {
        totalDaysTracked += Math.max(0,
          Math.round((new Date(g[4] + 'T12:00:00') - new Date(g[3] + 'T12:00:00')) / 86400000) + 1
        )
      }
    }

    const statsRow = document.createElement('div')
    statsRow.className = 'cg-stats-row'
    statsRow.innerHTML = `
      <div class="cg-stat-card">
        <span class="cg-stat-num">${completedGoals.length}</span>
        <span class="cg-stat-label">Goals Achieved</span>
      </div>
      <div class="cg-stat-card">
        <span class="cg-stat-num">${totalDaysTracked}</span>
        <span class="cg-stat-label">Days Tracked</span>
      </div>
      <div class="cg-stat-card">
        <span class="cg-stat-num">🏆</span>
        <span class="cg-stat-label">Keep it up!</span>
      </div>
    `
    container.appendChild(statsRow)

    // ── COMPLETED GOALS SECTION ───────────────────────────────────────────
    const goalsSection = document.createElement('div')

    if (completedGoals.length === 0) {
      goalsSection.innerHTML = `
        <p class="cg-section-heading">🏅 Completed Goals</p>
        <div class="cg-empty">
          <div class="cg-empty-icon">🏅</div>
          <p class="cg-empty-title">No completed goals yet</p>
          <p class="cg-empty-sub">Keep checking in on <strong>CheckMarked</strong> and your achievements will appear here! 💪</p>
        </div>
      `
    } else {
      goalsSection.innerHTML = `<p class="cg-section-heading">🏅 Completed Goals (${completedGoals.length})</p>`
      const grid = document.createElement('div')
      grid.className = 'cg-grid'
      for (const goal of completedGoals) {
        grid.appendChild(buildCGCard(goal))
      }
      goalsSection.appendChild(grid)
    }

    container.appendChild(goalsSection)

    // ── MOUNT ─────────────────────────────────────────────────────────────
    content.innerHTML = ''
    content.appendChild(container)
    attachCGEvents(content)

  } catch (err) {
    console.error('Error rendering completed goals:', err)
    content.innerHTML = `
      <div class="cg-error">
        <h2>❌ Error Loading Completed Goals</h2>
        <p>${escapeHtmlCG(err.message)}</p>
        <pre>${escapeHtmlCG(err.stack || '')}</pre>
      </div>
    `
  }
}

function buildCGCard(goal) {
  const id             = goal[0]
  const title          = goal[1]  || 'Untitled Goal'
  const description    = goal[2]  || ''
  const startDate      = goal[3]
  const targetDate     = goal[4]
  const progress       = goal[7]  || 0
  const frequency      = goal[8]  || 'daily'
  const completionDate = goal[11]
  const color          = goal[12] || '#6ee7b7'
  const icon           = goal[13] || '🎯'

  const completedStr = fmtDateCG(completionDate)
  const targetStr    = fmtDateCG(targetDate)

  let durationStr = ''
  if (startDate && (completionDate || targetDate)) {
    const endD = completionDate || targetDate
    const days = Math.round(
      (new Date(endD + 'T12:00:00') - new Date(startDate + 'T12:00:00')) / 86400000
    ) + 1
    durationStr = `${days} day${days !== 1 ? 's' : ''}`
  }

  const freqMap = {
    daily: '📅 Every Day', weekdays: '💼 Weekdays',
    weekends: '🎉 Weekends', '3x': '⭐ 3x/week', custom: '📍 Custom'
  }
  const freqLabel = freqMap[frequency] || frequency

  const card = document.createElement('div')
  card.className = 'cg-card'
  card.style.borderLeftColor = color

  card.innerHTML = `
    <div class="cg-card-top">
      <div class="cg-card-title-row">
        <span class="cg-card-icon">${icon}</span>
        <h3 class="cg-card-title">${escapeHtmlCG(title)}</h3>
        <span class="cg-card-badge">✅ COMPLETED</span>
      </div>
      ${description ? `<p class="cg-card-desc">${escapeHtmlCG(description)}</p>` : ''}
    </div>

    <div class="cg-card-meta">
      ${completedStr ? `<div class="cg-meta-row">🏆 Completed: <strong>${completedStr}</strong></div>` : ''}
      ${targetStr    ? `<div class="cg-meta-row">⏰ Deadline: <strong>${targetStr}</strong></div>`    : ''}
      <div class="cg-meta-row">${freqLabel}</div>
      ${durationStr  ? `<div class="cg-meta-row">📆 Duration: <strong>${durationStr}</strong></div>` : ''}
    </div>

    <div class="cg-progress-wrap">
      <div class="cg-progress-bar">
        <div class="cg-progress-fill" style="width:${progress}%;background:linear-gradient(90deg,${color},#39d353);"></div>
      </div>
      <div class="cg-progress-label">
        <span>${progress}% Complete</span>
      </div>
    </div>

    <div class="cg-card-actions">
      <button class="cg-btn-restore" data-id="${id}" data-title="${escapeHtmlCG(title)}">
        🔄 Restore
      </button>
      <button class="cg-btn-delete" data-id="${id}" data-title="${escapeHtmlCG(title)}">
        🗑️ Delete
      </button>
    </div>
  `
  return card
}

function attachCGEvents(content) {
  content.addEventListener('click', async (e) => {
    if (e.target.closest('#cg-refresh-btn')) {
      renderCompletedGoals()
      return
    }

    const forceBtn = e.target.closest('.btn-force-complete')
    if (forceBtn) {
      const id = Number(forceBtn.dataset.id)
      const title = forceBtn.dataset.title
      if (!confirm(`Mark "${title}" as complete now?`)) return
      try {
        await window.api.forceCompleteGoal(id)
        renderCompletedGoals()
      } catch (err) { alert('Could not complete: ' + err.message) }
      return
    }

    const restoreBtn = e.target.closest('.cg-btn-restore')
    if (restoreBtn) {
      const id = Number(restoreBtn.dataset.id)
      const title = restoreBtn.dataset.title
      if (!confirm(`Restore "${title}" back to active?\n\nProgress will be recalculated from existing check-ins.`)) return
      try {
        await window.api.restoreGoal(id)
        renderCompletedGoals()
      } catch (err) { alert('Could not restore: ' + err.message) }
      return
    }

    const deleteBtn = e.target.closest('.cg-btn-delete')
    if (deleteBtn) {
      const id = Number(deleteBtn.dataset.id)
      const title = deleteBtn.dataset.title
      if (!confirm(`Permanently delete "${title}"?\n\nThis cannot be undone.`)) return
      try {
        await window.api.deleteGoal(id)
        renderCompletedGoals()
      } catch (err) { alert('Could not delete: ' + err.message) }
    }
  })
}

function escapeHtmlCG(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function fmtDateCG(d) {
  if (!d) return null
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })
}