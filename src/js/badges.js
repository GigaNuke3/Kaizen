/**
 * Achievement Badges page
 */

async function renderBadges() {
  const content = document.getElementById('main-content')
  if (!content) {
    console.error('❌ Error: main-content element not found')
    return
  }

  content.innerHTML = '<div style="padding:40px;text-align:center;color:#888;">Loading badges...</div>'

  try {
    const badges = await window.api.getBadgeStats()
    const unlockedCount = badges.filter(b => b.unlocked).length

    const grid = badges.map(b => {
      const pct = b.target > 0 ? Math.min(100, Math.round((b.progress / b.target) * 100)) : 0
      return `
        <div class="badge-card ${b.unlocked ? 'unlocked' : 'locked'}">
          <div class="badge-icon">${b.icon}</div>
          <div class="badge-name">${escapeHtml(b.name)}</div>
          <div class="badge-desc">${escapeHtml(b.description)}</div>
          <div class="badge-progress">
            <div class="badge-progress-fill" style="width:${pct}%"></div>
          </div>
          <div class="badge-status">${b.unlocked ? '✅ Unlocked' : `${b.progress}/${b.target}`}</div>
        </div>
      `
    }).join('')

    content.innerHTML = `
      <div class="badges-container">
        <div class="badges-header">
          <h2 style="display: flex; align-items: center; gap: 12.1px;">
            <img src="assets/icons/badges_icon/Badges_Idle.png" style="width: 66px; height: 66px; image-rendering: pixelated; margin: 0;">
            Achievement Badges
          </h2>
          <span class="badges-count">${unlockedCount}/${badges.length} unlocked</span>
        </div>
        <div class="badges-grid">${grid}</div>
      </div>
    `
  } catch (err) {
    console.error('❌ Badges render error:', err)
    content.innerHTML = `
      <div class="error-state" style="padding:40px;text-align:center;">
        <h2>❌ Failed to load badges</h2>
        <p>${escapeHtml(err.message || 'Unknown error occurred')}</p>
      </div>
    `
  }
}
