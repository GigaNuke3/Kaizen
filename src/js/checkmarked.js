/**
 * CheckMarked Page - Goal Tracking Grid (365-Day View)
 */

let allGoals = []

/**
 * Render CheckMarked - Goal tracking grid
 */
async function renderCheckmarks() {
  const content = document.getElementById('main-content')
  content.innerHTML = ''
  
  try {
    // Load grid data
    const gridData = await window.api.getGoalTrackingGrid(365)
    const todayStats = await window.api.getTodayGoalStats()
    
    // Create container
    const container = document.createElement('div')
    container.className = 'checkmarked-container'
    
    // Header
    const header = document.createElement('div')
    header.className = 'checkmarked-header'
    header.innerHTML = `
      <h2>✅ CheckMarked - Goal Tracker</h2>
      <p>Track your goals across 365 days</p>
    `
    container.appendChild(header)
    
    // Stats section
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
    
    if (gridData.goals.length === 0) {
      const emptyState = document.createElement('div')
      emptyState.className = 'empty-state'
      emptyState.innerHTML = `
        <p>No goals yet. Create goals in the <strong>Goals</strong> page to start tracking!</p>
      `
      container.appendChild(emptyState)
    } else {
      // Goal tracking grid section
      const gridSection = document.createElement('div')
      gridSection.className = 'goal-grid-section'
      gridSection.innerHTML = '<h3>📅 Tracking Grid (365 Days)</h3>'
      
      // Create grid HTML
      const gridContainer = document.createElement('div')
      gridContainer.className = 'goal-grid-container'
      
      // Goal labels on the left
      const labelsColumn = document.createElement('div')
      labelsColumn.className = 'goal-labels'
      labelsColumn.innerHTML = '<div class="label-spacer"></div>'
      
      for (const goal of gridData.goals) {
        const label = document.createElement('div')
        label.className = 'goal-label'
        label.innerHTML = `
          <span class="goal-icon">${goal.icon || '🎯'}</span>
          <span class="goal-name" title="${goal.title}">${goal.title}</span>
        `
        labelsColumn.appendChild(label)
      }
      
      gridContainer.appendChild(labelsColumn)
      
      // Create scrollable grid
      const gridScroll = document.createElement('div')
      gridScroll.className = 'goal-grid-scroll'
      
      const grid = document.createElement('div')
      grid.className = 'goal-grid'
      
      const today = new Date().toISOString().split('T')[0]
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      // Create grid cells
      for (const goal of gridData.goals) {
        const row = document.createElement('div')
        row.className = 'grid-row'
        
        for (const date of gridData.dates) {
          const cell = document.createElement('div')
          const key = `${goal.id}_${date}`
          const isCompleted = gridData.completions[key] === 1
          const canEdit = date >= twoDaysAgo
          
          cell.className = 'grid-cell'
          cell.style.backgroundColor = goal.color || '#6ee7b7'
          cell.title = `${goal.title} - ${date}`
          
          if (isCompleted) {
            cell.classList.add('completed')
            cell.textContent = '✓'
          }
          
          if (canEdit && date === today) {
            cell.classList.add('today')
          }
          
          if (canEdit) {
            cell.style.cursor = 'pointer'
            cell.addEventListener('click', async () => {
              await window.api.toggleGoalCompletion(goal.id, date)
              renderCheckmarks()
            })
          } else {
            cell.style.opacity = '0.6'
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
    console.error('Error rendering checkmarked:', error)
    content.innerHTML = '<div class="error">Error loading goals tracker</div>'
  }
}


