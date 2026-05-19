/**
 * Global journal variables
 */
let allJournalEntries = []

/**
 * Load and render journal
 */
async function renderJournal() {
  const content = document.getElementById('main-content')
  if (!content) {
    console.error('❌ Error: main-content element not found')
    return
  }
  
  try {
    // Fetch journal entries
    allJournalEntries = await window.api.getAllJournalEntries(100)
    
    let entriesHtml = ''
    if (allJournalEntries.length > 0) {
      entriesHtml = allJournalEntries.map(entry => {
        const date = new Date(entry[2]).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
        const mood = getMoodEmoji(entry[3])
        
        return `
          <div class="journal-entry">
            <div class="entry-header">
              <div class="entry-meta">
                <span class="entry-mood">${mood}</span>
                <span class="entry-date">${date}</span>
              </div>
              <button class="icon-btn" onclick="deleteJournalEntryConfirm(${entry[0]})" title="Delete">🗑️</button>
            </div>
            <div class="entry-content">
              ${escapeHtml(entry[1])}
            </div>
          </div>
        `
      }).join('')
    }
    
    content.innerHTML = `
      <div class="journal-container">
        <div class="journal-header">
          <h2>📓 Journal</h2>
          <button class="btn btn-primary" onclick="openAddJournalModal()">+ New Entry</button>
        </div>

        <div class="journal-entries" id="journal-entries">
          ${allJournalEntries.length === 0 ? `<p class="empty-msg">No journal entries yet. Start your first reflection! 🌟</p>` : entriesHtml}
        </div>
      </div>
    `

    ensureJournalModalExists()
  } catch (err) {
    console.error('Journal render error:', err)
    document.getElementById('main-content').innerHTML = '<div class="error">Failed to load journal</div>'
  }
}

/**
 * Simple escape to prevent XSS
 */
function escapeHtml(str) {
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;'
    if (m === '<') return '&lt;'
    if (m === '>') return '&gt;'
    return m
  }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function(c) {
    return c
  })
}

/**
 * Ensure journal modal exists in DOM
 */
function ensureJournalModalExists() {
  if (!document.getElementById('journal-modal')) {
    const modalHtml = `
      <div class="modal" id="journal-modal">
        <div class="modal-content">
          <span class="modal-close" onclick="closeJournalModal()">&times;</span>
          <h3>Today's Reflection</h3>
          
          <form onsubmit="saveJournalEntry(event)">
            <div class="form-group">
              <label for="journal-time">Time *</label>
              <input type="time" id="journal-time" required>
            </div>

            <div class="form-group">
              <label for="journal-mood">How are you feeling?</label>
              <div class="mood-selector">
                <span class="mood-option" data-mood="😢" onclick="selectMood(event, 'sad')">😢 Sad</span>
                <span class="mood-option" data-mood="😐" onclick="selectMood(event, 'neutral')">😐 Neutral</span>
                <span class="mood-option" data-mood="🙂" onclick="selectMood(event, 'good')">🙂 Good</span>
                <span class="mood-option" data-mood="😄" onclick="selectMood(event, 'happy')">😄 Happy</span>
                <span class="mood-option" data-mood="🚀" onclick="selectMood(event, 'excited')">🚀 Excited</span>
              </div>
              <input type="hidden" id="journal-mood" value="neutral">
            </div>

            <div class="form-group">
              <label for="journal-content">Your Thoughts *</label>
              <textarea id="journal-content" placeholder="Write about your day, feelings, achievements, or goals..." required></textarea>
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-secondary" onclick="closeJournalModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Entry</button>
            </div>
          </form>
        </div>
      </div>
    `
    document.body.insertAdjacentHTML('beforeend', modalHtml)
  }
}

/**
 * Open modal to add journal entry
 */
function openAddJournalModal() {
  ensureJournalModalExists()
  document.getElementById('journal-content').value = ''
  document.getElementById('journal-mood').value = 'neutral'
  resetMoodSelector()
  document.getElementById('journal-modal').classList.add('active')
}

/**
 * Close journal modal
 */
function closeJournalModal() {
  document.getElementById('journal-modal').classList.remove('active')
}

/**
 * Save journal entry
 */
async function saveJournalEntry(event) {
  event.preventDefault()

  const content = document.getElementById('journal-content').value
  const mood = document.getElementById('journal-mood').value
  const time = document.getElementById('journal-time').value

  if (!content.trim()) {
    alert('Please write something!')
    return
  }
  if (!time) {
    alert('Please select a time for your journal entry.')
    return
  }

  await window.api.addJournalEntry(content, mood, time)
  closeJournalModal()
  renderJournal()
}

/**
 * Delete journal entry with confirmation
 */
function deleteJournalEntryConfirm(entryId) {
  if (confirm('Delete this entry? This action cannot be undone.')) {
    deleteJournalEntry(entryId)
  }
}

/**
 * Delete journal entry
 */
async function deleteJournalEntry(entryId) {
  await window.api.deleteJournalEntry(entryId)
  renderJournal()
}

/**
 * Select mood for entry
 */
function selectMood(event, mood) {
  document.getElementById('journal-mood').value = mood
  document.querySelectorAll('.mood-option').forEach(el => {
    el.classList.remove('selected')
  })
  event.target.classList.add('selected')
}

/**
 * Reset mood selector
 */
function resetMoodSelector() {
  document.querySelectorAll('.mood-option').forEach(el => {
    el.classList.remove('selected')
  })
  document.querySelectorAll('.mood-option').forEach(el => {
    if (el.getAttribute('onclick').includes('neutral')) {
      el.classList.add('selected')
    }
  })
}

/**
 * Get mood emoji
 */
function getMoodEmoji(mood) {
  const moods = {
    'sad': '😢',
    'neutral': '😐',
    'good': '🙂',
    'happy': '😄',
    'excited': '🚀'
  }
  return moods[mood] || '😐'
}