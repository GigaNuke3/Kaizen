/**
 * Goals Page - Goal Management Only
 * (Grid display moved to CheckMarked page)
 */

let allGoals = []
let selectedGoalForEdit = null

async function renderGoals() {
  const content = document.getElementById('main-content')
  content.innerHTML = ''
  
  try {
    // Load goals
    allGoals = await window.api.getAllGoals()
    const activeGoals = allGoals.filter(g => g[4] === 0)
    const completedGoals = allGoals.filter(g => g[4] === 1)
    
    // Create container
    const container = document.createElement('div')
    container.className = 'goals-container'
    
    // Header
    const header = document.createElement('div')
    header.className = 'goals-header'
    header.innerHTML = `
      <h2>🎯 Goals Management</h2>
      <button class="btn-primary" onclick="openAddGoalModal()">+ Create Goal</button>
    `
    container.appendChild(header)
    
    // Info banner
    const banner = document.createElement('div')
    banner.className = 'info-banner'
    banner.innerHTML = `
      <p>💡 Track your goals in the <strong>CheckMarked</strong> page with the 365-day grid</p>
    `
    container.appendChild(banner)
    
    // Active goals section
    const activeSection = document.createElement('div')
    activeSection.className = 'goals-section'
    activeSection.innerHTML = `<h3>In Progress (${activeGoals.length})</h3>`
    
    if (activeGoals.length === 0) {
      activeSection.innerHTML += '<p class="empty-msg">No active goals yet. Create one to get started!</p>'
    } else {
      const goalsGrid = document.createElement('div')
      goalsGrid.className = 'goals-grid'
      for (const goal of activeGoals) {
        goalsGrid.appendChild(createGoalCard(goal))
      }
      activeSection.appendChild(goalsGrid)
    }
    
    container.appendChild(activeSection)
    
    // Completed goals section
    if (completedGoals.length > 0) {
      const completedSection = document.createElement('div')
      completedSection.className = 'goals-section'
      completedSection.innerHTML = `<h3>Completed (${completedGoals.length})</h3>`
      
      const goalsGrid = document.createElement('div')
      goalsGrid.className = 'goals-grid'
      for (const goal of completedGoals) {
        goalsGrid.appendChild(createGoalCard(goal, true))
      }
      completedSection.appendChild(goalsGrid)
      container.appendChild(completedSection)
    }
    
    content.appendChild(container)
    ensureGoalModalExists()
    
  } catch (error) {
    console.error('Error rendering goals:', error)
    content.innerHTML = '<div class="error">Error loading goals</div>'
  }
}

