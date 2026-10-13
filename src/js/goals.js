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
    
    const avgProgress = activeGoals.length
      ? Math.round(activeGoals.reduce((sum, g) => sum + (g[7] || 0), 0) / activeGoals.length)
      : 0
    const next = activeGoals.filter(g => g[4]).sort((x, y) => x[4].localeCompare(y[4]))[0]

    container.innerHTML = `
      ${pageHeader('target', 'Goals', 'Small steps, every day. Check in on <strong>CheckMarked</strong>.', `
        <button class="btn btn-secondary" onclick="openCustomLabelModal()">${px('pin')} Labels</button>
        <button class="btn btn-primary" onclick="openAddGoalModal()">+ New Goal</button>`)}

      <div class="summary-row">
        <div class="summary-tile">${px('flag', 28)}<div><strong>${activeGoals.length}</strong><span>Active goals</span></div></div>
        <div class="summary-tile">${px('chartUp', 28)}<div><strong>${avgProgress}%</strong><span>Average progress</span></div></div>
        <div class="summary-tile">${px('clock', 28)}<div><strong>${next ? escapeHtml(next[1]) : '—'}</strong><span>${next ? `Next deadline · ${daysLeftLabel(next[3], next[4])}` : 'Next deadline'}</span></div></div>
      </div>

      <div class="goals-section">
        <h3>In progress <span class="goals-count">${activeGoals.length}</span></h3>
        ${activeGoals.length === 0 ? `
          <div class="goals-empty">
            ${px('target', 72)}
            <p>No active goals yet. Start with one small, daily step.</p>
            <button class="btn btn-primary" onclick="openAddGoalModal()">+ Create your first goal</button>
          </div>` : '<div class="goals-grid"></div>'}
      </div>
    `
    const goalsGrid = container.querySelector('.goals-grid')
    for (const goal of activeGoals) goalsGrid.appendChild(createGoalCard(goal))

    content.appendChild(container)
    ensureGoalModalExists()
    
  } catch (error) {
    console.error('Error rendering goals:', error)
    content.innerHTML = '<div class="error">Error loading goals</div>'
  }
}

/** "12 days left" / "Starts in 3 days" / "Last day" / "Ended" for a goal window */
function daysLeftLabel(startDate, targetDate) {
  const today = new Date(getLocalDateString() + 'T12:00:00')
  const diff = (d) => Math.round((new Date(d + 'T12:00:00') - today) / 86400000)
  if (startDate && diff(startDate) > 0) return `Starts in ${diff(startDate)} day${diff(startDate) !== 1 ? 's' : ''}`
  if (!targetDate) return 'No deadline'
  const left = diff(targetDate)
  if (left < 0) return 'Ended'
  if (left === 0) return 'Last day'
  return `${left} day${left !== 1 ? 's' : ''} left`
}

