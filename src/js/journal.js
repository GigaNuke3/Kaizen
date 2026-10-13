/**
 * Global journal variables
 */
let allJournalEntries = []
let journalSearchQuery = ''
let journalFilterMood = null

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
    const [analytics, entries] = await Promise.all([
      window.api.getMoodAnalytics(90),
      window.api.searchJournalEntries(journalSearchQuery, journalFilterMood, 200)
    ])
    allJournalEntries = entries

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
          ${px('pin')} Write a journal entry for <strong style="color:#6ee7b7;">${dateLabel}</strong> linked to this goal to unlock your CheckMarked slot.
          <br><span style="font-size:0.8rem;color:#888;margin-top:4px;display:block;">This journal entry will be saved specifically for that goal's check-in.</span>
        </div>
      `
    }

    const entriesHtml = journalEntriesHtml(allJournalEntries)

    content.innerHTML = `
      <div class="journal-container">
        ${pageHeader('book', 'Journal', 'Reflect on your day. <span class="kbd">Ctrl+N</span> starts a new entry.',
          '<button class="btn btn-primary" onclick="openAddJournalModal()">+ New Entry</button>')}
        </div>
        ${bannerHtml}
        <div class="journal-tools">
          <input type="text" id="journal-search" placeholder="Search entries..." style="flex:1;min-width:180px;background:#1a1a1a;border:1px solid #444;border-radius:6px;padding:8px 12px;color:#fff;">
          <div class="mood-filter" style="display:flex;gap:6px;flex-wrap:wrap;">
            <span class="mood-chip ${journalFilterMood === null ? 'selected' : ''}" data-mood="" style="cursor:pointer;padding:6px 10px;border-radius:16px;border:1px solid #444;color:#ccc;font-size:0.8rem;user-select:none;">All</span>
            <span class="mood-chip ${journalFilterMood === 'sad' ? 'selected' : ''}" data-mood="sad" style="cursor:pointer;padding:6px 10px;border-radius:16px;border:1px solid #444;color:#ccc;font-size:0.8rem;user-select:none;">${companionImg('sad', 'mood-face')}</span>
            <span class="mood-chip ${journalFilterMood === 'neutral' ? 'selected' : ''}" data-mood="neutral" style="cursor:pointer;padding:6px 10px;border-radius:16px;border:1px solid #444;color:#ccc;font-size:0.8rem;user-select:none;">${companionImg('neutral', 'mood-face')}</span>
            <span class="mood-chip ${journalFilterMood === 'good' ? 'selected' : ''}" data-mood="good" style="cursor:pointer;padding:6px 10px;border-radius:16px;border:1px solid #444;color:#ccc;font-size:0.8rem;user-select:none;">${companionImg('good', 'mood-face')}</span>
            <span class="mood-chip ${journalFilterMood === 'happy' ? 'selected' : ''}" data-mood="happy" style="cursor:pointer;padding:6px 10px;border-radius:16px;border:1px solid #444;color:#ccc;font-size:0.8rem;user-select:none;">${companionImg('happy', 'mood-face')}</span>
            <span class="mood-chip ${journalFilterMood === 'excited' ? 'selected' : ''}" data-mood="excited" style="cursor:pointer;padding:6px 10px;border-radius:16px;border:1px solid #444;color:#ccc;font-size:0.8rem;user-select:none;">${companionImg('excited', 'mood-face')}</span>
          </div>
        </div>
        <div class="section">
          <h3>Mood Trends (90 days)</h3>
          <div style="height:220px;"><canvas id="moodTrendChart"></canvas></div>
          <div id="mood-distribution" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px;"></div>
        </div>
        <div class="journal-entries" id="journal-entries">
          ${allJournalEntries.length === 0
            ? `<p class="empty-msg">No journal entries yet. Start your first reflection! ${px('sparkle')}</p>`
            : entriesHtml}
        </div>
      </div>
    `

    ensureJournalModalExists()
    renderMoodAnalytics(analytics)
    bindJournalSearch()

    if (pending && !document.getElementById('journal-modal')?.classList.contains('active')) {
      openAddJournalModal(pending.date)
    }
  } catch (err) {
    console.error('Journal render error:', err)
    content.innerHTML = '<div class="error">Failed to load journal</div>'
  }
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
                <span class="mood-option" onclick="selectMood(event, 'sad')">${companionImg('sad', 'mood-face')} Sad</span>
                <span class="mood-option" onclick="selectMood(event, 'neutral')">${companionImg('neutral', 'mood-face')} Neutral</span>
                <span class="mood-option" onclick="selectMood(event, 'good')">${companionImg('good', 'mood-face')} Good</span>
                <span class="mood-option" onclick="selectMood(event, 'happy')">${companionImg('happy', 'mood-face')} Happy</span>
                <span class="mood-option" onclick="selectMood(event, 'excited')">${companionImg('excited', 'mood-face')} Excited</span>
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
    kzAlert('Please write something!')
    return
  }
  if (!time) {
    kzAlert('Please select a time for your journal entry.')
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
      await window.api.evaluateGoals()
      clearPendingGoalCheck()
      if (typeof loadPage === 'function') {
        loadPage('checkmarked')
        return
      }
    } catch (err) {
      console.error('Could not complete pending goal check:', err)
      kzAlert(err.message || 'Journal saved, but the goal cell could not be checked. Try again on CheckMarked.')
    }
  }

  // Re-render journal to show the new entry
  await renderJournal()

  // ✅ Show Kai's response below the latest (first) entry
  const latestEntry = document.querySelector('.journal-entry')
  if (latestEntry) {
    const kaiSlot = latestEntry.querySelector('.kai-companion-slot')
    if (kaiSlot) {
      await renderKaiCompanion(journalText, kaiSlot, mood)
    }
  }
}

/**
 * Delete journal entry with confirmation
 */
async function deleteJournalEntryConfirm(entryId) {
  if (await kzConfirm('This cannot be undone.', { title: 'Delete this entry?', danger: true, okText: 'Delete' })) {
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
  event.currentTarget.classList.add('selected')
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
 * Companion face for a mood
 */
function getMoodEmoji(mood) {
  return companionImg(mood, 'mood-face')
}

/**
 * Build HTML for a list of journal entries.
 */
function journalEntriesHtml(entries) {
  if (!entries || entries.length === 0) return ''
  return entries.map(entry => {
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
          <button class="icon-btn" onclick="deleteJournalEntryConfirm(${entry[0]})" title="Delete">${px('trash')}</button>
        </div>
        <div class="entry-content">
          ${escapeHtml(entry[1])}
        </div>
        <div class="kai-companion-slot" id="kai-slot-${entry[0]}"></div>
      </div>
    `
  }).join('')
}

