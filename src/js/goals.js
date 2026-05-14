/**
 * Goals Page - Goal Management Only
 * (Grid display moved to CheckMarked page)
 */

let allGoals = []
let allLabels = []
let selectedGoalForEdit = null

async function renderGoals() {
  const content = document.getElementById('main-content')
  content.innerHTML = ''
  
  try {
    // Load goals and labels
    allGoals = await window.api.getAllGoals()
    allLabels = await window.api.getAllLabels()
    const activeGoals = allGoals.filter(g => g[4] === 0)
    const completedGoals = allGoals.filter(g => g[4] === 1)
    
    // Create container
    const container = document.createElement('div')
    container.className = 'goals-container'
    
    // Header
    const header = document.createElement('div')
    header.className = 'goals-header'
    header.innerHTML = `
      <div class="goals-header-content">
        <h2>🎯 Goals Management</h2>
        <button class="btn-primary" onclick="openAddGoalModal()">+ Create Goal</button>
        <button class="btn-primary" onclick="openCustomLabelModal()">+ Manage Labels</button>
      </div>
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
      <div class="goal-card-title">
        <span class="goal-card-icon">${icon}</span>
        <h4>${isCompleted ? '✓' : ''} ${title}</h4>
      </div>
      <div class="goal-actions">
        <button class="icon-btn" onclick="editGoal(${id})" title="Edit">✏️</button>
        <button class="icon-btn" onclick="deleteGoalConfirm(${id})" title="Delete">🗑️</button>
      </div>
    </div>
    ${description ? `<div class="goal-labels"><span class="goal-label-badge">${description}</span></div>` : ''}
    ${targetDate ? `<span class="goal-date">Target: ${dateStr}</span>` : ''}
  `
  
  return card
}

function ensureGoalModalExists() {
  if (document.getElementById('goal-modal')) {
    // Update labels in existing modal
    updateLabelDropdown()
    return
  }
  
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
          <label for="goal-label">Label *</label>
          <select id="goal-label" required onchange="handleLabelChange()">
            <option value="">Select a label...</option>
          </select>
          <input type="hidden" id="goal-label-value" value="">
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

function ensureCustomLabelModalExists() {
  if (document.getElementById('customlabel-modal')) return
  
  const modal = document.createElement('div')
  modal.id = 'customlabel-modal'
  modal.className = 'modal'
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Manage Custom Labels</h2>
        <button class="modal-close" onclick="closeCustomLabelModal()">✕</button>
      </div>
      
      <div class="form-group">
        <label for="new-custom-label">Create New Label</label>
        <div style="display: flex; gap: 8px;">
          <input type="text" id="new-custom-label" placeholder="Enter label name..." style="flex: 1;">
          <button type="button" onclick="addNewCustomLabel()" class="btn btn-primary">+ Add</button>
        </div>
      </div>
      
      <div style="margin-top: 24px;">
        <h3 style="font-size: 1rem; margin-bottom: 12px;">Your Custom Labels</h3>
        <div id="custom-labels-display" style="display: flex; flex-direction: column; gap: 8px;"></div>
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeCustomLabelModal()
  })
}

function openCustomLabelModal() {
  ensureCustomLabelModalExists()
  displayCustomLabels()
  document.getElementById('customlabel-modal').classList.add('active')
}

function closeCustomLabelModal() {
  const modal = document.getElementById('customlabel-modal')
  if (modal) modal.classList.remove('active')
  document.getElementById('new-custom-label').value = ''
}

function displayCustomLabels() {
  const customLabels = allLabels.filter(l => l[2] === 1)
  const display = document.getElementById('custom-labels-display')
  
  if (customLabels.length === 0) {
    display.innerHTML = '<p style="color: #666;">No custom labels yet. Create one above!</p>'
    return
  }
  
  let html = ''
  for (const label of customLabels) {
    const labelId = label[0]
    const labelName = label[1]
    html += `
      <div style="display: flex; justify-content: space-between; align-items: center; background: #252525; padding: 12px; border-radius: 6px; border-left: 3px solid #6ee7b7;">
        <span style="color: #fff;">${labelName}</span>
        <button type="button" onclick="deleteCustomLabelFromModal(${labelId})" class="btn-delete" title="Delete">🗑️</button>
      </div>
    `
  }
  display.innerHTML = html
}

