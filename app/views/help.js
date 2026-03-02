// Help & Support — FAQ, keyboard shortcuts, changelog, contact form

import { icons } from '../core/icons.js';
import { sanitizeHtml, debounce } from '../core/utils.js';
import { showToast } from '../components/toast.js';

const LAST_SEEN_VERSION_KEY = 'designdesk_last_seen_version';
const CURRENT_VERSION = '1.2.0';

let activeTab = 'faq';
let searchQuery = '';
let expandedFaq = -1;
let cleanupFns = [];

// ── Changelog data ──────────────────────────────────────────────────────

const changelog = [
  {
    version: '1.2.0',
    date: '2026-03-01',
    title: 'Onboarding & Help Center',
    items: [
      'First-run onboarding wizard for new users',
      'Help center with searchable FAQ',
      'Keyboard shortcuts reference',
      'PWA support with offline mode',
      'Privacy-respecting local analytics'
    ]
  },
  {
    version: '1.1.0',
    date: '2026-02-15',
    title: 'Presentations & AI Assistant',
    items: [
      'Client presentation builder with slide templates',
      'AI Assistant for generating project summaries',
      'Floor plan editor improvements',
      'Invoice credit notes support'
    ]
  },
  {
    version: '1.0.0',
    date: '2026-01-20',
    title: 'Initial Release',
    items: [
      'Dashboard with project overview',
      'Procurement tracking with supplier integration',
      'Gantt-style schedule builder',
      'Invoicing with PDF export',
      'Mood board editor',
      'Client portal'
    ]
  }
];

// ── FAQ data ────────────────────────────────────────────────────────────

const faqItems = [
  {
    q: 'How do I create a new project?',
    a: 'Go to the Dashboard and click the "New Project" button in the top right. Fill in the project name, client details, and budget. You can also create projects from the command palette (Ctrl+K).'
  },
  {
    q: 'How do I add items to a procurement list?',
    a: 'Navigate to Procurement from the sidebar, then click "Add Item". Fill in the product details, supplier, trade price, and markup. Items are automatically linked to your active project.'
  },
  {
    q: 'Can I export my data?',
    a: 'Yes! Go to Settings > Data Management and click "Export as JSON". You can also export procurement lists and invoices as CSV. Use the command palette (Ctrl+K) and search "Export" for quick access.'
  },
  {
    q: 'How does the markup calculator work?',
    a: 'Enter the trade price when adding an item. The markup percentage (set in Settings or per-item) is applied to calculate the client price. The margin is shown in the dashboard summary.'
  },
  {
    q: 'How do I create an invoice?',
    a: 'Go to Invoicing and click "New Invoice". Select items from your procurement list or add custom line items. Choose between Standard Invoice, Proforma, or Credit Note. Invoices can be previewed and printed.'
  },
  {
    q: 'Can I work offline?',
    a: 'Yes! DesignDesk is a Progressive Web App (PWA). Once loaded, the app works offline. All data is stored locally in your browser. Install it from your browser menu for the best experience.'
  },
  {
    q: 'How do I change the currency?',
    a: 'Go to Settings > Studio Information and select your preferred currency from the dropdown. This affects all new invoices and cost displays. Options include GBP, USD, and EUR.'
  },
  {
    q: 'What keyboard shortcuts are available?',
    a: 'Press "?" to see all shortcuts. Key ones: Ctrl+K for command palette, Ctrl+S to save, Ctrl+Z to undo, Ctrl+1-9 to navigate between views, and Escape to close modals.'
  },
  {
    q: 'How do I share a project with a client?',
    a: 'Go to Client Portal from the sidebar. Generate a shareable link for your active project. Clients can view project progress, mood boards, and approve invoices without needing an account.'
  },
  {
    q: 'Is my data secure?',
    a: 'All data is stored locally in your browser\'s localStorage. No data is sent to any server. You can export backups at any time from Settings. We recommend regular exports for important projects.'
  },
  {
    q: 'How do I reset or start fresh?',
    a: 'Go to Settings > Data Management and click "Reset to Demo Data". This will replace all current data with the sample dataset. Make sure to export your data first if you want to keep it.'
  },
  {
    q: 'Can I import data from a spreadsheet?',
    a: 'Currently, you can import JSON data exported from DesignDesk. CSV import for procurement lists is planned for a future update. Go to Settings > Data Management > Import.'
  }
];

// ── Shortcuts data ──────────────────────────────────────────────────────

