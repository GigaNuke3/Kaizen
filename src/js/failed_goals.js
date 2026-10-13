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
        const isExcused = gridData.excused?.[key] === 1
        if (!isCompleted && !isExcused) {
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
    container.insertAdjacentHTML('beforeend', pageHeader('x', 'Failed &amp; Overdue',
      `${allFailingGoals.length} failing goal${allFailingGoals.length !== 1 ? 's' : ''}. Restore one and go again — that's Kaizen.`,
      `<button id="force-fail-btn" class="btn btn-warning">${px('warning')} Force Fail Past Goals</button>
       <button id="refresh-failed-btn" class="btn btn-secondary">${px('refresh')} Refresh</button>`))

    // Goals section
    const goalsSection = document.createElement('div')
    goalsSection.style.marginBottom = '32px'

    if (allFailingGoals.length === 0) {
      goalsSection.innerHTML = `
        <h3 style="color:#ff6b6b;margin-bottom:12px;">${px('target')} Failing Goals</h3>
        <p style="color:#666;text-align:center;padding:40px 0;font-size:1rem;">
          No failing goals. You're crushing it! ${px('bolt')}
        </p>
      `
    } else {
      goalsSection.innerHTML = `<h3 style="color:#ff6b6b;margin-bottom:16px;">${px('target')} Failing Goals (${allFailingGoals.length})</h3>`
      const grid = document.createElement('div')
      grid.className = 'failed-goals-grid'

      for (const goal of allFailingGoals) {
        const targetStr = goal.target_date
          ? new Date(goal.target_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : 'No deadline'

        const freqLabel = frequencyLabel(goal.frequency)

        const missedCount = goal.missedDates?.length || 0
        const failureRate = 100 - (goal.progress || 0)

        // Status badge
        const statusBadge = goal.hardFailed
          ? `<span class="fg-status fg-status--hard">${px('warning')} Deadline passed · ${failureRate}% failed</span>`
          : `<span class="fg-status">${px('warning')} ${missedCount} day${missedCount !== 1 ? 's' : ''} missed · ${failureRate}% failed</span>`

        // Show last 5 missed dates as pills
        const missedPills = goal.missedDates?.slice(-5).map(d =>
          `<span class="fg-pill">${new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>`
        ).join('') || ''

        const card = document.createElement('div')
        card.className = 'failed-goal-card'
        card.innerHTML = `
          <div class="fg-head">
            <span class="fg-icon">${px('target', 28)}</span>
            <div class="fg-title">
              <h3 title="${escapeHtml(goal.title)}">${escapeHtml(goal.title)}</h3>
              ${statusBadge}
            </div>
          </div>
          ${goal.description ? `<p class="fg-desc">${escapeHtml(goal.description)}</p>` : ''}
          <div class="fg-progress">
            <div class="fg-progress-bar"><div style="width:${goal.progress || 0}%"></div></div>
            <span>${goal.progress || 0}% done</span>
          </div>
          <div class="fg-meta">
            <span>${px('clock')} Deadline <strong>${targetStr}</strong></span>
            <span>${freqLabel}</span>
          </div>
          ${missedPills ? `<div class="fg-missed"><span>Recent missed days</span><div>${missedPills}</div></div>` : ''}
          <div class="fg-actions">
            <button class="btn btn-secondary btn-sm restore-goal-btn" data-id="${goal.id}">${px('refresh')} Restore</button>
            <button class="btn btn-danger btn-sm delete-goal-btn" data-id="${goal.id}">${px('trash')} Delete</button>
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
        const restoreId = Number(restoreBtn.dataset.id)
        const goal = allFailingGoals.find(g => g.id === restoreId)
        let newTarget = null

        // If the deadline has passed, a restore would instantly re-fail.
        // Ask for a new target date before restoring.
        if (goal && goal.target_date && goal.target_date < today) {
          const extended = new Date()
          extended.setDate(extended.getDate() + 7)
          const defaultDate = getLocalDateString(extended)
          const input = await kzPrompt(
            `The deadline (${goal.target_date}) has passed. Pick a new target date to restore this goal.`,
            { type: 'date', value: defaultDate, min: today },
            { title: 'New deadline', okText: 'Restore' }
          )
          if (input === null) return
          const trimmed = input.trim()
          if (!trimmed) return
          newTarget = trimmed
        }

        try {
          await window.api.restoreGoal(restoreId, newTarget)
          renderFailedGoals()
        } catch (err) {
          kzAlert(err.message || 'Could not restore goal.')
        }
        return
      }

      const deleteGoalBtn = e.target.closest('.delete-goal-btn')
      if (deleteGoalBtn) {
        const id = Number(deleteGoalBtn.dataset.id)
        undoableDelete('Goal deleted', deleteGoalBtn.closest('.failed-goal-card'), () => window.api.deleteGoal(id))
      }
    })

  } catch (error) {
    console.error('❌ Error rendering failed goals:', error)
    content.innerHTML = `
      <div style="padding:40px;text-align:center;color:#ff6b6b;">
        <h2>${px('x')} Error Loading Failed Goals</h2>
        <p>${escapeHtml(error.message)}</p>
        <pre style="text-align:left;background:#1a1a1a;padding:12px;border-radius:6px;margin-top:16px;overflow-x:auto;font-size:0.8rem;">${escapeHtml(error.stack || '')}</pre>
      </div>
    `
  }
}