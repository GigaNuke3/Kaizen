/**
 * Shared renderer helpers — loaded before all page scripts.
 * Do not redefine getLocalDateString / escapeHtml in page scripts.
 */

/** Calendar date in local timezone (YYYY-MM-DD) */
function getLocalDateString(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Escape user-supplied text before injecting into innerHTML */
function escapeHtml(str) {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/** sessionStorage key for pending CheckMarked journal-gated check-ins */
const PENDING_GOAL_CHECK_KEY = 'kaizen_pending_goal_check'
