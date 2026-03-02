// DesignDesk — Main entry point with keyboard shortcuts, error boundary, perf timing, analytics, SW

import { initStore, undo, redo, canUndo, canRedo, checkStorageQuota, on } from './store.js';
import { registerRoute, initRouter, navigate, beforeEach } from './router.js';
import { seedData } from './seed-data.js';
import { renderSidebar, mountSidebar } from './components/sidebar.js';
import { renderTopbar, mountTopbar, openPalette } from './components/topbar.js';
import { initModal, showModal, closeModal, confirmModal } from './components/modal.js';
import { initToast, showToast } from './components/toast.js';
import { isAuthenticated, getCurrentUser, logout as authLogout } from './core/auth.js';
import { initAnalytics, trackEvent } from './core/analytics.js';
import { initKeyboardShortcuts } from './core/keyboard.js';
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
import * as auth from './views/auth.js';
import * as pricing from './views/pricing.js';
import * as billing from './views/billing.js';
import * as checkoutSuccess from './views/checkout-success.js';
import * as checkoutCancel from './views/checkout-cancel.js';
import * as onboarding from './views/onboarding.js';
import * as help from './views/help.js';

// Expose modal/store for topbar notifications and other components
window.__designdesk_modal = { showModal, closeModal };
window.__designdesk_store = storeModule;

// Expose logout handler globally for topbar/sidebar
window.__designdesk_logout = () => {
  authLogout();
  showToast('Signed out successfully', 'info', 2000);
  setTimeout(() => {
    window.location.hash = '/login';
    window.location.reload();
  }, 300);
};

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

const ERROR_LOG_KEY = 'designdesk_errors';
const MAX_ERRORS = 50;

function setupErrorBoundary() {
  window.onerror = (message, source, lineno, colno, error) => {
    console.error('[DesignDesk] Uncaught error:', { message, source, lineno, colno, error });
    logError({ type: 'uncaught', message, source, lineno, colno, stack: error?.stack });
    showToast(`Error: ${message}`, 'error', 5000);
    return true;
  };

  window.addEventListener('unhandledrejection', (e) => {
    console.error('[DesignDesk] Unhandled promise rejection:', e.reason);
    const msg = e.reason?.message || String(e.reason);
    logError({ type: 'promise', message: msg, stack: e.reason?.stack });
    showToast(`Async error: ${msg}`, 'error', 5000);
  });
}

function logError(errorInfo) {
  try {
    const errors = JSON.parse(localStorage.getItem(ERROR_LOG_KEY) || '[]');
    errors.unshift({
      ...errorInfo,
      timestamp: new Date().toISOString(),
      route: window.location.hash,
      userAgent: navigator.userAgent
    });
    if (errors.length > MAX_ERRORS) errors.length = MAX_ERRORS;
    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(errors));
  } catch { /* silent */ }
}

// ── Service Worker registration ─────────────────────────────────────────

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./app/sw.js', { scope: './' })
      .then(reg => {
        console.debug('[SW] Registered:', reg.scope);
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              showToast('App updated. Refresh for latest version.', 'info', 5000);
            }
          });
        });
      })
      .catch(err => {
        console.warn('[SW] Registration failed:', err);
        // Don't break the app if SW fails
      });
  }
}

// ── Offline detection ───────────────────────────────────────────────────

function setupOfflineDetection() {
  const banner = document.getElementById('offline-banner');
  if (!banner) return;

  const update = () => {
    banner.style.display = navigator.onLine ? 'none' : 'flex';
  };

  window.addEventListener('online', () => {
    update();
    showToast('Back online', 'success', 2000);
  });
  window.addEventListener('offline', () => {
    update();
  });

  update();
}

// ── Performance timing ──────────────────────────────────────────────────

function setupPerfTiming() {
  let routeStart = 0;

  window.addEventListener('hashchange', () => {
    routeStart = performance.now();
  });

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

// ── App shell visibility ────────────────────────────────────────────────

function updateShellVisibility() {
  const authed = isAuthenticated();
  const sidebar = document.getElementById('app-sidebar');
  const topbar = document.getElementById('app-topbar');

  if (sidebar) sidebar.style.display = authed ? '' : 'none';
  if (topbar) topbar.style.display = authed ? '' : 'none';

  const appLayout = document.getElementById('app-layout');
  if (appLayout) {
    appLayout.classList.toggle('auth-mode', !authed);
  }
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

  // Initialize analytics (local, privacy-respecting)
  initAnalytics();

  // Register service worker
  registerServiceWorker();

  // Offline detection
  setupOfflineDetection();

  // Check auth state and update shell visibility
  const authed = isAuthenticated();
  updateShellVisibility();

  if (authed) {
    // Render shell components
    document.getElementById('app-sidebar').innerHTML = renderSidebar();
    document.getElementById('app-topbar').innerHTML = renderTopbar();

    // Mount shell interactivity
    mountSidebar();
    mountTopbar();
  }

  // Register auth routes (always available)
  registerRoute('/login', auth);
  registerRoute('/signup', auth);
  registerRoute('/forgot-password', auth);

  // Register app routes
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
  registerRoute('/pricing', pricing);
  registerRoute('/billing', billing);
  registerRoute('/checkout/success', checkoutSuccess);
  registerRoute('/checkout/cancel', checkoutCancel);
  registerRoute('/onboarding', onboarding);
  registerRoute('/help', help);

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

  // Init router — check for first-run onboarding redirect
  initRouter(document.getElementById('app-main'));

  // First-run check: redirect to onboarding if not completed and authenticated
  if (authed && !onboarding.isOnboardingComplete()) {
    const hash = window.location.hash.slice(1);
    if (!hash.startsWith('/onboarding')) {
      navigate('/onboarding');
    }
  }

  // Re-render sidebar and topbar on route change
  window.addEventListener('hashchange', () => {
    updateShellVisibility();
    if (isAuthenticated()) {
      document.getElementById('app-sidebar').innerHTML = renderSidebar();
      document.getElementById('app-topbar').innerHTML = renderTopbar();
      mountSidebar();
      mountTopbar();
    }
  });

  // Register keyboard shortcuts (only relevant when authenticated)
  registerShortcut('ctrl+k', 'Open command palette', () => {
    if (isAuthenticated()) openPalette();
  });
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
    registerShortcut(`ctrl+${i + 1}`, `Navigate to ${route}`, () => {
      if (isAuthenticated()) navigate(route);
    });
  });

  // Enhanced keyboard shortcuts (Ctrl+S, Ctrl+N, ?, Ctrl+0)
  initKeyboardShortcuts(registerShortcut);

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