/**
 * Re-fetch and re-render just the entry list (keeps search input focused).
 */
async function refreshJournalEntries() {
  const container = document.getElementById('journal-entries')
  if (!container) return
  const entries = await window.api.searchJournalEntries(journalSearchQuery, journalFilterMood, 200)
  allJournalEntries = entries
  container.innerHTML = entries.length === 0
    ? '<p class="empty-msg">No journal entries match. Try a different search.</p>'
    : journalEntriesHtml(entries)
}

/**
 * Bind search input and mood filter chips.
 */
function bindJournalSearch() {
  const input = document.getElementById('journal-search')
  if (!input) return
  input.value = journalSearchQuery
  let debounce
  input.addEventListener('input', () => {
    journalSearchQuery = input.value
    clearTimeout(debounce)
    debounce = setTimeout(refreshJournalEntries, 200)
  })

  document.querySelectorAll('.mood-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const mood = chip.dataset.mood
      journalFilterMood = mood === '' ? null : mood
      document.querySelectorAll('.mood-chip').forEach(c => {
        const active = c.dataset.mood === mood
        c.classList.toggle('selected', active)
        c.style.background = active ? '#6ee7b7' : 'transparent'
        c.style.color = active ? '#000' : '#ccc'
        c.style.borderColor = active ? '#6ee7b7' : '#444'
      })
      refreshJournalEntries()
    })
  })
}

/**
 * Render the mood trend chart and distribution chips.
 */
function renderMoodAnalytics(analytics) {
  const distEl = document.getElementById('mood-distribution')
  if (distEl && analytics.distribution) {
    const moods = ['sad', 'neutral', 'good', 'happy', 'excited'].map(key => ({ key, emoji: companionImg(key, 'mood-face') }))
    distEl.innerHTML = moods.map(m =>
      `<span style="background:#1a1a1a;border:1px solid #444;border-radius:16px;padding:4px 12px;font-size:0.8rem;color:#ccc;">${m.emoji} ${analytics.distribution[m.key] || 0}</span>`
    ).join('')
  }

  const canvas = document.getElementById('moodTrendChart')
  if (!canvas) return
  const trend = analytics.trend || []
  if (trend.length === 0) {
    canvas.parentElement.innerHTML = '<p class="empty-msg">No mood data yet. Write a journal entry to see trends!</p>'
    return
  }

  if (window.moodTrendChartInstance) {
    window.moodTrendChartInstance.destroy()
  }

  const moodScale = { sad: 1, neutral: 2, good: 3, happy: 4, excited: 5 }
  const labels = trend.map(([date]) => date.slice(5))
  const data = trend.map(([, mood]) => moodScale[mood] || 2)

  window.moodTrendChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Mood',
        data,
        borderColor: '#6ee7b7',
        backgroundColor: 'rgba(110, 231, 183, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 2,
        pointBackgroundColor: '#6ee7b7'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          min: 1,
          max: 5,
          ticks: {
            stepSize: 1,
            color: '#666',
            callback: v => ['', 'Sad', 'Meh', 'Good', 'Happy', 'Wow'][v] || ''
          },
          grid: { color: 'rgba(255,255,255,0.08)' }
        },
        x: {
          ticks: { color: '#666', maxTicksLimit: 12 },
          grid: { display: false }
        }
      }
    }
  })
}