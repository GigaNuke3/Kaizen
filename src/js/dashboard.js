async function renderDashboard() {
  const content = document.getElementById('main-content')
  if (!content) {
    console.error('❌ Error: main-content element not found')
    return
  }

  try {
    // Fetch data
    const [stats, journalEntries, todayStats, streakStats, weeklySummary] = await Promise.all([
      window.api.getDashboardStats(),
      window.api.getAllJournalEntries(3),
      window.api.getTodayGoalStats(),
      window.api.getStreakStats(),
      window.api.getWeeklySummary()
    ])

    content.innerHTML = `
      <div class="dashboard">
        <div class="dash-header">
          <h2>Good ${getGreeting()}, Warrior</h2>
          <p class="date">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div class="stats-row">
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
          <div class="stat-card">
            <span class="stat-num">${streakStats.current || 0}</span>
            <span class="stat-label">Current Streak 🔥</span>
          </div>
          <div class="stat-card">
            <span class="stat-num">${streakStats.longest || 0}</span>
            <span class="stat-label">Longest Streak 🏆</span>
          </div>
        </div>

        <div class="section">
          <h3>This Week</h3>
          <div id="weekly-summary"></div>
        </div>

        <div class="section">
          <h3>Activity Last 12 Months</h3>
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

        <div class="section section--chart">
          <h3>Top 5 Goal Labels</h3>
          <canvas id="spiderChart"></canvas>
        </div>

        <div class="dash-bottom">
          <div class="section half">
            <h3>Today's Goals</h3>
            <div id="today-goals-summary"></div>
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

    // Render today's goal stats
    const goalSummaryEl = document.getElementById('today-goals-summary')
    if (goalSummaryEl) {
      const completed  = todayStats?.completed  || 0
      const scheduled  = todayStats?.scheduled  || 0
      const percentage = todayStats?.percentage || 0

      if (scheduled === 0) {
        goalSummaryEl.innerHTML = '<p class="empty-msg">No goals scheduled for today.</p>'
      } else {
        const remaining = scheduled - completed
        goalSummaryEl.innerHTML = `
          <div style="display:flex;flex-direction:column;gap:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="color:#aaa;font-size:0.9rem;">${completed} of ${scheduled} checked in</span>
              <span style="color:#6ee7b7;font-weight:700;font-size:1rem;">${percentage}%</span>
            </div>
            <div style="background:#2a2a2a;border-radius:4px;height:8px;overflow:hidden;">
              <div style="height:100%;width:${percentage}%;background:linear-gradient(90deg,#6ee7b7,#39d353);border-radius:4px;transition:width 0.4s;"></div>
            </div>
            <p style="color:#666;font-size:0.82rem;margin:0;">
              ${remaining > 0
                ? `${remaining} goal${remaining !== 1 ? 's' : ''} still open today — head to <strong style="color:#6ee7b7;">CheckMarked</strong> to check in.`
                : '🎉 All goals checked in for today!'}
            </p>
          </div>
        `
      }
    }

    // Render weekly summary
    const weeklyEl = document.getElementById('weekly-summary')
    if (weeklyEl && weeklySummary) {
      const MOOD_EMOJI = { sad: '😢', neutral: '😐', good: '🙂', happy: '😄', excited: '🚀' }
      const topMood = weeklySummary.topMood ? (MOOD_EMOJI[weeklySummary.topMood] || '😐') : '—'
      weeklyEl.innerHTML = `
        <div style="display:flex;gap:16px;flex-wrap:wrap;">
          <div style="flex:1;min-width:110px;">
            <span style="font-size:1.4rem;font-weight:700;color:#6ee7b7;">${weeklySummary.checkins || 0}</span>
            <div style="color:#888;font-size:0.8rem;">Check-ins</div>
          </div>
          <div style="flex:1;min-width:110px;">
            <span style="font-size:1.4rem;font-weight:700;color:#6ee7b7;">${weeklySummary.journalEntries || 0}</span>
            <div style="color:#888;font-size:0.8rem;">Journal Entries</div>
          </div>
          <div style="flex:1;min-width:110px;">
            <span style="font-size:1.4rem;font-weight:700;color:#6ee7b7;">${weeklySummary.completionPct || 0}%</span>
            <div style="color:#888;font-size:0.8rem;">Goal Completion</div>
          </div>
          <div style="flex:1;min-width:110px;">
            <span style="font-size:1.4rem;">${topMood}</span>
            <div style="color:#888;font-size:0.8rem;">Top Mood</div>
          </div>
        </div>
      `
    }

    // Render recent journal
    if (journalEntries.length > 0) {
      const journalHtml = journalEntries.map(j => `
        <div class="journal-preview">
          <p><strong>${new Date(j[2] + 'T12:00:00').toLocaleDateString()}:</strong> ${j[1].substring(0, 100)}...</p>
        </div>
      `).join('')
      document.getElementById('recent-journal').innerHTML = journalHtml
    }

    renderContributionGrid()
    renderSpiderChart()
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

async function renderContributionGrid() {
  const grid = document.getElementById('contribution-grid')
  if (!grid) return

  const today = new Date()
  
  // Calculate start date: 12 months ago from today
  const startDate = new Date(today)
  startDate.setFullYear(startDate.getFullYear() - 1)
  
  // Get real contribution data
  const contributionData = await window.api.getContributionData()

  // Build array of all dates from startDate to today
  const allDates = []
  const current = new Date(startDate)
  while (current <= today) {
    allDates.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  // Group dates into weeks (Sunday to Saturday)
  const weeks = []
  let currentWeek = []
  const firstDayOfWeek = startDate.getDay() // 0 = Sunday
  
  // Add padding for the first week if it doesn't start on Sunday
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push(null)
  }

  // Add all dates to weeks
  for (const date of allDates) {
    currentWeek.push(date)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }

  // Add final week WITHOUT padding — just push whatever days are left
  if (currentWeek.length > 0) {
    weeks.push(currentWeek)
  }

  // Create GitHub-like layout
  const container = document.createElement('div')
  container.className = 'github-contribution-container'

  // Day labels (left side)
  const daysLabel = document.createElement('div')
  daysLabel.className = 'contribution-days-label'
  daysLabel.innerHTML = `
    <div class="day-label"></div>
    <div class="day-label">Mon</div>
    <div class="day-label"></div>
    <div class="day-label">Wed</div>
    <div class="day-label"></div>
    <div class="day-label">Fri</div>
    <div class="day-label"></div>
  `
  container.appendChild(daysLabel)

  // Main grid container
  const gridWrapper = document.createElement('div')
  gridWrapper.className = 'contribution-grid-wrapper'

  // Month headers with proper grid column alignment
  const monthsHeader = document.createElement('div')
  monthsHeader.className = 'contribution-months-header'
  monthsHeader.style.gridTemplateColumns = `repeat(${weeks.length}, 22px)`

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  
  // Build month labels chronologically using year+month key to avoid duplicates
  const monthLabels = [] // { label, weekIndex }
  let prevMonthKey = null

  for (let weekIndex = 0; weekIndex < weeks.length; weekIndex++) {
    const week = weeks[weekIndex]
    const firstDate = week.find(d => d !== null)
    if (firstDate) {
      const monthKey = `${firstDate.getFullYear()}-${firstDate.getMonth()}`
      if (monthKey !== prevMonthKey) {
        monthLabels.push({
          label: monthNames[firstDate.getMonth()],
          weekIndex
        })
        prevMonthKey = monthKey
      }
    }
  }

  // Create month headers with proper column alignment
  for (let i = 0; i < monthLabels.length; i++) {
    const { label, weekIndex } = monthLabels[i]
    const nextWeekIndex = i + 1 < monthLabels.length 
      ? monthLabels[i + 1].weekIndex 
      : weeks.length

    const span = nextWeekIndex - weekIndex

    const monthSpan = document.createElement('div')
    monthSpan.className = 'month-header'
    monthSpan.style.gridColumn = `${weekIndex + 1} / span ${span}`
    monthSpan.textContent = label
    monthsHeader.appendChild(monthSpan)
  }
  gridWrapper.appendChild(monthsHeader)

  // Contribution cells grid
  const cellsGrid = document.createElement('div')
  cellsGrid.className = 'contribution-cells-grid'
  cellsGrid.style.gridTemplateColumns = `repeat(${weeks.length}, 22px)`

  // Add cells for each week and day
  for (let weekIdx = 0; weekIdx < weeks.length; weekIdx++) {
    const week = weeks[weekIdx]
    const isLastWeek = weekIdx === weeks.length - 1

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const date = week[dayIndex] ?? null  // undefined becomes null for short last week

      if (date === null) {
        // Skip trailing nulls in the last week entirely
        if (isLastWeek) continue

        // Keep leading nulls in the first week for Sunday alignment
        const paddingCell = document.createElement('div')
        paddingCell.className = 'contrib-cell contrib-cell-padding'
        paddingCell.style.visibility = 'hidden'
        cellsGrid.appendChild(paddingCell)
      } else {
        const isPast = date <= today
        const dateStr = getLocalDateString(date)
        const count = contributionData[dateStr] || 0
        
        // Color mapping: fewer contributions = lighter, more = darker
        let level = 0
        if (isPast) {
          if (count === 0) {
            level = 0  // #1e1e1e - no contribution
          } else if (count < 2) {
            level = 4  // #39d353 - 1 contribution (bright)
          } else if (count < 4) {
            level = 3  // #26a641 - 2-3 contributions
          } else if (count < 6) {
            level = 2  // #006d32 - 4-5 contributions
          } else {
            level = 1  // #0d4429 - 6+ contributions (dark)
          }
        }
        
        const cell = document.createElement('div')
        cell.className = `contrib-cell l${level}`
        cell.title = `${dateStr}: ${count} contribution${count !== 1 ? 's' : ''}`
        cellsGrid.appendChild(cell)
      }
    }
  }

  gridWrapper.appendChild(cellsGrid)
  container.appendChild(gridWrapper)
  grid.innerHTML = ''
  grid.appendChild(container)
}

async function renderSpiderChart() {
  const canvas = document.getElementById('spiderChart')
  if (!canvas) return

  try {
    // Get top 5 labels with usage counts
    const topLabels = await window.api.getTopLabels(5)
    
    if (!topLabels || topLabels.length === 0) {
      canvas.parentElement.innerHTML = '<p class="empty-msg">No goal labels yet. Create goals to see stats!</p>'
      return
    }

    const labels = topLabels.map(item => item.label)
    const data = topLabels.map(item => item.count)

    // Destroy existing chart if it exists
    if (window.spiderChartInstance) {
      window.spiderChartInstance.destroy()
    }

    // Create radar chart
    window.spiderChartInstance = new Chart(canvas, {
      type: 'radar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Goal Count',
          data: data,
          borderColor: '#6ee7b7',
          backgroundColor: 'rgba(110, 231, 183, 0.1)',
          borderWidth: 2,
          fill: true,
          pointRadius: 5,
          pointBackgroundColor: '#6ee7b7',
          pointBorderColor: '#0f0f0f',
          pointBorderWidth: 2,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: {
              color: '#aaa',
              font: { size: 12 }
            }
          }
        },
        scales: {
          r: {
            beginAtZero: true,
            max: Math.max(...data) * 1.2,
            ticks: {
              color: '#666',
              font: { size: 10 }
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            pointLabels: {
              color: '#aaa',
              font: { size: 12 }
            }
          }
        }
      }
    })
  } catch (err) {
    console.error('❌ Spider chart render error:', err)
    canvas.parentElement.innerHTML = '<p class="empty-msg">Failed to load chart</p>'
  }
}