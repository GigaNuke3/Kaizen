async function renderDashboard() {
  const content = document.getElementById('main-content')
  if (!content) {
    console.error('❌ Error: main-content element not found')
    return
  }
  
  try {
    // Fetch data
    const stats = await window.api.getDashboardStats()
    const todayChecklist = await window.api.getTodayChecklist()
    const journalEntries = await window.api.getAllJournalEntries(3)
    
    content.innerHTML = `
      <div class="dashboard">
        <div class="dash-header">
          <h2>Good ${getGreeting()}, Warrior</h2>
          <p class="date">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div class="stats-row">
          <div class="stat-card">
            <span class="stat-num">${stats.habits || 0}</span>
            <span class="stat-label">Habits Tracked</span>
          </div>
          <div class="stat-card">
            <span class="stat-num">${stats.checkmarks_done || 0}</span>
            <span class="stat-label">Checkmarks Done</span>
          </div>
          <div class="stat-card">
            <span class="stat-num">${stats.contributions_today || 0}</span>
            <span class="stat-label">Today's Actions</span>
          </div>
          <div class="stat-card">
            <span class="stat-num">${stats.journal_entries || 0}</span>
            <span class="stat-label">Journal Entries</span>
          </div>
        </div>

        <div class="section">
          <h3>Activity This Year</h3>
          <div class="contribution-grid" id="contribution-grid"></div>
          <div class="grid-legend">
            <span>Less</span>
            <div class="legend-box l0"></div>
            <div class="legend-box l1"></div>
            <div class="legend-box l2"></div>
            <div class="legend-box l3"></div>
            <div class="legend-box l4"></div>
            <span>More</span>
          </div>
        </div>

        <div class="dash-bottom">
          <div class="section half">
            <h3>Today's Checklist</h3>
            <div id="today-checklist">
              ${todayChecklist.length === 0 ? '<p class="empty-msg">No habits yet. Add some in Habits!</p>' : ''}
            </div>
          </div>
          <div class="section half">
            <h3>Recent Journal</h3>
            <div id="recent-journal">
              ${journalEntries.length === 0 ? '<p class="empty-msg">No entries yet. Start writing!</p>' : ''}
            </div>
          </div>
        </div>
      </div>
    `

    // Render checklist items
    if (todayChecklist.length > 0) {
      const checklistHtml = todayChecklist.map(h => `
        <div class="checklist-item">
          <input type="checkbox" ${h[4] === 1 ? 'checked' : ''} onchange="toggleHabitFromDash(${h[0]}, this.checked)">
          <span>${h[1]}</span>
        </div>
      `).join('')
      document.getElementById('today-checklist').innerHTML = checklistHtml
    }

    // Render recent journal
    if (journalEntries.length > 0) {
      const journalHtml = journalEntries.map(j => `
        <div class="journal-preview">
          <p><strong>${new Date(j[2]).toLocaleDateString()}:</strong> ${j[1].substring(0, 100)}...</p>
        </div>
      `).join('')
      document.getElementById('recent-journal').innerHTML = journalHtml
    }

    renderContributionGrid()
  } catch (err) {
    console.error('❌ Dashboard render error:', err)
    content.innerHTML = `
      <div class="error-state" style="padding:40px; text-align:center;">
        <h2>❌ Failed to load dashboard</h2>
        <p>${err.message || 'Unknown error occurred'}</p>
        <button class="btn btn-primary" onclick="location.reload()">Reload Page</button>
      </div>
    `
  }
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}

/**
 * Toggle habit completion from dashboard
 */
async function toggleHabitFromDash(habitId, isChecked) {
  if (isChecked) {
    await window.api.markHabitComplete(habitId)
  } else {
    await window.api.unmarkHabitComplete(habitId)
  }
  renderDashboard()
}

async function renderContributionGrid() {
  const grid = document.getElementById('contribution-grid')
  if (!grid) return

  const today = new Date()
  const start = new Date(today.getFullYear(), 0, 1)
  
  // Get real contribution data
  const contributionData = await window.api.getContributionData(today.getFullYear())

  let html = ''
  for (let i = 0; i < 365; i++) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    const isPast = date <= today
    const dateStr = date.toISOString().split('T')[0]
    const count = contributionData[dateStr] || 0
    const level = isPast ? Math.min(Math.floor(count / 2), 4) : 0
    html += `<div class="contrib-cell l${level}" title="${dateStr}: ${count} contributions"></div>`
  }

  grid.innerHTML = html
}
