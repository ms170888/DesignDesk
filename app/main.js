// DesignDesk Demo — Main entry point with keyboard shortcuts, error boundary, perf timing

import { initStore, undo, redo, canUndo, canRedo, checkStorageQuota, on } from './store.js';
import { registerRoute, initRouter, navigate, beforeEach } from './router.js';
import { seedData } from './seed-data.js';
import { renderSidebar, mountSidebar } from './components/sidebar.js';
import { renderTopbar, mountTopbar, openPalette } from './components/topbar.js';
import { initModal, showModal, closeModal, confirmModal } from './components/modal.js';
import { initToast, showToast } from './components/toast.js';
import * as storeModule from './store.js';

// Import views
import * as dashboard from './views/dashboard.js';
import * as procurement from './views/procurement.js';
import * as schedule from './views/schedule.js';
import * as invoicing from './views/invoicing.js';
import * as suppliers from './views/suppliers.js';
import * as moodboard from './views/moodboard-editor.js';
import * as floorplan from './views/floorplan-editor.js';
import * as clientPortal from './views/client-portal.js';
import * as aiAssistant from './views/ai-assistant.js';
import * as presentations from './views/presentations.js';
import * as settings from './views/settings.js';

// Expose modal/store for topbar notifications and other components
window.__designdesk_modal = { showModal, closeModal };
window.__designdesk_store = storeModule;

// ── Keyboard shortcut registry ──────────────────────────────────────────

const shortcuts = new Map();

function registerShortcut(key, description, handler) {
  shortcuts.set(key, { description, handler });
}

function matchShortcut(e) {
  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push('ctrl');
  if (e.shiftKey) parts.push('shift');
  if (e.altKey) parts.push('alt');

  const keyName = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  parts.push(keyName);
  return parts.join('+');
}

function isInputFocused() {
  const tag = document.activeElement?.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || document.activeElement?.isContentEditable;
}

// ── Global error boundary ───────────────────────────────────────────────

function setupErrorBoundary() {
  window.onerror = (message, source, lineno, colno, error) => {
    console.error('[DesignDesk] Uncaught error:', { message, source, lineno, colno, error });
    showToast(`Error: ${message}`, 'error', 5000);
    return true; // Prevent default browser error handling
  };

  window.addEventListener('unhandledrejection', (e) => {
    console.error('[DesignDesk] Unhandled promise rejection:', e.reason);
    const msg = e.reason?.message || String(e.reason);
    showToast(`Async error: ${msg}`, 'error', 5000);
  });
}

// ── Performance timing ──────────────────────────────────────────────────

function setupPerfTiming() {
  let routeStart = 0;

  window.addEventListener('hashchange', () => {
    routeStart = performance.now();
  });

  // Observe DOM mutations to detect when rendering completes
  const observer = new MutationObserver(() => {
    if (routeStart > 0) {
      const elapsed = (performance.now() - routeStart).toFixed(1);
      console.debug(`[perf] View render complete in ${elapsed}ms`);
      routeStart = 0;
    }
  });

  const mainEl = document.getElementById('app-main');
  if (mainEl) {
    observer.observe(mainEl, { childList: true, subtree: true });
  }
}

// ── LocalStorage quota check ────────────────────────────────────────────

function checkStorage() {
  const quota = checkStorageQuota();
  if (quota.percentUsed > 80) {
    console.warn(`[storage] localStorage usage at ${quota.percentUsed}% (${quota.usedMB}MB / ~${quota.estimatedLimitMB}MB)`);
    showToast(`Storage usage high: ${quota.percentUsed}% used`, 'warning', 5000);
  } else {
    console.debug(`[storage] localStorage usage: ${quota.usedMB}MB (${quota.percentUsed}%)`);
  }
}

// ── Dirty state tracking for route guards ───────────────────────────────

let dirtyViews = new Set();

export function markViewDirty(viewName) {
  dirtyViews.add(viewName);
}

export function clearViewDirty(viewName) {
  dirtyViews.delete(viewName);
}

// ── Init ────────────────────────────────────────────────────────────────

async function init() {
  const initStart = performance.now();

  // Error boundary first
  setupErrorBoundary();

  // Init store with seed data
  initStore(seedData);

  // Check storage quota
  checkStorage();

  // Init modal and toast
  initModal();
  initToast();

  // Render shell components
  document.getElementById('app-sidebar').innerHTML = renderSidebar();
  document.getElementById('app-topbar').innerHTML = renderTopbar();

  // Mount shell interactivity
  mountSidebar();
  mountTopbar();

  // Register routes
  registerRoute('/dashboard', dashboard);
  registerRoute('/procurement', procurement);
  registerRoute('/schedule', schedule);
  registerRoute('/invoicing', invoicing);
  registerRoute('/suppliers', suppliers);
  registerRoute('/moodboard', moodboard);
  registerRoute('/floorplan', floorplan);
  registerRoute('/client-portal', clientPortal);
  registerRoute('/ai-assistant', aiAssistant);
  registerRoute('/presentations', presentations);
  registerRoute('/settings', settings);

  // Route guard: confirm unsaved changes
  beforeEach(async ({ from, to }) => {
    if (dirtyViews.size > 0) {
      const confirmed = await confirmModal(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to leave this page?',
        { confirmLabel: 'Leave', danger: true }
      );
      if (confirmed) {
        dirtyViews.clear();
        return true;
      }
      return false;
    }
    return true;
  });

  // Init router
  initRouter(document.getElementById('app-main'));

  // Re-render sidebar and topbar on route change
  window.addEventListener('hashchange', () => {
    document.getElementById('app-sidebar').innerHTML = renderSidebar();
    document.getElementById('app-topbar').innerHTML = renderTopbar();
    mountSidebar();
    mountTopbar();
  });

  // Register keyboard shortcuts
  registerShortcut('ctrl+k', 'Open command palette', () => openPalette());
  registerShortcut('ctrl+z', 'Undo', () => {
    if (undo()) showToast('Undone', 'info', 1500);
  });
  registerShortcut('ctrl+y', 'Redo', () => {
    if (redo()) showToast('Redone', 'info', 1500);
  });
  registerShortcut('ctrl+shift+z', 'Redo', () => {
    if (redo()) showToast('Redone', 'info', 1500);
  });
  registerShortcut('Escape', 'Close modal', () => closeModal());

  // Ctrl+1 through Ctrl+9 for nav items
  const navRoutes = [
    '/dashboard', '/procurement', '/schedule', '/invoicing', '/suppliers',
    '/moodboard', '/floorplan', '/client-portal', '/ai-assistant'
  ];
  navRoutes.forEach((route, i) => {
    registerShortcut(`ctrl+${i + 1}`, `Navigate to ${route}`, () => navigate(route));
  });

  // Global keydown handler
  document.addEventListener('keydown', (e) => {
    const combo = matchShortcut(e);
    const shortcut = shortcuts.get(combo);

    if (shortcut) {
      // Allow Escape anywhere, but don't hijack input for other shortcuts
      if (combo !== 'Escape' && isInputFocused()) return;
      e.preventDefault();
      shortcut.handler();
    }
  });

  // Performance timing
  setupPerfTiming();

  const elapsed = (performance.now() - initStart).toFixed(1);
  console.info(`[DesignDesk] App initialized in ${elapsed}ms`);
}

// Boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
