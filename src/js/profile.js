const PROFILE_DEFAULTS = {
  name: 'Warrior',
  tagline: 'Self-improvement enthusiast'
}

const PROFILE_FEATURES = [
  { icon: '📊', name: 'Dashboard', desc: 'See your daily activity and progress at a glance' },
  { icon: '🔔', name: 'Notifications', desc: 'Goal completed and failed alerts in one place' },
  { icon: '🎯', name: 'Goals', desc: 'Set goals with deadlines and track progress' },
  { icon: '📝', name: 'CheckMarked', desc: '365-day grid with frequency-based scheduling' },
  { icon: '✅', name: 'Completed Goals', desc: 'Review finished goals and restore if needed' },
  { icon: '❌', name: 'Failed Goals', desc: 'See missed goals and overdue checkmark tasks' },
  { icon: '📓', name: 'Journal', desc: 'Reflect on your day and track your mood' }
]

function loadUserData() {
  return {
    name: localStorage.getItem('kaizen_user_name') || PROFILE_DEFAULTS.name,
    tagline: localStorage.getItem('kaizen_user_tagline') || PROFILE_DEFAULTS.tagline,
    notifications: true
  }
}

/**
 * Load and render profile
 */
async function renderProfile() {
  const content = document.getElementById('main-content')
  if (!content) {
    console.error('❌ Error: main-content element not found')
    return
  }

  try {
    const user = loadUserData()
    const [stats, allGoals, settings] = await Promise.all([
      window.api.getDashboardStats(),
      window.api.getAllGoals(),
      window.api.getSettings()
    ])
    user.notifications = settings.notifications

    const activeGoals = allGoals.filter(g => g[5] === 0 && g[6] === 0).length
    const completedGoals = allGoals.filter(g => g[5] === 1).length

    const featuresHtml = PROFILE_FEATURES.map(
      f => `
        <div class="feature-item">
          <span>${f.icon} ${f.name}</span>
          <p>${f.desc}</p>
        </div>
      `
    ).join('')

    content.innerHTML = `
      <div class="profile-container">
        <div class="profile-header">
          <div class="profile-avatar" aria-hidden="true">👤</div>
          <div class="profile-info">
            <h2 id="profile-name">${escapeHtml(user.name)}</h2>
            <p class="profile-tagline" id="profile-tagline">${escapeHtml(user.tagline)}</p>
            <button class="btn btn-primary" onclick="openEditProfileModal()">Edit Profile</button>
          </div>
        </div>

        <div class="profile-stats">
          <div class="stat-item">
            <span class="stat-icon">🎯</span>
            <div class="stat-details">
              <span class="stat-value">${activeGoals}</span>
              <span class="stat-name">Active Goals</span>
            </div>
          </div>
          <div class="stat-item">
            <span class="stat-icon">✅</span>
            <div class="stat-details">
              <span class="stat-value">${completedGoals}</span>
              <span class="stat-name">Completed Goals</span>
            </div>
          </div>
          <div class="stat-item">
            <span class="stat-icon">📓</span>
            <div class="stat-details">
              <span class="stat-value">${stats.journal_entries || 0}</span>
              <span class="stat-name">Journal Entries</span>
            </div>
          </div>
          <div class="stat-item">
            <span class="stat-icon">🔥</span>
            <div class="stat-details">
              <span class="stat-value">${stats.contributions_today || 0}</span>
              <span class="stat-name">Today's Actions</span>
            </div>
          </div>
        </div>

        <div class="profile-section">
          <h3>About</h3>
          <div class="about-content">
            <p>Welcome to Kaizen — your personal self-improvement companion.</p>
            <p>Track goals on the CheckMarked grid, journal your progress, and review completed or failed goals as you improve a little each day.</p>
          </div>
        </div>

        <div class="profile-section">
          <h3>Features</h3>
          <div class="features-list">${featuresHtml}</div>
        </div>

        <div class="profile-section">
          <h3>Settings</h3>
          <div class="settings-list">
            <div class="setting-item">
              <label>
                <input type="checkbox" id="notifications-enabled" ${user.notifications ? 'checked' : ''}
                  onchange="toggleNotificationsSetting(this.checked)">
                <span>Desktop goal notifications</span>
              </label>
            </div>
            <div class="setting-item setting-item--stacked">
              <button class="btn btn-secondary" onclick="clearAllData()">Clear All Data</button>
              <span class="setting-hint">Deletes all goals, journal entries, checkmarks, and habits. Profile name is kept.</span>
            </div>
          </div>
        </div>
      </div>
    `

    ensureProfileModalExists()
    syncProfileModalFields(user)
  } catch (err) {
    console.error('❌ Profile render error:', err)
    content.innerHTML = `
      <div class="error-state" style="padding:40px; text-align:center;">
        <h2>❌ Failed to load profile</h2>
        <p>${escapeHtml(err.message || 'Unknown error occurred')}</p>
      </div>
    `
  }
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function syncProfileModalFields(user) {
  const nameInput = document.getElementById('profile-username')
  const taglineInput = document.getElementById('profile-tagline-input')
  if (nameInput) nameInput.value = user.name
  if (taglineInput) taglineInput.value = user.tagline
}

/**
 * Ensure profile modal exists in DOM
 */
function ensureProfileModalExists() {
  if (document.getElementById('profile-modal')) return

  const user = loadUserData()
  const modalHtml = `
    <div class="modal" id="profile-modal">
      <div class="modal-content">
        <span class="modal-close" onclick="closeEditProfileModal()">&times;</span>
        <h3>Edit Profile</h3>
        <form onsubmit="saveProfile(event)">
          <div class="form-group">
            <label for="profile-username">Name</label>
            <input type="text" id="profile-username" placeholder="Enter your name" required maxlength="48">
          </div>
          <div class="form-group">
            <label for="profile-tagline-input">Tagline</label>
            <input type="text" id="profile-tagline-input" placeholder="Your motivational tagline" maxlength="80">
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="closeEditProfileModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  `
  document.body.insertAdjacentHTML('beforeend', modalHtml)
  syncProfileModalFields(user)
}

function openEditProfileModal() {
  ensureProfileModalExists()
  syncProfileModalFields(loadUserData())
  document.getElementById('profile-modal').classList.add('active')
}

function closeEditProfileModal() {
  document.getElementById('profile-modal')?.classList.remove('active')
}

async function saveProfile(event) {
  event.preventDefault()

  const name = document.getElementById('profile-username').value.trim() || PROFILE_DEFAULTS.name
  const tagline = document.getElementById('profile-tagline-input').value.trim() || PROFILE_DEFAULTS.tagline

  localStorage.setItem('kaizen_user_name', name)
  localStorage.setItem('kaizen_user_tagline', tagline)

  const nameEl = document.getElementById('profile-name')
  const taglineEl = document.getElementById('profile-tagline')
  if (nameEl) nameEl.textContent = name
  if (taglineEl) taglineEl.textContent = tagline

  closeEditProfileModal()
}

async function toggleNotificationsSetting(enabled) {
  await window.api.setSettings({ notifications: enabled })
}

async function clearAllData() {
  if (!confirm('Delete ALL app data (goals, journal, checkmarks, habits)? This cannot be undone.')) return
  if (!confirm('Last chance — permanently erase everything except your profile name and tagline?')) return

  try {
    await window.api.resetAllData()
    alert('All data has been cleared.')
    if (typeof loadPage === 'function') {
      loadPage('dashboard')
    }
  } catch (err) {
    console.error('Error clearing data:', err)
    alert('Could not clear data: ' + err.message)
  }
}
