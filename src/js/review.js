/**
 * Weekly Review page — this week (Mon–Sun) at a glance, the one goal worth adjusting,
 * and an on-demand insight from the companion. Opened from the dashboard or the Sunday notification.
 */

/** Monday..Sunday date strings for the week containing `date` */
function weekDates(date = new Date()) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  monday.setDate(monday.getDate() + (monday.getDay() === 0 ? -6 : 1 - monday.getDay()))
  return Array.from({ length: 7 }, (_, i) => getLocalDateString(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)))
}

/** Per-goal scheduled/done counts for the given days, from the tracking grid (rest days don't count) */
function weekGoalStats(grid, days) {
  const today = getLocalDateString()
  return grid.goals.map(goal => {
    let scheduled = 0
    let done = 0
    for (const date of days) {
      if (date > today) continue
      if (!shouldShowDayForGoal(date, goal.frequency, goal.scheduled_days)) continue
      if (!isDateWithinChecklistWindow(date, goal.start_date, goal.target_date)) continue
      const key = `${goal.id}_${date}`
      if (grid.excused?.[key] === 1) continue
      scheduled++
      if (grid.completions?.[key] === 1) done++
    }
    return { goal, scheduled, done, rate: scheduled ? Math.round((done / scheduled) * 100) : null }
  })
}

/** The goal most worth adjusting: lowest rate this week, if it's below 70% */
function goalToAdjust(stats) {
  const candidates = stats.filter(s => s.rate !== null && s.rate < 70).sort((a, b) => a.rate - b.rate)
  return candidates[0] || null
}