function addNewCustomLabel() {
  const input = document.getElementById('new-custom-label')
  const labelValue = input.value.trim()
  
  if (!labelValue) {
    alert('Please enter a label name')
    return
  }
  
  // Check if label already exists
  const existingLabel = allLabels.find(l => l[1].toLowerCase() === labelValue.toLowerCase())
  if (existingLabel) {
    alert('This label already exists!')
    input.value = ''
    return
  }
  
  // Add custom label to database
  window.api.addCustomLabel(labelValue).then(() => {
    window.api.getAllLabels().then(labels => {
      allLabels = labels
      updateLabelDropdown()
      displayCustomLabels()
      input.value = ''
    })
  })
}

function deleteCustomLabelFromModal(labelId) {
  const label = allLabels.find(l => l[0] === labelId)
  if (!label) return
  
  if (confirm(`Delete custom label "${label[1]}"?`)) {
    window.api.deleteLabel(labelId).then(() => {
      window.api.getAllLabels().then(labels => {
        allLabels = labels
        updateLabelDropdown()
        displayCustomLabels()
      })
    })
  }
}

function openAddGoalModal() {
  ensureGoalModalExists()
  selectedGoalForEdit = null
  document.getElementById('goal-modal-title').textContent = 'Create New Goal'
  document.getElementById('goal-form').reset()
  document.getElementById('goal-label-value').value = ''
  updateLabelDropdown()
  document.getElementById('goal-modal').classList.add('active')
}

function closeGoalModal() {
  const modal = document.getElementById('goal-modal')
  if (modal) modal.classList.remove('active')
  selectedGoalForEdit = null
}

async function editGoal(goalId) {
  const goal = allGoals.find(g => g[0] === goalId)
  if (!goal) return
  
  selectedGoalForEdit = goalId
  ensureGoalModalExists()
  document.getElementById('goal-modal-title').textContent = 'Edit Goal'
  document.getElementById('goal-title').value = goal[1]
  const label = goal[2] || ''
  document.getElementById('goal-label-value').value = label
  document.getElementById('goal-date').value = goal[3] || ''
  
  updateLabelDropdown()
  document.getElementById('goal-label').value = label || ''
  
  document.getElementById('goal-modal').classList.add('active')
}

async function saveGoal(event) {
  event.preventDefault()
  
  const title = document.getElementById('goal-title').value
  const label = document.getElementById('goal-label-value').value
  const targetDate = document.getElementById('goal-date').value
  
  if (!title.trim()) {
    alert('Goal title is required!')
    return
  }
  
  if (!label) {
    alert('Please select or create a label!')
    return
  }
  
  try {
    if (selectedGoalForEdit) {
      // Update existing goal
      await window.api.updateGoal(selectedGoalForEdit, title, label, targetDate || null)
    } else {
      // Create new goal
      await window.api.addGoal(title, label, targetDate || null)
    }
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

function addCustomLabel() {
  // This function is kept for backward compatibility but is no longer used
  // Custom labels are now managed through the Manage Labels modal
}

function updateLabelDropdown() {
  const select = document.getElementById('goal-label')
  if (!select) return
  
  const currentValue = select.value
  select.innerHTML = '<option value="">Select a label...</option>'
  
  // Add all labels to dropdown
  for (const label of allLabels) {
    const labelId = label[0]
    const labelName = label[1]
    const isCustom = label[2]
    const option = document.createElement('option')
    option.value = labelName
    option.textContent = labelName
    option.dataset.isCustom = isCustom
    option.dataset.labelId = labelId
    select.appendChild(option)
  }
  
  // Restore previous value if it still exists
  if (currentValue) {
    select.value = currentValue
  }
}

function updateCustomLabelsDisplay() {
  // This function is kept for backward compatibility but is no longer used
  // Custom labels are now managed through the Manage Labels modal
}

async function deleteCustomLabel(labelId) {
  // This function is kept for backward compatibility but is no longer used
  // Use deleteCustomLabelFromModal() instead for the new modal-based management
}

function handleLabelChange() {
  const selectElement = document.getElementById('goal-label')
  const selectedValue = selectElement.value
  document.getElementById('goal-label-value').value = selectedValue
}