function createGoalCard(goal) {
  // [0]=id [1]=title [3]=start_date [4]=target_date [7]=progress [8]=frequency [12]=color [14]=time [15]=label
  const [id, title, , startDate, targetDate, , , progress = 0, frequency, , , , color = '#6ee7b7', , time, label] = goal
  const fmt = (d) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  let timeStr = ''
  if (time) {
    const [h, m] = time.split(':').map(Number)
    const d = new Date()
    d.setHours(h, m, 0)
    timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  const card = document.createElement('div')
  card.className = 'goal-card'
  card.style.setProperty('--goal-color', color || '#6ee7b7')
  card.innerHTML = `
    <div class="goal-card-header">
      <span class="goal-card-icon">${px('target', 28)}</span>
      <div class="goal-card-title">
        <h4 title="${escapeHtml(title)}">${escapeHtml(title)}</h4>
        ${label ? `<span class="goal-label-badge">${escapeHtml(label)}</span>` : ''}
      </div>
      <div class="goal-actions">
        <button class="icon-btn" onclick="editGoal(${id})" title="Edit" aria-label="Edit goal">${px('pencil')}</button>
        <button class="icon-btn" onclick="deleteGoalConfirm(${id})" title="Delete" aria-label="Delete goal">${px('trash')}</button>
      </div>
    </div>
    <div class="goal-progress">
      <div class="goal-progress-bar"><div style="width:${progress}%"></div></div>
      <span>${progress}%</span>
    </div>
    <div class="goal-meta">
      <span>${frequencyLabel(frequency)}</span>
      ${timeStr ? `<span>${px('clock')} ${timeStr}</span>` : ''}
    </div>
    <div class="goal-footer-row">
      <span>${startDate && targetDate ? `${fmt(startDate)} → ${fmt(targetDate)}` : ''}</span>
      <span class="goal-days-left">${daysLeftLabel(startDate, targetDate)}</span>
    </div>
  `
  return card
}

/**
 * Returns valid day-of-week numbers (0=Sun…6=Sat) for a given frequency.
 * null means every day is valid (daily).
 */
function getScheduledDaysForFrequency(frequency, customDays = []) {
  switch (frequency) {
    case 'daily':    return null               // all days valid
    case 'weekdays': return [1, 2, 3, 4, 5]   // Mon–Fri
    case 'weekends': return [0, 6]             // Sat–Sun
    case '3x':       return [1, 3, 5]          // Mon, Wed, Fri
    case 'custom':   return customDays.length > 0 ? customDays : null
    default:         return null
  }
}

/**
 * Returns a human-readable label for the valid days of a frequency.
 */
function getFrequencyDayLabel(frequency, customDays = []) {
  switch (frequency) {
    case 'daily':    return 'any day'
    case 'weekdays': return 'Monday–Friday'
    case 'weekends': return 'Saturday or Sunday'
    case '3x':       return 'Monday, Wednesday, or Friday'
    case 'custom': {
      const names = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
      return customDays.length > 0
        ? customDays.map(d => names[d]).join(', ')
        : 'your selected days'
    }
    default: return 'any day'
  }
}

/**
 * Validates a date string against a frequency.
 * Returns null if valid, or an error message string if invalid.
 */
function validateDateForFrequency(dateStr, frequency, customDays = []) {
  if (!dateStr) return null // let required attr handle empty
  const validDays = getScheduledDaysForFrequency(frequency, customDays)
  if (!validDays) return null // daily — all days valid
  const dayOfWeek = new Date(dateStr + 'T12:00:00').getDay()
  if (!validDays.includes(dayOfWeek)) {
    return `Must be a ${getFrequencyDayLabel(frequency, customDays)}`
  }
  return null
}

/**
 * Gets the currently selected custom days from the modal checkboxes.
 */
function getSelectedCustomDays() {
  return [...document.querySelectorAll('input[name="day"]:checked')]
    .map(cb => parseInt(cb.value))
}

/**
 * Validates both date fields and shows/hides inline errors.
 * Returns true if both are valid, false otherwise.
 */
function validateGoalDates() {
  const frequency  = document.getElementById('goal-frequency')?.value || 'daily'
  const startDate  = document.getElementById('goal-start-date')?.value
  const targetDate = document.getElementById('goal-date')?.value
  const customDays = frequency === 'custom' ? getSelectedCustomDays() : []

  const startErr  = validateDateForFrequency(startDate, frequency, customDays)
  const targetErr = validateDateForFrequency(targetDate, frequency, customDays)

  // Cross-field: end must be after start
  let rangeErr = null
  if (startDate && targetDate && new Date(startDate) > new Date(targetDate)) {
    rangeErr = 'Closing date must be after opening date'
  }

  // Show/hide inline error messages
  const startErrEl  = document.getElementById('start-date-error')
  const targetErrEl = document.getElementById('target-date-error')
  if (startErrEl)  startErrEl.textContent  = startErr  || ''
  if (targetErrEl) targetErrEl.textContent = rangeErr || targetErr || ''

  // Disable Save button if any errors
  const saveBtn = document.getElementById('goal-save-btn')
  const hasErrors = !!(startErr || targetErr || rangeErr)
  if (saveBtn) {
    saveBtn.disabled = hasErrors
    saveBtn.style.opacity = hasErrors ? '0.5' : '1'
    saveBtn.style.cursor  = hasErrors ? 'not-allowed' : 'pointer'
  }

  return !hasErrors
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
          <label for="goal-time">Time Window *</label>
          <input type="time" id="goal-time" required>
        </div>

        <div class="form-group">
          <label for="goal-start-date">Checklist Opens (Start Date) *</label>
          <input type="date" id="goal-start-date" required>
          <span id="start-date-error" style="color:#ff6b6b;font-size:0.8rem;margin-top:4px;display:block;min-height:16px;"></span>
        </div>
        
        <div class="form-group">
          <label for="goal-date">Checklist Closes (Target Date) *</label>
          <input type="date" id="goal-date" required>
          <span id="target-date-error" style="color:#ff6b6b;font-size:0.8rem;margin-top:4px;display:block;min-height:16px;"></span>
        </div>
        
        <button type="submit" id="goal-save-btn" class="btn btn-primary">Save Goal</button>
      </form>
    </div>
  `
  
  document.body.appendChild(modal)

  // Date validation is handled by validateGoalDates() on blur/change
  document.getElementById('goal-frequency').addEventListener('change', (e) => {
    document.getElementById('custom-days-group').style.display =
      e.target.value === 'custom' ? 'block' : 'none'
    validateGoalDates()
  })

  // Validate dates on blur and change
  document.getElementById('goal-start-date').addEventListener('blur', validateGoalDates)
  document.getElementById('goal-date').addEventListener('blur', validateGoalDates)
  document.getElementById('goal-start-date').addEventListener('change', () => {
    // When start date changes, update target date min to match
    const startVal = document.getElementById('goal-start-date').value
    if (startVal) {
      document.getElementById('goal-date').min = startVal
    }
    validateGoalDates()
  })
  document.getElementById('goal-date').addEventListener('change', validateGoalDates)

  // Re-validate when custom day checkboxes change
  document.querySelectorAll('input[name="day"]').forEach(cb => {
    cb.addEventListener('change', validateGoalDates)
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
        <span style="color: #fff;">${escapeHtml(labelName)}</span>
        <button type="button" onclick="deleteCustomLabelFromModal(${labelId})" class="btn-delete" title="Delete">${px('trash')}</button>
      </div>
    `
  }
  display.innerHTML = html
}

