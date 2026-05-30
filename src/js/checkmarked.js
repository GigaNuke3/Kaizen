/**
 * CheckMarked Page - Goal Tracking Grid (365-Day View)
 * Displays all active goals with 365-day tracking grid
 * Data flows from Goals page → Database → API
 */

function getLocalDateString(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function setPendingGoalCheck(goalId, date) {
  sessionStorage.setItem(PENDING_GOAL_CHECK_KEY, JSON.stringify({ goalId, date }))
}

function getPendingGoalCheck() {
  try {
    const raw = sessionStorage.getItem(PENDING_GOAL_CHECK_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function clearPendingGoalCheck() {
  sessionStorage.removeItem(PENDING_GOAL_CHECK_KEY)
}

/**
 * Main render function - load and display all goal data
 */
async function renderCheckmarks() {
  const content = document.getElementById('main-content')
  if (!content) {
    console.error('❌ Error: main-content element not found')
    return
  }
  
  try {
    // Clear content
    content.innerHTML = ''
    
    // Load data
    const gridData = await window.api.getGoalTrackingGrid()
    const todayStats = await window.api.getTodayGoalStats()
    
    // Create main container
    const container = document.createElement('div')
    container.className = 'checkmarked-container'
    
    // ===== HEADER =====
    const header = document.createElement('div')
    header.className = 'checkmarked-header'
    header.innerHTML = `
      <h2>✅ CheckMarked - Goal Tracker</h2>
      <p>Track your goals across 365 days with frequency-based scheduling</p>
    `
    container.appendChild(header)
    
    // ===== TODAY'S STATS =====
    const statsDiv = document.createElement('div')
    statsDiv.className = 'checkmarked-stats'
    statsDiv.innerHTML = `
      <div class="stat-item">
        <span class="stat-label">Today's Progress</span>
        <span class="stat-value">${todayStats.completed}/${todayStats.scheduled}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Completion Rate</span>
        <span class="stat-value">${todayStats.percentage}%</span>
      </div>
    `
    container.appendChild(statsDiv)
    
    // ===== EMPTY STATE =====
    if (gridData.goals.length === 0) {
      const emptyState = document.createElement('div')
      emptyState.className = 'empty-state'
      emptyState.innerHTML = `
        <p style="color: #888; text-align: center; padding: 40px 20px;">
          📝 No active goals yet. Create goals in the <strong>Goals</strong> page to start tracking!
        </p>
      `
      container.appendChild(emptyState)
    } else {
      // ===== GOALS INFO SECTION =====
      const goalsInfoSection = document.createElement('div')
      goalsInfoSection.className = 'goals-section'
      goalsInfoSection.innerHTML = `<h3>📋 Active Goals (${gridData.goals.length})</h3>`
      
      const goalsGrid = document.createElement('div')
      goalsGrid.className = 'goals-grid'
      
      for (const goal of gridData.goals) {
        goalsGrid.appendChild(createGoalInfoCard(goal))
      }
      
      goalsInfoSection.appendChild(goalsGrid)
      container.appendChild(goalsInfoSection)
      
      // ===== TRACKING GRID SECTION =====
      const gridSection = document.createElement('div')
      gridSection.className = 'goal-grid-section'
      const earliestDate = gridData.dates.length > 0 ? gridData.dates[0] : 'N/A'
      const latestDate = gridData.dates.length > 0 ? gridData.dates[gridData.dates.length - 1] : 'N/A'
      gridSection.innerHTML = `<h3>📅 Tracking Grid (${earliestDate} → ${latestDate})</h3>`
      
      const gridContainer = document.createElement('div')
      gridContainer.className = 'goal-grid-container'
      
      // Goal labels column (left side)
      const labelsColumn = document.createElement('div')
      labelsColumn.className = 'goal-labels'
      labelsColumn.innerHTML = ''
      
      for (const goal of gridData.goals) {
        const label = document.createElement('div')
        label.className = 'goal-label'
        let timeLabel = ''
        if (goal.time) {
          try {
            const [h, m] = goal.time.split(':')
            const d = new Date()
            d.setHours(parseInt(h), parseInt(m), 0)
            timeLabel = `<div style="font-size: 0.7rem; color: #888; margin-top: 2px;">⌚ ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>`
          } catch(e) {
            timeLabel = `<div style="font-size: 0.7rem; color: #888; margin-top: 2px;">⌚ ${goal.time}</div>`
          }
        }
        
        label.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; width: 30px;">
            <span class="goal-icon">${goal.icon || '🎯'}</span>
          </div>
          <div style="display: flex; flex-direction: column; overflow: hidden;">
            <span class="goal-name" title="${goal.title}" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${goal.title}</span>
            ${timeLabel}
          </div>
        `
        labelsColumn.appendChild(label)
      }
      
      gridContainer.appendChild(labelsColumn)
      
      // Scrollable grid (right side)
      const gridScroll = document.createElement('div')
      gridScroll.className = 'goal-grid-scroll'
      
      const grid = document.createElement('div')
      grid.className = 'goal-grid'

      // Guard flag to prevent infinite scroll event loops
      let isSyncing = false

      gridScroll.addEventListener('scroll', () => {
        if (isSyncing) return
        isSyncing = true
        labelsColumn.scrollTop = gridScroll.scrollTop
        isSyncing = false
      })
      labelsColumn.addEventListener('scroll', () => {
        if (isSyncing) return
        isSyncing = true
        gridScroll.scrollTop = labelsColumn.scrollTop
        isSyncing = false
      })
      
      // Add header spacer in labels column
      const headerSpacer = document.createElement('div')
      headerSpacer.className = 'goal-label label-header'
      headerSpacer.innerHTML = '<span style="font-size:0.85rem; font-weight:600;">Goal</span>'
      labelsColumn.insertBefore(headerSpacer, labelsColumn.firstChild)
      
      // Add day-of-week header row
      const headerRow = document.createElement('div')
      headerRow.className = 'grid-row'

      for (const date of gridData.dates) {
        const d = new Date(date)
        const dayLetter = ['S','M','T','W','T','F','S'][d.getDay()]
        const headerCell = document.createElement('div')
        headerCell.className = 'grid-cell grid-header-cell'
        headerCell.textContent = dayLetter
        headerCell.title = date
        if (d.getDay() === 0 || d.getDay() === 6) {
          headerCell.style.color = '#f472b6'
        }
        headerRow.appendChild(headerCell)
      }
      grid.appendChild(headerRow)
      
      // Get the current local time string (e.g., "14:30")
      const now = new Date()
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      
      const today = getLocalDateString()
      
      // Create one row per goal
      for (const goal of gridData.goals) {
        const row = document.createElement('div')
        row.className = 'grid-row'
        
        // Create a cell for each date
        for (const date of gridData.dates) {
          const shouldDisplay = shouldShowDayForGoal(date, goal.frequency, goal.scheduled_days)
          const isWithinWindow = isDateWithinChecklistWindow(date, goal.start_date, goal.target_date)
          const isNotFuture = new Date(date) <= new Date(today)
          const isNotPast = new Date(date) >= new Date(today)
          
          // Check if the time requirement is met (only relevant for today)
          const goalTime = goal.time || "00:00"
          const isTimeAvailable = (date === today) ? currentTime >= goalTime : true
          
          const cell = document.createElement('div')
          const cellKey = `${goal.id}_${date}`
          const isCompleted = gridData.completions[cellKey] === 1
          
          cell.className = 'grid-cell'
          
          let titleReason = ''
          if (!shouldDisplay) titleReason = ' (Not scheduled)'
          else if (!isWithinWindow) titleReason = ' (Outside checklist window)'
          else if (!isNotFuture) titleReason = ' (Future date - cannot check)'
          else if (!isTimeAvailable) titleReason = ` (Opens today at ${goalTime})`
          
          cell.title = `${goal.title} - ${date}${titleReason}`
          
          if (!shouldDisplay || !isWithinWindow || !isNotFuture || !isTimeAvailable) {
            cell.classList.add('disabled')
          } else {
            const isTodayOnly = date === today

            if (isCompleted) {
              cell.classList.add('completed')
              cell.textContent = '✓'
            }
            
            if (date === today) {
              cell.classList.add('today')
            }
            
            cell.style.cursor = 'pointer'
            cell.addEventListener('click', async () => {
              try {
                await window.api.toggleGoalCompletion(goal.id, date)
                renderCheckmarks()
              } catch (error) {
                showJournalRequiredModal(goal.id, date, error.message)
              }
            })
          }
          
          row.appendChild(cell)
        }
        
        grid.appendChild(row)
      }
      
      gridScroll.appendChild(grid)
      gridContainer.appendChild(gridScroll)
      gridSection.appendChild(gridContainer)
      
      container.appendChild(gridSection)
    }
    
    content.appendChild(container)
    
  } catch (error) {
    console.error('❌ Error rendering checkmarked:', error)
    content.innerHTML = `
      <div class="error-state" style="padding: 40px; text-align: center;">
        <h2>❌ Error Loading CheckMarked</h2>
        <p><strong>${error.message || 'Unknown error'}</strong></p>
        <pre style="text-align: left; background: #1a1a1a; padding: 12px; border-radius: 6px; overflow-x: auto;">
${error.stack || 'No stack trace available'}</pre>
      </div>
    `
  }
}

/**
 * Check if a date is within the checklist window (between start_date and target_date)
 */
function isDateWithinChecklistWindow(dateStr, startDateStr, targetDateStr) {
  if (!startDateStr || !targetDateStr) return true
  
  const date = new Date(dateStr)
  const startDate = new Date(startDateStr)
  const targetDate = new Date(targetDateStr)
  
  return date >= startDate && date <= targetDate
}

/**
 * Determine if a goal should be shown on a given date
 * based on its frequency and scheduled days
 */
function shouldShowDayForGoal(dateStr, frequency, scheduledDaysStr) {
  if (!frequency) return true
  
  const date = new Date(dateStr)
  const dayOfWeek = date.getDay() // 0 = Sunday, 1 = Monday, etc.
  
  switch (frequency) {
    case 'daily':
      return true
    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5
    case 'weekends':
      return dayOfWeek === 0 || dayOfWeek === 6
    case '3x': {
      if (!scheduledDaysStr) return [1, 3, 5].includes(dayOfWeek)
      const days = parseScheduledDays(scheduledDaysStr)
      return days.includes(dayOfWeek)
    }
    case 'custom': {
      if (!scheduledDaysStr) return true
      const customDays = parseScheduledDays(scheduledDaysStr)
      return customDays.includes(dayOfWeek)
    }
    default:
      return true
  }
}

/**
 * Parse scheduled days string (JSON format) to array of day numbers
 */
function parseScheduledDays(scheduledDaysStr) {
  try {
    if (!scheduledDaysStr) return []
    const parsed = JSON.parse(scheduledDaysStr)
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    return []
  }
}

/**
 * Create goal information card showing details
 */
function createGoalInfoCard(goal) {
  const card = document.createElement('div')
  card.className = 'goal-card'
  
  const title = goal.title || 'Untitled Goal'
  const description = goal.description || ''
  const startDate = goal.start_date
  const targetDate = goal.target_date
  const progress = goal.progress || 0
  const icon = goal.icon || '🎯'
  const frequency = goal.frequency || 'daily'
  
  const startStr = startDate 
    ? new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) 
    : ''
  const targetStr = targetDate 
    ? new Date(targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) 
    : ''
  
  const frequencyDisplay = {
    'daily': '📅 Every Day',
    'weekdays': '💼 Weekdays (Mon-Fri)',
    'weekends': '🎉 Weekends (Sat-Sun)',
    '3x': '⭐ 3 times per week',
    'custom': '📍 Custom days'
  }[frequency] || frequency
  
  card.innerHTML = `
    <div class="goal-card-header">
      <div class="goal-card-title">
        <span class="goal-card-icon">${icon}</span>
        <h4>${title}</h4>
      </div>
    </div>
    ${description ? `<p class="goal-desc">${description}</p>` : ''}
    <div class="goal-card-meta">
      <span class="goal-card-frequency"><strong>${frequencyDisplay}</strong></span>
      ${startDate && targetDate ? `<span class="goal-card-target">⏱️ Window: ${startStr} → ${targetStr}</span>` : ''}
    </div>
    <div class="progress-container">
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${progress}%"></div>
      </div>
      <div class="progress-text">
        <span>Progress: ${progress}%</span>
      </div>
    </div>
  `
  
  return card
}

/**
 * Show modal requiring journal entry, then open Journal for that grid date.
 */
function showJournalRequiredModal(goalId, date, errorMessage) {
  setPendingGoalCheck(goalId, date)

  const existing = document.getElementById('journal-required-modal')
  if (existing) existing.remove()

  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  const modal = document.createElement('div')
  modal.id = 'journal-required-modal'
  modal.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.7);
    display: flex; align-items: center; justify-content: center; z-index: 9999;
  `

  const content = document.createElement('div')
  content.style.cssText = `
    background: linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%);
    border: 2px solid #6ee7b7; border-radius: 12px; padding: 40px; max-width: 500px;
    text-align: center; box-shadow: 0 10px 40px rgba(110, 231, 183, 0.2);
  `

  content.innerHTML = `
    <div style="font-size: 48px; margin-bottom: 20px;">📓</div>
    <h2 style="color: #6ee7b7; margin-bottom: 15px; font-size: 24px;">Journal Entry Required</h2>
    <p style="color: #ccc; line-height: 1.6; margin-bottom: 12px;">${errorMessage}</p>
    <p style="color: #888; font-size: 14px; margin-bottom: 30px;">
      Write a journal entry for <strong style="color:#6ee7b7;">${dateLabel}</strong> with a time.
      After you save, this check slot will be marked automatically.
    </p>
    <div style="display: flex; gap: 12px; justify-content: center;">
      <button type="button" id="journal-required-cancel" class="btn btn-secondary">Cancel</button>
      <button type="button" id="journal-required-go" class="btn btn-primary">➔ Go to Journal</button>
    </div>
  `

  modal.appendChild(content)
  document.body.appendChild(modal)

  content.querySelector('#journal-required-cancel').addEventListener('click', () => {
    clearPendingGoalCheck()
    modal.remove()
  })

  content.querySelector('#journal-required-go').addEventListener('click', () => {
    modal.remove()
    if (typeof loadPage === 'function') {
      loadPage('journal')
    }
    setTimeout(() => {
      if (typeof openAddJournalModal === 'function') {
        openAddJournalModal(date)
      }
    }, 150)
  })
}

// Get the current local time string (e.g., "14:30")
const now = new Date()
const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`