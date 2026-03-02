// Enhanced keyboard shortcuts — registration, modal reference, save/new context awareness

import { icons } from './icons.js';
import { navigate, currentRoute } from '../router.js';
import { showToast } from '../components/toast.js';

let shortcutsModalOpen = false;
let modalEl = null;

// ── Shortcut definitions for the help modal ─────────────────────────────

const shortcutDefinitions = [
  { group: 'General', items: [
    { keys: 'Ctrl+K', desc: 'Open command palette' },
    { keys: 'Ctrl+S', desc: 'Save current form' },
    { keys: 'Ctrl+Z', desc: 'Undo last action' },
    { keys: 'Ctrl+Shift+Z', desc: 'Redo' },
    { keys: 'Ctrl+Y', desc: 'Redo (alternative)' },
    { keys: 'Ctrl+N', desc: 'New item (context-dependent)' },
    { keys: 'Escape', desc: 'Close modal / panel' },
    { keys: '?', desc: 'Show this shortcuts reference' }
  ]},
  { group: 'Navigation', items: [
    { keys: 'Ctrl+1', desc: 'Dashboard' },
    { keys: 'Ctrl+2', desc: 'Procurement' },
    { keys: 'Ctrl+3', desc: 'Schedule' },
    { keys: 'Ctrl+4', desc: 'Invoicing' },
    { keys: 'Ctrl+5', desc: 'Suppliers' },
    { keys: 'Ctrl+6', desc: 'Mood Boards' },
    { keys: 'Ctrl+7', desc: 'Floor Plans' },
    { keys: 'Ctrl+8', desc: 'Client Portal' },
    { keys: 'Ctrl+9', desc: 'AI Assistant' },
    { keys: 'Ctrl+0', desc: 'Presentations' }
  ]}
];

// ── Context-dependent actions ───────────────────────────────────────────

function handleCtrlS() {
  // Look for a visible save button in the current view
  const saveBtn = document.querySelector('.btn-save, [data-action="save"], button[type="submit"]');
  if (saveBtn && !saveBtn.disabled) {
    saveBtn.click();
    return;
  }
  // Check for form with changes
  const form = document.querySelector('.app-main form');
  if (form) {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    return;
  }
  showToast('Nothing to save', 'info', 1500);
}

function handleCtrlN() {
  const route = currentRoute();
  // Context-dependent new item creation
  const routeActions = {
    '/procurement': () => {
      const btn = document.querySelector('[data-action="add-item"], .procurement-add-btn, .btn-add-item');
      if (btn) btn.click();
      else showToast('Open Procurement to add items', 'info', 1500);
    },
    '/invoicing': () => {
      const btn = document.querySelector('[data-action="new-invoice"], .invoice-add-btn');
      if (btn) btn.click();
      else navigate('/invoicing');
    },
    '/suppliers': () => {
      const btn = document.querySelector('[data-action="add-supplier"]');
      if (btn) btn.click();
      else navigate('/suppliers');
    },
    '/moodboard': () => {
      const btn = document.querySelector('[data-action="new-board"]');
      if (btn) btn.click();
      else navigate('/moodboard');
    },
    '/schedule': () => {
      const btn = document.querySelector('[data-action="add-task"]');
      if (btn) btn.click();
      else navigate('/schedule');
    }
  };

  const action = routeActions[route];
  if (action) {
    action();
  } else {
    showToast('Press Ctrl+K to search and create', 'info', 1500);
  }
}

// ── Register enhanced shortcuts (called from main.js) ───────────────────

export function initKeyboardShortcuts(registerShortcut) {
  // Ctrl+S — Save
  registerShortcut('ctrl+s', 'Save current form', handleCtrlS);

  // Ctrl+N — New item
  registerShortcut('ctrl+n', 'New item (context-dependent)', handleCtrlN);

  // ? — Show shortcuts modal (only when not in input)
  // Shift+/ produces '?' key event with shiftKey=true
  registerShortcut('shift+?', 'Show keyboard shortcuts', showShortcutsModal);

  // Ctrl+0 — Presentations (10th nav item)
  registerShortcut('ctrl+0', 'Navigate to Presentations', () => navigate('/presentations'));
}

// ── Shortcuts reference modal ───────────────────────────────────────────

export function showShortcutsModal() {
  if (shortcutsModalOpen) return;
  shortcutsModalOpen = true;

  modalEl = document.createElement('div');
  modalEl.className = 'shortcuts-modal-overlay';
  modalEl.innerHTML = `
    <div class="shortcuts-modal" role="dialog" aria-label="Keyboard shortcuts">
      <div class="shortcuts-modal-header">
        <h2>${icons.grid} Keyboard Shortcuts</h2>
        <button class="shortcuts-modal-close" type="button" aria-label="Close">&times;</button>
      </div>
      <div class="shortcuts-modal-body">
        ${shortcutDefinitions.map(group => `
          <div class="shortcuts-modal-group">
            <h3>${group.group}</h3>
            <div class="shortcuts-modal-list">
              ${group.items.map(s => `
                <div class="shortcuts-modal-item">
                  <span class="shortcuts-modal-desc">${s.desc}</span>
                  <span class="shortcuts-modal-keys">
                    ${s.keys.split('+').map(k => `<kbd>${k}</kbd>`).join('<span class="shortcuts-plus">+</span>')}
                  </span>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.body.appendChild(modalEl);

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      modalEl.classList.add('open');
    });
  });

  // Close handlers
  const closeBtn = modalEl.querySelector('.shortcuts-modal-close');
  closeBtn.addEventListener('click', closeShortcutsModal);
  modalEl.addEventListener('click', (e) => {
    if (e.target === modalEl) closeShortcutsModal();
  });

  const keyHandler = (e) => {
    if (e.key === 'Escape') closeShortcutsModal();
  };
  document.addEventListener('keydown', keyHandler);
  modalEl._keyCleanup = () => document.removeEventListener('keydown', keyHandler);
}

function closeShortcutsModal() {
  if (!modalEl) return;
  shortcutsModalOpen = false;
  if (modalEl._keyCleanup) modalEl._keyCleanup();
  modalEl.classList.remove('open');
  modalEl.classList.add('closing');
  setTimeout(() => {
    if (modalEl && modalEl.parentElement) modalEl.remove();
    modalEl = null;
  }, 200);
}
