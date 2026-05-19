// Global profile variables
let userProfile = null

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
    // Fetch stats for the profile
    const stats = await window.api.getDashboardStats()
    
    content.innerHTML = `
      <div class="profile-container">
        <div class="profile-header">
          <div class="profile-avatar">👤</div>
          <div class="profile-info">
            <h2 id="profile-name">Warrior</h2>
            <p class="profile-tagline">Self-improvement enthusiast</p>
            <button class="btn btn-primary" onclick="openEditProfileModal()">Edit Profile</button>
          </div>
        </div>

        <!-- Statistics -->
        <div class="profile-stats">
          <div class="stat-item">
            <span class="stat-icon">📝</span>
            <div class="stat-details">
              <span class="stat-value">${stats.checkmarks_done || 0}</span>
              <span class="stat-name">Checkmarks</span>
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

        <!-- About Section -->
        <div class="profile-section">
          <h3>About</h3>
          <div class="about-content">
            <p>Welcome to Kaizen - your personal self-improvement companion!</p>
            <p>This app helps you track habits, set goals, journal your thoughts, and stay consistent on your self-improvement journey.</p>
          </div>
        </div>

        <!-- Features Section -->
        <div class="profile-section">
          <h3>Features</h3>
          <div class="features-list">
            <div class="feature-item">
              <span>📊 Dashboard</span>
              <p>See your daily activity and progress at a glance</p>
            </div>
            <div class="feature-item">
              <span>📋 Habits</span>
              <p>Track daily habits and build consistency</p>
            </div>
            <div class="feature-item">
              <span>📓 Journal</span>
              <p>Reflect on your day and track your mood</p>
            </div>
            <div class="feature-item">
              <span>🎯 Goals</span>
              <p>Set goals and track your progress</p>
            </div>
            <div class="feature-item">
              <span>📝 CheckMarked</span>
              <p>Track goals with 365-day grid and frequency scheduling</p>
            </div>
          </div>
        </div>

        <!-- Settings Section -->
        <div class="profile-section">
          <h3>Settings</h3>
          <div class="settings-list">
            <div class="setting-item">
              <label>
                <input type="checkbox" id="notifications-enabled" checked>
                <span>Enable Notifications</span>
              </label>
            </div>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="dark-mode" checked>
                <span>Dark Mode</span>
              </label>
            </div>
            <div class="setting-item">
              <button class="btn btn-secondary" onclick="clearAllData()">Clear All Data</button>
              <span class="setting-hint">⚠️ This will delete all your data permanently</span>
            </div>
          </div>
        </div>
      </div>
    `

    // Ensure modal exists
    ensureProfileModalExists()
  } catch (err) {
    console.error('❌ Profile render error:', err)
    content.innerHTML = `
      <div class="error-state" style="padding:40px; text-align:center;">
        <h2>❌ Failed to load profile</h2>
        <p>${err.message || 'Unknown error occurred'}</p>
      </div>
    `
  }
}

/**
 * Ensure profile modal exists in DOM
 */
function ensureProfileModalExists() {
  if (!document.getElementById('profile-modal')) {
    const modalHtml = `
      <div class="modal" id="profile-modal">
        <div class="modal-content">
          <span class="modal-close" onclick="closeEditProfileModal()">&times;</span>
          <h3>Edit Profile</h3>
          
          <form onsubmit="saveProfile(event)">
            <div class="form-group">
              <label for="profile-username">Name</label>
              <input type="text" id="profile-username" placeholder="Enter your name" value="Eco">
            </div>

            <div class="form-group">
              <label for="profile-tagline">Tagline</label>
              <input type="text" id="profile-tagline" placeholder="Your motivational tagline" value="Self-improvement enthusiast">
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
  }
}

/**
 * Open edit profile modal
 */
function openEditProfileModal() {
  ensureProfileModalExists()
  const name = document.getElementById('profile-name').textContent
  document.getElementById('profile-username').value = name
  document.getElementById('profile-modal').classList.add('active')
}

/**
 * Close edit profile modal
 */
function closeEditProfileModal() {
  document.getElementById('profile-modal').classList.remove('active')
}

/**
 * Save profile changes
 */
async function saveProfile(event) {
  event.preventDefault()

  const name = document.getElementById('profile-username').value
  const tagline = document.getElementById('profile-tagline').value

  document.getElementById('profile-name').textContent = name
  
  // Save to localStorage for persistence
  localStorage.setItem('kaizen_user_name', name)
  localStorage.setItem('kaizen_user_tagline', tagline)

  closeEditProfileModal()
}

/**
 * Clear all data with confirmation
 */
function clearAllData() {
  const confirmed = confirm('Are you sure you want to delete ALL your data? This cannot be undone.')
  if (confirmed) {
    const doubleConfirm = confirm('This will delete all habits, entries, goals, and checkmarks. Are you absolutely sure?')
    if (doubleConfirm) {
      alert('Data deletion feature not yet implemented. Please contact support.')
    }
  }
}

/**
 * Load user data from localStorage
 */
function loadUserData() {
  const savedName = localStorage.getItem('kaizen_user_name') || 'Eco'
  const savedTagline = localStorage.getItem('kaizen_user_tagline') || 'Self-improvement enthusiast'
  
  return {
    name: savedName,
    tagline: savedTagline
  }
}