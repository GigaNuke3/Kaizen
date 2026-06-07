async function renderFailedGoals() {
  const content = document.getElementById('main-content')
  if (!content) return

  content.innerHTML = '<div style="padding:40px;text-align:center;">Loading failed goals...</div>'

  try {
    // 🔥 FORCE FAIL: manually mark any goal with target_date < today as failed
    const allGoals = await window.api.getAllGoals()
    const today = new Date().toISOString().split('T')[0]
    let forcedCount = 0
    for (const goal of allGoals) {
      if (goal[4] < today && goal[5] === 0 && goal[6] === 0) {
        // This goal should be failed – we need a direct way to mark it.
        // Since we don't have a "forceFailGoal" API yet, we'll use restoreGoal + custom logic?
        // Actually, we can call updateGoal to set failed=1? Not directly exposed.
        // So we'll add a temporary SQL injection? Not safe.
        // Instead, we'll show a button to manually fail it.
        console.log(`⚠️ Goal "${goal[1]}" (ID ${goal[0]}) should be failed but isn't.`)
        forcedCount++
      }
    }
    if (forcedCount > 0) {
      console.warn(`Found ${forcedCount} goals that need to be failed. Use the "Force Fail All" button.`)
    }

    // Now call the normal evaluation (it should mark them, but may not work)
    await window.api.evaluateGoals()

    // Refresh goals after evaluation
    const [allGoalsAfter, allCheckmarks] = await Promise.all([
      window.api.getAllGoals(),
      window.api.getAllCheckmarks()
    ])

    const failedGoals = allGoalsAfter.filter(g => g[6] === 1)
    const overdueCheckmarks = allCheckmarks.filter(c => {
      if (c[4] === 1) return false
      const due = c[7]
      if (!due) return false
      return new Date(due) < new Date()
    })

    // Build UI (same as before, but add a force-fail button)
    const container = document.createElement('div')
    container.className = 'failed-goals-container'

    const header = document.createElement('div')
    header.className = 'failed-goals-header'
    header.innerHTML = `
      <h2>❌ Failed &amp; Overdue</h2>
      <div style="display:flex; gap:12px; align-items:center;">
        <span class="badge-count">${failedGoals.length} failed goal${failedGoals.length !== 1 ? 's' : ''}</span>
        <span class="badge-count">${overdueCheckmarks.length} overdue task${overdueCheckmarks.length !== 1 ? 's' : ''}</span>
        <button id="force-fail-btn" class="btn btn-warning" style="margin-left:auto;">⚠️ Force Fail Past Goals</button>
        <button id="refresh-failed-btn" class="btn btn-secondary">🔄 Refresh</button>
      </div>
    `
    container.appendChild(header)

    // ... (rest of your UI rendering code for failed goals and overdue checkmarks)
    // (keep the same as in your original, just make sure to use escapeHtml)

    content.innerHTML = ''
    content.appendChild(container)

    // Add force-fail button handler
    document.getElementById('force-fail-btn')?.addEventListener('click', async () => {
      const all = await window.api.getAllGoals()
      const todayStr = new Date().toISOString().split('T')[0]
      let count = 0
      for (const goal of all) {
        if (goal[4] < todayStr && goal[5] === 0 && goal[6] === 0) {
          // We need a way to set failed=1. Since you don't have an API, 
          // you can add this temporary function in your backend.
          // For now, show alert and suggest adding the backend method.
          alert(`Goal "${goal[1]}" needs to be failed. Please add a forceFailGoal API.`)
          count++
        }
      }
      if (count === 0) alert('No goals need force-failing.')
      else await renderFailedGoals() // retry
    })

    document.getElementById('refresh-failed-btn')?.addEventListener('click', () => renderFailedGoals())

  } catch (error) {
    console.error('❌ Error rendering failed goals:', error)
    content.innerHTML = `<div class="error">${error.message}</div>`
  }
}