/**
 * Sidebar Badges System
 * Manages notification badges for sidebar navigation items
 * Displays counts for Notifications, Goals, CheckMarked, Completed Goals, Failed Goals, and Journal
 */

class SidebarBadges {
  constructor() {
    this.badges = {
      notifications: 0,
      goals: 0,
      checkmarked: 0,
      completed_goals: 0,
      failed_goals: 0,
      journal: 0
    }
    this.init()
  }

  /**
   * Initialize badges on page load
   */
  init() {
    // Create CSS for badges if not already present
    if (!document.getElementById('sidebar-badges-style')) {
      const style = document.createElement('style')
      style.id = 'sidebar-badges-style'
      style.innerHTML = `
        .badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          margin-left: auto;
          background-color: #ff4444;
          color: white;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          vertical-align: middle;
        }

        .badge.zero {
          display: none;
        }

        .badge.notifications-badge {
          background-color: #ff6b6b;
        }

        .badge.goals-badge {
          background-color: #ffa940;
        }

        .badge.checkmarked-badge {
          background-color: #4096ff;
        }

        .badge.completed-badge {
          background-color: #52c41a;
        }

        .badge.failed-badge {
          background-color: #ff4d4f;
        }

        .badge.journal-badge {
          background-color: #722ed1;
        }
      `
      document.head.appendChild(style)
    }

    // Create badges for each page
    this.createBadge('notifications', 'notifications-badge')
    this.createBadge('goals', 'goals-badge')
    this.createBadge('checkmarked', 'checkmarked-badge')
    this.createBadge('completed_goals', 'completed-badge')
    this.createBadge('failed_goals', 'failed-badge')
    this.createBadge('journal', 'journal-badge')
  }

  /**
   * Create badge element for a page
   * @param {string} page - Page name (data-page value)
   * @param {string} className - CSS class for badge styling
   */
  createBadge(page, className) {
    const navItem = document.querySelector(`[data-page="${page}"]`)
    if (!navItem) return

    // Check if badge already exists
    if (navItem.querySelector('.badge')) return

    const badge = document.createElement('span')
    badge.className = `badge ${className} zero`
    badge.id = `badge-${page}`
    badge.textContent = '0'
    navItem.appendChild(badge)
  }

  /**
   * Update badge count for a specific page
   * @param {string} page - Page name (data-page value)
   * @param {number} count - Number to display
   */
  updateBadge(page, count) {
    if (!(page in this.badges)) return

    this.badges[page] = count
    const badgeElement = document.getElementById(`badge-${page}`)
    if (!badgeElement) return

    if (count > 0) {
      badgeElement.textContent = count > 99 ? '99+' : count
      badgeElement.classList.remove('zero')
    } else {
      badgeElement.textContent = '0'
      badgeElement.classList.add('zero')
    }
  }

  /**
   * Update notifications badge
   * Displays count of unread/active notifications
   */
  async updateNotificationsBadge() {
    try {
      const notifications = await window.api.getNotifications?.() || []
      // notifications are arrays: [0]=id [1]=goal_id [2]=message [3]=type [4]=created_at [5]=read
      const unreadCount = notifications.filter(n => n[5] === 0).length
      this.updateBadge('notifications', unreadCount)
    } catch (error) {
      console.error('Error updating notifications badge:', error)
      this.updateBadge('notifications', 0)
    }
  }

  /**
   * Update goals badge
   * Displays count of active goals
   */
  async updateGoalsBadge() {
    try {
      const goals = await window.api.getAllGoals?.() || []
      const activeCount = goals.filter(g => g[5] === 0 && g[6] === 0).length
      this.updateBadge('goals', activeCount)
    } catch (error) {
      console.error('Error updating goals badge:', error)
      this.updateBadge('goals', 0)
    }
  }

