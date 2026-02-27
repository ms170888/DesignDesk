// Client Portal — branded client-facing view

import { getState, getActiveProject } from '../store.js';
import { formatCurrency, formatDate, formatDateShort } from '../core/utils.js';
import { showToast } from '../components/toast.js';

let activeTab = 'overview';

export function render() {
  const state = getState();
  const project = getActiveProject();
  if (!project || !state) return '<div class="empty-state"><h2>No project selected</h2></div>';

  const items = state.items.filter(i => i.projectId === project.id);
  const tasks = state.tasks.filter(t => t.projectId === project.id);
  const invoices = state.invoices.filter(i => i.projectId === project.id);
  const boards = state.moodboards.filter(b => b.projectId === project.id);

  const avgProgress = tasks.length ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length) : 0;
  const nextTask = tasks.filter(t => t.progress < 100 && t.progress > 0).sort((a, b) => new Date(a.end) - new Date(b.end))[0];

  return `
    <div class="view-client-portal">
      <div class="client-header">
        <div class="client-brand">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#1e293b"/><path d="M8 12h16M8 16h12M8 20h8" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>
          <span>DesignDesk Studio</span>
        </div>
        <h2 class="client-project-name">${project.name}</h2>
        <p class="client-sub">Welcome, ${project.client}</p>
      </div>

      <div class="client-tabs">
        ${['overview', 'schedule', 'selections', 'invoices', 'messages'].map(t =>
          `<button class="client-tab ${activeTab === t ? 'active' : ''}" data-tab="${t}">${t.charAt(0).toUpperCase() + t.slice(1)}</button>`
        ).join('')}
      </div>

      <div class="client-content">
        ${activeTab === 'overview' ? renderOverview(project, avgProgress, nextTask, items, invoices) : ''}
        ${activeTab === 'schedule' ? renderSchedule(tasks) : ''}
        ${activeTab === 'selections' ? renderSelections(items, boards) : ''}
        ${activeTab === 'invoices' ? renderInvoices(invoices, items, state) : ''}
        ${activeTab === 'messages' ? renderMessages(project) : ''}
      </div>
    </div>
  `;
}

function renderOverview(project, progress, nextTask, items, invoices) {
  const deliveredCount = items.filter(i => ['delivered', 'installed'].includes(i.status)).length;
  const unpaid = invoices.filter(i => ['sent', 'overdue'].includes(i.status)).length;

  return `
    <div class="client-overview">
      <div class="client-progress-card">
        <h3>Project Progress</h3>
        <div class="big-progress">
          <svg viewBox="0 0 120 120" class="progress-ring">
            <circle cx="60" cy="60" r="50" fill="none" stroke="#e2e8f0" stroke-width="8"/>
            <circle cx="60" cy="60" r="50" fill="none" stroke="#6366f1" stroke-width="8" stroke-linecap="round"
              stroke-dasharray="${Math.PI * 100 * progress / 100} ${Math.PI * 100}" transform="rotate(-90 60 60)"/>
          </svg>
          <div class="progress-text">${progress}%</div>
        </div>
        ${nextTask ? `<p class="next-milestone">Next: <strong>${nextTask.name}</strong> — due ${formatDateShort(nextTask.end)}</p>` : ''}
      </div>

      <div class="client-stats-row">
        <div class="client-stat"><span class="text-muted">Items Delivered</span><strong>${deliveredCount} / ${items.length}</strong></div>
        <div class="client-stat"><span class="text-muted">Pending Invoices</span><strong>${unpaid}</strong></div>
        <div class="client-stat"><span class="text-muted">Timeline</span><strong>${formatDateShort(project.startDate)} — ${formatDateShort(project.endDate)}</strong></div>
      </div>
    </div>
  `;
}

function renderSchedule(tasks) {
  return `
    <div class="client-schedule">
      <h3>Construction Timeline</h3>
      <div class="client-timeline">
        ${tasks.map(t => `
          <div class="timeline-item ${t.progress === 100 ? 'done' : t.progress > 0 ? 'active' : ''}">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
              <strong>${t.name}</strong>
              <span class="text-muted">${formatDateShort(t.start)} — ${formatDateShort(t.end)}</span>
              <div class="mini-progress"><div class="mini-progress-bar" style="width:${t.progress}%"></div></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderSelections(items, boards) {
  // No trade prices visible!
  return `
    <div class="client-selections">
      <h3>Your Selections</h3>
      <div class="selection-cards">
        ${items.map(item => `
          <div class="selection-card">
            <div class="selection-info">
              <h4>${item.name}</h4>
              <p class="text-muted">${item.supplier} &middot; ${item.room}</p>
              <span class="status-badge status-${item.status}">${item.status}</span>
            </div>
            <div class="selection-actions">
              <button class="btn btn-sm btn-primary approve-btn" data-id="${item.id}">Approve</button>
              <button class="btn btn-sm btn-outline change-btn" data-id="${item.id}">Request Change</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderInvoices(invoices, items, state) {
  // Client view only — no trade prices
  return `
    <div class="client-invoices">
      <h3>Your Invoices</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr><th>Invoice</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            ${invoices.map(inv => {
              const invItems = inv.items.map(id => items.find(i => i.id === id)).filter(Boolean);
              const subtotal = invItems.reduce((s, i) => s + i.trade * (1 + i.markup / 100), 0);
              const total = subtotal * (1 + inv.vatRate / 100);
              return `<tr>
                <td><strong>${inv.number}</strong></td>
                <td>${formatDate(inv.date)}</td>
                <td>${formatCurrency(total)}</td>
                <td><span class="status-badge status-${inv.status}">${inv.status}</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderMessages(project) {
  return `
    <div class="client-messages">
      <h3>Messages</h3>
      <div class="message-list">
        <div class="message from-designer">
          <div class="message-avatar">DD</div>
          <div class="message-body">
            <strong>DesignDesk Studio</strong>
            <p>Hi ${project.client.split(' ')[0]}! Plastering starts on Monday. We'll need access from 8am — could you confirm the key handover?</p>
            <span class="text-muted">2 days ago</span>
          </div>
        </div>
        <div class="message from-client">
          <div class="message-avatar">${project.client.split(' ').map(w => w[0]).join('')}</div>
          <div class="message-body">
            <strong>${project.client}</strong>
            <p>Yes, the housekeeper will be there from 7:30. Should I leave anything unlocked?</p>
            <span class="text-muted">1 day ago</span>
          </div>
        </div>
      </div>
      <div class="message-compose">
        <input type="text" placeholder="Type a message..." class="message-input" />
        <button class="btn btn-primary btn-sm">Send</button>
      </div>
    </div>
  `;
}

export function mount(el) {
  // Tab switching
  el.querySelectorAll('.client-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeTab = tab.dataset.tab;
      el.innerHTML = render();
      mount(el);
    });
  });

  // Approve/change buttons
  el.querySelectorAll('.approve-btn').forEach(btn => {
    btn.addEventListener('click', () => { showToast('Selection approved'); btn.disabled = true; btn.textContent = 'Approved'; });
  });
  el.querySelectorAll('.change-btn').forEach(btn => {
    btn.addEventListener('click', () => showToast('Change request sent to designer', 'info'));
  });

  // Message send
  const msgInput = el.querySelector('.message-input');
  const sendBtn = el.querySelector('.message-compose .btn');
  if (msgInput && sendBtn) {
    sendBtn.addEventListener('click', () => {
      if (msgInput.value.trim()) { showToast('Message sent'); msgInput.value = ''; }
    });
  }
}

export function destroy() { activeTab = 'overview'; }
