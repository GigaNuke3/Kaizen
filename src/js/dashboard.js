function renderDashboard() {
  const content = document.getElementById('main-content')
  content.innerHTML = `
    <div class="dashboard">
      <div class="dash-header">
        <h2>Good ${getGreeting()}, Eco 👋</h2>
        <p class="date">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-num" id="habit-count">0</span>
          <span class="stat-label">Habits Tracked</span>
        </div>
        <div class="stat-card">
          <span class="stat-num" id="todo-count">0</span>
          <span class="stat-label">Todos Done</span>
        </div>
        <div class="stat-card">
          <span class="stat-num" id="streak-count">0</span>
          <span class="stat-label">Day Streak 🔥</span>
        </div>
        <div class="stat-card">
          <span class="stat-num" id="journal-count">0</span>
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
            <p class="empty-msg">No habits yet. Add some in Habits!</p>
          </div>
        </div>
        <div class="section half">
          <h3>Recent Journal</h3>
          <div id="recent-journal">
            <p class="empty-msg">No entries yet. Start writing!</p>
          </div>
        </div>
      </div>
    </div>
  `

  renderContributionGrid()
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}

function renderContributionGrid() {
  const grid = document.getElementById('contribution-grid')
  if (!grid) return

  const today = new Date()
  const start = new Date(today.getFullYear(), 0, 1)
  const days = Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1

  let html = ''
  for (let i = 0; i < 365; i++) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    const isPast = date <= today
    // Random activity for now — will connect to real data later
    const level = isPast ? Math.floor(Math.random() * 5) : 0
    const dateStr = date.toISOString().split('T')[0]
    html += `<div class="grid-cell l${level}" title="${dateStr}"></div>`
  }

  grid.innerHTML = html
}