  /**
   * Update checkmarked badge
   * Displays count of pending goals to check
   */
  async updateCheckmarkedBadge() {
    try {
      const grid = await window.api.getGoalTrackingGrid?.()
      if (!grid || !grid.goals) { this.updateBadge('checkmarked', 0); return }

      const today = getLocalDateString()

      // Count only goals that actually have an open, uncompleted slot today —
      // i.e. today is a scheduled day AND within the goal's start/target window —
      // matching the same logic the CheckMarked page uses to decide which cells are clickable.
      const pendingCount = grid.goals.filter(goal => {
        const scheduled = typeof shouldShowDayForGoal === 'function'
          ? shouldShowDayForGoal(today, goal.frequency, goal.scheduled_days)
          : true
        const inWindow = typeof isDateWithinChecklistWindow === 'function'
          ? isDateWithinChecklistWindow(today, goal.start_date, goal.target_date)
          : true
        if (!scheduled || !inWindow) return false

        const key = `${goal.id}_${today}`
        return grid.completions[key] !== 1
      }).length

      this.updateBadge('checkmarked', pendingCount)
    } catch (error) {
      console.error('Error updating checkmarked badge:', error)
      this.updateBadge('checkmarked', 0)
    }
  }

  /**
   * Update completed goals badge
   * Displays count of completed goals
   */
  async updateCompletedBadge() {
    try {
      const goals = await window.api.getAllGoals?.() || []
      const completedCount = goals.filter(g => g[5] === 1).length
      this.updateBadge('completed_goals', completedCount)
    } catch (error) {
      console.error('Error updating completed goals badge:', error)
      this.updateBadge('completed_goals', 0)
    }
  }

  /**
   * Update failed goals badge
   * Displays count of failed goals
   */
  async updateFailedBadge() {
    try {
      const goals = await window.api.getAllGoals?.() || []
      const failedCount = goals.filter(g => g[6] === 1).length
      this.updateBadge('failed_goals', failedCount)
    } catch (error) {
      console.error('Error updating failed goals badge:', error)
      this.updateBadge('failed_goals', 0)
    }
  }

  /**
   * Update journal badge
   * Displays count of journal entries for current month
   */
  async updateJournalBadge() {
    try {
      // journal entries: [0]=id [1]=content [2]=date [3]=time [4]=mood
      const entries = await window.api.getAllJournalEntries?.(100) || []
      const now = new Date()
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      const thisMonthCount = entries.filter(entry => {
        const entryDate = entry[2] ? entry[2].substring(0, 7) : ''
        return entryDate === currentMonth
      }).length

      this.updateBadge('journal', thisMonthCount)
    } catch (error) {
      console.error('Error updating journal badge:', error)
      this.updateBadge('journal', 0)
    }
  }

  /**
   * Update all badges at once
   */
  async updateAllBadges() {
    await Promise.all([
      this.updateNotificationsBadge(),
      this.updateGoalsBadge(),
      this.updateCheckmarkedBadge(),
      this.updateCompletedBadge(),
      this.updateFailedBadge(),
      this.updateJournalBadge()
    ])
  }

  /**
   * Get current badge count
   * @param {string} page - Page name
   * @returns {number} Current count
   */
  getBadgeCount(page) {
    return this.badges[page] || 0
  }

  /**
   * Increment badge count
   * @param {string} page - Page name
   * @param {number} amount - Amount to increment (default 1)
   */
  incrementBadge(page, amount = 1) {
    if (!(page in this.badges)) return
    this.updateBadge(page, this.badges[page] + amount)
  }

  /**
   * Decrement badge count
   * @param {string} page - Page name
   * @param {number} amount - Amount to decrement (default 1)
   */
  decrementBadge(page, amount = 1) {
    if (!(page in this.badges)) return
    const newCount = Math.max(0, this.badges[page] - amount)
    this.updateBadge(page, newCount)
  }

  /**
   * Reset all badges to zero
   */
  resetAllBadges() {
    Object.keys(this.badges).forEach(page => {
      this.updateBadge(page, 0)
    })
  }
}

// Initialize sidebar badges on page load
let sidebarBadges
document.addEventListener('DOMContentLoaded', () => {
  sidebarBadges = new SidebarBadges()
  // Initial update of all badges
  sidebarBadges.updateAllBadges()
})