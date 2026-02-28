// Client Portal — premium branded client-facing view
// No trade prices, no margins, no internal notes visible ANYWHERE

import { getState, getActiveProject, addActivity } from '../store.js';
import { formatCurrency, formatDate, formatDateShort, daysBetween, generateId, relativeTime } from '../core/utils.js';
import { icons } from '../core/icons.js';
import { showToast } from '../components/toast.js';

let activeTab = 'overview';
let roomFilter = 'all';
let selectedInvoice = null;
let changeRequestItemId = null;
let changeRequestText = '';

// ── Messages persistence ─────────────────────────────────────────────────
const MESSAGES_KEY = 'designdesk_portal_messages';

function getMessages(projectId) {
  try {
    const raw = localStorage.getItem(MESSAGES_KEY);
    const all = raw ? JSON.parse(raw) : {};
    return all[projectId] || getDefaultMessages(projectId);
  } catch { return getDefaultMessages(projectId); }
}

function saveMessages(projectId, msgs) {
  try {
    const raw = localStorage.getItem(MESSAGES_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[projectId] = msgs;
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

function getDefaultMessages(projectId) {
  const project = getActiveProject();
  const clientFirst = project ? project.client.split(' ')[0] : 'there';
  const now = new Date();
  return [
    {
      id: 'msg-1',
      from: 'designer',
      name: 'DesignDesk Studio',
      text: `Hi ${clientFirst}! Just a quick update — plastering starts on Monday. We'll need access from 8am. Could you confirm the key handover arrangements?`,
      timestamp: new Date(now - 2 * 86400000).toISOString(),
      read: true
    },
    {
      id: 'msg-2',
      from: 'client',
      name: project ? project.client : 'Client',
      text: `Yes, the housekeeper will be there from 7:30. Should I leave anything unlocked? Also, will there be much dust? I left some artwork in the hallway.`,
      timestamp: new Date(now - 1.5 * 86400000).toISOString(),
      read: true
    },
    {
      id: 'msg-3',
      from: 'designer',
      name: 'DesignDesk Studio',
      text: `Good thinking — we'll cover everything with dust sheets but I'd recommend moving the artwork to the master bedroom for now. The plasterers will be in the hallway and drawing room. I'll send photos at end of day Monday!`,
      timestamp: new Date(now - 1 * 86400000).toISOString(),
      read: true
    },
    {
      id: 'msg-4',
      from: 'client',
      name: project ? project.client : 'Client',
      text: `Perfect, I'll move it this weekend. Looking forward to seeing the progress photos!`,
      timestamp: new Date(now - 0.5 * 86400000).toISOString(),
      read: true
    }
  ];
}

// ── Documents data ───────────────────────────────────────────────────────

function getDocuments() {
  return [
    { id: 'doc-1', name: 'Design Contract & Terms', type: 'PDF', size: '245 KB', date: '2026-01-10', category: 'contract' },
    { id: 'doc-2', name: 'Ground Floor Layout Drawings', type: 'PDF', size: '1.2 MB', date: '2026-01-18', category: 'drawing' },
    { id: 'doc-3', name: 'Kitchen Specification Sheet', type: 'PDF', size: '380 KB', date: '2026-02-05', category: 'spec' },
    { id: 'doc-4', name: 'Material Samples Reference', type: 'PDF', size: '2.8 MB', date: '2026-02-12', category: 'spec' },
  ];
}

// ── Helpers ──────────────────────────────────────────────────────────────

function clientPrice(item) {
  return item.trade * (1 + item.markup / 100);
}

function invoiceTotal(inv, items) {
  const invItems = inv.items.map(id => items.find(i => i.id === id)).filter(Boolean);
  const subtotal = invItems.reduce((s, i) => s + clientPrice(i), 0);
  return subtotal * (1 + inv.vatRate / 100);
}

function getUnreadCount(projectId) {
  const msgs = getMessages(projectId);
  return msgs.filter(m => !m.read && m.from === 'designer').length;
}

function getPhaseLabel(phase) {
  const labels = { structural: 'Structural', firstfix: 'First Fix', finishing: 'Finishing', install: 'Installation' };
  return labels[phase] || phase;
}

function getPhaseOrder(phase) {
  const order = { structural: 0, firstfix: 1, finishing: 2, install: 3 };
  return order[phase] ?? 99;
}

// ── Main render ─────────────────────────────────────────────────────────

export function render() {
  const state = getState();
  const project = getActiveProject();
  if (!project || !state) return '<div class="empty-state"><h2>No project selected</h2></div>';

  const items = state.items.filter(i => i.projectId === project.id);
  const tasks = state.tasks.filter(t => t.projectId === project.id);
  const invoices = state.invoices.filter(i => i.projectId === project.id);
  const boards = state.moodboards.filter(b => b.projectId === project.id);
  const unreadCount = getUnreadCount(project.id);

  const avgProgress = tasks.length ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length) : 0;

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'schedule', label: 'Schedule' },
    { key: 'selections', label: 'Selections' },
    { key: 'invoices', label: 'Invoices' },
    { key: 'messages', label: 'Messages', badge: unreadCount },
    { key: 'documents', label: 'Documents' },
  ];

  return `
    <div class="view-client-portal">
      <div class="portal-hero">
        <div class="portal-hero-inner">
          <div class="portal-brand">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#1e293b"/><path d="M8 12h16M8 16h12M8 20h8" stroke="#c9a96e" stroke-width="2" stroke-linecap="round"/></svg>
            <span>DesignDesk Studio</span>
          </div>
          <h1 class="portal-project-name">${project.name}</h1>
          <p class="portal-welcome">Welcome back, ${project.client}</p>
          <p class="portal-address">${project.address}</p>
        </div>
      </div>

      <div class="portal-tabs">
        ${tabs.map(t => `
          <button class="portal-tab ${activeTab === t.key ? 'active' : ''}" data-tab="${t.key}">
            ${t.label}
            ${t.badge ? `<span class="portal-tab-badge">${t.badge}</span>` : ''}
          </button>
        `).join('')}
      </div>

      <div class="portal-content">
        ${activeTab === 'overview' ? renderOverview(project, avgProgress, tasks, items, invoices, boards) : ''}
        ${activeTab === 'schedule' ? renderSchedule(tasks) : ''}
        ${activeTab === 'selections' ? renderSelections(items) : ''}
        ${activeTab === 'invoices' ? renderInvoices(invoices, items, state) : ''}
        ${activeTab === 'messages' ? renderMessages(project) : ''}
        ${activeTab === 'documents' ? renderDocuments() : ''}
      </div>

      ${changeRequestItemId ? renderChangeModal() : ''}
    </div>
  `;
}

