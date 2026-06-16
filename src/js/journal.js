/**
 * Global journal variables
 */
let allJournalEntries = []

function getLocalDateString(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
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
 * Load and render journal
 */
async function renderJournal() {
  const content = document.getElementById('main-content')
  if (!content) {
    console.error('❌ Error: main-content element not found')
    return
  }

  try {
    allJournalEntries = await window.api.getAllJournalEntries(100)

    const pending = getPendingGoalCheck()
    let bannerHtml = ''
    if (pending) {
      const dateLabel = new Date(pending.date + 'T12:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
      bannerHtml = `
        <div class="journal-pending-banner" style="background:#1a2a1a;border:1px solid #6ee7b7;border-radius:8px;padding:12px 16px;margin-bottom:16px;color:#ccc;">
          📌 Write a journal entry for <strong style="color:#6ee7b7;">${dateLabel}</strong> linked to this goal to unlock your CheckMarked slot.
          <br><span style="font-size:0.8rem;color:#888;margin-top:4px;display:block;">This journal entry will be saved specifically for that goal's check-in.</span>
        </div>
      `
    }

    let entriesHtml = ''
    if (allJournalEntries.length > 0) {
      entriesHtml = allJournalEntries.map(entry => {
        const date = new Date(entry[2] + 'T12:00:00').toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
        const mood = getMoodEmoji(entry[4])
        const timeStr = entry[3] ? ` · ${entry[3]}` : ''

        return `
          <div class="journal-entry" data-id="${entry[0]}">
            <div class="entry-header">
              <div class="entry-meta">
                <span class="entry-mood">${mood}</span>
                <span class="entry-date">${date}${timeStr}</span>
              </div>
              <button class="icon-btn" onclick="deleteJournalEntryConfirm(${entry[0]})" title="Delete">🗑️</button>
            </div>
            <div class="entry-content">
              ${escapeHtml(entry[1])}
            </div>
            <div class="kai-companion-slot" id="kai-slot-${entry[0]}"></div>
          </div>
        `
      }).join('')
    }

    content.innerHTML = `
      <div class="journal-container">
        <div class="journal-header">
          <h2 style="display: flex; align-items: center; gap: 12.1px;">
            <img src="assets/icons/Journal_icon/Journal_Idle.png" style="width: 66px; height: 66px; image-rendering: pixelated; margin: 0;"> 
            Journal
          </h2>
          <button class="btn btn-primary" onclick="openAddJournalModal()">+ New Entry</button>
        </div>
        ${bannerHtml}
        <div class="journal-entries" id="journal-entries">
          ${allJournalEntries.length === 0
            ? `<p class="empty-msg">No journal entries yet. Start your first reflection! 🌟</p>`
            : entriesHtml}
        </div>
      </div>
    `

    ensureJournalModalExists()

    if (pending && !document.getElementById('journal-modal')?.classList.contains('active')) {
      openAddJournalModal(pending.date)
    }
  } catch (err) {
    console.error('Journal render error:', err)
    content.innerHTML = '<div class="error">Failed to load journal</div>'
  }
}

/**
 * Simple escape to prevent XSS
 */
function escapeHtml(str) {
  return String(str).replace(/[&<>]/g, function (m) {
    if (m === '&') return '&amp;'
    if (m === '<') return '&lt;'
    if (m === '>') return '&gt;'
    return m
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
          <h3 id="journal-modal-title">Today's Reflection</h3>
          <p id="journal-modal-date-hint" style="color:#888;font-size:0.85rem;margin:-8px 0 16px;display:none;"></p>
          
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

            <input type="hidden" id="journal-entry-date" value="">

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
 * Open modal to add journal entry (optional date for CheckMarked unlock)
 */
function openAddJournalModal(forDate = null) {
  ensureJournalModalExists()

  const pending = getPendingGoalCheck()
  const entryDate = forDate || pending?.date || getLocalDateString()

  document.getElementById('journal-content').value = ''
  document.getElementById('journal-mood').value = 'neutral'
  document.getElementById('journal-entry-date').value = entryDate

  const now = new Date()
  document.getElementById('journal-time').value =
    `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const titleEl = document.getElementById('journal-modal-title')
  const hintEl = document.getElementById('journal-modal-date-hint')
  if (entryDate === getLocalDateString()) {
    titleEl.textContent = "Today's Reflection"
    hintEl.style.display = 'none'
  } else {
    titleEl.textContent = 'Journal Entry'
    hintEl.style.display = 'block'
    hintEl.textContent = `Entry will be saved for ${new Date(entryDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  resetMoodSelector()
  document.getElementById('journal-modal').classList.add('active')
}

/**
 * Close journal modal
 */
function closeJournalModal() {
  document.getElementById('journal-modal')?.classList.remove('active')
}

/**
 * Save journal entry; if opened from CheckMarked, auto-check the pending cell.
 * After saving, Kai reads the entry and responds below it.
 */
async function saveJournalEntry(event) {
  event.preventDefault()

  // ✅ Grab the actual text content from the form
  const journalText = document.getElementById('journal-content').value
  const mood = document.getElementById('journal-mood').value
  const time = document.getElementById('journal-time').value
  const entryDate =
    document.getElementById('journal-entry-date')?.value ||
    getPendingGoalCheck()?.date ||
    getLocalDateString()

  if (!journalText.trim()) {
    alert('Please write something!')
    return
  }
  if (!time) {
    alert('Please select a time for your journal entry.')
    return
  }

  // Save to database — link to goal if this entry is for a pending check-in
  const pending = getPendingGoalCheck()
  const linkedGoalId = (pending && pending.date === entryDate) ? pending.goalId : null
  await window.api.addJournalEntry(journalText, mood, time, entryDate, linkedGoalId)
  closeJournalModal()

  // Handle pending goal check (CheckMarked unlock)
  if (pending && pending.date === entryDate) {
    try {
      await window.api.toggleGoalCompletion(pending.goalId, pending.date)
      clearPendingGoalCheck()
      if (typeof loadPage === 'function') {
        loadPage('checkmarked')
        return
      }
    } catch (err) {
      console.error('Could not complete pending goal check:', err)
      alert(err.message || 'Journal saved, but the goal cell could not be checked. Try again on CheckMarked.')
    }
  }

  // Re-render journal to show the new entry
  await renderJournal()

  // ✅ Show Kai's response below the latest (first) entry
  const latestEntry = document.querySelector('.journal-entry')
  if (latestEntry) {
    const kaiSlot = latestEntry.querySelector('.kai-companion-slot')
    if (kaiSlot) {
      await renderKaiCompanion(journalText, kaiSlot)
    }
  }
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
    sad: '😢',
    neutral: '😐',
    good: '🙂',
    happy: '😄',
    excited: '🚀'
  }
  return moods[mood] || '😐'
}