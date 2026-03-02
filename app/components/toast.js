// Toast notification component — with progress bar, action buttons, stacking, per-type icons

import { sanitizeHtml } from '../core/utils.js';

let containerEl = null;
const MAX_VISIBLE = 3;
const activeToasts = [];

const ICONS = {
  success: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 9.5l2.5 2.5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  error: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M6 6l6 6M12 6l-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  info: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M9 8v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="9" cy="5.5" r="1" fill="currentColor"/></svg>`,
  warning: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2L1.5 16h15L9 2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M9 7v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="9" cy="13.5" r="0.8" fill="currentColor"/></svg>`
};

export function initToast() {
  containerEl = document.getElementById('toast-container');
  if (!containerEl) {
    containerEl = document.createElement('div');
    containerEl.id = 'toast-container';
    containerEl.className = 'toast-container';
    document.body.appendChild(containerEl);
  }
}

/**
 * Show a toast notification.
 * @param {string} message
 * @param {string} type - 'success' | 'error' | 'info' | 'warning'
 * @param {number} duration - ms before auto-dismiss (0 = manual only)
 * @param {object} [action] - { label: string, onClick: function } for action button (e.g. Undo)
 */
export function showToast(message, type = 'success', duration = 3000, action = null) {
  if (!containerEl) initToast();

  // Enforce max visible — remove oldest
  while (activeToasts.length >= MAX_VISIBLE) {
    const oldest = activeToasts.shift();
    dismissToast(oldest);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icon = ICONS[type] || ICONS.info;
  const actionHtml = action
    ? `<button class="toast-action" type="button">${action.label}</button>`
    : '';
  const progressHtml = duration > 0
    ? `<div class="toast-progress"><div class="toast-progress-bar toast-progress-${type}"></div></div>`
    : '';

  toast.innerHTML = `
    <div class="toast-main">
      <span class="toast-icon toast-icon-${type}">${icon}</span>
      <span class="toast-msg">${sanitizeHtml(message)}</span>
      ${actionHtml}
      <button class="toast-dismiss" type="button" aria-label="Dismiss">&times;</button>
    </div>
    ${progressHtml}
  `;

  // Insert at top so newest appears on bottom visually (container uses flex column-reverse)
  containerEl.appendChild(toast);
  activeToasts.push(toast);

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });
  });

  // Action button
  if (action && action.onClick) {
    const actionBtn = toast.querySelector('.toast-action');
    if (actionBtn) {
      actionBtn.addEventListener('click', () => {
        action.onClick();
        dismissToast(toast);
      });
    }
  }

  // Dismiss button
  const dismissBtn = toast.querySelector('.toast-dismiss');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => dismissToast(toast));
  }

  // Progress bar animation + auto dismiss
  let timeoutId = null;
  if (duration > 0) {
    const bar = toast.querySelector('.toast-progress-bar');
    if (bar) {
      bar.style.transition = `width ${duration}ms linear`;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          bar.style.width = '0%';
        });
      });
    }

    timeoutId = setTimeout(() => {
      dismissToast(toast);
    }, duration);

    // Pause on hover
    toast.addEventListener('mouseenter', () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      const bar = toast.querySelector('.toast-progress-bar');
      if (bar) {
        const computed = getComputedStyle(bar);
        bar.style.transition = 'none';
        bar.style.width = computed.width;
      }
    });

    toast.addEventListener('mouseleave', () => {
      const bar = toast.querySelector('.toast-progress-bar');
      if (bar) {
        const current = parseFloat(getComputedStyle(bar).width);
        const container = bar.parentElement;
        const total = container ? container.offsetWidth : 1;
        const remaining = Math.max(0, (current / total) * duration);
        bar.style.transition = `width ${remaining}ms linear`;
        requestAnimationFrame(() => {
          bar.style.width = '0%';
        });
        timeoutId = setTimeout(() => dismissToast(toast), remaining);
      }
    });
  }

  return toast;
}

function dismissToast(toast) {
  if (!toast || !toast.parentElement) return;
  toast.classList.remove('show');
  toast.classList.add('hiding');
  const idx = activeToasts.indexOf(toast);
  if (idx !== -1) activeToasts.splice(idx, 1);
  setTimeout(() => {
    if (toast.parentElement) toast.parentElement.removeChild(toast);
  }, 300);
}
