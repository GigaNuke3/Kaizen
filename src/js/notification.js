// This will be populated with notification logic
async function renderNotifications() {
    const content = document.getElementById('main-content');
    content.innerHTML = `
        <div class="notifications-container">
            <div class="notifications-header">
                <h2>🔔 Notifications</h2>
            </div>
            <div class="notification-list">
                <p class="empty-msg">No new notifications.</p>
            </div>
        </div>
    `;
}
