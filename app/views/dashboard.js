// Dashboard view — comprehensive rewrite with sparklines, interactive donut,
// activity feed, mini Gantt, budget breakdown, supplier lead times, invoice aging

import { getState, getActiveProject, getProjectItems, getProjectTasks, getProjectInvoices, getProjectBudget, on } from '../store.js';
import { formatCurrency, relativeTime, formatDateShort, daysBetween, isOverdue, groupBy, pluralize, capitalize, sanitizeHtml } from '../core/utils.js';
import { icons } from '../core/icons.js';
import { navigate } from '../router.js';

let storeUnsub = null;
let timestampInterval = null;

// ── Status colors ───────────────────────────────────────────────────────

const STATUS_COLORS = {
  spec: '#94a3b8', quoted: '#6366f1', ordered: '#f59e0b',
  shipped: '#3b82f6', delivered: '#10b981', installed: '#8b5cf6'
};
const PHASE_COLORS = {
  structural: '#ef4444', firstfix: '#f59e0b', finishing: '#3b82f6', install: '#10b981'
};
const INVOICE_STATUS_COLORS = {
  draft: '#94a3b8', sent: '#3b82f6', paid: '#10b981', overdue: '#ef4444'
};
const ACTIVITY_ICONS = {
  check: icons.check, edit: icons.edit, trash: icons.trash, plus: icons.plus,
  'Item delivered': icons.check, 'Invoice paid': `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1v14M4 5l4-4 4 4M4 11l4 4 4-4" stroke="#10b981" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  'Order placed': icons.procurement, 'Item shipped': `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="5" width="10" height="7" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M11 8h3l1.5 2.5V12h-4.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="4" cy="13" r="1.5" stroke="currentColor" stroke-width="1.2"/><circle cx="12" cy="13" r="1.5" stroke="currentColor" stroke-width="1.2"/></svg>`,
  'Quote received': icons.edit, 'Status update': icons.edit, 'Task completed': icons.check,
  'Client approval': icons.check, 'Invoice overdue': icons.trash, 'Project started': icons.plus,
  'New project': icons.plus, 'Quote requested': icons.edit
};

// ── Render ──────────────────────────────────────────────────────────────

export function render() {
  const state = getState();
  const project = getActiveProject();
  if (!project || !state) return '<div class="empty-state"><h2>No project selected</h2></div>';

  const items = state.items.filter(i => i.projectId === project.id);
  const tasks = state.tasks.filter(t => t.projectId === project.id);
  const invoices = state.invoices.filter(i => i.projectId === project.id);
  const activities = state.activities.filter(a => a.projectId === project.id).slice(0, 10);

  // Budget
  const budget = getProjectBudget(project.id);
  const orderedCount = items.filter(i => ['ordered', 'shipped', 'delivered', 'installed'].includes(i.status)).length;
  const avgProgress = tasks.length ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length) : 0;
  const invoicedTotal = invoices.filter(i => i.status === 'paid').reduce((s, inv) => {
    return s + inv.items.reduce((sum, itemId) => {
      const item = items.find(x => x.id === itemId);
      return sum + (item ? item.trade * (1 + item.markup / 100) : 0);
    }, 0);
  }, 0);
  const overdueInvoices = invoices.filter(i => i.status === 'overdue');

  // Status counts for donut
  const statuses = ['spec', 'quoted', 'ordered', 'shipped', 'delivered', 'installed'];
  const statusCounts = {};
  statuses.forEach(s => { statusCounts[s] = items.filter(i => i.status === s).length; });

  // Sparkline data (simulated last 7 data points from items/tasks)
  const budgetSparkline = generateSparkline(items, 'trade');
  const orderedSparkline = generateOrderSparkline(items);
  const progressSparkline = generateProgressSparkline(tasks);
  const invoiceSparkline = generateInvoiceSparkline(invoices, items);

  // Upcoming tasks
  const upcoming = tasks.filter(t => t.progress < 100).sort((a, b) => new Date(a.start) - new Date(b.start)).slice(0, 5);

  // Budget by room
  const roomBudgets = buildRoomBudgets(items);

  // Supplier lead times
  const atRiskItems = getAtRiskItems(items, state.suppliers);

  // Invoice aging
  const invoiceAging = buildInvoiceAging(invoices, items);

  // Project timeline
  const timelineData = buildTimeline(project);

  // Completion ring
  const completionPct = avgProgress;

  return `
    <div class="view-dashboard">
      ${renderProjectHeader(project, completionPct, timelineData)}
      ${renderStatsGrid(budget, orderedCount, items.length, avgProgress, invoicedTotal, overdueInvoices, budgetSparkline, orderedSparkline, progressSparkline, invoiceSparkline, items)}
      <div class="dash-grid">
        ${renderDonutPanel(statusCounts, items.length)}
        ${renderActivityFeed(activities)}
        ${renderThisWeek(upcoming)}
        ${renderQuickLinks()}
        ${renderBudgetByRoom(roomBudgets)}
        ${renderSupplierLeadTimes(atRiskItems)}
        ${renderInvoiceAging(invoiceAging)}
      </div>
    </div>
  `;
}

// ── Mount ───────────────────────────────────────────────────────────────

export function mount(el) {
  // Quick link navigation
  el.querySelectorAll('[data-nav]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.dataset.nav);
    });
  });

  // Stat card clicks
  el.querySelectorAll('.stat-card[data-nav]').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => navigate(card.dataset.nav));
  });

  // Donut hover segments
  setupDonutHover(el);

  // Activity feed "View All" toggle
  const viewAllBtn = el.querySelector('.activity-view-all');
  if (viewAllBtn) {
    viewAllBtn.addEventListener('click', () => {
      const feed = el.querySelector('.activity-feed');
      feed?.classList.toggle('expanded');
      viewAllBtn.textContent = feed?.classList.contains('expanded') ? 'Show Less' : 'View All';
    });
  }

  // Activity item clicks
  el.querySelectorAll('.activity-item[data-nav]').forEach(item => {
    item.style.cursor = 'pointer';
    item.addEventListener('click', () => navigate(item.dataset.nav));
  });

  // Animate progress bars on load
  requestAnimationFrame(() => {
    el.querySelectorAll('.gantt-bar-fill').forEach(bar => {
      const target = bar.dataset.progress;
      bar.style.width = target + '%';
    });
    el.querySelectorAll('.stat-progress-bar').forEach(bar => {
      const target = bar.dataset.width;
      bar.style.width = target + '%';
    });
    el.querySelectorAll('.room-bar-trade, .room-bar-margin').forEach(bar => {
      const target = bar.dataset.width;
      bar.style.width = target + '%';
    });
  });

  // Auto-update timestamps every 60s
  timestampInterval = setInterval(() => {
    el.querySelectorAll('[data-timestamp]').forEach(el => {
      el.textContent = relativeTime(el.dataset.timestamp);
    });
  }, 60000);

  // Subscribe to store changes for reactive updates
  if (storeUnsub) storeUnsub();
  storeUnsub = on('stateChanged', () => {
    // Full re-render for simplicity; in production would diff
    const mainEl = document.getElementById('app-main');
    if (mainEl && window.location.hash.slice(1).startsWith('/dashboard')) {
      const html = render();
      mainEl.innerHTML = html;
      mount(mainEl);
    }
  });
}

export function destroy() {
  if (storeUnsub) { storeUnsub(); storeUnsub = null; }
  if (timestampInterval) { clearInterval(timestampInterval); timestampInterval = null; }
}

// ── Project Header ──────────────────────────────────────────────────────

function renderProjectHeader(project, completionPct, timeline) {
  const ringR = 18;
  const ringC = 2 * Math.PI * ringR;
  const ringDash = (completionPct / 100) * ringC;
  const ringGap = ringC - ringDash;

  return `
    <div class="dash-header">
      <div class="dash-header-left">
        <div class="dash-header-ring">
          <svg width="48" height="48" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="${ringR}" fill="none" stroke="#e2e8f0" stroke-width="4"/>
            <circle cx="24" cy="24" r="${ringR}" fill="none" stroke="#6366f1" stroke-width="4"
              stroke-dasharray="${ringDash} ${ringGap}" stroke-dashoffset="${ringC * 0.25}"
              stroke-linecap="round" transform="rotate(-90 24 24)"/>
            <text x="24" y="26" text-anchor="middle" font-size="11" font-weight="700" fill="#6366f1">${completionPct}%</text>
          </svg>
        </div>
        <div>
          <h1 class="dash-title">${sanitizeHtml(project.name)}</h1>
          <p class="text-muted">${sanitizeHtml(project.client)} &middot; ${sanitizeHtml(project.address)}</p>
        </div>
      </div>
      <div class="dash-header-right">
        <span class="project-status-badge status-${project.status}">${capitalize(project.status)}</span>
        <div class="project-timeline-bar" title="${formatDateShort(project.startDate)} - ${formatDateShort(project.endDate)}">
          <div class="timeline-track">
            <div class="timeline-elapsed" style="width:${timeline.elapsedPct}%"></div>
            <div class="timeline-today" style="left:${timeline.elapsedPct}%"></div>
          </div>
          <div class="timeline-labels">
            <span>${formatDateShort(project.startDate)}</span>
            <span>Today</span>
            <span>${formatDateShort(project.endDate)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function buildTimeline(project) {
  const start = new Date(project.startDate);
  const end = new Date(project.endDate);
  const now = new Date();
  const total = end - start;
  const elapsed = now - start;
  const elapsedPct = total > 0 ? Math.max(0, Math.min(100, Math.round((elapsed / total) * 100))) : 0;
  return { elapsedPct };
}

// ── Stats Grid with sparklines ──────────────────────────────────────────

function renderStatsGrid(budget, orderedCount, totalItems, avgProgress, invoicedTotal, overdueInvoices, budgetSpark, orderedSpark, progressSpark, invoiceSpark, items) {
  const specCount = items.filter(i => i.status === 'spec').length;
  const trendBudget = budgetSpark.length > 1 ? (budgetSpark[budgetSpark.length - 1] >= budgetSpark[budgetSpark.length - 2] ? 'up' : 'down') : 'flat';
  const overdueCount = overdueInvoices.length;

  return `
    <div class="stats-grid">
      <div class="stat-card" data-nav="/procurement">
        <div class="stat-header">
          <div class="stat-label">Total Budget</div>
          ${renderSparkline(budgetSpark, '#6366f1')}
        </div>
        <div class="stat-value">${formatCurrency(budget.totalClient)} ${renderTrendArrow(trendBudget)}</div>
        <div class="stat-sub">Margin: ${formatCurrency(budget.totalMargin)} (${budget.marginPercent}%)</div>
      </div>
      <div class="stat-card" data-nav="/procurement">
        <div class="stat-header">
          <div class="stat-label">Items Ordered</div>
          ${renderSparkline(orderedSpark, '#10b981')}
        </div>
        <div class="stat-value">${orderedCount} / ${totalItems}</div>
        <div class="stat-sub">${specCount} still in spec</div>
      </div>
      <div class="stat-card" data-nav="/schedule">
        <div class="stat-header">
          <div class="stat-label">Schedule Progress</div>
          ${renderSparkline(progressSpark, '#3b82f6')}
        </div>
        <div class="stat-value">${avgProgress}%</div>
        <div class="stat-progress"><div class="stat-progress-bar" data-width="${avgProgress}" style="width:0%;transition:width 0.8s ease-out;"></div></div>
      </div>
      <div class="stat-card" data-nav="/invoicing">
        <div class="stat-header">
          <div class="stat-label">Invoiced</div>
          ${renderSparkline(invoiceSpark, overdueCount ? '#ef4444' : '#10b981')}
        </div>
        <div class="stat-value">${formatCurrency(invoicedTotal)}</div>
        <div class="stat-sub ${overdueCount ? 'text-error' : ''}">${overdueCount ? overdueCount + ' overdue' : 'All on track'}</div>
      </div>
    </div>
  `;
}

function renderSparkline(data, color) {
  if (!data || data.length < 2) return '';
  const h = 24;
  const w = 60;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * (h - 4) - 2).toFixed(1)}`).join(' ');
  return `
    <svg class="sparkline" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${((data.length - 1) * step).toFixed(1)}" cy="${(h - ((data[data.length - 1] - min) / range) * (h - 4) - 2).toFixed(1)}" r="2" fill="${color}"/>
    </svg>
  `;
}

function renderTrendArrow(direction) {
  if (direction === 'up') return '<span class="trend-arrow trend-up" title="Trending up">&uarr;</span>';
  if (direction === 'down') return '<span class="trend-arrow trend-down" title="Trending down">&darr;</span>';
  return '';
}

// ── Sparkline data generators ───────────────────────────────────────────

function generateSparkline(items, field) {
  // Simulate 7 cumulative data points from items
  const values = [];
  const sorted = [...items].sort((a, b) => (a.id > b.id ? 1 : -1));
  const step = Math.max(1, Math.floor(sorted.length / 7));
  let cumulative = 0;
  for (let i = 0; i < 7; i++) {
    const end = Math.min((i + 1) * step, sorted.length);
    for (let j = i * step; j < end; j++) {
      cumulative += sorted[j]?.[field] || 0;
    }
    values.push(cumulative);
  }
  return values.length > 1 ? values : [0, 0];
}

function generateOrderSparkline(items) {
  const orderedStatuses = new Set(['ordered', 'shipped', 'delivered', 'installed']);
  const sorted = [...items].sort((a, b) => (a.id > b.id ? 1 : -1));
  const step = Math.max(1, Math.floor(sorted.length / 7));
  const values = [];
  let count = 0;
  for (let i = 0; i < 7; i++) {
    const end = Math.min((i + 1) * step, sorted.length);
    for (let j = i * step; j < end; j++) {
      if (sorted[j] && orderedStatuses.has(sorted[j].status)) count++;
    }
    values.push(count);
  }
  return values.length > 1 ? values : [0, 0];
}

function generateProgressSparkline(tasks) {
  // Show progress ramp-up over last 7 "snapshots"
  if (tasks.length === 0) return [0, 0];
  const sorted = [...tasks].sort((a, b) => new Date(a.start) - new Date(b.start));
  const values = [];
  for (let i = 1; i <= 7; i++) {
    const frac = i / 7;
    const count = Math.round(sorted.length * frac);
    const slice = sorted.slice(0, count);
    const avg = slice.length ? Math.round(slice.reduce((s, t) => s + t.progress, 0) / slice.length) : 0;
    values.push(avg);
  }
  return values;
}

function generateInvoiceSparkline(invoices, items) {
  const paid = invoices.filter(i => i.status === 'paid');
  if (paid.length === 0) return [0, 0];
  const values = [0];
  let cumulative = 0;
  paid.forEach(inv => {
    const total = inv.items.reduce((sum, itemId) => {
      const item = items.find(x => x.id === itemId);
      return sum + (item ? item.trade * (1 + item.markup / 100) : 0);
    }, 0);
    cumulative += total;
    values.push(cumulative);
  });
  while (values.length < 7) values.push(cumulative);
  return values.slice(-7);
}

// ── Donut Chart with hover ──────────────────────────────────────────────

function renderDonutPanel(counts, total) {
  const donutSegments = buildDonut(counts, total);
  const legend = Object.entries(counts)
    .filter(([, c]) => c > 0)
    .map(([s, c]) => `<div class="legend-item"><span class="legend-dot" style="background:${STATUS_COLORS[s]};"></span>${capitalize(s)} (${c})</div>`)
    .join('');

  return `
    <div class="dash-panel">
      <h3 class="panel-title">Order Status</h3>
      <div class="donut-container">
        <div class="donut-wrapper">
          <svg viewBox="0 0 120 120" class="donut-chart" id="donut-chart">${donutSegments}</svg>
          <div class="donut-center">
            <div class="donut-center-value">${total}</div>
            <div class="donut-center-label">${pluralize(total, 'item')}</div>
          </div>
        </div>
        <div class="donut-legend">${legend}</div>
      </div>
      <div class="donut-tooltip" id="donut-tooltip" style="display:none;"></div>
    </div>
  `;
}

function buildDonut(counts, total) {
  if (total === 0) return '<circle cx="60" cy="60" r="45" fill="none" stroke="#e2e8f0" stroke-width="10"/>';
  let offset = 0;
  const circumference = 2 * Math.PI * 45;
  let segments = '';
  for (const [status, count] of Object.entries(counts)) {
    if (count === 0) continue;
    const pct = count / total;
    const dash = pct * circumference;
    const gap = circumference - dash;
    segments += `<circle class="donut-segment" data-status="${status}" data-count="${count}" data-pct="${(pct * 100).toFixed(1)}"
      cx="60" cy="60" r="45" fill="none" stroke="${STATUS_COLORS[status]}" stroke-width="10"
      stroke-dasharray="${dash} ${gap}" stroke-dashoffset="${-offset}" transform="rotate(-90 60 60)"
      style="cursor:pointer;transition:stroke-width 0.15s ease;"/>`;
    offset += dash;
  }
  return segments;
}

function setupDonutHover(el) {
  const chart = el.querySelector('#donut-chart');
  const tooltip = el.querySelector('#donut-tooltip');
  if (!chart || !tooltip) return;

  chart.querySelectorAll('.donut-segment').forEach(seg => {
    seg.addEventListener('mouseenter', (e) => {
      seg.setAttribute('stroke-width', '14');
      const status = seg.dataset.status;
      const count = seg.dataset.count;
      const pct = seg.dataset.pct;
      tooltip.innerHTML = `<strong>${capitalize(status)}</strong>: ${count} ${pluralize(parseInt(count), 'item')} (${pct}%)`;
      tooltip.style.display = 'block';
      tooltip.style.background = STATUS_COLORS[status];
      tooltip.style.color = '#fff';
    });
    seg.addEventListener('mouseleave', () => {
      seg.setAttribute('stroke-width', '10');
      tooltip.style.display = 'none';
    });
    seg.addEventListener('click', () => navigate('/procurement'));
  });
}

// ── Activity Feed ───────────────────────────────────────────────────────

function renderActivityFeed(activities) {
  const feedHtml = activities.map(a => {
    const icon = ACTIVITY_ICONS[a.action] || ACTIVITY_ICONS[a.icon] || icons.check;
    const navTarget = getActivityNav(a);
    return `
      <div class="activity-item" ${navTarget ? `data-nav="${navTarget}"` : ''}>
        <div class="activity-icon">${icon}</div>
        <div class="activity-content">
          <strong>${sanitizeHtml(a.action)}</strong>
          <p>${sanitizeHtml(a.detail)}</p>
          <span class="text-muted" data-timestamp="${a.timestamp}">${relativeTime(a.timestamp)}</span>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="dash-panel">
      <div class="panel-header">
        <h3 class="panel-title">Recent Activity</h3>
        ${activities.length > 5 ? '<button class="activity-view-all btn-link" type="button">View All</button>' : ''}
      </div>
      <div class="activity-feed">${feedHtml || '<p class="text-muted">No activity yet</p>'}</div>
    </div>
  `;
}

function getActivityNav(activity) {
  const a = activity.action.toLowerCase();
  if (a.includes('invoice')) return '/invoicing';
  if (a.includes('item') || a.includes('order') || a.includes('quote')) return '/procurement';
  if (a.includes('task')) return '/schedule';
  if (a.includes('project')) return '/dashboard';
  return null;
}

// ── This Week — Mini Gantt ──────────────────────────────────────────────

function renderThisWeek(upcoming) {
  const ganttHtml = upcoming.map(t => {
    const color = PHASE_COLORS[t.phase] || '#94a3b8';
    return `
      <div class="gantt-task">
        <div class="gantt-task-info">
          <div class="gantt-task-name">${sanitizeHtml(t.name)}</div>
          <div class="gantt-task-contractor text-muted">${sanitizeHtml(t.contractor)}</div>
        </div>
        <div class="gantt-bar-track">
          <div class="gantt-bar-fill" data-progress="${t.progress}" style="width:0%;background:${color};transition:width 0.8s ease-out;"></div>
        </div>
        <span class="gantt-pct">${t.progress}%</span>
      </div>
    `;
  }).join('');

  return `
    <div class="dash-panel">
      <div class="panel-header">
        <h3 class="panel-title">This Week</h3>
        <a class="btn-link" data-nav="/schedule">View Schedule &rarr;</a>
      </div>
      <div class="gantt-mini">
        ${ganttHtml || '<p class="text-muted">No upcoming tasks</p>'}
      </div>
      <div class="phase-legend">
        ${Object.entries(PHASE_COLORS).map(([p, c]) => `<span class="phase-tag" style="background:${c}20;color:${c};border:1px solid ${c}40;">${capitalize(p)}</span>`).join('')}
      </div>
    </div>
  `;
}

// ── Quick Links with hover preview ──────────────────────────────────────

function renderQuickLinks() {
  const state = getState();
  const items = state ? state.items.filter(i => i.projectId === state.activeProjectId) : [];
  const tasks = state ? state.tasks.filter(t => t.projectId === state.activeProjectId) : [];
  const invoices = state ? state.invoices.filter(i => i.projectId === state.activeProjectId) : [];
  const suppliers = state ? state.suppliers : [];

  const links = [
    { route: '/procurement', icon: 'procurement', label: 'Procurement', metric: `${items.length} items` },
    { route: '/schedule', icon: 'schedule', label: 'Schedule', metric: `${tasks.filter(t => t.progress < 100).length} active` },
    { route: '/invoicing', icon: 'invoicing', label: 'Invoicing', metric: `${invoices.length} invoices` },
    { route: '/moodboard', icon: 'moodboard', label: 'Mood Boards', metric: `${state?.moodboards?.filter(m => m.projectId === state.activeProjectId).length || 0} boards` },
    { route: '/ai-assistant', icon: 'ai', label: 'AI Assistant', metric: 'Smart help' },
    { route: '/client-portal', icon: 'clientPortal', label: 'Client Portal', metric: 'Shared view' },
  ];

  return `
    <div class="dash-panel">
      <h3 class="panel-title">Quick Links</h3>
      <div class="quick-links">
        ${links.map(l => `
          <a class="quick-link" data-nav="${l.route}">
            <span class="quick-link-icon">${icons[l.icon]}</span>
            <span class="quick-link-label">${l.label}</span>
            <span class="quick-link-metric text-muted">${l.metric}</span>
          </a>
        `).join('')}
      </div>
    </div>
  `;
}

// ── Budget by Room — horizontal stacked bar ─────────────────────────────

function buildRoomBudgets(items) {
  const rooms = {};
  items.forEach(item => {
    if (!rooms[item.room]) rooms[item.room] = { trade: 0, margin: 0 };
    rooms[item.room].trade += item.trade;
    rooms[item.room].margin += item.trade * (item.markup / 100);
  });
  const entries = Object.entries(rooms).map(([room, data]) => ({
    room,
    trade: data.trade,
    margin: data.margin,
    total: data.trade + data.margin
  }));
  entries.sort((a, b) => b.total - a.total);
  return entries;
}

function renderBudgetByRoom(roomBudgets) {
  if (roomBudgets.length === 0) return '';
  const maxTotal = Math.max(...roomBudgets.map(r => r.total));

  const barsHtml = roomBudgets.map(r => {
    const tradePct = maxTotal > 0 ? (r.trade / maxTotal) * 100 : 0;
    const marginPct = maxTotal > 0 ? (r.margin / maxTotal) * 100 : 0;
    return `
      <div class="room-budget-row">
        <div class="room-budget-label">${sanitizeHtml(r.room)}</div>
        <div class="room-budget-bar">
          <div class="room-bar-trade" data-width="${tradePct}" style="width:0%;transition:width 0.8s ease-out;" title="Trade: ${formatCurrency(r.trade)}"></div>
          <div class="room-bar-margin" data-width="${marginPct}" style="width:0%;transition:width 0.8s ease-out;" title="Margin: ${formatCurrency(r.margin)}"></div>
        </div>
        <div class="room-budget-value">${formatCurrency(r.total)}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="dash-panel dash-panel-wide">
      <h3 class="panel-title">Budget by Room</h3>
      <div class="room-budget-chart">${barsHtml}</div>
      <div class="room-budget-legend">
        <span><span class="legend-dot" style="background:#6366f1;"></span>Trade cost</span>
        <span><span class="legend-dot" style="background:#a855f7;"></span>Margin</span>
      </div>
    </div>
  `;
}

// ── Supplier Lead Times — at risk items ─────────────────────────────────

function getAtRiskItems(items, suppliers) {
  const pendingItems = items.filter(i => ['spec', 'quoted', 'ordered'].includes(i.status));
  return pendingItems.map(item => {
    const supplier = suppliers.find(s => s.name === item.supplier);
    const leadTime = supplier?.leadTime || 'Unknown';
    const leadWeeks = parseLeadWeeks(leadTime);
    return { ...item, leadTime, leadWeeks, supplierName: supplier?.name || item.supplier };
  }).sort((a, b) => b.leadWeeks - a.leadWeeks).slice(0, 5);
}

function parseLeadWeeks(str) {
  const match = str.match(/(\d+)/g);
  if (!match) return 0;
  return parseInt(match[match.length - 1]) || 0;
}

function renderSupplierLeadTimes(items) {
  if (items.length === 0) return '';

  const html = items.map(item => {
    const risk = item.leadWeeks >= 10 ? 'high' : item.leadWeeks >= 6 ? 'medium' : 'low';
    const riskColor = risk === 'high' ? '#ef4444' : risk === 'medium' ? '#f59e0b' : '#10b981';
    return `
      <div class="leadtime-item">
        <div class="leadtime-info">
          <div class="leadtime-name">${sanitizeHtml(item.name)}</div>
          <div class="leadtime-supplier text-muted">${sanitizeHtml(item.supplierName)}</div>
        </div>
        <div class="leadtime-bar-track">
          <div class="leadtime-bar-fill" style="width:${Math.min(100, item.leadWeeks * 7)}%;background:${riskColor};"></div>
        </div>
        <span class="leadtime-value" style="color:${riskColor};">${item.leadTime}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="dash-panel">
      <h3 class="panel-title">Supplier Lead Times</h3>
      <div class="leadtime-list">${html}</div>
    </div>
  `;
}

// ── Invoice Aging ───────────────────────────────────────────────────────

function buildInvoiceAging(invoices, items) {
  const unpaid = invoices.filter(i => i.status === 'sent' || i.status === 'overdue');
  return unpaid.map(inv => {
    const total = inv.items.reduce((sum, itemId) => {
      const item = items.find(x => x.id === itemId);
      return sum + (item ? item.trade * (1 + item.markup / 100) : 0);
    }, 0);
    const daysOut = daysBetween(inv.date, new Date().toISOString());
    const daysOverdue = inv.dueDate ? daysBetween(inv.dueDate, new Date().toISOString()) : 0;
    return {
      number: inv.number,
      total,
      daysOut,
      daysOverdue: Math.max(0, daysOverdue),
      status: inv.status,
      dueDate: inv.dueDate
    };
  }).sort((a, b) => b.daysOut - a.daysOut);
}

function renderInvoiceAging(aging) {
  if (aging.length === 0) return '';

  const html = aging.map(inv => {
    const isOverdue = inv.status === 'overdue';
    const barWidth = Math.min(100, inv.daysOut * 2);
    const barColor = isOverdue ? '#ef4444' : '#f59e0b';
    return `
      <div class="aging-item" data-nav="/invoicing">
        <div class="aging-info">
          <div class="aging-number">${sanitizeHtml(inv.number)}</div>
          <div class="aging-amount">${formatCurrency(inv.total)}</div>
        </div>
        <div class="aging-bar-track">
          <div class="aging-bar-fill" style="width:${barWidth}%;background:${barColor};"></div>
        </div>
        <span class="aging-days ${isOverdue ? 'text-error' : ''}">${inv.daysOut}d ${isOverdue ? '(' + inv.daysOverdue + 'd overdue)' : ''}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="dash-panel">
      <div class="panel-header">
        <h3 class="panel-title">Invoice Aging</h3>
        <a class="btn-link" data-nav="/invoicing">View All &rarr;</a>
      </div>
      <div class="aging-list">${html}</div>
    </div>
  `;
}
