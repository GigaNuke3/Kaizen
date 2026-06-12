function escapeHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function getLocalDateString(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function shouldShowDayForGoal(dateStr, frequency, scheduledDaysStr) {
  if (!frequency) return true
  const date = new Date(dateStr + 'T12:00:00')
  const dayOfWeek = date.getDay()
  switch (frequency) {
    case 'daily':    return true
    case 'weekdays': return dayOfWeek >= 1 && dayOfWeek <= 5
    case 'weekends': return dayOfWeek === 0 || dayOfWeek === 6
    case '3x': {
      const days = scheduledDaysStr ? JSON.parse(scheduledDaysStr) : [1, 3, 5]
      return days.includes(dayOfWeek)
    }
    case 'custom': {
      if (!scheduledDaysStr) return true
      return JSON.parse(scheduledDaysStr).includes(dayOfWeek)
    }
    default: return true
  }
}

async function renderFailedGoals() {
  const content = document.getElementById('main-content')
  if (!content) return

  content.innerHTML = '<div style="padding:40px;text-align:center;color:#888;">Loading...</div>'

  try {
    // Run backend evaluator (handles deadline-passed goals)
    await window.api.evaluateGoals()

    // Pull grid data — this has goals, dates, and completions
    const gridData = await window.api.getGoalTrackingGrid()
    const today = getLocalDateString()

    // ── Build "failing goals" list from missed checkmarks ─────────────────
    // A goal is "failing" if it has at least one past scheduled day with no check
    const failingGoals = []

    for (const goal of gridData.goals) {
      const missedDates = []

      for (const date of gridData.dates) {
        // Only look at past days (not today, not future)
        if (date >= today) continue

        const inWindow = (!goal.start_date || date >= goal.start_date) &&
                         (!goal.target_date || date <= goal.target_date)
        if (!inWindow) continue

        const scheduled = shouldShowDayForGoal(date, goal.frequency, goal.scheduled_days)
        if (!scheduled) continue

        const key = `${goal.id}_${date}`
        const isCompleted = gridData.completions[key] === 1
        if (!isCompleted) {
          missedDates.push(date)
        }
      }

      if (missedDates.length > 0) {
        failingGoals.push({ ...goal, missedDates })
      }
    }

    // ── Also include hard-failed goals (deadline passed) from backend ──────
    // getGoalTrackingGrid only returns active (not failed/completed) goals,
    // so we separately fetch hard-failed ones
    const allGoals = await window.api.getAllGoals()
    // layout: [id,title,desc,start_date,target_date,completed,failed,progress,frequency,scheduled_days,created_at,completion_date,color,icon,time]
    const hardFailedGoals = allGoals
      .filter(g => g[6] === 1)
      .map(g => ({
        id: g[0], title: g[1], description: g[2], start_date: g[3],
        target_date: g[4], completed: g[5], failed: g[6], progress: g[7],
        frequency: g[8], scheduled_days: g[9], created_at: g[10],
        completion_date: g[11], color: g[12], icon: g[13], time: g[14],
        missedDates: [],
        hardFailed: true
      }))

    // Merge: hardFailed first, then active-but-failing, deduped by id
    const hardFailedIds = new Set(hardFailedGoals.map(g => g.id))
    const activeFailingOnly = failingGoals.filter(g => !hardFailedIds.has(g.id))
    const allFailingGoals = [...hardFailedGoals, ...activeFailingOnly]

    // ── BUILD UI ──────────────────────────────────────────────────────────
    const container = document.createElement('div')
    container.className = 'failed-goals-container'

    // Header
    const header = document.createElement('div')
    header.className = 'failed-goals-header'
    header.innerHTML = `
      <h2>❌ Failed &amp; Overdue</h2>
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
        <span class="badge-count">${allFailingGoals.length} failing goal${allFailingGoals.length !== 1 ? 's' : ''}</span>
        <button id="force-fail-btn" class="btn btn-warning">⚠️ Force Fail Past Goals</button>
        <button id="refresh-failed-btn" class="btn btn-secondary">🔄 Refresh</button>
      </div>
    `
    container.appendChild(header)

    // Goals section
    const goalsSection = document.createElement('div')
    goalsSection.style.marginBottom = '32px'

    if (allFailingGoals.length === 0) {
      goalsSection.innerHTML = `
        <h3 style="color:#ff6b6b;margin-bottom:12px;">🎯 Failing Goals</h3>
        <p style="color:#666;text-align:center;padding:40px 0;font-size:1rem;">
          No failing goals. You're crushing it! 💪
        </p>
      `
    } else {
      goalsSection.innerHTML = `<h3 style="color:#ff6b6b;margin-bottom:16px;">🎯 Failing Goals (${allFailingGoals.length})</h3>`
      const grid = document.createElement('div')
      grid.className = 'failed-goals-grid'

      for (const goal of allFailingGoals) {
        const targetStr = goal.target_date
          ? new Date(goal.target_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : 'No deadline'

        const freqLabel = {
          daily: '📅 Every Day',
          weekdays: '💼 Weekdays',
          weekends: '🎉 Weekends',
          '3x': '⭐ 3x/week',
          custom: '📍 Custom'
        }[goal.frequency] || goal.frequency || 'Daily'

        const missedCount = goal.missedDates?.length || 0

        // Status badge
        const statusBadge = goal.hardFailed
          ? `<span style="background:#7f1d1d;color:#fca5a5;padding:2px 8px;border-radius:12px;font-size:0.75rem;font-weight:600;">⛔ DEADLINE PASSED</span>`
          : `<span style="background:#3b1f1f;color:#fca5a5;padding:2px 8px;border-radius:12px;font-size:0.75rem;font-weight:600;">⚠️ ${missedCount} DAY${missedCount !== 1 ? 'S' : ''} MISSED</span>`

        // Show last 5 missed dates as pills
        const missedPills = goal.missedDates?.slice(-5).map(d => {
          const label = new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          return `<span style="background:#2a1010;border:1px solid #7f1d1d;color:#fca5a5;padding:2px 7px;border-radius:8px;font-size:0.72rem;">${label}</span>`
        }).join('') || ''

        const card = document.createElement('div')
        card.className = 'failed-goal-card'
        card.innerHTML = `
          <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;">
            <span style="font-size:1.6rem;line-height:1;">${goal.icon || '🎯'}</span>
            <div style="flex:1;min-width:0;">
              <h3 style="margin:0 0 6px;font-size:1rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(goal.title)}</h3>
              ${statusBadge}
            </div>
          </div>
          ${goal.description ? `<p style="color:#aaa;font-size:0.85rem;margin-bottom:10px;">${escapeHtml(goal.description)}</p>` : ''}
          <div class="meta" style="display:flex;flex-direction:column;gap:4px;margin-bottom:12px;font-size:0.85rem;color:#999;">
            <span>⏱️ Deadline: <strong style="color:#ff6b6b;">${targetStr}</strong></span>
            <span>📊 Progress: <strong style="color:#fff;">${goal.progress || 0}%</strong></span>
            <span>${freqLabel}</span>
          </div>
          <div style="background:#1a1a1a;border-radius:4px;height:5px;overflow:hidden;margin-bottom:12px;">
            <div style="height:100%;width:${goal.progress || 0}%;background:#ff6b6b;border-radius:4px;transition:width 0.3s;"></div>
          </div>
          ${missedPills ? `
            <div style="margin-bottom:12px;">
              <div style="font-size:0.75rem;color:#666;margin-bottom:5px;">Recent missed days:</div>
              <div style="display:flex;flex-wrap:wrap;gap:4px;">${missedPills}</div>
            </div>
          ` : ''}
          <div style="display:flex;gap:8px;">
            <button class="btn btn-secondary btn-sm restore-goal-btn" data-id="${goal.id}" style="flex:1;">
              🔄 Restore
            </button>
            <button class="btn btn-danger btn-sm delete-goal-btn" data-id="${goal.id}" style="flex:1;">
              🗑️ Delete
            </button>
          </div>
        `
        grid.appendChild(card)
      }

      goalsSection.appendChild(grid)
    }

    container.appendChild(goalsSection)

    // Mount
    content.innerHTML = ''
    content.appendChild(container)

    // Event delegation — attach ONCE to content after mount
    content.addEventListener('click', async (e) => {
      if (e.target.id === 'force-fail-btn' || e.target.closest('#force-fail-btn')) {
        await window.api.evaluateGoals()
        renderFailedGoals()
        return
      }
      if (e.target.id === 'refresh-failed-btn' || e.target.closest('#refresh-failed-btn')) {
        renderFailedGoals()
        return
      }

      const restoreBtn = e.target.closest('.restore-goal-btn')
      if (restoreBtn) {
        await window.api.restoreGoal(Number(restoreBtn.dataset.id))
        renderFailedGoals()
        return
      }

      const deleteGoalBtn = e.target.closest('.delete-goal-btn')
      if (deleteGoalBtn) {
        if (confirm('Permanently delete this goal?')) {
          await window.api.deleteGoal(Number(deleteGoalBtn.dataset.id))
          renderFailedGoals()
        }
      }
    })

  } catch (error) {
    console.error('❌ Error rendering failed goals:', error)
    content.innerHTML = `
      <div style="padding:40px;text-align:center;color:#ff6b6b;">
        <h2>❌ Error Loading Failed Goals</h2>
        <p>${escapeHtml(error.message)}</p>
        <pre style="text-align:left;background:#1a1a1a;padding:12px;border-radius:6px;margin-top:16px;overflow-x:auto;font-size:0.8rem;">${escapeHtml(error.stack || '')}</pre>
      </div>
    `
  }
}