// AI Assistant — comprehensive pattern-matched responses from real project data

import { getState, getActiveProject } from '../store.js';
import { formatCurrency, formatDate, formatDateShort, daysBetween, relativeTime, isOverdue, getWeekRange, sanitizeHtml } from '../core/utils.js';
import { icons } from '../core/icons.js';
import { showToast } from '../components/toast.js';

let messages = [];
let contextMemory = []; // last 5 queries for context

function getGreeting() {
  const hour = new Date().getHours();
  const project = getActiveProject();
  const name = project ? project.client.split(' ')[0] : '';
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return `${greeting}${name ? ', ' + name : ''}! I'm your DesignDesk AI assistant. I can help with budgets, orders, invoices, schedules, suppliers, and more. What would you like to know?`;
}

function initMessages() {
  messages = [
    { role: 'assistant', text: getGreeting(), cards: null, suggestions: getDefaultSuggestions(), timestamp: new Date().toISOString() }
  ];
}

function getDefaultSuggestions() {
  return [
    "What's the budget status?",
    "Show pending orders",
    "Any overdue invoices?",
    "What's the schedule looking like?",
    "Most expensive room?",
    "Find a fabric supplier",
  ];
}

export function render() {
  if (messages.length === 0) initMessages();

  return `
    <div class="view-ai">
      <div class="view-header">
        <div>
          <h1>AI Assistant</h1>
          <span class="ai-powered-badge">Powered by DesignDesk AI</span>
        </div>
        <button class="btn btn-outline btn-sm" id="ai-clear-chat" title="Clear chat history">
          ${icons.trash} Clear Chat
        </button>
      </div>

      <div class="ai-chat-container" id="ai-chat-container">
        ${messages.map((m, idx) => `
          <div class="ai-msg ai-msg-${m.role}">
            <div class="ai-msg-avatar-wrap">
              <div class="ai-msg-avatar ${m.role === 'assistant' ? 'ai-avatar-bot' : 'ai-avatar-user'}">
                ${m.role === 'assistant' ? `<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 2l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z" fill="currentColor"/></svg>` : `<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3" stroke="currentColor" stroke-width="1.8"/><path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`}
              </div>
            </div>
            <div class="ai-msg-content">
              <div class="ai-msg-bubble">
                <div class="ai-msg-text">${formatResponseText(m.text)}</div>
                ${m.cards ? `<div class="ai-msg-cards">${m.cards}</div>` : ''}
                <div class="ai-msg-meta">
                  <span class="ai-msg-time">${m.timestamp ? relativeTime(m.timestamp) : ''}</span>
                  ${m.role === 'assistant' ? `<button class="ai-copy-btn" data-idx="${idx}" title="Copy response">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="9" height="9" rx="1" stroke="currentColor" stroke-width="1.5"/><path d="M3 11V3h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                  </button>` : ''}
                </div>
              </div>
              ${m.suggestions && m.suggestions.length > 0 ? `
                <div class="ai-suggestions">
                  ${m.suggestions.map(s => `<button class="ai-suggestion-chip">${s}</button>`).join('')}
                </div>
              ` : ''}
            </div>
          </div>
        `).join('')}
        <div class="ai-typing hidden" id="ai-typing">
          <div class="ai-msg-avatar-wrap">
            <div class="ai-msg-avatar ai-avatar-bot">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 2l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z" fill="currentColor"/></svg>
            </div>
          </div>
          <div class="ai-msg-content">
            <div class="ai-msg-bubble ai-typing-bubble">
              <span class="ai-dot"></span><span class="ai-dot"></span><span class="ai-dot"></span>
            </div>
          </div>
        </div>
      </div>

      <div class="ai-input-bar">
        <input type="text" id="ai-input" placeholder="Ask me anything about your project..." autocomplete="off" />
        <button class="btn btn-primary btn-sm" id="ai-send">${icons.send}</button>
      </div>
    </div>
  `;
}

