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

/** Chosen companion ('Kai' or 'Zun'), picked in Profile settings */
function companionName() {
  return window.kaizenSettings?.companion === 'zun' ? 'Zun' : 'Kai'
}

/** Companion pixel sprite for a journal mood: sad | neutral | good | happy | excited */
function companionImg(mood = 'neutral', cls = 'kai-avatar') {
  const who = companionName()
  const m = ['sad', 'neutral', 'good', 'happy', 'excited'].includes(mood) ? mood : 'neutral'
  return `<img class="${cls} companion-sprite" src="assets/Kai-Zun/${who}/${who}_${m[0].toUpperCase()}${m.slice(1)}.png" alt="${who} ${m}">`
}

const FREQUENCY_INFO = {
  daily: ['calendar', 'Every day'],
  weekdays: ['briefcase', 'Weekdays (Mon–Fri)'],
  weekends: ['sun', 'Weekends (Sat–Sun)'],
  '3x': ['star', '3x per week'],
  custom: ['pin', 'Custom days']
}

/** Pixel icon + text for a goal frequency */
function frequencyLabel(frequency) {
  const [icon, text] = FREQUENCY_INFO[frequency] || FREQUENCY_INFO.daily
  return `${px(icon)} ${text}`
}

/**
 * In-app dialog replacing alert()/confirm()/prompt() (Electron has no prompt()).
 * Resolves true/false, or the entered value (null on cancel) when `input` is given.
 */
function kzDialog(message, { title = '', confirm = false, danger = false, okText = '', input = null } = {}) {
  return new Promise(resolve => {
    const d = document.createElement('dialog')
    d.className = 'kz-dialog'
    d.innerHTML = `
      <div class="kz-dialog-icon">${px(danger ? 'warning' : confirm ? 'bulb' : 'sparkle', 40)}</div>
      ${title ? `<h3>${escapeHtml(title)}</h3>` : ''}
      <p>${escapeHtml(message)}</p>
      ${input ? `<input class="kz-dialog-input" type="${input.type || 'text'}" value="${escapeHtml(input.value || '')}" ${input.min ? `min="${input.min}"` : ''}>` : ''}
      <div class="kz-dialog-actions">
        ${confirm || input ? '<button type="button" class="btn btn-secondary" value="cancel">Cancel</button>' : ''}
        <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" value="ok">${escapeHtml(okText || (confirm ? 'Confirm' : 'OK'))}</button>
      </div>`
    const field = d.querySelector('.kz-dialog-input')
    d.addEventListener('click', e => { const v = e.target.closest('button')?.value; if (v) d.close(v) })
    field?.addEventListener('keydown', e => { if (e.key === 'Enter') d.close('ok') })
    d.addEventListener('close', () => {
      d.remove()
      const ok = d.returnValue === 'ok'
      resolve(input ? (ok ? field.value : null) : ok)
    })
    document.body.appendChild(d)
    d.showModal()
    ;(field || d.querySelector('button[value="ok"]')).focus()
  })
}

const kzAlert = (message, opts) => kzDialog(message, opts)
const kzConfirm = (message, opts) => kzDialog(message, { ...opts, confirm: true })
const kzPrompt = (message, input, opts) => kzDialog(message, { ...opts, input })

/** Shared page header: big pixel icon (sprite name or ready HTML), title, subtitle, right-side actions */
function pageHeader(icon, title, subtitle = '', actions = '') {
  return `
    <div class="page-header">
      <div class="page-title">
        ${icon.startsWith('<') ? icon : px(icon, 44)}
        <div>
          <h2>${title}</h2>
          ${subtitle ? `<p class="page-subtitle">${subtitle}</p>` : ''}
        </div>
      </div>
      ${actions ? `<div class="page-actions">${actions}</div>` : ''}
    </div>`
}
