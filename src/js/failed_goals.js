/**
 * Failed Goals Page
 * Displays all Failed goals failed = 1, pulled from the goals table.
 * Data flows: failed table (backend) -> window.api.getAllGoals() -> filtered here
 */


async function renderFailedGoals() {
    const content = document.getElementById('main-content');
    content.innerHTML = '';

    try {
        const allGoals = await window.api.getAllGoals();
        const failedGoals = allGoals.filter(g => g[6] === 1); // Assuming index 6 is 'failed'

        const container = document.createElement('div');
        container.className = 'failed-goals-container';

        const header = document.createElement('div');
        header.className = 'failed-goals-header';
        header.innerHTML = `<h2>❌ Failed Goals (${failedGoals.length})</h2>`;
        container.appendChild(header);

        if (failedGoals.length === 0) {
            container.innerHTML += '<p class="empty-msg">No failed goals. Keep up the good work!</p>';
        } else {
            const grid = document.createElement('div');
            grid.className = 'failed-goals-grid';
            failedGoals.forEach(goal => {
                const card = document.createElement('div');
                card.className = 'failed-goal-card';
                card.innerHTML = `
                    <h3>${goal[1]}</h3>
                    <p>${goal[2]}</p>
                    <div class="meta">
                        <span>Target Date: ${new Date(goal[4]).toLocaleDateString()}</span>
                    </div>
                `;
                grid.appendChild(card);
            });
            container.appendChild(grid);
        }

        content.appendChild(container);
    } catch (error) {
        console.error('Error rendering failed goals:', error);
        content.innerHTML = '<p class="error-msg">Could not load failed goals.</p>';
    }
}