const shortcutGroups = [
  {
    title: 'General',
    shortcuts: [
      { keys: ['Ctrl', 'K'], desc: 'Open command palette' },
      { keys: ['Ctrl', 'S'], desc: 'Save current form' },
      { keys: ['Ctrl', 'Z'], desc: 'Undo last action' },
      { keys: ['Ctrl', 'Shift', 'Z'], desc: 'Redo last action' },
      { keys: ['Ctrl', 'N'], desc: 'New item (context-dependent)' },
      { keys: ['Esc'], desc: 'Close modal or panel' },
      { keys: ['?'], desc: 'Show keyboard shortcuts' }
    ]
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['Ctrl', '1'], desc: 'Go to Dashboard' },
      { keys: ['Ctrl', '2'], desc: 'Go to Procurement' },
      { keys: ['Ctrl', '3'], desc: 'Go to Schedule' },
      { keys: ['Ctrl', '4'], desc: 'Go to Invoicing' },
      { keys: ['Ctrl', '5'], desc: 'Go to Suppliers' },
      { keys: ['Ctrl', '6'], desc: 'Go to Mood Boards' },
      { keys: ['Ctrl', '7'], desc: 'Go to Floor Plans' },
      { keys: ['Ctrl', '8'], desc: 'Go to Client Portal' },
      { keys: ['Ctrl', '9'], desc: 'Go to AI Assistant' }
    ]
  }
];

// ── Check for new version ───────────────────────────────────────────────

export function hasUnreadChangelog() {
  const lastSeen = localStorage.getItem(LAST_SEEN_VERSION_KEY);
  return lastSeen !== CURRENT_VERSION;
}

export function markChangelogRead() {
  localStorage.setItem(LAST_SEEN_VERSION_KEY, CURRENT_VERSION);
}

// ── View API ────────────────────────────────────────────────────────────

export function render() {
  return `
    <div class="help-container">
      <div class="view-header">
        <h1>${icons.help} Help & Support</h1>
      </div>

      <div class="help-tabs">
        <button class="help-tab ${activeTab === 'faq' ? 'active' : ''}" data-tab="faq">
          ${icons.info} FAQ
        </button>
        <button class="help-tab ${activeTab === 'shortcuts' ? 'active' : ''}" data-tab="shortcuts">
          ${icons.grid} Shortcuts
        </button>
        <button class="help-tab ${activeTab === 'changelog' ? 'active' : ''}" data-tab="changelog">
          ${icons.flag} What's New
          ${hasUnreadChangelog() ? '<span class="help-tab-dot"></span>' : ''}
        </button>
        <button class="help-tab ${activeTab === 'contact' ? 'active' : ''}" data-tab="contact">
          ${icons.send} Contact
        </button>
      </div>

      <div class="help-content">
        ${activeTab === 'faq' ? renderFaq() : ''}
        ${activeTab === 'shortcuts' ? renderShortcuts() : ''}
        ${activeTab === 'changelog' ? renderChangelog() : ''}
        ${activeTab === 'contact' ? renderContact() : ''}
      </div>
    </div>
  `;
}

export function mount(el) {
  cleanupFns = [];

  // Tab switching
  el.querySelectorAll('.help-tab').forEach(tab => {
    const handler = () => {
      activeTab = tab.dataset.tab;
      if (activeTab === 'changelog') markChangelogRead();
      rerender(el);
    };
    tab.addEventListener('click', handler);
    cleanupFns.push(() => tab.removeEventListener('click', handler));
  });

  // Tab-specific bindings
  if (activeTab === 'faq') bindFaq(el);
  if (activeTab === 'contact') bindContact(el);
  if (activeTab === 'shortcuts') bindShortcutsTab(el);
}

export function destroy() {
  cleanupFns.forEach(fn => fn());
  cleanupFns = [];
}

// ── FAQ ─────────────────────────────────────────────────────────────────

function renderFaq() {
  const filtered = searchQuery
    ? faqItems.filter(item => {
        const hay = (item.q + ' ' + item.a).toLowerCase();
        return searchQuery.toLowerCase().split(/\s+/).every(t => hay.includes(t));
      })
    : faqItems;

  return `
    <div class="help-faq">
      <div class="help-search">
        ${icons.search}
        <input type="text" id="faq-search" placeholder="Search frequently asked questions..." value="${sanitizeHtml(searchQuery)}" />
      </div>

      <div class="faq-list">
        ${filtered.length === 0
          ? '<div class="help-empty">No questions match your search. Try different keywords.</div>'
          : filtered.map((item, i) => {
            const realIndex = faqItems.indexOf(item);
            const isOpen = expandedFaq === realIndex;
            return `
              <div class="faq-item ${isOpen ? 'open' : ''}" data-index="${realIndex}">
                <button class="faq-question" type="button">
                  <span>${sanitizeHtml(item.q)}</span>
                  <span class="faq-chevron">${icons.chevronDown}</span>
                </button>
                <div class="faq-answer" ${isOpen ? 'style="max-height:300px;"' : ''}>
                  <p>${sanitizeHtml(item.a)}</p>
                </div>
              </div>
            `;
          }).join('')
        }
      </div>
    </div>
  `;
}