async function renderWeeklyReview() {
  const content = document.getElementById('main-content')
  if (!content) return

  const days = weekDates()
  const [summary, grid, entries] = await Promise.all([
    window.api.getWeeklySummary(),
    window.api.getGoalTrackingGrid(),
    window.api.getJournalEntriesBetween(days[0], days[6])
  ])
  const stats = weekGoalStats(grid, days)
  const adjust = goalToAdjust(stats)
  const today = getLocalDateString()
  const fmt = (d, opts) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', opts)

  // Day strip: mood color from the day's last entry, check-in count from the grid
  const moodByDate = Object.fromEntries(entries.map(e => [e[2], e[4]]))
  const checkinsByDate = {}
  for (const [key, v] of Object.entries(grid.completions || {})) {
    if (v === 1) {
      const date = key.slice(key.indexOf('_') + 1)
      checkinsByDate[date] = (checkinsByDate[date] || 0) + 1
    }
  }
  const strip = days.map(d => {
    const mood = moodByDate[d]
    return `
      <div class="review-day${d === today ? ' review-today' : ''}${d > today ? ' review-future' : ''}">
        <span class="review-day-name">${fmt(d, { weekday: 'short' })}</span>
        <div class="review-day-cell" style="${mood ? `background:${MOOD_COLORS[mood] || MOOD_COLORS.neutral}` : ''}">
          ${mood ? companionImg(mood, 'mood-face') : ''}
        </div>
        <span class="review-day-count">${checkinsByDate[d] ? `${px('check')} ${checkinsByDate[d]}` : '—'}</span>
      </div>`
  }).join('')

  const goalRows = stats.length === 0
    ? '<p class="empty-msg">No active goals this week.</p>'
    : stats.map(({ goal, scheduled, done, rate }) => `
      <div class="review-goal" style="--goal-color:${goal.color || '#6ee7b7'}">
        <span class="review-goal-title">${px('target')} ${escapeHtml(goal.title)}</span>
        <div class="goal-progress-bar"><div style="width:${rate ?? 0}%"></div></div>
        <span class="review-goal-rate">${scheduled ? `${done}/${scheduled}` : 'Not scheduled'}</span>
      </div>`).join('')

  const adjustHtml = adjust
    ? `<p><strong>${escapeHtml(adjust.goal.title)}</strong> landed ${adjust.done} of ${adjust.scheduled} this week (${adjust.rate}%).
         ${adjust.rate < 40 ? 'Make it smaller: fewer days a week, or a shorter version of the task.' : 'Close. Try moving its time to when you usually have energy.'}</p>
       <button class="btn btn-secondary" onclick="loadPage('goals').then(() => editGoal(${adjust.goal.id}))">${px('pencil')} Adjust this goal</button>`
    : `<p>${px('sparkle')} Every goal hit 70% or more this week. Keep the same plan — consistency is the point.</p>`

  content.innerHTML = `
    <div class="review-container">
      ${pageHeader('calendar', 'Weekly Review', `${fmt(days[0], { month: 'short', day: 'numeric' })} – ${fmt(days[6], { month: 'short', day: 'numeric' })} · Look back, then adjust one thing.`,
        `<button class="btn btn-secondary" onclick="loadPage('dashboard')">${px('arrowLeft')} Dashboard</button>`)}

      <div class="summary-row">
        <div class="summary-tile">${px('check', 28)}<div><strong>${summary.checkins || 0}</strong><span>Check-ins</span></div></div>
        <div class="summary-tile">${px('book', 28)}<div><strong>${summary.journalEntries || 0}</strong><span>Journal entries</span></div></div>
        <div class="summary-tile">${px('chartUp', 28)}<div><strong>${summary.completionPct || 0}%</strong><span>Goal completion</span></div></div>
        <div class="summary-tile">${summary.topMood ? companionImg(summary.topMood, 'page-header-sprite') : px('sun', 28)}<div><strong>${summary.topMood || '—'}</strong><span>Top mood</span></div></div>
      </div>

      <div class="section">
        <h3>${px('calendar')} Your week in pixels</h3>
        <div class="review-strip">${strip}</div>
      </div>

      <div class="section">
        <h3>${px('target')} Goals this week</h3>
        <div class="review-goals">${goalRows}</div>
      </div>

      <div class="section">
        <h3>${px('bulb')} One thing to adjust</h3>
        <div class="review-adjust">${adjustHtml}</div>
      </div>

      <div class="section">
        <h3>${companionImg('happy', 'mood-face')} ${companionName()}'s take</h3>
        <div id="review-insight" class="review-insight">
          <button class="btn btn-primary" onclick="streamReviewInsight()">${px('sparkle')} Ask ${companionName()} for a weekly insight</button>
        </div>
      </div>
    </div>
  `
}

async function streamReviewInsight() {
  const box = document.getElementById('review-insight')
  if (!box) return
  if (!(await isOllamaRunning())) {
    box.innerHTML = `<p>${companionName()} is offline. Start Ollama (or download the model on the Companion page) and try again.</p>`
    return
  }
  const days = weekDates()
  const [entries, summary] = await Promise.all([
    window.api.getJournalEntriesBetween(days[0], days[6]),
    window.api.getWeeklySummary()
  ])
  const journal = entries.length
    ? entries.map(r => `[${r[2]}] (${r[4] || 'no mood'}) ${r[1]}`).join('\n')
    : '(no journal entries this week)'
  const prompt = `Here is my journal from this week:\n${journal}\n\nWeekly stats: ${summary.checkins} check-ins, ${summary.journalEntries} journal entries, ${summary.completionPct}% goal completion.\n\nGive me a warm, specific weekly review in 4-6 sentences: celebrate wins, notice one pattern, and suggest one small change for next week.`

  box.innerHTML = '<p class="review-insight-text"></p>'
  const text = box.querySelector('.review-insight-text')
  try {
    await streamKaiChat([
      { role: 'system', content: kaiSystemPrompt() + await kaiUserContext() },
      { role: 'user', content: prompt }
    ], (chunk, full) => { text.textContent = full })
  } catch (err) {
    console.error('Review insight error:', err)
    text.textContent = "Hmm, I couldn't respond right now. Try again later."
  }
}

if (typeof module !== 'undefined') module.exports = { weekDates, goalToAdjust }
