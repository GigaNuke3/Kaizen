/**
 * CheckMarked Page - Goal Tracking Grid (365-Day View)
 */

let allGoals = []

/**
 * Render CheckMarked - Goal tracking grid
 */
async function renderTodos() {
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
              renderTodos()
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

/**
 * Ensure todo modal exists in DOM
 */
function ensureTodoModalExists() {
  if (!document.getElementById('todo-modal')) {
    const modalHtml = `
      <div class="modal" id="todo-modal">
        <div class="modal-content">
          <span class="modal-close" onclick="closeTodoModal()">&times;</span>
          <h3 id="todo-modal-title">Add New Todo</h3>
          
          <form onsubmit="saveTodo(event)">
            <div class="form-group">
              <label for="todo-title">Todo Title *</label>
              <input type="text" id="todo-title" placeholder="What do you need to do?" required>
            </div>

            <div class="form-group">
              <label for="todo-desc">Description</label>
              <textarea id="todo-desc" placeholder="Add more details..."></textarea>
            </div>

            <div class="form-group">
              <label for="todo-category">Category</label>
              <select id="todo-category">
                <option value="general">General</option>
                <option value="work">Work</option>
                <option value="personal">Personal</option>
                <option value="health">Health</option>
                <option value="finance">Finance</option>
                <option value="learning">Learning</option>
              </select>
            </div>

            <div class="form-group">
              <label for="todo-priority">Priority</label>
              <select id="todo-priority">
                <option value="0">Low</option>
                <option value="1">Medium</option>
                <option value="2">High</option>
              </select>
            </div>

            <div class="form-group">
              <label for="todo-date">Due Date</label>
              <input type="date" id="todo-date">
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-secondary" onclick="closeTodoModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Todo</button>
            </div>
          </form>
        </div>
      </div>
    `
    document.body.insertAdjacentHTML('beforeend', modalHtml)
  }
}

/**
 * Render a todo item
 */
function renderTodoItem(todo, isCompleted = false) {
  const id = todo[0]
  const title = todo[1]
  const description = todo[2]
  const category = todo[3]
  const priority = todo[5]
  const dueDate = todo[6]
  
  const priorityLabels = ['Low', 'Medium', 'High']
  const priorityColors = ['#666', '#fbbf24', '#f87171']
  const priorityLabel = priorityLabels[priority] || 'Low'
  const priorityColor = priorityColors[priority] || '#666'
  
  const dateStr = dueDate ? new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
  
  return `
    <div class="todo-item ${isCompleted ? 'completed' : ''}">
      <div class="todo-check">
        <input type="checkbox" 
          ${isCompleted ? 'checked' : ''} 
          onchange="toggleTodoCompletion(${id}, ${isCompleted ? 1 : 0})">
      </div>

      <div class="todo-content">
        <div class="todo-title">${title}</div>
        ${description ? `<div class="todo-desc">${description}</div>` : ''}
        <div class="todo-meta">
          ${category !== 'general' ? `<span class="todo-tag">${category}</span>` : ''}
          <span class="todo-priority" style="background: ${priorityColor}; opacity: 0.8;">${priorityLabel}</span>
          ${dateStr ? `<span class="todo-date">Due: ${dateStr}</span>` : ''}
        </div>
      </div>

      <div class="todo-actions">
        ${!isCompleted ? `<button class="icon-btn" onclick="editTodo(${id})" title="Edit">✏️</button>` : ''}
        <button class="icon-btn" onclick="deleteTodoConfirm(${id})" title="Delete">🗑️</button>
      </div>
    </div>
  `
}

/**
 * Open modal to add todo
 */
function openAddTodoModal() {
  ensureTodoModalExists()
  selectedTodoForEdit = null
  document.getElementById('todo-modal-title').textContent = 'Add New Todo'
  document.getElementById('todo-title').value = ''
  document.getElementById('todo-desc').value = ''
  document.getElementById('todo-category').value = 'general'
  document.getElementById('todo-priority').value = '0'
  document.getElementById('todo-date').value = ''
  document.getElementById('todo-modal').classList.add('active')
}

/**
 * Close todo modal
 */
function closeTodoModal() {
  document.getElementById('todo-modal').classList.remove('active')
  selectedTodoForEdit = null
}

/**
 * Edit todo
 */
async function editTodo(todoId) {
  const todo = allTodos.find(t => t[0] === todoId)
  if (!todo) return

  selectedTodoForEdit = todoId
  document.getElementById('todo-modal-title').textContent = 'Edit Todo'
  document.getElementById('todo-title').value = todo[1]
  document.getElementById('todo-desc').value = todo[2] || ''
  document.getElementById('todo-category').value = todo[3] || 'general'
  document.getElementById('todo-priority').value = todo[5] || '0'
  document.getElementById('todo-date').value = todo[6] || ''
  document.getElementById('todo-modal').classList.add('active')
}

/**
 * Save todo (add or update)
 */
async function saveTodo(event) {
  event.preventDefault()

  const title = document.getElementById('todo-title').value
  const description = document.getElementById('todo-desc').value
  const category = document.getElementById('todo-category').value
  const priority = parseInt(document.getElementById('todo-priority').value)
  const dueDate = document.getElementById('todo-date').value

  if (!title.trim()) {
    alert('Todo title is required!')
    return
  }

  if (selectedTodoForEdit) {
    await window.api.updateTodo(selectedTodoForEdit, title, category, priority, dueDate || null, description)
  } else {
    await window.api.addTodo(title, category, priority, dueDate || null, description)
  }

  closeTodoModal()
  renderTodos()
}

/**
 * Toggle todo completion
 */
async function toggleTodoCompletion(todoId, isCompleted) {
  if (isCompleted) {
    await window.api.uncompleteTodo(todoId)
  } else {
    await window.api.completeTodo(todoId)
  }
  renderTodos()
}

/**
 * Delete todo with confirmation
 */
function deleteTodoConfirm(todoId) {
  const todo = allTodos.find(t => t[0] === todoId)
  if (!todo) return

  if (confirm(`Delete todo "${todo[1]}"?`)) {
    deleteTodo(todoId)
  }
}

/**
 * Delete todo
 */
async function deleteTodo(todoId) {
  await window.api.deleteTodo(todoId)
  renderTodos()
}
