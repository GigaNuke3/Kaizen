const PROFILE_DEFAULTS = {
  name: 'Warrior',
  tagline: 'Self-improvement enthusiast'
}

const PROFILE_FEATURES = [
  { icon: 'dashboard', name: 'Dashboard', desc: 'See your daily activity and progress at a glance' },
  { icon: 'bell', name: 'Notifications', desc: 'Goal completed and failed alerts in one place' },
  { icon: 'target', name: 'Goals', desc: 'Set goals with deadlines and track progress' },
  { icon: 'clipboard', name: 'CheckMarked', desc: '365-day grid with frequency-based scheduling' },
  { icon: 'trophy', name: 'Completed Goals', desc: 'Review finished goals and restore if needed' },
  { icon: 'x', name: 'Failed Goals', desc: 'See missed goals and overdue checkmark tasks' },
  { icon: 'book', name: 'Journal', desc: 'Reflect on your day and track your mood' }
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
    user.soundEnabled = settings.soundEnabled !== false
    user.remindersEnabled = settings.remindersEnabled === true
    user.reminderTime = settings.reminderTime || '20:00'

    const activeGoals = allGoals.filter(g => g[5] === 0 && g[6] === 0).length
    const completedGoals = allGoals.filter(g => g[5] === 1).length

    const featuresHtml = PROFILE_FEATURES.map(
      f => `
        <div class="feature-item">
          <span>${px(f.icon)} ${f.name}</span>
          <p>${f.desc}</p>
        </div>
      `
    ).join('')

    content.innerHTML = `
      <div class="profile-container">
        <div class="profile-header">
          <div class="profile-avatar" aria-hidden="true">${px('warrior', 72)}</div>
          <div class="profile-info">
            <h2 id="profile-name">${escapeHtml(user.name)}</h2>
            <p class="profile-tagline" id="profile-tagline">${escapeHtml(user.tagline)}</p>
            <button class="btn btn-primary" onclick="openEditProfileModal()">Edit Profile</button>
          </div>
        </div>

        <div class="profile-stats">
          <div class="stat-item">
            <span class="stat-icon">${px('target', 32)}</span>
            <div class="stat-details">
              <span class="stat-value">${activeGoals}</span>
              <span class="stat-name">Active Goals</span>
            </div>
          </div>
          <div class="stat-item">
            <span class="stat-icon">${px('check', 32)}</span>
            <div class="stat-details">
              <span class="stat-value">${completedGoals}</span>
              <span class="stat-name">Completed Goals</span>
            </div>
          </div>
          <div class="stat-item">
            <span class="stat-icon">${px('book', 32)}</span>
            <div class="stat-details">
              <span class="stat-value">${stats.journal_entries || 0}</span>
              <span class="stat-name">Journal Entries</span>
            </div>
          </div>
          <div class="stat-item">
            <span class="stat-icon">${px('flame', 32)}</span>
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
              <span>Theme</span>
              <select class="theme-select" onchange="setTheme(this.value)" aria-label="Theme">
                ${[['dark', 'Dark'], ['light', 'Light'], ['system', 'Match system']].map(([v, t]) =>
                  `<option value="${v}" ${(settings.theme || 'dark') === v ? 'selected' : ''}>${t}</option>`).join('')}
              </select>
            </div>
            <div class="setting-item">
              <span>Companion</span>
              <div class="companion-picker">
                ${['kai', 'zun'].map(c => `
                  <button type="button" class="companion-choice ${(settings.companion || 'kai') === c ? 'selected' : ''}"
                    onclick="setCompanion('${c}')" aria-pressed="${(settings.companion || 'kai') === c}">
                    <img src="assets/Kai-Zun/${c === 'kai' ? 'Kai/Kai' : 'Zun/Zun'}_Happy.png" alt="">
                    ${c === 'kai' ? 'Kai' : 'Zun'}
                  </button>`).join('')}
              </div>
            </div>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="notifications-enabled" ${user.notifications ? 'checked' : ''}
                  onchange="toggleNotificationsSetting(this.checked)">
                <span>Desktop goal notifications</span>
              </label>
            </div>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="sound-enabled" ${user.soundEnabled ? 'checked' : ''}
                  onchange="toggleSoundSetting(this.checked)">
                <span>Navigation sounds</span>
              </label>
            </div>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="reminders-enabled" ${user.remindersEnabled ? 'checked' : ''}
                  onchange="toggleRemindersSetting(this.checked)">
                <span>Daily reminders</span>
              </label>
              <input type="time" id="reminder-time" value="${user.reminderTime}" ${user.remindersEnabled ? '' : 'disabled'}
                onchange="updateReminderTime(this.value)"
                style="background:#1a1a1a;border:1px solid #444;border-radius:6px;padding:6px 8px;color:#fff;">
            </div>
            ${[
              ['closeToTray', 'Keep running in the tray when the window is closed (reminders keep working)'],
              ['launchAtLogin', 'Launch Kaizen at login (starts in the tray)'],
              ['autoBackup', 'Back up automatically every day (keeps the last 7)'],
              ['weeklyReview', 'Sunday weekly review notification (at your reminder time)']
            ].map(([key, text]) => `
            <div class="setting-item">
              <label>
                <input type="checkbox" ${settings[key] ? 'checked' : ''} onchange="toggleAppSetting('${key}', this.checked)">
                <span>${text}</span>
              </label>
            </div>`).join('')}
            <div class="setting-item setting-item--stacked">
              <button class="btn btn-secondary" onclick="clearAllData()">Clear All Data</button>
              <span class="setting-hint">Deletes all goals, journal entries, checkmarks, and habits. Profile name is kept.</span>
            </div>
          </div>
        </div>

        <div class="profile-section">
          <h3>Data</h3>
          <div class="settings-list">
            <div class="setting-item setting-item--stacked">
              <button class="btn btn-secondary" onclick="backupData()">${px('arrowDown')} Back up now</button>
              <span class="setting-hint">Exports all goals, check-ins, journal entries, badges data, and Kai chat to a JSON file.</span>
            </div>
            <div class="setting-item setting-item--stacked">
              <button class="btn btn-secondary" onclick="openBackupsFolder()">${px('box')} Open daily backups folder</button>
              <span class="setting-hint">Automatic daily backups live here. Restore any of them with the button below.</span>
            </div>
            <div class="setting-item setting-item--stacked">
              <button class="btn btn-secondary" onclick="restoreData()">${px('arrowUp')} Restore from backup</button>
              <span class="setting-hint">Replaces all current data with the selected backup file. This cannot be undone.</span>
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
        <h2>${px('x')} Failed to load profile</h2>
        <p>${escapeHtml(err.message || 'Unknown error occurred')}</p>
      </div>
    `
  }
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
  if (window.kaizenSettings) window.kaizenSettings.notifications = enabled
}

