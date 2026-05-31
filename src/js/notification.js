/**
 * Notifications Page
 * Displays all notifications (completed/failed goals) with mark‑as‑read functionality.
 */

async function renderNotifications() {
  const content = document.getElementById('main-content')
  if (!content) {
    console.error('❌ Error: main-content element not found')
    return
  }
  
  content.innerHTML = `
    <div class="notifications-container">
      <div class="notifications-header">
      <img src-="assets/icons/pixel_bell/Notification_bell.png" alt="Bell icon" class="sidebar-icon">
        <h2> Notifications</h2>
        <button class="btn btn-secondary" onclick="markAllRead()">Mark all as read</button>
      </div>
      <div id="notification-list" class="notification-list">Loading...</div>
    </div>
  `

  try {
    const notifications = await window.api.getNotifications(false)
    const container = document.getElementById('notification-list')
    
    if (!notifications || notifications.length === 0) {
      container.innerHTML = '<p class="empty-msg">No notifications yet.</p>'
      return
    }

    let html = ''
    for (const n of notifications) {
      const id = n[0]
      const message = n[2]
      const type = n[3]
      const createdAt = new Date(n[4]).toLocaleString()
      const read = n[5]

      html += `
        <div class="notification-item ${read ? 'read' : 'unread'}" data-id="${id}">
          <p><strong>${type === 'completed' ? '✅' : '❌'}</strong> ${message}</p>
          <div class="timestamp">${createdAt}</div>
          ${!read ? `<button class="btn-small" onclick="markRead(${id})">Mark read</button>` : ''}
        </div>
      `
    }
    container.innerHTML = html
  } catch (err) {
    console.error('❌ Error loading notifications:', err)
    document.getElementById('notification-list').innerHTML = `<p class="error-msg">Failed to load notifications: ${err.message}</p>`
  }
}

async function markRead(id) {
  await window.api.markNotificationRead(id)
  renderNotifications()
}

async function markAllRead() {
  const notifications = await window.api.getNotifications(true)
  for (const n of notifications) {
    await window.api.markNotificationRead(n[0])
  }
  renderNotifications()
}