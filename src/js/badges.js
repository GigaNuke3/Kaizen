/**
 * Achievement Badges page
 */

const BADGE_PX = {
  'first-goal': 'target', 'first-checkin': 'check', 'checkins-10': 'bolt', 'checkins-50': 'flag',
  'checkins-100': 'crown', 'streak-7': 'flame', 'streak-30': 'rocket', 'first-completed-goal': 'trophy',
  'goals-5': 'medal', 'journals-10': 'book', 'journals-25': 'bulb', 'perfect-week': 'star'
}

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
          <div class="badge-icon">${px(BADGE_PX[b.id] || 'star', 48)}</div>
          <div class="badge-name">${escapeHtml(b.name)}</div>
          <div class="badge-desc">${escapeHtml(b.description)}</div>
          <div class="badge-progress">
            <div class="badge-progress-fill" style="width:${pct}%"></div>
          </div>
          <div class="badge-status">${b.unlocked ? `${px('check')} Unlocked` : `${b.progress}/${b.target}`}</div>
        </div>
      `
    }).join('')

    content.innerHTML = `
      <div class="badges-container">
        ${pageHeader('medal', 'Achievement Badges', 'Milestones you earn by showing up.',
          `<span class="badges-count">${unlockedCount}/${badges.length} unlocked</span>`)}
        <div class="badges-grid">${grid}</div>
      </div>
    `
  } catch (err) {
    console.error('❌ Badges render error:', err)
    content.innerHTML = `
      <div class="error-state" style="padding:40px;text-align:center;">
        <h2>${px('x')} Failed to load badges</h2>
        <p>${escapeHtml(err.message || 'Unknown error occurred')}</p>
      </div>
    `
  }
}