function bindFaq(el) {
  const searchInput = el.querySelector('#faq-search');
  if (searchInput) {
    const handler = debounce(() => {
      searchQuery = searchInput.value;
      expandedFaq = -1;
      const listEl = el.querySelector('.faq-list');
      if (listEl) {
        const filtered = searchQuery
          ? faqItems.filter(item => {
              const hay = (item.q + ' ' + item.a).toLowerCase();
              return searchQuery.toLowerCase().split(/\s+/).every(t => hay.includes(t));
            })
          : faqItems;
        listEl.innerHTML = filtered.length === 0
          ? '<div class="help-empty">No questions match your search. Try different keywords.</div>'
          : filtered.map((item, i) => {
            const realIndex = faqItems.indexOf(item);
            return `
              <div class="faq-item" data-index="${realIndex}">
                <button class="faq-question" type="button">
                  <span>${sanitizeHtml(item.q)}</span>
                  <span class="faq-chevron">${icons.chevronDown}</span>
                </button>
                <div class="faq-answer">
                  <p>${sanitizeHtml(item.a)}</p>
                </div>
              </div>
            `;
          }).join('');
        bindFaqAccordion(el);
      }
    }, 200);
    searchInput.addEventListener('input', handler);
    cleanupFns.push(() => searchInput.removeEventListener('input', handler));
    setTimeout(() => searchInput.focus(), 50);
  }

  bindFaqAccordion(el);
}

function bindFaqAccordion(el) {
  el.querySelectorAll('.faq-question').forEach(btn => {
    const handler = () => {
      const item = btn.closest('.faq-item');
      const idx = parseInt(item.dataset.index, 10);
      const answer = item.querySelector('.faq-answer');
      const isOpen = item.classList.contains('open');

      // Close all
      el.querySelectorAll('.faq-item.open').forEach(openItem => {
        openItem.classList.remove('open');
        openItem.querySelector('.faq-answer').style.maxHeight = '0';
      });

      if (!isOpen) {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
        expandedFaq = idx;
      } else {
        expandedFaq = -1;
      }
    };
    btn.addEventListener('click', handler);
    cleanupFns.push(() => btn.removeEventListener('click', handler));
  });
}

// ── Shortcuts ───────────────────────────────────────────────────────────

function renderShortcuts() {
  return `
    <div class="help-shortcuts">
      ${shortcutGroups.map(group => `
        <div class="shortcut-group">
          <h3>${group.title}</h3>
          <div class="shortcut-table">
            ${group.shortcuts.map(s => `
              <div class="shortcut-row">
                <div class="shortcut-keys">
                  ${s.keys.map(k => `<kbd>${k}</kbd>`).join('<span class="shortcut-plus">+</span>')}
                </div>
                <span class="shortcut-desc">${s.desc}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function bindShortcutsTab(el) {
  // No interactive elements needed
}

// ── Changelog ───────────────────────────────────────────────────────────

function renderChangelog() {
  return `
    <div class="help-changelog">
      ${changelog.map((entry, i) => `
        <div class="changelog-entry ${i === 0 ? 'latest' : ''}">
          <div class="changelog-header">
            <span class="changelog-version">v${entry.version}</span>
            <span class="changelog-date">${entry.date}</span>
            ${i === 0 ? '<span class="changelog-badge">Latest</span>' : ''}
          </div>
          <h3 class="changelog-title">${sanitizeHtml(entry.title)}</h3>
          <ul class="changelog-items">
            ${entry.items.map(item => `<li>${sanitizeHtml(item)}</li>`).join('')}
          </ul>
        </div>
      `).join('')}
    </div>
  `;
}

// ── Contact ─────────────────────────────────────────────────────────────

function renderContact() {
  return `
    <div class="help-contact">
      <div class="help-contact-info">
        <h3>Get in Touch</h3>
        <p>Have a question not covered in the FAQ? Send us a message and we'll get back to you within 24 hours.</p>
        <div class="help-contact-methods">
          <div class="help-contact-method">
            ${icons.send} <span>support@designdesk.app</span>
          </div>
          <div class="help-contact-method">
            ${icons.externalLink} <span>docs.designdesk.app</span>
          </div>
        </div>
      </div>

      <form class="help-contact-form" id="contact-form">
        <div class="form-group">
          <label for="contact-subject">Subject</label>
          <select id="contact-subject">
            <option value="bug">Bug Report</option>
            <option value="feature">Feature Request</option>
            <option value="question">General Question</option>
            <option value="billing">Billing Inquiry</option>
          </select>
        </div>
        <div class="form-group">
          <label for="contact-message">Message</label>
          <textarea id="contact-message" rows="5" placeholder="Describe your issue or question..."></textarea>
        </div>
        <button class="btn btn-primary btn-sm" type="submit">
          ${icons.send} Send Message
        </button>
      </form>
    </div>
  `;
}

function bindContact(el) {
  const form = el.querySelector('#contact-form');
  if (form) {
    const handler = (e) => {
      e.preventDefault();
      const msg = el.querySelector('#contact-message')?.value?.trim();
      if (!msg) {
        showToast('Please enter a message', 'warning');
        return;
      }
      showToast('Message sent! We\'ll get back to you soon.', 'success');
      el.querySelector('#contact-message').value = '';
    };
    form.addEventListener('submit', handler);
    cleanupFns.push(() => form.removeEventListener('submit', handler));
  }
}

// ── Rerender ────────────────────────────────────────────────────────────

function rerender(el) {
  cleanupFns.forEach(fn => fn());
  cleanupFns = [];
  const mainEl = el.closest('#app-main') || el;
  mainEl.innerHTML = render();
  mount(mainEl);
}