function createGoalCard(goal, isCompleted = false) {
  const card = document.createElement('div')
  card.className = `goal-card ${isCompleted ? 'completed' : ''}`
  
  const id = goal[0]
  const title = goal[1]
  const description = goal[2]
  const targetDate = goal[3]
  const progress = goal[5]
  const icon = goal[10] || '🎯'
  
  const dateStr = targetDate ? new Date(targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
  
  card.innerHTML = `
    <div class="goal-card-header">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 1.5rem;">${icon}</span>
        <h4>${isCompleted ? '✓' : ''} ${title}</h4>
      </div>
      <div class="goal-actions">
        ${!isCompleted ? `<button class="icon-btn" onclick="editGoal(${id})" title="Edit">✏️</button>` : ''}
        <button class="icon-btn" onclick="deleteGoalConfirm(${id})" title="Delete">🗑️</button>
      </div>
    </div>
    ${description ? `<p class="goal-desc">${description}</p>` : ''}
    ${!isCompleted ? `
      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
        <div class="progress-text">
          <span>${progress}%</span>
          <input type="range" min="0" max="100" value="${progress}" onchange="updateGoalProgress(${id}, this.value)">
        </div>
      </div>
    ` : ''}
    ${targetDate ? `<span class="goal-date">Target: ${dateStr}</span>` : ''}
    <div class="goal-footer">
      ${!isCompleted ? `
        <button class="btn btn-primary" onclick="markGoalComplete(${id})">✓ Mark Complete</button>
      ` : `
        <span class="goal-badge">Completed ✓</span>
      `}
    </div>
  `
  
  return card
}

function ensureGoalModalExists() {
  if (document.getElementById('goal-modal')) return
  
  const modal = document.createElement('div')
  modal.id = 'goal-modal'
  modal.className = 'modal'
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2 id="goal-modal-title">Create New Goal</h2>
        <button class="modal-close" onclick="closeGoalModal()">✕</button>
      </div>
      
      <form id="goal-form" onsubmit="saveGoal(event)">
        <div class="form-group">
          <label for="goal-title">Goal Title *</label>
          <input type="text" id="goal-title" placeholder="e.g., Workout, Read 30 Min" required>
        </div>
        
        <div class="form-group">
          <label for="goal-desc">Description</label>
          <textarea id="goal-desc" placeholder="Why is this goal important?"></textarea>
        </div>
        
        <div class="form-group">
          <label for="goal-frequency">Frequency *</label>
          <select id="goal-frequency" required>
            <option value="daily">Daily (every day)</option>
            <option value="weekdays">Weekdays (Mon-Fri)</option>
            <option value="weekends">Weekends (Sat-Sun)</option>
            <option value="3x">3 times per week</option>
            <option value="custom">Custom days</option>
          </select>
        </div>
        
        <div class="form-group" id="custom-days-group" style="display:none;">
          <label>Select Days:</label>
          <div class="days-selector">
            <label><input type="checkbox" name="day" value="1"> Mon</label>
            <label><input type="checkbox" name="day" value="2"> Tue</label>
            <label><input type="checkbox" name="day" value="3"> Wed</label>
            <label><input type="checkbox" name="day" value="4"> Thu</label>
            <label><input type="checkbox" name="day" value="5"> Fri</label>
            <label><input type="checkbox" name="day" value="6"> Sat</label>
            <label><input type="checkbox" name="day" value="0"> Sun</label>
          </div>
        </div>
        
        <div class="form-group">
          <label for="goal-color">Color</label>
          <div class="color-picker">
            <span class="color-option" style="background-color: #6ee7b7" data-color="#6ee7b7"></span>
            <span class="color-option" style="background-color: #f472b6" data-color="#f472b6"></span>
            <span class="color-option" style="background-color: #60a5fa" data-color="#60a5fa"></span>
            <span class="color-option" style="background-color: #fbbf24" data-color="#fbbf24"></span>
            <span class="color-option" style="background-color: #a78bfa" data-color="#a78bfa"></span>
          </div>
          <input type="hidden" id="goal-color" value="#6ee7b7">
        </div>
        
        <div class="form-group">
          <label for="goal-icon">Icon</label>
          <input type="text" id="goal-icon" placeholder="e.g., 🏃 💪 📚">
        </div>
        
        <div class="form-group">
          <label for="goal-date">Target Date</label>
          <input type="date" id="goal-date">
        </div>
        
        <button type="submit" class="btn btn-primary">Save Goal</button>
      </form>
    </div>
  `
  
  document.body.appendChild(modal)
  
  // Setup event listeners
  document.querySelectorAll('.color-option').forEach(option => {
    option.addEventListener('click', () => {
      document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'))
      option.classList.add('selected')
      document.getElementById('goal-color').value = option.dataset.color
    })
  })
  
  document.getElementById('goal-frequency').addEventListener('change', (e) => {
    document.getElementById('custom-days-group').style.display = 
      e.target.value === 'custom' ? 'block' : 'none'
  })
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeGoalModal()
  })
}

function openAddGoalModal() {
  ensureGoalModalExists()
  selectedGoalForEdit = null
  document.getElementById('goal-modal-title').textContent = 'Create New Goal'
  document.getElementById('goal-form').reset()
  document.getElementById('goal-modal').style.display = 'flex'
}

function closeGoalModal() {
  const modal = document.getElementById('goal-modal')
  if (modal) modal.style.display = 'none'
  selectedGoalForEdit = null
}

async function editGoal(goalId) {
  const goal = allGoals.find(g => g[0] === goalId)
  if (!goal) return
  
  selectedGoalForEdit = goalId
  ensureGoalModalExists()
  document.getElementById('goal-modal-title').textContent = 'Edit Goal'
  document.getElementById('goal-title').value = goal[1]
  document.getElementById('goal-desc').value = goal[2] || ''
  document.getElementById('goal-date').value = goal[3] || ''
  document.getElementById('goal-modal').style.display = 'flex'
}

async function saveGoal(event) {
  event.preventDefault()
  
  const title = document.getElementById('goal-title').value
  const description = document.getElementById('goal-desc').value
  const targetDate = document.getElementById('goal-date').value
  
  if (!title.trim()) {
    alert('Goal title is required!')
    return
  }
  
  try {
    await window.api.addGoal(title, description || '', targetDate || null)
    closeGoalModal()
    renderGoals()
  } catch (error) {
    console.error('Error saving goal:', error)
    alert('Error saving goal')
  }
}

async function updateGoalProgress(goalId, progress) {
  await window.api.updateGoalProgress(goalId, parseInt(progress))
  renderGoals()
}

async function markGoalComplete(goalId) {
  await window.api.completeGoal(goalId)
  renderGoals()
}

function deleteGoalConfirm(goalId) {
  const goal = allGoals.find(g => g[0] === goalId)
  if (!goal) return
  
  if (confirm(`Delete goal "${goal[1]}"? This action cannot be undone.`)) {
    deleteGoal(goalId)
  }
}

async function deleteGoal(goalId) {
  await window.api.deleteGoal(goalId)
  renderGoals()
}
