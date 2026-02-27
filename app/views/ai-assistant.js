// AI Assistant — pattern-matched responses from real data

import { getState, getActiveProject } from '../store.js';
import { formatCurrency, formatDate } from '../core/utils.js';
import { icons } from '../core/icons.js';

let messages = [
  { role: 'assistant', text: "Hi! I'm your DesignDesk AI assistant. I can help you with project data, budgets, schedules, suppliers, and more. What would you like to know?", cards: null }
];

const SUGGESTIONS = [
  "What's the budget status?",
  "Show pending orders",
  "Any overdue invoices?",
  "Find a fabric supplier",
  "What's coming up this week?",
  "Show project summary",
];

export function render() {
  return `
    <div class="view-ai">
      <div class="view-header">
        <h1>AI Assistant</h1>
        <span class="ai-badge">Powered by DesignDesk AI</span>
      </div>

      <div class="chat-container" id="chat-container">
        ${messages.map(m => `
          <div class="chat-msg chat-${m.role}">
            <div class="chat-avatar">${m.role === 'assistant' ? 'AI' : 'You'}</div>
            <div class="chat-bubble">
              <p>${m.text}</p>
              ${m.cards ? `<div class="chat-cards">${m.cards}</div>` : ''}
            </div>
          </div>
        `).join('')}
        <div class="typing-indicator hidden" id="typing">
          <div class="chat-avatar">AI</div>
          <div class="chat-bubble"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
        </div>
      </div>

      <div class="chat-suggestions" id="suggestions">
        ${SUGGESTIONS.map(s => `<button class="suggestion-chip">${s}</button>`).join('')}
      </div>

      <div class="chat-input-bar">
        <input type="text" id="chat-input" placeholder="Ask me anything about your project..." />
        <button class="btn btn-primary btn-sm" id="chat-send">${icons.send}</button>
      </div>
    </div>
  `;
}

export function mount(el) {
  const input = el.querySelector('#chat-input');
  const sendBtn = el.querySelector('#chat-send');
  const container = el.querySelector('#chat-container');

  const sendMessage = () => {
    const text = input.value.trim();
    if (!text) return;
    messages.push({ role: 'user', text, cards: null });
    input.value = '';
    el.innerHTML = render();
    mount(el);

    // Show typing
    const typing = el.querySelector('#typing');
    typing?.classList.remove('hidden');
    container?.scrollTo(0, container.scrollHeight);

    setTimeout(() => {
      const response = generateResponse(text);
      messages.push({ role: 'assistant', text: response.text, cards: response.cards });
      el.innerHTML = render();
      mount(el);
      el.querySelector('#chat-container')?.scrollTo(0, 99999);
    }, 600 + Math.random() * 800);
  };

  sendBtn?.addEventListener('click', sendMessage);
  input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });

  // Suggestions
  el.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      input.value = chip.textContent;
      sendMessage();
    });
  });

  // Scroll to bottom
  container?.scrollTo(0, container.scrollHeight);
}

export function destroy() {
  messages = [messages[0]]; // Keep welcome message
}