function formatResponseText(text) {
  // Sanitize first to prevent XSS, then convert **bold** to <strong> and newlines to <br>
  const safe = sanitizeHtml(text);
  return safe
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

export function mount(el) {
  const input = el.querySelector('#ai-input');
  const sendBtn = el.querySelector('#ai-send');
  const container = el.querySelector('#ai-chat-container');

  const sendMessage = () => {
    const text = input.value.trim();
    if (!text) return;

    messages.push({
      role: 'user',
      text,
      cards: null,
      suggestions: null,
      timestamp: new Date().toISOString()
    });
    input.value = '';

    // Re-render to show user message
    el.innerHTML = render();
    mount(el);

    // Show typing indicator
    const typing = el.querySelector('#ai-typing');
    if (typing) typing.classList.remove('hidden');
    const chatContainer = el.querySelector('#ai-chat-container');
    if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;

    const delay = 600 + Math.random() * 800;
    setTimeout(() => {
      const response = generateResponse(text);
      contextMemory.push(text);
      if (contextMemory.length > 5) contextMemory.shift();

      messages.push({
        role: 'assistant',
        text: response.text,
        cards: response.cards,
        suggestions: response.suggestions,
        timestamp: new Date().toISOString()
      });

      el.innerHTML = render();
      mount(el);
      const newContainer = el.querySelector('#ai-chat-container');
      if (newContainer) newContainer.scrollTop = newContainer.scrollHeight;
    }, delay);
  };

  sendBtn?.addEventListener('click', sendMessage);
  input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });

  // Suggestion chips
  el.querySelectorAll('.ai-suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      input.value = chip.textContent;
      sendMessage();
    });
  });

  // Copy buttons
  el.querySelectorAll('.ai-copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      const msg = messages[idx];
      if (msg) {
        const plainText = msg.text.replace(/\*\*/g, '');
        navigator.clipboard.writeText(plainText).then(() => {
          showToast('Response copied to clipboard', 'success');
        }).catch(() => {
          showToast('Failed to copy', 'error');
        });
      }
    });
  });

  // Clear chat
  el.querySelector('#ai-clear-chat')?.addEventListener('click', () => {
    if (confirm('Clear the entire chat history?')) {
      contextMemory = [];
      initMessages();
      el.innerHTML = render();
      mount(el);
    }
  });

  // Scroll to bottom
  if (container) container.scrollTop = container.scrollHeight;

  // Focus input
  input?.focus();
}

export function destroy() {
  messages = [];
  contextMemory = [];
}

// ── Response Generation Engine ──────────────────────────────────────────