async function setTheme(theme) {
  await window.api.setSettings({ theme })
  if (window.kaizenSettings) window.kaizenSettings.theme = theme
  applyTheme(theme)
}

async function toggleAppSetting(key, enabled) {
  try {
    await window.api.setSettings({ [key]: enabled })
    if (window.kaizenSettings) window.kaizenSettings[key] = enabled
  } catch (err) {
    kzAlert('Could not save setting: ' + err.message)
  }
}

async function openBackupsFolder() {
  try {
    await window.api.openBackupsFolder()
  } catch (err) {
    kzAlert('Could not open the backups folder: ' + err.message)
  }
}

async function setCompanion(companion) {
  await window.api.setSettings({ companion })
  if (window.kaizenSettings) window.kaizenSettings.companion = companion
  await renderProfile()
}

function toggleSoundSetting(enabled) {
  window.api.setSettings({ soundEnabled: enabled })
  if (window.kaizenSettings) window.kaizenSettings.soundEnabled = enabled
}

function toggleRemindersSetting(enabled) {
  window.api.setSettings({ remindersEnabled: enabled })
  if (window.kaizenSettings) window.kaizenSettings.remindersEnabled = enabled
  const timeInput = document.getElementById('reminder-time')
  if (timeInput) timeInput.disabled = !enabled
}

function updateReminderTime(value) {
  window.api.setSettings({ reminderTime: value })
  if (window.kaizenSettings) window.kaizenSettings.reminderTime = value
}

async function backupData() {
  try {
    const res = await window.api.exportData()
    if (res && res.canceled) return
    kzAlert('Backup saved to:\n' + (res.filePath || 'unknown'))
  } catch (err) {
    console.error('Backup failed:', err)
    kzAlert('Backup failed: ' + err.message)
  }
}

async function restoreData() {
  if (!(await kzConfirm('This REPLACES all current data (goals, journal, check-ins, chat).', { title: 'Restore from backup?', danger: true, okText: 'Continue' }))) return
  if (!(await kzConfirm('Current data will be permanently replaced by the backup.', { title: 'Last chance', danger: true, okText: 'Replace my data' }))) return
  try {
    const res = await window.api.importData()
    if (res && res.canceled) return
    kzAlert('Data restored successfully.')
    if (typeof loadPage === 'function') {
      loadPage('dashboard')
    }
  } catch (err) {
    console.error('Restore failed:', err)
    kzAlert('Restore failed: ' + err.message)
  }
}

async function clearAllData() {
  if (!(await kzConfirm('Goals, journal, check-ins and chat will be deleted. This cannot be undone.', { title: 'Delete ALL app data?', danger: true, okText: 'Continue' }))) return
  if (!(await kzConfirm('Permanently erase everything except your profile name and tagline?', { title: 'Last chance', danger: true, okText: 'Erase everything' }))) return

  try {
    await window.api.resetAllData()
    kzAlert('All data has been cleared.')
    if (typeof loadPage === 'function') {
      loadPage('dashboard')
    }
  } catch (err) {
    console.error('Error clearing data:', err)
    kzAlert('Could not clear data: ' + err.message)
  }
}
