// Dashboard view

import { getState, getActiveProject } from '../store.js';
import { formatCurrency, relativeTime } from '../core/utils.js';
import { icons } from '../core/icons.js';
import { navigate } from '../router.js';

export function render() {
  const state = getState();
  const project = getActiveProject();
  if (!project || !state) return '<div class="empty-state"><h2>No project selected</h2></div>';

  const items = state.items.filter(i => i.projectId === project.id);
  const tasks = state.tasks.filter(t => t.projectId === project.id);
  const invoices = state.invoices.filter(i => i.projectId === project.id);
  const activities = state.activities.filter(a => a.projectId === project.id).slice(0, 8);

  // Stats
  const totalTrade = items.reduce((s, i) => s + i.trade, 0);
  const totalClient = items.reduce((s, i) => s + i.trade * (1 + i.markup / 100), 0);
  const totalMargin = totalClient - totalTrade;
  const orderedCount = items.filter(i => ['ordered', 'shipped', 'delivered', 'installed'].includes(i.status)).length;
  const avgProgress = tasks.length ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length) : 0;
  const invoicedTotal = invoices.filter(i => i.status === 'paid').reduce((s, inv) => {
    return s + inv.items.reduce((sum, itemId) => {
      const item = items.find(i => i.id === itemId);
      return sum + (item ? item.trade * (1 + item.markup / 100) : 0);
    }, 0);
  }, 0);
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;

  // Status breakdown for donut
  const statusCounts = {};
  ['spec', 'quoted', 'ordered', 'shipped', 'delivered', 'installed'].forEach(s => {
    statusCounts[s] = items.filter(i => i.status === s).length;
  });
  const donutSegments = buildDonut(statusCounts, items.length);

  // Upcoming tasks
  const upcoming = tasks.filter(t => t.progress < 100).sort((a, b) => new Date(a.start) - new Date(b.start)).slice(0, 4);

  return `
    <div class="view-dashboard">
      <div class="dash-header">
        <div>
          <h1>${project.name}</h1>
          <p class="text-muted">${project.client} &middot; ${project.address}</p>
        </div>
        <span class="project-status-badge status-${project.status}">${project.status}</span>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Budget</div>
          <div class="stat-value">${formatCurrency(totalClient)}</div>
          <div class="stat-sub">Margin: ${formatCurrency(totalMargin)} (${totalClient ? Math.round(totalMargin / totalClient * 100) : 0}%)</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Items Ordered</div>
          <div class="stat-value">${orderedCount} / ${items.length}</div>
          <div class="stat-sub">${items.filter(i => i.status === 'spec').length} still in spec</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Schedule Progress</div>
          <div class="stat-value">${avgProgress}%</div>
          <div class="stat-progress"><div class="stat-progress-bar" style="width:${avgProgress}%"></div></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Invoiced</div>
          <div class="stat-value">${formatCurrency(invoicedTotal)}</div>
          <div class="stat-sub ${overdueCount ? 'text-error' : ''}">${overdueCount ? overdueCount + ' overdue' : 'All on track'}</div>
        </div>
      </div>

      <div class="dash-grid">
        <div class="dash-panel">
          <h3 class="panel-title">Order Status</h3>
          <div class="donut-container">
            <svg viewBox="0 0 120 120" class="donut-chart">${donutSegments}</svg>
            <div class="donut-legend">
              ${Object.entries(statusCounts).map(([s, c]) => c > 0 ? `<div class="legend-item"><span class="legend-dot status-dot-${s}"></span>${s} (${c})</div>` : '').join('')}
            </div>
          </div>
        </div>

        <div class="dash-panel">
          <h3 class="panel-title">Recent Activity</h3>
          <div class="activity-feed">
            ${activities.map(a => `
              <div class="activity-item">
                <div class="activity-dot"></div>
                <div class="activity-content">
                  <strong>${a.action}</strong>
                  <p>${a.detail}</p>
                  <span class="text-muted">${relativeTime(a.timestamp)}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="dash-panel">
          <h3 class="panel-title">This Week</h3>
          <div class="upcoming-tasks">
            ${upcoming.map(t => `
              <div class="upcoming-task">
                <div class="upcoming-task-name">${t.name}</div>
                <div class="upcoming-task-contractor text-muted">${t.contractor}</div>
                <div class="upcoming-task-progress">
                  <div class="mini-progress"><div class="mini-progress-bar phase-${t.phase}" style="width:${t.progress}%"></div></div>
                  <span>${t.progress}%</span>
                </div>
              </div>
            `).join('')}
            ${upcoming.length === 0 ? '<p class="text-muted">No upcoming tasks</p>' : ''}
          </div>
        </div>

        <div class="dash-panel">
          <h3 class="panel-title">Quick Links</h3>
          <div class="quick-links">
            <a class="quick-link" data-nav="/procurement">${icons.procurement} Procurement</a>
            <a class="quick-link" data-nav="/schedule">${icons.schedule} Schedule</a>
            <a class="quick-link" data-nav="/invoicing">${icons.invoicing} Invoicing</a>
            <a class="quick-link" data-nav="/moodboard">${icons.moodboard} Mood Boards</a>
            <a class="quick-link" data-nav="/ai-assistant">${icons.ai} AI Assistant</a>
            <a class="quick-link" data-nav="/client-portal">${icons.clientPortal} Client Portal</a>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function mount(el) {
  el.querySelectorAll('.quick-link, [data-nav]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.dataset.nav);
    });
  });
}

function buildDonut(counts, total) {
  if (total === 0) return '<circle cx="60" cy="60" r="45" fill="none" stroke="#e2e8f0" stroke-width="10"/>';
  const colors = { spec: '#94a3b8', quoted: '#6366f1', ordered: '#f59e0b', shipped: '#3b82f6', delivered: '#10b981', installed: '#8b5cf6' };
  let offset = 0;
  const circumference = 2 * Math.PI * 45;
  let segments = '';
  for (const [status, count] of Object.entries(counts)) {
    if (count === 0) continue;
    const pct = count / total;
    const dash = pct * circumference;
    const gap = circumference - dash;
    segments += `<circle cx="60" cy="60" r="45" fill="none" stroke="${colors[status]}" stroke-width="10" stroke-dasharray="${dash} ${gap}" stroke-dashoffset="${-offset}" transform="rotate(-90 60 60)"/>`;
    offset += dash;
  }
  return segments;
}