function generateResponse(query) {
  const state = getState();
  const project = getActiveProject();
  if (!state || !project) return { text: "I don't have any project data loaded. Please select a project first.", cards: null, suggestions: getDefaultSuggestions() };

  const q = query.toLowerCase();
  const items = state.items.filter(i => i.projectId === project.id);
  const tasks = state.tasks.filter(t => t.projectId === project.id);
  const invoices = state.invoices.filter(i => i.projectId === project.id);
  const suppliers = state.suppliers || [];

  // ── Context: check if previous query provides scope (room, supplier, etc.)
  const lastContext = contextMemory.length > 0 ? contextMemory[contextMemory.length - 1].toLowerCase() : '';
  const contextRoom = extractRoom(lastContext, items);

  // ── Budget / Financial queries ─────────────────────────────────────────
  if (matchAny(q, ['budget', 'cost', 'spend', 'total', 'money', 'financial', 'how much'])) {
    const totalTrade = items.reduce((s, i) => s + i.trade, 0);
    const totalClient = items.reduce((s, i) => s + clientPrice(i), 0);
    const margin = totalClient - totalTrade;
    const remaining = project.budget - totalClient;
    const pctUsed = project.budget > 0 ? Math.round((totalClient / project.budget) * 100) : 0;

    return {
      text: `Here's the budget breakdown for **${project.name}**:`,
      cards: `
        <div class="ai-data-card">
          <div class="ai-data-row"><span>Total Trade Cost</span><strong>${formatCurrency(totalTrade)}</strong></div>
          <div class="ai-data-row"><span>Total Client Value</span><strong>${formatCurrency(totalClient)}</strong></div>
          <div class="ai-data-row ai-row-highlight"><span>Gross Margin</span><strong>${formatCurrency(margin)} (${Math.round(margin / (totalClient || 1) * 100)}%)</strong></div>
          <div class="ai-data-row"><span>Project Budget</span><strong>${formatCurrency(project.budget)}</strong></div>
          <div class="ai-data-row ${remaining < 0 ? 'ai-row-danger' : ''}"><span>Remaining</span><strong>${formatCurrency(remaining)}</strong></div>
          <div class="ai-progress-bar-wrap">
            <div class="ai-progress-bar"><div class="ai-progress-fill ${pctUsed > 100 ? 'over-budget' : ''}" style="width:${Math.min(pctUsed, 100)}%"></div></div>
            <span class="ai-progress-label">${pctUsed}% of budget used</span>
          </div>
        </div>`,
      suggestions: ['Show margin by room', 'Most expensive items', 'Category breakdown', 'At-risk items']
    };
  }

  // ── Margin / Profit queries ────────────────────────────────────────────
  if (matchAny(q, ['margin', 'profit', 'markup'])) {
    const byRoom = {};
    items.forEach(i => {
      if (!byRoom[i.room]) byRoom[i.room] = { trade: 0, client: 0 };
      byRoom[i.room].trade += i.trade;
      byRoom[i.room].client += clientPrice(i);
    });

    const rows = Object.entries(byRoom).map(([room, v]) => {
      const m = v.client - v.trade;
      const pct = v.client > 0 ? Math.round((m / v.client) * 100) : 0;
      return `<div class="ai-data-row"><span>${room}</span><strong>${formatCurrency(m)} (${pct}%)</strong></div>`;
    }).join('');

    const totalMargin = items.reduce((s, i) => s + clientPrice(i) - i.trade, 0);

    return {
      text: `Here's the margin analysis by room for **${project.name}**:`,
      cards: `<div class="ai-data-card">${rows}<div class="ai-data-row ai-row-highlight"><span>Total Margin</span><strong>${formatCurrency(totalMargin)}</strong></div></div>`,
      suggestions: ['Budget overview', 'Most expensive room', 'Items with highest markup']
    };
  }

  // ── Expensive / Cheapest ───────────────────────────────────────────────
  if (matchAny(q, ['expensive', 'cheapest', 'priciest', 'most costly'])) {
    const sorted = [...items].sort((a, b) => clientPrice(b) - clientPrice(a));
    const isExpensive = matchAny(q, ['expensive', 'priciest', 'most costly']);
    const list = isExpensive ? sorted.slice(0, 5) : sorted.reverse().slice(0, 5);
    const label = isExpensive ? 'most expensive' : 'least expensive';

    return {
      text: `The ${label} items in **${project.name}**:`,
      cards: `<div class="ai-mini-table">
        <div class="ai-table-header"><span>Item</span><span>Room</span><span class="text-right">Client Price</span></div>
        ${list.map((i, idx) => `<div class="ai-table-row"><span>${idx + 1}. ${i.name}</span><span>${i.room}</span><span class="text-right">${formatCurrency(clientPrice(i))}</span></div>`).join('')}
      </div>`,
      suggestions: ['Budget overview', 'Most expensive room', 'Category breakdown']
    };
  }

  // ── Pending / Waiting / Outstanding ────────────────────────────────────
  if (matchAny(q, ['pending', 'waiting', 'not delivered', 'outstanding'])) {
    const pending = items.filter(i => !['delivered', 'installed'].includes(i.status));
    if (pending.length === 0) return { text: "All items have been delivered or installed. Nothing is pending.", cards: null, suggestions: ['Schedule status', 'Overdue invoices', 'Budget overview'] };
    return {
      text: `There are **${pending.length} items** not yet delivered:`,
      cards: `<div class="ai-mini-table">
        <div class="ai-table-header"><span>Item</span><span>Supplier</span><span>Status</span></div>
        ${pending.map(i => `<div class="ai-table-row"><span>${i.name}</span><span>${i.supplier}</span><span><span class="status-badge status-${i.status}">${i.status}</span></span></div>`).join('')}
      </div>`,
      suggestions: ['Items in spec phase', 'Items shipped', "What's ordered?"]
    };
  }

  // ── Ordered / Shipped ──────────────────────────────────────────────────
  if (matchAny(q, ['ordered', 'shipped', 'in transit'])) {
    const status = matchAny(q, ['shipped', 'in transit']) ? 'shipped' : 'ordered';
    const matched = items.filter(i => i.status === status);
    if (matched.length === 0) return { text: `No items currently have "${status}" status.`, cards: null, suggestions: ['Pending orders', 'Delivered items', 'Budget'] };
    return {
      text: `**${matched.length} items** are currently ${status}:`,
      cards: matched.map(i => `<div class="ai-item-chip"><span class="status-badge status-${i.status}">${i.status}</span> <strong>${i.name}</strong> — ${i.supplier} — ${i.room}</div>`).join(''),
      suggestions: ['Pending orders', 'Delivered items', 'Schedule status']
    };
  }

  // ── Delivered / Installed ──────────────────────────────────────────────
  if (matchAny(q, ['delivered', 'installed', 'completed items', 'arrived'])) {
    const done = items.filter(i => ['delivered', 'installed'].includes(i.status));
    if (done.length === 0) return { text: "No items have been delivered yet.", cards: null, suggestions: ['Pending orders', 'Schedule'] };
    return {
      text: `**${done.length} items** have been delivered or installed:`,
      cards: done.map(i => `<div class="ai-item-chip"><span class="status-badge status-${i.status}">${i.status}</span> <strong>${i.name}</strong> — ${i.room}</div>`).join(''),
      suggestions: ['Pending orders', 'Budget status', 'Schedule']
    };
  }

  // ── Spec phase items ───────────────────────────────────────────────────
  if (matchAny(q, ['spec', 'specification', 'speccing'])) {
    const specItems = items.filter(i => i.status === 'spec');
    if (specItems.length === 0) return { text: "No items are in the specification phase.", cards: null, suggestions: ['Pending orders', 'Budget'] };
    return {
      text: `**${specItems.length} items** still need specifications:`,
      cards: specItems.map(i => `<div class="ai-item-chip"><span class="status-badge status-spec">spec</span> <strong>${i.name}</strong> — ${i.supplier} — ${i.room} — ${formatCurrency(clientPrice(i))}</div>`).join(''),
      suggestions: ['At-risk items', 'Pending orders', 'Lead times']
    };
  }

  // ── Room query ─────────────────────────────────────────────────────────
  const roomMatch = extractRoom(q, items);
  if (roomMatch || (matchAny(q, ["what's in the", "items in", "items for", "show me the"]) && !roomMatch)) {
    const room = roomMatch;
    if (!room) {
      const rooms = [...new Set(items.map(i => i.room))];
      return { text: `Which room? Available rooms: ${rooms.join(', ')}`, cards: null, suggestions: rooms.map(r => `Items in ${r}`) };
    }
    const roomItems = items.filter(i => i.room.toLowerCase() === room.toLowerCase());
    if (roomItems.length === 0) return { text: `No items found for "${room}".`, cards: null, suggestions: ['Show all rooms', 'Budget status'] };
    const total = roomItems.reduce((s, i) => s + clientPrice(i), 0);
    return {
      text: `**${roomItems.length} items** in the **${roomItems[0].room}** (${formatCurrency(total)} total):`,
      cards: `<div class="ai-mini-table">
        <div class="ai-table-header"><span>Item</span><span>Supplier</span><span>Status</span><span class="text-right">Price</span></div>
        ${roomItems.map(i => `<div class="ai-table-row"><span>${i.name}</span><span>${i.supplier}</span><span><span class="status-badge status-${i.status}">${i.status}</span></span><span class="text-right">${formatCurrency(clientPrice(i))}</span></div>`).join('')}
      </div>`,
      suggestions: ['Most expensive room', 'Budget for this room', 'All rooms breakdown']
    };
  }

  // ── Items from supplier ────────────────────────────────────────────────
  const supplierMatch = q.match(/(?:items?\s+from|from)\s+([a-z&'\s]+)/i);
  if (supplierMatch) {
    const supplierName = supplierMatch[1].trim();
    const matched = items.filter(i => i.supplier.toLowerCase().includes(supplierName));
    if (matched.length === 0) return { text: `No items found from "${supplierName}".`, cards: null, suggestions: ['Show all suppliers', 'Pending orders'] };
    return {
      text: `**${matched.length} items** from **${matched[0].supplier}**:`,
      cards: matched.map(i => `<div class="ai-item-chip"><span class="status-badge status-${i.status}">${i.status}</span> <strong>${i.name}</strong> — ${i.room} — ${formatCurrency(clientPrice(i))}</div>`).join(''),
      suggestions: ['Pending orders', 'All suppliers', 'Budget']
    };
  }

  // ── Overdue invoices ───────────────────────────────────────────────────
  if (matchAny(q, ['overdue', 'unpaid', 'late invoice', 'past due'])) {
    const overdue = invoices.filter(i => i.status === 'overdue');
    if (overdue.length === 0) return { text: "Great news — no overdue invoices!", cards: null, suggestions: ['Draft invoices', 'Paid invoices', 'Budget'] };
    return {
      text: `**${overdue.length} overdue invoice${overdue.length > 1 ? 's' : ''}** requiring attention:`,
      cards: overdue.map(inv => {
        const total = calcInvoiceTotal(inv, items);
        const daysLate = daysBetween(inv.dueDate, new Date().toISOString());
        return `<div class="ai-item-chip ai-chip-danger"><strong>${inv.number}</strong> — ${formatCurrency(total)} — <span class="text-error">${daysLate} days overdue</span> (due ${formatDate(inv.dueDate)})</div>`;
      }).join(''),
      suggestions: ['Send reminder', 'All invoices', 'Paid invoices']
    };
  }

  // ── Paid invoices ──────────────────────────────────────────────────────
  if (matchAny(q, ['paid', 'collected', 'received payment'])) {
    const paid = invoices.filter(i => i.status === 'paid');
    const totalPaid = paid.reduce((s, inv) => s + calcInvoiceTotal(inv, items), 0);
    return {
      text: `**${paid.length} invoices** have been paid, totalling **${formatCurrency(totalPaid)}**:`,
      cards: paid.map(inv => `<div class="ai-item-chip"><strong>${inv.number}</strong> — ${formatCurrency(calcInvoiceTotal(inv, items))} — paid ${formatDate(inv.paidDate)}</div>`).join(''),
      suggestions: ['Overdue invoices', 'Draft invoices', 'Budget']
    };
  }

  // ── Draft invoices ─────────────────────────────────────────────────────
  if (matchAny(q, ['draft', 'unsent'])) {
    const drafts = invoices.filter(i => i.status === 'draft');
    if (drafts.length === 0) return { text: "No draft invoices — all have been sent.", cards: null, suggestions: ['Overdue invoices', 'Paid invoices'] };
    return {
      text: `**${drafts.length} draft invoice${drafts.length > 1 ? 's' : ''}** awaiting review:`,
      cards: drafts.map(inv => `<div class="ai-item-chip"><strong>${inv.number}</strong> — ${formatCurrency(calcInvoiceTotal(inv, items))} — created ${formatDate(inv.date)}</div>`).join(''),
      suggestions: ['View in Invoicing', 'Overdue invoices', 'Budget']
    };
  }

  // ── Specific invoice ───────────────────────────────────────────────────
  const invoiceMatch = q.match(/invoice\s+(dd-?\d{4}-?\d{3}|\d+)/i);
  if (invoiceMatch) {
    const num = invoiceMatch[1].toUpperCase().replace(/(\d{4})(\d{3})/, '$1-$2');
    const inv = invoices.find(i => i.number.toUpperCase().includes(num) || i.number.includes(invoiceMatch[1]));
    if (!inv) return { text: `Couldn't find invoice "${invoiceMatch[1]}".`, cards: null, suggestions: ['Show all invoices', 'Overdue invoices'] };
    const invItems = inv.items.map(id => items.find(i => i.id === id)).filter(Boolean);
    const total = calcInvoiceTotal(inv, items);
    return {
      text: `Details for **${inv.number}**:`,
      cards: `<div class="ai-data-card">
        <div class="ai-data-row"><span>Status</span><span class="status-badge status-${inv.status}">${inv.status}</span></div>
        <div class="ai-data-row"><span>Date</span><strong>${formatDate(inv.date)}</strong></div>
        ${inv.dueDate ? `<div class="ai-data-row"><span>Due</span><strong>${formatDate(inv.dueDate)}</strong></div>` : ''}
        <div class="ai-data-row ai-row-highlight"><span>Total (inc. VAT)</span><strong>${formatCurrency(total)}</strong></div>
        <div class="ai-data-row"><span>Items</span><strong>${invItems.map(i => i.name).join(', ')}</strong></div>
        ${inv.notes ? `<div class="ai-data-row"><span>Notes</span><strong>${inv.notes}</strong></div>` : ''}
      </div>`,
      suggestions: ['Overdue invoices', 'All invoices', 'Budget']
    };
  }

  // ── Schedule / Timeline ────────────────────────────────────────────────
  if (matchAny(q, ['schedule', 'timeline', 'when', 'milestones'])) {
    const active = tasks.filter(t => t.progress > 0 && t.progress < 100);
    const upcoming = tasks.filter(t => t.progress === 0).slice(0, 4);
    const completed = tasks.filter(t => t.progress === 100);
    return {
      text: `Schedule overview for **${project.name}**:`,
      cards: `<div class="ai-data-card">
        <h4 style="margin:0 0 6px;color:#10b981">Completed (${completed.length})</h4>
        ${completed.map(t => `<div class="ai-data-row"><span>${t.name}</span><span class="text-muted">${t.contractor}</span></div>`).join('')}
        ${completed.length === 0 ? '<div class="ai-data-row text-muted">None yet</div>' : ''}
        <h4 style="margin:12px 0 6px;color:#6366f1">In Progress (${active.length})</h4>
        ${active.map(t => `<div class="ai-data-row"><span>${t.name} — ${t.progress}%</span><strong>${t.contractor}</strong></div>`).join('')}
        ${active.length === 0 ? '<div class="ai-data-row text-muted">Nothing in progress</div>' : ''}
        <h4 style="margin:12px 0 6px;color:#94a3b8">Coming Up (${upcoming.length})</h4>
        ${upcoming.map(t => `<div class="ai-data-row"><span>${t.name}</span><span class="text-muted">Starts ${formatDateShort(t.start)}</span></div>`).join('')}
      </div>`,
      suggestions: ['Behind schedule?', 'This week', 'Who\'s working on site?', 'Progress overall']
    };
  }

  // ── Behind / Delayed ───────────────────────────────────────────────────
  if (matchAny(q, ['behind', 'delay', 'delayed', 'late task', 'overdue task'])) {
    const today = new Date().toISOString().split('T')[0];
    const behind = tasks.filter(t => t.progress < 100 && t.end < today);
    if (behind.length === 0) return { text: "Good news — no tasks are currently behind schedule!", cards: null, suggestions: ['Schedule overview', 'This week', 'Progress'] };
    return {
      text: `**${behind.length} task${behind.length > 1 ? 's' : ''}** may be behind schedule:`,
      cards: behind.map(t => {
        const daysLate = daysBetween(t.end, today);
        return `<div class="ai-item-chip ai-chip-warning"><strong>${t.name}</strong> — ${t.progress}% complete — <span class="text-error">${daysLate} days past end date</span> — ${t.contractor}</div>`;
      }).join(''),
      suggestions: ['Schedule overview', 'Overall progress', 'Contact contractor']
    };
  }

  // ── This week / Upcoming ───────────────────────────────────────────────
  if (matchAny(q, ['this week', 'upcoming', 'next', 'what\'s happening'])) {
    const week = getWeekRange(matchAny(q, ['next']) ? 1 : 0);
    const thisWeek = tasks.filter(t => {
      return (t.start <= week.end && t.end >= week.start);
    });
    if (thisWeek.length === 0) return { text: `Nothing scheduled for ${week.label}.`, cards: null, suggestions: ['Full schedule', 'Progress', 'Pending orders'] };
    return {
      text: `Tasks for **${week.label}**:`,
      cards: thisWeek.map(t => `<div class="ai-item-chip"><span class="status-badge status-${t.progress === 100 ? 'delivered' : t.progress > 0 ? 'ordered' : 'spec'}">${t.progress}%</span> <strong>${t.name}</strong> — ${t.contractor} — ${formatDateShort(t.start)} to ${formatDateShort(t.end)}</div>`).join(''),
      suggestions: ['Overall progress', 'Behind schedule?', 'Budget status']
    };
  }

  // ── Progress / How far ─────────────────────────────────────────────────
  if (matchAny(q, ['progress', 'how far', 'completion', 'percent', 'how much done'])) {
    const avgProgress = tasks.length ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length) : 0;
    const completed = tasks.filter(t => t.progress === 100).length;
    const active = tasks.filter(t => t.progress > 0 && t.progress < 100).length;
    const notStarted = tasks.filter(t => t.progress === 0).length;

    // Build simple bar chart SVG
    const barData = tasks.map(t => ({ name: t.name.length > 20 ? t.name.substring(0, 20) + '...' : t.name, value: t.progress }));
    const barH = 22;
    const svgH = barData.length * (barH + 8) + 10;
    const bars = barData.map((d, i) => {
      const y = i * (barH + 8) + 5;
      const color = d.value === 100 ? '#10b981' : d.value > 0 ? '#6366f1' : '#e2e8f0';
      return `<rect x="0" y="${y}" width="${d.value * 2}" height="${barH}" rx="4" fill="${color}"/>
        <text x="${Math.max(d.value * 2 + 6, 6)}" y="${y + 15}" fill="#1e293b" font-size="12" font-family="Inter,sans-serif">${d.name} (${d.value}%)</text>`;
    }).join('');

    return {
      text: `Overall project progress: **${avgProgress}%**\n${completed} completed, ${active} in progress, ${notStarted} not started.`,
      cards: `<div class="ai-chart-wrap"><svg width="100%" height="${svgH}" viewBox="0 0 400 ${svgH}">${bars}</svg></div>`,
      suggestions: ['Behind schedule?', 'This week', 'Budget status']
    };
  }

  // ── Who's working / Contractors ────────────────────────────────────────
  if (matchAny(q, ["who's working", 'contractor', 'on site', 'who is on'])) {
    const active = tasks.filter(t => t.progress > 0 && t.progress < 100);
    if (active.length === 0) return { text: "No active tasks right now — no contractors currently on site.", cards: null, suggestions: ['Schedule overview', 'Upcoming tasks'] };
    const contractors = [...new Set(active.map(t => t.contractor))];
    return {
      text: `Currently on site for **${project.name}**:`,
      cards: active.map(t => `<div class="ai-item-chip"><strong>${t.contractor}</strong> — ${t.name} (${t.progress}%) — until ${formatDateShort(t.end)}</div>`).join(''),
      suggestions: ['Schedule overview', 'This week', 'Progress']
    };
  }

  // ── Supplier queries ───────────────────────────────────────────────────
  if (matchAny(q, ['supplier', 'find', 'who sells', 'where to get'])) {
    const categories = ['fabric', 'furniture', 'lighting', 'paint', 'tiles', 'hardware'];
    const matchCat = categories.find(c => q.includes(c));
    let results = matchCat ? suppliers.filter(s => s.category.toLowerCase() === matchCat) : suppliers;

    return {
      text: matchCat ? `Your **${matchCat}** suppliers:` : `All **${results.length} suppliers** on file:`,
      cards: `<div class="ai-mini-table">
        <div class="ai-table-header"><span>Supplier</span><span>Category</span><span>Rating</span><span>Lead Time</span></div>
        ${results.slice(0, 8).map(s => `<div class="ai-table-row">
          <span><strong>${s.name}</strong>${s.tradeAccount ? ' <span class="ai-trade-badge">Trade</span>' : ''}</span>
          <span>${s.category}</span>
          <span>${'&#9733;'.repeat(s.rating)}${'&#9734;'.repeat(5 - s.rating)}</span>
          <span>${s.leadTime}</span>
        </div>`).join('')}
      </div>`,
      suggestions: matchCat ? ['Show all suppliers', 'Trade account suppliers', 'Lead times'] : categories.map(c => `${c.charAt(0).toUpperCase() + c.slice(1)} suppliers`)
    };
  }

  // ── Trade account / Discount ───────────────────────────────────────────
  if (matchAny(q, ['trade account', 'discount'])) {
    const tradeSuppliers = suppliers.filter(s => s.tradeAccount);
    return {
      text: `**${tradeSuppliers.length} suppliers** with trade accounts:`,
      cards: tradeSuppliers.map(s => `<div class="ai-item-chip"><strong>${s.name}</strong> — ${s.category} — ${s.discount}% trade discount</div>`).join(''),
      suggestions: ['All suppliers', 'Best rated suppliers', 'Lead times']
    };
  }

  // ── Lead times ─────────────────────────────────────────────────────────
  if (matchAny(q, ['lead time', 'how long', 'delivery time'])) {
    const sorted = [...suppliers].sort((a, b) => {
      const aWeeks = parseInt(a.leadTime) || 0;
      const bWeeks = parseInt(b.leadTime) || 0;
      return aWeeks - bWeeks;
    });
    return {
      text: `Supplier lead times (shortest first):`,
      cards: `<div class="ai-mini-table">
        <div class="ai-table-header"><span>Supplier</span><span>Category</span><span>Lead Time</span></div>
        ${sorted.map(s => `<div class="ai-table-row"><span>${s.name}</span><span>${s.category}</span><span>${s.leadTime}</span></div>`).join('')}
      </div>`,
      suggestions: ['At-risk items', 'Pending orders', 'Suppliers with trade accounts']
    };
  }

  // ── Most expensive room ────────────────────────────────────────────────
  if (matchAny(q, ['most expensive room', 'room breakdown', 'cost by room', 'room cost'])) {
    const byRoom = {};
    items.forEach(i => { byRoom[i.room] = (byRoom[i.room] || 0) + clientPrice(i); });
    const sorted = Object.entries(byRoom).sort((a, b) => b[1] - a[1]);
    const max = sorted.length > 0 ? sorted[0][1] : 1;

    const barRows = sorted.map(([room, total]) => {
      const pct = Math.round((total / max) * 100);
      return `<div class="ai-bar-row"><span class="ai-bar-label">${room}</span><div class="ai-bar-track"><div class="ai-bar-fill" style="width:${pct}%"></div></div><span class="ai-bar-value">${formatCurrency(total)}</span></div>`;
    }).join('');

    return {
      text: `Room-by-room spending breakdown:`,
      cards: `<div class="ai-bar-chart">${barRows}</div>`,
      suggestions: ['Budget overview', 'Margin by room', 'Category breakdown']
    };
  }

  // ── Category breakdown ─────────────────────────────────────────────────
  if (matchAny(q, ['category', 'by category', 'category breakdown', 'spending by'])) {
    const byCat = {};
    items.forEach(i => { byCat[i.category] = (byCat[i.category] || 0) + clientPrice(i); });
    const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    const max = sorted.length > 0 ? sorted[0][1] : 1;

    const barRows = sorted.map(([cat, total]) => {
      const pct = Math.round((total / max) * 100);
      return `<div class="ai-bar-row"><span class="ai-bar-label">${cat}</span><div class="ai-bar-track"><div class="ai-bar-fill" style="width:${pct}%"></div></div><span class="ai-bar-value">${formatCurrency(total)}</span></div>`;
    }).join('');

    return {
      text: `Spending by category:`,
      cards: `<div class="ai-bar-chart">${barRows}</div>`,
      suggestions: ['Budget overview', 'Room breakdown', 'Most expensive items']
    };
  }

  // ── At-risk items ──────────────────────────────────────────────────────
  if (matchAny(q, ['risk', 'at risk', 'risky'])) {
    const atRisk = items.filter(i => {
      if (['delivered', 'installed'].includes(i.status)) return false;
      const sup = suppliers.find(s => s.name === i.supplier);
      const leadWeeks = sup ? parseInt(sup.leadTime) || 0 : 0;
      return leadWeeks >= 8 && ['spec', 'quoted'].includes(i.status);
    });
    if (atRisk.length === 0) return { text: "No items flagged as at-risk. All long-lead items are progressing well.", cards: null, suggestions: ['Pending orders', 'Lead times', 'Schedule'] };
    return {
      text: `**${atRisk.length} item${atRisk.length > 1 ? 's' : ''}** at risk (long lead time + not yet ordered):`,
      cards: atRisk.map(i => {
        const sup = suppliers.find(s => s.name === i.supplier);
        return `<div class="ai-item-chip ai-chip-warning"><strong>${i.name}</strong> — ${i.supplier} — Lead: ${sup ? sup.leadTime : 'unknown'} — Status: ${i.status}</div>`;
      }).join(''),
      suggestions: ['Order these items', 'Lead times', 'Schedule status']
    };
  }

  // ── Compare ────────────────────────────────────────────────────────────
  if (matchAny(q, ['compare', 'vs', 'versus', 'difference between'])) {
    return {
      text: "I can compare items, suppliers, or rooms. Try asking:\n- \"Compare Kitchen vs Drawing Room\"\n- \"Compare Sofa Workshop vs Benchmark\"\n\nOr tell me exactly what you'd like to compare!",
      cards: null,
      suggestions: ['Room breakdown', 'Supplier comparison', 'Budget by category']
    };
  }

  // ── Action queries ─────────────────────────────────────────────────────
  if (matchAny(q, ['add item', 'create', 'new item'])) {
    return {
      text: "I can guide you! To add a new item, use the **+ button in Procurement** view. You can also navigate there from the sidebar.\n\nWould you like me to help with anything else?",
      cards: `<div class="ai-link-card"><a href="#/procurement" class="ai-view-link">Open Procurement &rarr;</a></div>`,
      suggestions: ['Show pending items', 'Budget status', 'Suppliers']
    };
  }

  if (matchAny(q, ['change status', 'update status', 'update item'])) {
    return {
      text: "To update an item's status, go to **Procurement** and click on the item to edit it. You can change status, add notes, and more.",
      cards: `<div class="ai-link-card"><a href="#/procurement" class="ai-view-link">Open Procurement &rarr;</a></div>`,
      suggestions: ['Pending orders', 'Delivered items', 'Schedule']
    };
  }

  if (matchAny(q, ['export', 'download', 'report'])) {
    return {
      text: "You can export data from **Settings**:\n- Full project data as JSON\n- Procurement items as CSV\n- Suppliers as CSV\n- Invoices as CSV\n- Schedule as CSV",
      cards: `<div class="ai-link-card"><a href="#/settings" class="ai-view-link">Open Settings &rarr;</a></div>`,
      suggestions: ['Budget overview', 'Project summary']
    };
  }

  // ── Summary / Overview ─────────────────────────────────────────────────
  if (matchAny(q, ['summary', 'overview', 'status', 'how are things', 'project summary'])) {
    const avgProgress = tasks.length ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length) : 0;
    const delivered = items.filter(i => ['delivered', 'installed'].includes(i.status)).length;
    const totalClient = items.reduce((s, i) => s + clientPrice(i), 0);
    const overdue = invoices.filter(i => i.status === 'overdue').length;

    return {
      text: `Here's a quick summary of **${project.name}**:`,
      cards: `<div class="ai-data-card">
        <div class="ai-data-row"><span>Client</span><strong>${project.client}</strong></div>
        <div class="ai-data-row"><span>Status</span><strong>${project.status.charAt(0).toUpperCase() + project.status.slice(1)}</strong></div>
        <div class="ai-data-row"><span>Overall Progress</span><strong>${avgProgress}%</strong></div>
        <div class="ai-data-row"><span>Items</span><strong>${delivered} delivered / ${items.length} total</strong></div>
        <div class="ai-data-row"><span>Budget</span><strong>${formatCurrency(totalClient)} / ${formatCurrency(project.budget)}</strong></div>
        <div class="ai-data-row ${overdue > 0 ? 'ai-row-danger' : ''}"><span>Overdue Invoices</span><strong>${overdue}</strong></div>
        <div class="ai-data-row"><span>Timeline</span><strong>${formatDateShort(project.startDate)} — ${formatDateShort(project.endDate)}</strong></div>
      </div>`,
      suggestions: ['Budget details', 'Schedule status', 'Pending orders', 'Overdue invoices']
    };
  }

  // ── Greeting / Thanks ──────────────────────────────────────────────────
  if (matchAny(q, ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'])) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    return {
      text: `${greeting}! How can I help you with **${project.name}** today?`,
      cards: null,
      suggestions: getDefaultSuggestions()
    };
  }

  if (matchAny(q, ['thank', 'thanks', 'cheers', 'great', 'perfect', 'awesome'])) {
    return {
      text: "You're welcome! Let me know if you need anything else.",
      cards: null,
      suggestions: getDefaultSuggestions()
    };
  }

  // ── Default fallback ───────────────────────────────────────────────────
  return {
    text: "I'm not sure I understand that query. Here's what I can help with:\n\n**Budget:** budget, cost, margin, most expensive\n**Orders:** pending, shipped, delivered, spec phase\n**Invoices:** overdue, paid, draft, specific invoice number\n**Schedule:** timeline, this week, behind schedule, progress\n**Suppliers:** find supplier, trade accounts, lead times\n**Analysis:** room breakdown, category breakdown, at-risk items\n**Actions:** add item, export data, change status",
    cards: null,
    suggestions: getDefaultSuggestions()
  };
}

// ── Utility functions ───────────────────────────────────────────────────

function matchAny(text, terms) {
  return terms.some(t => text.includes(t));
}

function clientPrice(item) {
  return item.trade * (1 + item.markup / 100);
}

function calcInvoiceTotal(inv, items) {
  const invItems = inv.items.map(id => items.find(i => i.id === id)).filter(Boolean);
  const subtotal = invItems.reduce((s, i) => s + clientPrice(i), 0);
  return subtotal * (1 + inv.vatRate / 100);
}

function extractRoom(text, items) {
  const rooms = [...new Set(items.map(i => i.room))];
  const lower = text.toLowerCase();
  for (const room of rooms) {
    if (lower.includes(room.toLowerCase())) return room;
  }
  // Partial match
  for (const room of rooms) {
    const words = room.toLowerCase().split(' ');
    if (words.some(w => w.length > 3 && lower.includes(w))) return room;
  }
  return null;
}