// ── Overview Tab ────────────────────────────────────────────────────────

function renderOverview(project, progress, tasks, items, invoices, boards) {
  const nextTask = tasks
    .filter(t => t.progress < 100 && t.progress > 0)
    .sort((a, b) => new Date(a.end) - new Date(b.end))[0]
    || tasks.filter(t => t.progress === 0).sort((a, b) => new Date(a.start) - new Date(b.start))[0];

  const daysUntil = nextTask ? daysBetween(new Date().toISOString(), nextTask.end) : 0;
  const deliveredCount = items.filter(i => ['delivered', 'installed'].includes(i.status)).length;

  // Timeline calculations
  const startDate = new Date(project.startDate);
  const endDate = new Date(project.endDate);
  const today = new Date();
  const totalDuration = endDate - startDate;
  const elapsed = today - startDate;
  const timelineProgress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

  // Photo gallery from mood boards
  const colors = boards.flatMap(b => b.items.filter(i => i.type === 'color')).slice(0, 6);

  return `
    <div class="portal-overview">
      <div class="portal-grid-2">
        <div class="portal-card portal-card-progress">
          <h3>Project Progress</h3>
          <div class="portal-progress-ring-wrap">
            <svg viewBox="0 0 140 140" class="portal-progress-ring" data-progress="${progress}">
              <circle cx="70" cy="70" r="58" fill="none" stroke="#f1f5f9" stroke-width="10"/>
              <circle cx="70" cy="70" r="58" fill="none" stroke="#c9a96e" stroke-width="10" stroke-linecap="round"
                class="portal-progress-arc"
                stroke-dasharray="0 ${Math.PI * 116}"
                data-target="${Math.PI * 116 * progress / 100}"
                data-circumference="${Math.PI * 116}"
                transform="rotate(-90 70 70)"/>
            </svg>
            <div class="portal-progress-label">
              <span class="portal-progress-num" data-target="${progress}">0</span>
              <span class="portal-progress-pct">%</span>
            </div>
          </div>
          <p class="portal-progress-status">${progress >= 100 ? 'Project Complete' : progress >= 75 ? 'Nearly there!' : progress >= 50 ? 'Great progress' : 'Getting started'}</p>
        </div>

        <div class="portal-card portal-card-milestone">
          <h3>Next Milestone</h3>
          ${nextTask ? `
            <div class="portal-milestone-hero">
              <div class="portal-milestone-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M2 12h20" stroke="#c9a96e" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="4" fill="#c9a96e" opacity=".2"/></svg>
              </div>
              <h4>${nextTask.name}</h4>
              <p class="portal-milestone-dates">${formatDateShort(nextTask.start)} &mdash; ${formatDateShort(nextTask.end)}</p>
              <div class="portal-countdown">
                <span class="portal-countdown-num">${Math.max(0, daysUntil)}</span>
                <span class="portal-countdown-label">days ${daysUntil >= 0 ? 'remaining' : 'overdue'}</span>
              </div>
              ${nextTask.contractor ? `<p class="portal-milestone-contractor">Contractor: ${nextTask.contractor}</p>` : ''}
            </div>
          ` : '<p class="text-muted">All milestones complete!</p>'}
        </div>
      </div>

      <div class="portal-card portal-card-timeline">
        <h3>Project Timeline</h3>
        <div class="portal-timeline-bar-wrap">
          <div class="portal-timeline-labels">
            <span>${formatDateShort(project.startDate)}</span>
            <span>${formatDateShort(project.endDate)}</span>
          </div>
          <div class="portal-timeline-bar">
            <div class="portal-timeline-fill" style="width:${timelineProgress}%"></div>
            <div class="portal-timeline-today" style="left:${timelineProgress}%">
              <span class="portal-timeline-today-label">Today</span>
            </div>
            ${tasks.filter(t => t.progress === 0).slice(0, 3).map(t => {
              const taskStart = new Date(t.start);
              const pos = Math.min(100, Math.max(0, ((taskStart - startDate) / totalDuration) * 100));
              return `<div class="portal-timeline-marker" style="left:${pos}%" title="${t.name} — ${formatDateShort(t.start)}"></div>`;
            }).join('')}
          </div>
        </div>
      </div>

      <div class="portal-grid-3">
        <div class="portal-card portal-stat-card">
          <div class="portal-stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke="#c9a96e" stroke-width="1.8"/><path d="M8 12l3 3 5-5" stroke="#c9a96e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <span class="portal-stat-value">${deliveredCount} / ${items.length}</span>
          <span class="portal-stat-label">Items Delivered</span>
        </div>
        <div class="portal-card portal-stat-card">
          <div class="portal-stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" stroke="#c9a96e" stroke-width="1.8"/><path d="M3 8h18" stroke="#c9a96e" stroke-width="1.8"/><path d="M8 12h4M8 15h2" stroke="#c9a96e" stroke-width="1.8" stroke-linecap="round"/></svg>
          </div>
          <span class="portal-stat-value">${invoices.filter(i => ['sent', 'overdue'].includes(i.status)).length}</span>
          <span class="portal-stat-label">Pending Invoices</span>
        </div>
        <div class="portal-card portal-stat-card">
          <div class="portal-stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="#c9a96e" stroke-width="1.8"/><path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="#c9a96e" stroke-width="1.8" stroke-linecap="round"/></svg>
          </div>
          <span class="portal-stat-value">DesignDesk Studio</span>
          <span class="portal-stat-label">Your Designer</span>
        </div>
      </div>

      ${colors.length > 0 ? `
        <div class="portal-card">
          <h3>Colour Palette</h3>
          <div class="portal-palette-grid">
            ${colors.map(c => `
              <div class="portal-palette-swatch">
                <div class="portal-swatch-color" style="background:${c.value}"></div>
                <span class="portal-swatch-label">${c.label}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// ── Schedule Tab ────────────────────────────────────────────────────────

function renderSchedule(tasks) {
  const sorted = [...tasks].sort((a, b) => new Date(a.start) - new Date(b.start));
  const grouped = {};
  sorted.forEach(t => {
    const phase = t.phase || 'other';
    if (!grouped[phase]) grouped[phase] = [];
    grouped[phase].push(t);
  });

  const phaseOrder = Object.keys(grouped).sort((a, b) => getPhaseOrder(a) - getPhaseOrder(b));

  return `
    <div class="portal-schedule">
      <div class="portal-card">
        <h3>Construction Timeline</h3>
        <div class="portal-vertical-timeline">
          ${phaseOrder.map(phase => `
            <div class="portal-phase-group">
              <div class="portal-phase-header">
                <span class="portal-phase-dot"></span>
                <h4>${getPhaseLabel(phase)}</h4>
              </div>
              ${grouped[phase].map(t => {
                const isDone = t.progress === 100;
                const isActive = t.progress > 0 && t.progress < 100;
                const cls = isDone ? 'done' : isActive ? 'active' : 'future';
                return `
                  <div class="portal-timeline-task ${cls}">
                    <div class="portal-timeline-task-line">
                      <div class="portal-timeline-task-dot ${cls}">
                        ${isDone ? `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-8" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>` : ''}
                        ${isActive ? '<span class="portal-pulse"></span>' : ''}
                      </div>
                    </div>
                    <div class="portal-timeline-task-content">
                      <div class="portal-timeline-task-header">
                        <strong>${t.name}</strong>
                        ${t.contractor ? `<span class="portal-contractor-badge">${t.contractor}</span>` : ''}
                      </div>
                      <span class="portal-timeline-task-dates">${formatDateShort(t.start)} &mdash; ${formatDateShort(t.end)}</span>
                      ${isActive ? `
                        <div class="portal-task-progress">
                          <div class="portal-task-progress-bar">
                            <div class="portal-task-progress-fill" style="width:${t.progress}%"></div>
                          </div>
                          <span class="portal-task-progress-label">${t.progress}%</span>
                        </div>
                      ` : ''}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

// ── Selections Tab ──────────────────────────────────────────────────────

function renderSelections(items) {
  const rooms = ['all', ...new Set(items.map(i => i.room))];
  const filtered = roomFilter === 'all' ? items : items.filter(i => i.room === roomFilter);

  function selectionStatus(item) {
    if (['delivered', 'installed'].includes(item.status)) return { label: 'Approved', cls: 'approved' };
    if (['shipped', 'ordered'].includes(item.status)) return { label: 'Approved', cls: 'approved' };
    if (item.clientApproval === 'change') return { label: 'Change Requested', cls: 'change' };
    return { label: 'Pending Approval', cls: 'pending' };
  }

  return `
    <div class="portal-selections">
      <div class="portal-room-tabs">
        ${rooms.map(r => `
          <button class="portal-room-tab ${roomFilter === r ? 'active' : ''}" data-room="${r}">
            ${r === 'all' ? 'All Rooms' : r}
          </button>
        `).join('')}
      </div>
      <div class="portal-selection-grid">
        ${filtered.map(item => {
          const st = selectionStatus(item);
          return `
            <div class="portal-selection-card">
              <div class="portal-selection-image">
                <div class="portal-selection-placeholder">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke="#cbd5e1" stroke-width="1.5"/><path d="M3 16l5-5 3 3 2-2 8 8" stroke="#cbd5e1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="8" r="2" stroke="#cbd5e1" stroke-width="1.5"/></svg>
                </div>
              </div>
              <div class="portal-selection-info">
                <h4>${item.name}</h4>
                <p class="portal-selection-meta">${item.supplier} &middot; ${item.room}</p>
                <span class="portal-selection-badge ${st.cls}">${st.label}</span>
              </div>
              <div class="portal-selection-actions">
                ${st.cls === 'pending' ? `
                  <button class="portal-btn portal-btn-gold approve-btn" data-id="${item.id}">Approve</button>
                  <button class="portal-btn portal-btn-outline change-btn" data-id="${item.id}">Request Change</button>
                ` : ''}
                ${st.cls === 'change' ? `
                  <span class="portal-change-note">Change request sent</span>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
        ${filtered.length === 0 ? '<p class="text-muted" style="padding:24px">No items in this room yet.</p>' : ''}
      </div>
    </div>
  `;
}

// ── Invoices Tab ────────────────────────────────────────────────────────

function renderInvoices(invoices, items, state) {
  if (selectedInvoice) {
    const inv = invoices.find(i => i.id === selectedInvoice);
    if (inv) return renderInvoiceDetail(inv, items);
  }

  return `
    <div class="portal-invoices">
      <div class="portal-card">
        <h3>Your Invoices</h3>
        <div class="portal-invoice-list">
          ${invoices.map(inv => {
            const total = invoiceTotal(inv, items);
            const statusCls = inv.status === 'paid' ? 'paid' : inv.status === 'overdue' ? 'overdue' : inv.status === 'sent' ? 'sent' : 'draft';
            return `
              <div class="portal-invoice-row" data-invoice="${inv.id}">
                <div class="portal-invoice-main">
                  <strong>${inv.number}</strong>
                  <span class="portal-invoice-date">${formatDate(inv.date)}</span>
                </div>
                <div class="portal-invoice-amount">${formatCurrency(total)}</div>
                <span class="portal-invoice-status ${statusCls}">${inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}</span>
                ${['sent', 'overdue'].includes(inv.status) ? `<button class="portal-btn portal-btn-gold portal-btn-sm pay-btn" data-id="${inv.id}">Pay Now</button>` : ''}
                <button class="portal-btn portal-btn-outline portal-btn-sm view-invoice-btn" data-id="${inv.id}">View</button>
              </div>
            `;
          }).join('')}
          ${invoices.length === 0 ? '<p class="text-muted" style="padding:24px">No invoices yet.</p>' : ''}
        </div>
      </div>
    </div>
  `;
}

function renderInvoiceDetail(inv, items) {
  const invItems = inv.items.map(id => items.find(i => i.id === id)).filter(Boolean);
  const subtotal = invItems.reduce((s, i) => s + clientPrice(i), 0);
  const vat = subtotal * (inv.vatRate / 100);
  const total = subtotal + vat;

  return `
    <div class="portal-invoice-detail">
      <button class="portal-btn portal-btn-outline portal-btn-sm back-to-invoices">&larr; Back to Invoices</button>
      <div class="portal-invoice-sheet" id="invoice-printable">
        <div class="portal-invoice-header">
          <div>
            <h2>DesignDesk Studio</h2>
            <p class="text-muted">Interior Design &amp; Project Management</p>
          </div>
          <div class="portal-invoice-number">
            <h3>${inv.number}</h3>
            <span class="portal-invoice-status ${inv.status}">${inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}</span>
          </div>
        </div>
        <div class="portal-invoice-meta">
          <div><strong>Date:</strong> ${formatDate(inv.date)}</div>
          ${inv.dueDate ? `<div><strong>Due:</strong> ${formatDate(inv.dueDate)}</div>` : ''}
          ${inv.paidDate ? `<div><strong>Paid:</strong> ${formatDate(inv.paidDate)}</div>` : ''}
        </div>
        <table class="portal-invoice-table">
          <thead><tr><th>Item</th><th>Room</th><th class="text-right">Amount</th></tr></thead>
          <tbody>
            ${invItems.map(i => `
              <tr>
                <td>${i.name}</td>
                <td>${i.room}</td>
                <td class="text-right">${formatCurrency(clientPrice(i))}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr><td colspan="2" class="text-right"><strong>Subtotal</strong></td><td class="text-right">${formatCurrency(subtotal)}</td></tr>
            <tr><td colspan="2" class="text-right"><strong>VAT (${inv.vatRate}%)</strong></td><td class="text-right">${formatCurrency(vat)}</td></tr>
            <tr class="portal-invoice-total-row"><td colspan="2" class="text-right"><strong>Total</strong></td><td class="text-right"><strong>${formatCurrency(total)}</strong></td></tr>
          </tfoot>
        </table>
        ${inv.notes ? `<p class="portal-invoice-notes"><strong>Notes:</strong> ${inv.notes}</p>` : ''}
      </div>
      <div class="portal-invoice-actions">
        <button class="portal-btn portal-btn-outline print-invoice-btn">${icons.printer} Download / Print</button>
        ${['sent', 'overdue'].includes(inv.status) ? `<button class="portal-btn portal-btn-gold pay-btn" data-id="${inv.id}">Pay Now</button>` : ''}
      </div>
    </div>
  `;
}

// ── Messages Tab ────────────────────────────────────────────────────────

function renderMessages(project) {
  const msgs = getMessages(project.id);
  const clientInitials = project.client.split(' ').map(w => w[0]).join('');

  return `
    <div class="portal-messages">
      <div class="portal-card portal-messages-card">
        <div class="portal-messages-header">
          <h3>Messages</h3>
        </div>
        <div class="portal-message-list" id="portal-message-list">
          ${msgs.map(m => `
            <div class="portal-msg ${m.from === 'designer' ? 'portal-msg-designer' : 'portal-msg-client'}">
              <div class="portal-msg-avatar ${m.from === 'designer' ? 'portal-avatar-designer' : 'portal-avatar-client'}">
                ${m.from === 'designer' ? 'DD' : clientInitials}
              </div>
              <div class="portal-msg-bubble">
                <div class="portal-msg-name">${m.name}</div>
                <p>${m.text}</p>
                <span class="portal-msg-time">${relativeTime(m.timestamp)}</span>
              </div>
            </div>
          `).join('')}
          <div class="portal-typing-indicator hidden" id="portal-typing">
            <div class="portal-msg-avatar portal-avatar-designer">DD</div>
            <div class="portal-msg-bubble portal-typing-bubble">
              <span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
            </div>
          </div>
        </div>
        <div class="portal-compose">
          <input type="text" placeholder="Type a message..." class="portal-message-input" id="portal-msg-input" />
          <button class="portal-btn portal-btn-gold portal-send-btn" id="portal-send-btn">
            ${icons.send}
          </button>
        </div>
      </div>
    </div>
  `;
}

// ── Documents Tab ───────────────────────────────────────────────────────

function renderDocuments() {
  const docs = getDocuments();
  const docIcons = {
    contract: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#c9a96e" stroke-width="1.8"/><path d="M14 2v6h6M8 13h8M8 17h5" stroke="#c9a96e" stroke-width="1.8" stroke-linecap="round"/></svg>',
    drawing: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="#c9a96e" stroke-width="1.8"/><path d="M3 16l5-5 3 3 2-2 8 8" stroke="#c9a96e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    spec: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#c9a96e" stroke-width="1.8"/><path d="M14 2v6h6" stroke="#c9a96e" stroke-width="1.8"/><path d="M9 15l2 2 4-4" stroke="#c9a96e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  return `
    <div class="portal-documents">
      <div class="portal-card">
        <div class="portal-docs-header">
          <h3>Project Documents</h3>
          <button class="portal-btn portal-btn-outline portal-btn-sm" id="portal-upload-doc">
            ${icons.upload} Upload File
          </button>
        </div>
        <div class="portal-doc-list">
          ${docs.map(d => `
            <div class="portal-doc-row">
              <div class="portal-doc-icon">${docIcons[d.category] || docIcons.contract}</div>
              <div class="portal-doc-info">
                <strong>${d.name}</strong>
                <span class="portal-doc-meta">${d.type} &middot; ${d.size} &middot; ${formatDate(d.date)}</span>
              </div>
              <button class="portal-btn portal-btn-outline portal-btn-sm download-doc-btn" data-doc="${d.id}">Download</button>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

// ── Change Request Modal ────────────────────────────────────────────────

function renderChangeModal() {
  const state = getState();
  const item = state ? state.items.find(i => i.id === changeRequestItemId) : null;
  if (!item) return '';

  return `
    <div class="portal-modal-overlay" id="change-modal-overlay">
      <div class="portal-modal">
        <div class="portal-modal-header">
          <h3>Request a Change</h3>
          <button class="portal-modal-close" id="close-change-modal">&times;</button>
        </div>
        <div class="portal-modal-body">
          <p>Tell us what you'd like changed for <strong>${item.name}</strong>:</p>
          <textarea class="portal-textarea" id="change-request-text" rows="4" placeholder="e.g. Could we see this in a different colour? I'd prefer something warmer...">${changeRequestText}</textarea>
        </div>
        <div class="portal-modal-footer">
          <button class="portal-btn portal-btn-outline" id="cancel-change">Cancel</button>
          <button class="portal-btn portal-btn-gold" id="submit-change">Send Request</button>
        </div>
      </div>
    </div>
  `;
}

// ── Mount ───────────────────────────────────────────────────────────────

export function mount(el) {
  const project = getActiveProject();
  if (!project) return;

  // Tab switching
  el.querySelectorAll('.portal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeTab = tab.dataset.tab;
      selectedInvoice = null;
      el.innerHTML = render();
      mount(el);
    });
  });

  // ── Overview: animate progress ring
  const arc = el.querySelector('.portal-progress-arc');
  if (arc) {
    const target = parseFloat(arc.dataset.target) || 0;
    const circumference = parseFloat(arc.dataset.circumference) || 0;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        arc.style.transition = 'stroke-dasharray 1.2s ease-out';
        arc.setAttribute('stroke-dasharray', `${target} ${circumference}`);
      });
    });
  }

  // Animate progress number
  const numEl = el.querySelector('.portal-progress-num');
  if (numEl) {
    const target = parseInt(numEl.dataset.target) || 0;
    let current = 0;
    const duration = 1200;
    const start = performance.now();
    const step = (ts) => {
      const elapsed = ts - start;
      const progress = Math.min(elapsed / duration, 1);
      current = Math.round(progress * target);
      numEl.textContent = current;
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ── Schedule: no interactions needed, purely visual

  // ── Selections: room filter
  el.querySelectorAll('.portal-room-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      roomFilter = tab.dataset.room;
      el.innerHTML = render();
      mount(el);
    });
  });

  // Approve buttons
  el.querySelectorAll('.approve-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const itemId = btn.dataset.id;
      addActivity('Client approval', `Client approved selection: ${itemId}`, 'check');
      showToast('Selection approved! Your designer has been notified.', 'success');
      btn.disabled = true;
      btn.textContent = 'Approved';
      btn.classList.add('portal-btn-disabled');
      const card = btn.closest('.portal-selection-card');
      if (card) {
        const badge = card.querySelector('.portal-selection-badge');
        if (badge) { badge.textContent = 'Approved'; badge.className = 'portal-selection-badge approved'; }
        const changeBtn = card.querySelector('.change-btn');
        if (changeBtn) changeBtn.remove();
      }
    });
  });

  // Change request buttons
  el.querySelectorAll('.change-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      changeRequestItemId = btn.dataset.id;
      changeRequestText = '';
      el.innerHTML = render();
      mount(el);
    });
  });

  // Change modal
  el.querySelector('#close-change-modal')?.addEventListener('click', closeChangeModal);
  el.querySelector('#cancel-change')?.addEventListener('click', closeChangeModal);
  el.querySelector('#change-modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'change-modal-overlay') closeChangeModal();
  });
  el.querySelector('#submit-change')?.addEventListener('click', () => {
    const text = el.querySelector('#change-request-text')?.value?.trim();
    if (!text) { showToast('Please describe the change you need.', 'warning'); return; }
    addActivity('Change request', `Client requested change: ${text}`, 'edit');
    showToast('Change request sent to your designer.', 'success');
    closeChangeModal();
    el.innerHTML = render();
    mount(el);
  });

  function closeChangeModal() {
    changeRequestItemId = null;
    changeRequestText = '';
    el.innerHTML = render();
    mount(el);
  }

  // ── Invoices
  el.querySelectorAll('.view-invoice-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedInvoice = btn.dataset.id;
      el.innerHTML = render();
      mount(el);
    });
  });

  el.querySelector('.back-to-invoices')?.addEventListener('click', () => {
    selectedInvoice = null;
    el.innerHTML = render();
    mount(el);
  });

  el.querySelector('.print-invoice-btn')?.addEventListener('click', () => {
    const printable = el.querySelector('#invoice-printable');
    if (!printable) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Invoice</title>
      <style>
        body { font-family: 'Inter', -apple-system, sans-serif; padding: 40px; color: #1e293b; }
        h2 { margin: 0 0 4px; } h3 { margin: 0; }
        .text-muted { color: #64748b; }
        .text-right { text-align: right; }
        table { width: 100%; border-collapse: collapse; margin: 24px 0; }
        th, td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: left; }
        th { background: #f8fafc; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: .05em; }
        tfoot td { border-bottom: none; }
        .portal-invoice-total-row td { border-top: 2px solid #1e293b; font-size: 16px; }
        .portal-invoice-header { display: flex; justify-content: space-between; margin-bottom: 24px; }
        .portal-invoice-meta { display: flex; gap: 24px; margin-bottom: 16px; color: #64748b; }
        .portal-invoice-status { display: inline-block; padding: 2px 10px; border-radius: 99px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
        .portal-invoice-status.paid { background: #dcfce7; color: #166534; }
        .portal-invoice-status.overdue { background: #fee2e2; color: #991b1b; }
        .portal-invoice-status.sent { background: #dbeafe; color: #1e40af; }
        .portal-invoice-status.draft { background: #f1f5f9; color: #475569; }
        .portal-invoice-notes { margin-top: 16px; color: #64748b; font-size: 14px; }
      </style></head><body>${printable.innerHTML}</body></html>
    `);
    win.document.close();
    win.print();
  });

  // Pay button (contact modal)
  el.querySelectorAll('.pay-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showToast('Please contact us to arrange payment: accounts@designdeskstudio.co.uk', 'info', 5000);
    });
  });

  // ── Messages
  const msgInput = el.querySelector('#portal-msg-input');
  const sendBtn = el.querySelector('#portal-send-btn');
  const messageList = el.querySelector('#portal-message-list');

  if (msgInput && sendBtn) {
    const sendMessage = () => {
      const text = msgInput.value.trim();
      if (!text) return;

      const msgs = getMessages(project.id);
      msgs.push({
        id: generateId(),
        from: 'client',
        name: project.client,
        text: text,
        timestamp: new Date().toISOString(),
        read: true
      });
      saveMessages(project.id, msgs);
      msgInput.value = '';

      // Re-render messages
      el.innerHTML = render();
      mount(el);

      // Scroll to bottom
      const newList = el.querySelector('#portal-message-list');
      if (newList) newList.scrollTop = newList.scrollHeight;

      // Simulate designer typing + response
      setTimeout(() => {
        const typing = el.querySelector('#portal-typing');
        if (typing) typing.classList.remove('hidden');
        const list = el.querySelector('#portal-message-list');
        if (list) list.scrollTop = list.scrollHeight;
      }, 800);

      setTimeout(() => {
        const currentMsgs = getMessages(project.id);
        const responses = [
          "Thanks for letting me know! I'll update the team.",
          "Great question — I'll check with the contractor and get back to you today.",
          "Noted! I'll add this to our next site meeting agenda.",
          "Perfect, that's really helpful. I'll send you an update by end of day.",
          "Absolutely, leave it with me. I'll have an answer for you shortly.",
        ];
        currentMsgs.push({
          id: generateId(),
          from: 'designer',
          name: 'DesignDesk Studio',
          text: responses[Math.floor(Math.random() * responses.length)],
          timestamp: new Date().toISOString(),
          read: true
        });
        saveMessages(project.id, currentMsgs);
        el.innerHTML = render();
        mount(el);
        const finalList = el.querySelector('#portal-message-list');
        if (finalList) finalList.scrollTop = finalList.scrollHeight;
      }, 2500 + Math.random() * 1500);
    };

    sendBtn.addEventListener('click', sendMessage);
    msgInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });
  }

  // Scroll message list to bottom
  if (messageList) messageList.scrollTop = messageList.scrollHeight;

  // ── Documents
  el.querySelectorAll('.download-doc-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showToast('Document downloaded', 'success');
    });
  });

  el.querySelector('#portal-upload-doc')?.addEventListener('click', () => {
    showToast('File upload coming soon — contact your designer to share documents.', 'info');
  });
}

export function destroy() {
  activeTab = 'overview';
  roomFilter = 'all';
  selectedInvoice = null;
  changeRequestItemId = null;
  changeRequestText = '';
}