function addNewCustomLabel() {
  const input = document.getElementById('new-custom-label')
  const labelValue = input.value.trim()
  
  if (!labelValue) {
    kzAlert('Please enter a label name')
    return
  }
  
  const existingLabel = allLabels.find(l => l[1].toLowerCase() === labelValue.toLowerCase())
  if (existingLabel) {
    kzAlert('This label already exists!')
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

async function deleteCustomLabelFromModal(labelId) {
  const label = allLabels.find(l => l[0] === labelId)
  if (!label) return
  
  if (await kzConfirm(`Delete custom label "${label[1]}"?`, { danger: true, okText: 'Delete' })) {
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
  document.getElementById('custom-days-group').style.display = 'none'
  updateLabelDropdown()

  // Enforce today as minimum — new goals cannot start in the past
  const today = getLocalDateString()
  document.getElementById('goal-start-date').min = today
  document.getElementById('goal-date').min = today

  // Clear any leftover inline errors and reset Save button
  const startErrEl  = document.getElementById('start-date-error')
  const targetErrEl = document.getElementById('target-date-error')
  const saveBtn     = document.getElementById('goal-save-btn')
  if (startErrEl)  startErrEl.textContent = ''
  if (targetErrEl) targetErrEl.textContent = ''
  if (saveBtn) {
    saveBtn.disabled = false
    saveBtn.style.opacity = '1'
    saveBtn.style.cursor  = 'pointer'
  }

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

  // Remove min restriction for editing — existing goals may have past start dates
  document.getElementById('goal-start-date').removeAttribute('min')
  document.getElementById('goal-date').removeAttribute('min')

  const timeInput = document.getElementById('goal-time')
  if (timeInput) timeInput.value = goal[14] || ''

  if (goal[8] === 'custom' && goal[9]) {  // scheduled_days at index 9
    document.getElementById('custom-days-group').style.display = 'block'
    const days = JSON.parse(goal[9] || '[]')
    document.querySelectorAll('input[name="day"]').forEach(cb => {
      cb.checked = days.includes(parseInt(cb.value))
    })
  } else {
    document.getElementById('custom-days-group').style.display = 'none'
  }

  updateLabelDropdown()
  document.getElementById('goal-label').value = goal[15] || ''
  document.getElementById('goal-modal').classList.add('active')

  // Re-validate with loaded frequency so Save button state is correct on open
  requestAnimationFrame(validateGoalDates)
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
    kzAlert('Goal title is required!')
    return
  }
  if (!label) {
    kzAlert('Please select or create a label!')
    return
  }
  if (!startDate) {
    kzAlert('Start date is required!')
    return
  }
  if (!targetDate) {
    kzAlert('Target date is required!')
    return
  }

  // Run full frequency + range validation before saving
  if (!validateGoalDates()) {
    // Errors are already shown inline under the fields
    return
  }
  
  let scheduledDays = null
  if (frequency === 'custom') {
    const checked = [...document.querySelectorAll('input[name="day"]:checked')]
    if (checked.length === 0) {
      kzAlert('Select at least one day!')
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
    kzAlert('Error saving goal')
  }
}

async function deleteGoalConfirm(goalId) {
  const goal = allGoals.find(g => g[0] === goalId)
  if (!goal) return
  const card = document.querySelector(`[onclick="deleteGoalConfirm(${goalId})"]`)?.closest('.goal-card')
  undoableDelete(`Deleted "${goal[1]}"`, card, () => window.api.deleteGoal(goalId))
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