function generateResponse(query) {
  const state = getState();
  const project = getActiveProject();
  if (!state || !project) return { text: "I don't have any project data loaded.", cards: null };

  const q = query.toLowerCase();
  const items = state.items.filter(i => i.projectId === project.id);
  const tasks = state.tasks.filter(t => t.projectId === project.id);
  const invoices = state.invoices.filter(i => i.projectId === project.id);

  // Budget / money
  if (q.includes('budget') || q.includes('cost') || q.includes('spend') || q.includes('money') || q.includes('total')) {
    const totalTrade = items.reduce((s, i) => s + i.trade, 0);
    const totalClient = items.reduce((s, i) => s + i.trade * (1 + i.markup / 100), 0);
    const margin = totalClient - totalTrade;
    return {
      text: `Here's the budget breakdown for ${project.name}:`,
      cards: `<div class="ai-card">
        <div class="ai-card-row"><span>Total Trade Cost</span><strong>${formatCurrency(totalTrade)}</strong></div>
        <div class="ai-card-row"><span>Total Client Value</span><strong>${formatCurrency(totalClient)}</strong></div>
        <div class="ai-card-row text-success"><span>Gross Margin</span><strong>${formatCurrency(margin)} (${Math.round(margin / totalClient * 100)}%)</strong></div>
        <div class="ai-card-row"><span>Project Budget</span><strong>${formatCurrency(project.budget)}</strong></div>
        <div class="ai-card-row"><span>Remaining</span><strong>${formatCurrency(project.budget - totalClient)}</strong></div>
      </div>`
    };
  }

  // Pending / not delivered
  if (q.includes('pending') || q.includes('not delivered') || q.includes('waiting') || q.includes('outstanding orders')) {
    const pending = items.filter(i => !['delivered', 'installed'].includes(i.status));
    return {
      text: `There are ${pending.length} items not yet delivered:`,
      cards: pending.map(i => `<div class="ai-card-sm"><span class="status-badge status-${i.status}">${i.status}</span> ${i.name} — ${i.supplier}</div>`).join('')
    };
  }

  // Overdue
  if (q.includes('overdue') || q.includes('unpaid') || q.includes('late')) {
    const overdue = invoices.filter(i => i.status === 'overdue');
    if (overdue.length === 0) return { text: "Great news — there are no overdue invoices!", cards: null };
    return {
      text: `There ${overdue.length === 1 ? 'is' : 'are'} ${overdue.length} overdue invoice${overdue.length > 1 ? 's' : ''}:`,
      cards: overdue.map(inv => {
        const total = inv.items.reduce((s, id) => {
          const item = items.find(i => i.id === id);
          return s + (item ? item.trade * (1 + item.markup / 100) * 1.2 : 0);
        }, 0);
        return `<div class="ai-card-sm text-error"><strong>${inv.number}</strong> — ${formatCurrency(total)} — due ${formatDate(inv.dueDate)}</div>`;
      }).join('')
    };
  }

  // Supplier search
  if (q.includes('supplier') || q.includes('find') || q.includes('who sells') || q.includes('where to get')) {
    const categories = ['fabric', 'furniture', 'lighting', 'paint', 'tiles', 'hardware'];
    const matchCat = categories.find(c => q.includes(c));
    let results = state.suppliers;
    if (matchCat) results = results.filter(s => s.category.toLowerCase() === matchCat);
    return {
      text: matchCat ? `Here are your ${matchCat} suppliers:` : "Here are all your suppliers:",
      cards: results.slice(0, 6).map(s => `<div class="ai-card-sm">
        <strong>${s.name}</strong> — ${s.category} — ${'&#9733;'.repeat(s.rating)} — Lead: ${s.leadTime}
        ${s.tradeAccount ? ' — <span class="trade-badge">Trade</span>' : ''}
      </div>`).join('')
    };
  }

  // Schedule / upcoming
  if (q.includes('schedule') || q.includes('upcoming') || q.includes('this week') || q.includes('what\'s next') || q.includes('timeline')) {
    const active = tasks.filter(t => t.progress > 0 && t.progress < 100);
    const upcoming = tasks.filter(t => t.progress === 0).slice(0, 3);
    return {
      text: "Here's the current schedule status:",
      cards: `<div class="ai-card">
        <h4>In Progress</h4>
        ${active.map(t => `<div class="ai-card-row"><span>${t.name}</span><strong>${t.progress}%</strong></div>`).join('')}
        ${active.length === 0 ? '<p class="text-muted">Nothing in progress</p>' : ''}
        <h4 style="margin-top:8px">Coming Up</h4>
        ${upcoming.map(t => `<div class="ai-card-row"><span>${t.name}</span><span class="text-muted">${formatDate(t.start)}</span></div>`).join('')}
      </div>`
    };
  }

  // Summary
  if (q.includes('summary') || q.includes('overview') || q.includes('status') || q.includes('how are things')) {
    const avgProgress = tasks.length ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length) : 0;
    const delivered = items.filter(i => ['delivered', 'installed'].includes(i.status)).length;
    return {
      text: `Here's a quick summary of ${project.name}:`,
      cards: `<div class="ai-card">
        <div class="ai-card-row"><span>Client</span><strong>${project.client}</strong></div>
        <div class="ai-card-row"><span>Status</span><strong>${project.status}</strong></div>
        <div class="ai-card-row"><span>Overall Progress</span><strong>${avgProgress}%</strong></div>
        <div class="ai-card-row"><span>Items Delivered</span><strong>${delivered} / ${items.length}</strong></div>
        <div class="ai-card-row"><span>Invoices</span><strong>${invoices.length} total, ${invoices.filter(i => i.status === 'overdue').length} overdue</strong></div>
      </div>`
    };
  }

  // Room
  const roomMatch = q.match(/(?:room|in the)\s+(\w[\w\s]*)/);
  if (roomMatch) {
    const room = roomMatch[1].trim();
    const roomItems = items.filter(i => i.room.toLowerCase().includes(room.toLowerCase()));
    if (roomItems.length > 0) {
      return {
        text: `Items for the ${roomItems[0].room}:`,
        cards: roomItems.map(i => `<div class="ai-card-sm"><span class="status-badge status-${i.status}">${i.status}</span> ${i.name} — ${i.supplier} — ${formatCurrency(i.trade * (1 + i.markup / 100))}</div>`).join('')
      };
    }
  }

  // Default
  return {
    text: "I can help with budget tracking, pending orders, overdue invoices, supplier searches, schedule status, and project summaries. Try asking me something like \"What's the budget status?\" or \"Show pending orders\".",
    cards: null
  };
}
