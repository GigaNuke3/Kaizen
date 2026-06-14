/**
 * Goals Page - Goal Management Only
 * (Grid display moved to CheckMarked page)
 */

let allGoals = []
let allLabels = []
let selectedGoalForEdit = null

async function renderGoals() {
  const content = document.getElementById('main-content')
  if (!content) {
    console.error('❌ Error: main-content element not found')
    return
  }
  
  content.innerHTML = ''
  
  try {
    allGoals = await window.api.getAllGoals()
    allLabels = await window.api.getAllLabels()
    
    // FIXED: correct column indices
    // goal[5] = completed, goal[6] = failed
    const activeGoals = allGoals.filter(g => g[5] === 0 && g[6] === 0)
  
    
    const container = document.createElement('div')
    container.className = 'goals-container'
    
    const header = document.createElement('div')
    header.className = 'goals-header'
    header.innerHTML = `
      <div class="goals-header-content">
        <h2>🎯 Goals Management</h2>
        <button class="btn btn-primary" onclick="openAddGoalModal()">+ Create Goal</button>
        <button class="btn btn-primary" onclick="openCustomLabelModal()">+ Manage Labels</button>
      </div>
    `
    container.appendChild(header)
    
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
  
  // FIXED: correct indices
  const id = goal[0]
  const title = goal[1]
  const description = goal[2]
  const startDate = goal[3]
  const targetDate = goal[4]
  const completed = goal[5]
  const failed = goal[6]
  const progress = goal[7]
  const completionDate = goal[11]
  const color = goal[12]
  const icon = goal[13] || '🎯'
  const time = goal[14]
  const label = goal[15] || ''
  
  const startStr = startDate ? new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
  const targetStr = targetDate ? new Date(targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
  const completionStr = completionDate ? new Date(completionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
  
  let timeInfo = ''
  if (time) {
    // Format the time as h:mm A
    try {
      const [hours, minutes] = time.split(':')
      const d = new Date()
      d.setHours(parseInt(hours), parseInt(minutes), 0)
      timeInfo = ` &middot; ⌚ ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    } catch(e) {
      timeInfo = ` &middot; ⌚ ${time}`
    }
  }

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
    ${label ? `<div class="goal-labels"><span class="goal-label-badge">${label}</span></div>` : ''}
    ${startDate && targetDate ? `<span class="goal-time">⏱️ Window: ${startStr} → ${targetStr}${timeInfo}</span>` : ''}
    ${isCompleted && completionStr ? `<span class="goal-completion">✓ Completed on ${completionStr}</span>` : ''}
  `
  return card
}

function ensureGoalModalExists() {
  if (document.getElementById('goal-modal')) {
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
            <option value="3x">3x per week (Mon, Wed, Fri)</option>
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
          <label for="goal-time">Time Window *</label>
          <input type="time" id="goal-time" required>
        </div>

        <div class="form-group">
          <label for="goal-start-date">Checklist Opens (Start Date) *</label>
          <input type="date" id="goal-start-date" required>
        </div>
        
        <div class="form-group">
          <label for="goal-date">Checklist Closes (Target Date) *</label>
          <input type="date" id="goal-date" required>
        </div>
        
        <button type="submit" class="btn btn-primary">Save Goal</button>
      </form>
    </div>
  `
  
  document.body.appendChild(modal)
  
  // Initialize date input handlers
  initializeDateInputs('goal-start-date')
  initializeDateInputs('goal-date')
  
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
  const input = document.getElementById('new-custom-label')
  if (input) input.value = ''
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
  
  const existingLabel = allLabels.find(l => l[1].toLowerCase() === labelValue.toLowerCase())
  if (existingLabel) {
    alert('This label already exists!')
    input.value = ''
    return
  }
  
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
  document.getElementById('goal-label-value').value = goal[15] || ''
  document.getElementById('goal-start-date').value = goal[3] || ''
  document.getElementById('goal-date').value = goal[4] || ''
  document.getElementById('goal-frequency').value = goal[8] || 'daily'
  document.getElementById('goal-color').value = goal[12] || '#6ee7b7'

  const timeInput = document.getElementById('goal-time')
  if (timeInput) timeInput.value = goal[14] || ''

  if (goal[8] === 'custom' && goal[9]) {
    document.getElementById('custom-days-group').style.display = 'block'
    const days = JSON.parse(goal[9] || '[]')
    document.querySelectorAll('input[name="day"]').forEach(cb => {
      cb.checked = days.includes(parseInt(cb.value))
    })
  } else {
    document.getElementById('custom-days-group').style.display = 'none'
  }

  updateLabelDropdown()
  // Restore label dropdown to saved label value (index 15)
  document.getElementById('goal-label').value = goal[15] || ''
  document.getElementById('goal-modal').classList.add('active')
}

async function saveGoal(event) {
  event.preventDefault()
  
  const title = document.getElementById('goal-title').value.trim()
  const label = document.getElementById('goal-label-value').value
  const startDate = document.getElementById('goal-start-date').value
  const targetDate = document.getElementById('goal-date').value
  const frequency = document.getElementById('goal-frequency').value
  const timeInput = document.getElementById('goal-time')
  const time = timeInput ? timeInput.value : null
  
  if (!title) {
    alert('Goal title is required!')
    return
  }
  if (!label) {
    alert('Please select or create a label!')
    return
  }
  if (!startDate) {
    alert('Start date is required!')
    return
  }
  if (!targetDate) {
    alert('Target date is required!')
    return
  }
  if (new Date(startDate) > new Date(targetDate)) {
    alert('Start date must be before target date!')
    return
  }
  
  let scheduledDays = null
  if (frequency === 'custom') {
    const checked = [...document.querySelectorAll('input[name="day"]:checked')]
    if (checked.length === 0) {
      alert('Select at least one day!')
      return
    }
    scheduledDays = JSON.stringify(checked.map(cb => parseInt(cb.value)))
  } else if (frequency === '3x') {
    scheduledDays = JSON.stringify([1, 3, 5])
  }
  
  try {
    if (selectedGoalForEdit) {
      await window.api.updateGoal(selectedGoalForEdit, title, label, targetDate, frequency, scheduledDays, startDate, time)
    } else {
      await window.api.addGoal(title, label, targetDate, frequency, scheduledDays, startDate, time)
    }
    closeGoalModal()
    renderGoals()
  } catch (error) {
    console.error('Error saving goal:', error)
    alert('Error saving goal')
  }
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

function updateLabelDropdown() {
  const select = document.getElementById('goal-label')
  if (!select) return
  
  const currentValue = select.value
  select.innerHTML = '<option value="">Select a label...</option>'
  
  for (const label of allLabels) {
    const labelName = label[1]
    const option = document.createElement('option')
    option.value = labelName
    option.textContent = labelName
    select.appendChild(option)
  }
  
  if (currentValue) {
    select.value = currentValue
  }
}

function handleLabelChange() {
  const selectElement = document.getElementById('goal-label')
  const selectedValue = selectElement.value
  document.getElementById('goal-label-value').value = selectedValue
}

/**
 * Initialize date input - disables past dates
 */
function initializeDateInputs(inputId) {
  const input = document.getElementById(inputId)
  if (!input) return
  
  // Set minimum date to today to disable past dates
  const today = new Date()
  const minDate = formatDate(today)
  input.setAttribute('min', minDate)
}

/**
 * Format date object to YYYY-MM-DD string
 */
function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}