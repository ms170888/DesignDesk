// Sidebar navigation — badges, collapse animation, keyboard nav, mobile slide-in

import { icons } from '../core/icons.js';
import { getState, getActiveProject, setActiveProject, on, getProjectInvoices } from '../store.js';
import { navigate, currentRoute } from '../router.js';

const navItems = [
  { route: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { route: '/procurement', label: 'Procurement', icon: 'procurement' },
  { route: '/schedule', label: 'Schedule', icon: 'schedule' },
  { route: '/invoicing', label: 'Invoicing', icon: 'invoicing', badgeFn: getOverdueCount },
  { route: '/suppliers', label: 'Suppliers', icon: 'suppliers' },
  { route: '/moodboard', label: 'Mood Boards', icon: 'moodboard' },
  { route: '/floorplan', label: 'Floor Plans', icon: 'floorplan' },
  { route: '/client-portal', label: 'Client Portal', icon: 'clientPortal' },
  { route: '/ai-assistant', label: 'AI Assistant', icon: 'ai', badge: 'NEW' },
  { route: '/presentations', label: 'Presentations', icon: 'presentations' },
  { route: '/settings', label: 'Settings', icon: 'settings' },
];

const STATUS_COLORS = {
  active: '#10b981',
  planning: '#f59e0b',
  completed: '#6366f1',
  paused: '#94a3b8'
};

let collapsed = false;
let keyboardCleanup = null;
let storeUnsub = null;
let backdropEl = null;

function getOverdueCount() {
  const invoices = getProjectInvoices();
  const count = invoices.filter(i => i.status === 'overdue').length;
  return count > 0 ? count : null;
}

export function renderSidebar() {
  const state = getState();
  const activeProject = getActiveProject();
  const projects = state ? state.projects : [];
  const current = currentRoute();

  const projectOptions = projects.map(p => {
    const color = STATUS_COLORS[p.status] || '#94a3b8';
    return `<option value="${p.id}" ${p.id === (activeProject?.id) ? 'selected' : ''}>${p.name}</option>`;
  }).join('');

  const statusDot = activeProject
    ? `<span class="sidebar-project-dot" style="background:${STATUS_COLORS[activeProject.status] || '#94a3b8'};"></span>`
    : '';

  const navHtml = navItems.map((item, idx) => {
    const isActive = item.route === current;

    // Dynamic badge (function) or static badge
    let badgeHtml = '';
    if (item.badgeFn) {
      const val = item.badgeFn();
      if (val != null) {
        badgeHtml = `<span class="sidebar-badge sidebar-badge-count">${val}</span>`;
      }
    } else if (item.badge) {
      badgeHtml = `<span class="sidebar-badge">${item.badge}</span>`;
    }

    return `<a class="sidebar-nav-item ${isActive ? 'active' : ''}"
      data-route="${item.route}"
      data-nav-index="${idx}"
      href="#${item.route}"
      role="menuitem"
      tabindex="${isActive ? '0' : '-1'}"
      aria-current="${isActive ? 'page' : 'false'}">
      <span class="sidebar-icon">${icons[item.icon]}</span>
      <span class="sidebar-label">${item.label}</span>
      ${badgeHtml}
    </a>`;
  }).join('');

  const collapseIcon = collapsed
    ? `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`
    : `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;

  return `
    <div class="sidebar-header">
      <div class="sidebar-logo">
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="url(#logo-grad-sb)"/>
          <path d="M8 12h16M8 16h12M8 20h8" stroke="white" stroke-width="2" stroke-linecap="round"/>
          <circle cx="24" cy="20" r="4" fill="white" fill-opacity="0.3"/>
          <defs><linearGradient id="logo-grad-sb" x1="0" y1="0" x2="32" y2="32"><stop stop-color="#6366f1"/><stop offset="1" stop-color="#a855f7"/></linearGradient></defs>
        </svg>
        <span class="sidebar-logo-text">DesignDesk</span>
      </div>
      <button class="sidebar-collapse-btn" id="sidebar-collapse-btn" type="button" aria-label="${collapsed ? 'Expand sidebar' : 'Collapse sidebar'}">
        ${collapseIcon}
      </button>
    </div>
    <div class="sidebar-project-selector">
      <label>${statusDot} Project</label>
      <select id="project-selector">${projectOptions}</select>
    </div>
    <nav class="sidebar-nav" role="menu" aria-label="Main navigation">${navHtml}</nav>
    <div class="sidebar-footer">
      <a href="index.html" class="sidebar-back">&larr; Back to Site</a>
    </div>
  `;
}

export function mountSidebar() {
  const sidebarEl = document.querySelector('.app-sidebar');

  // Project selector
  const selector = document.getElementById('project-selector');
  if (selector) {
    selector.addEventListener('change', (e) => {
      setActiveProject(e.target.value);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
  }

  // Nav item clicks
  document.querySelectorAll('.sidebar-nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(item.dataset.route);
      closeMobileSidebar();
    });
  });

  // Collapse toggle
  const collapseBtn = document.getElementById('sidebar-collapse-btn');
  if (collapseBtn && sidebarEl) {
    collapseBtn.addEventListener('click', () => {
      collapsed = !collapsed;
      sidebarEl.classList.toggle('collapsed', collapsed);
      collapseBtn.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    });
    // Restore collapsed state
    if (collapsed) sidebarEl.classList.add('collapsed');
  }

  // Mobile toggle
  const toggle = document.getElementById('sidebar-toggle');
  if (toggle && sidebarEl) {
    toggle.addEventListener('click', () => {
      const isOpen = sidebarEl.classList.contains('mobile-open');
      if (isOpen) {
        closeMobileSidebar();
      } else {
        openMobileSidebar();
      }
    });
  }

  // Keyboard navigation
  setupKeyboardNav();

  // Subscribe to store changes for badge updates
  if (storeUnsub) storeUnsub();
  storeUnsub = on('stateChanged', () => {
    refreshBadges();
  });
}

// ── Mobile slide-in ─────────────────────────────────────────────────────

function openMobileSidebar() {
  const sidebarEl = document.querySelector('.app-sidebar');
  if (!sidebarEl) return;
  sidebarEl.classList.add('mobile-open');

  // Create backdrop
  if (!backdropEl) {
    backdropEl = document.createElement('div');
    backdropEl.className = 'sidebar-mobile-backdrop';
    backdropEl.addEventListener('click', closeMobileSidebar);
  }
  document.body.appendChild(backdropEl);
  requestAnimationFrame(() => backdropEl.classList.add('visible'));

  // Touch swipe to close
  let touchStartX = 0;
  const onTouchStart = (e) => { touchStartX = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (dx < -60) closeMobileSidebar();
  };
  sidebarEl.addEventListener('touchstart', onTouchStart, { passive: true });
  sidebarEl.addEventListener('touchend', onTouchEnd, { passive: true });
  sidebarEl._touchCleanup = () => {
    sidebarEl.removeEventListener('touchstart', onTouchStart);
    sidebarEl.removeEventListener('touchend', onTouchEnd);
  };
}

function closeMobileSidebar() {
  const sidebarEl = document.querySelector('.app-sidebar');
  if (!sidebarEl) return;
  sidebarEl.classList.remove('mobile-open');
  if (sidebarEl._touchCleanup) {
    sidebarEl._touchCleanup();
    sidebarEl._touchCleanup = null;
  }
  if (backdropEl) {
    backdropEl.classList.remove('visible');
    setTimeout(() => {
      if (backdropEl && backdropEl.parentElement) backdropEl.parentElement.removeChild(backdropEl);
    }, 200);
  }
}

// ── Keyboard navigation ─────────────────────────────────────────────────

function setupKeyboardNav() {
  if (keyboardCleanup) keyboardCleanup();

  const nav = document.querySelector('.sidebar-nav');
  if (!nav) return;

  const handler = (e) => {
    const items = Array.from(nav.querySelectorAll('.sidebar-nav-item'));
    const focusedIdx = items.findIndex(el => el === document.activeElement);
    if (focusedIdx === -1 && !['ArrowDown', 'ArrowUp'].includes(e.key)) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = focusedIdx < items.length - 1 ? focusedIdx + 1 : 0;
      items[next].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = focusedIdx > 0 ? focusedIdx - 1 : items.length - 1;
      items[prev].focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (focusedIdx >= 0) {
        navigate(items[focusedIdx].dataset.route);
        closeMobileSidebar();
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      items[items.length - 1]?.focus();
    }
  };

  nav.addEventListener('keydown', handler);
  keyboardCleanup = () => nav.removeEventListener('keydown', handler);
}

// ── Dynamic badge refresh ───────────────────────────────────────────────

function refreshBadges() {
  navItems.forEach(item => {
    if (!item.badgeFn) return;
    const navEl = document.querySelector(`.sidebar-nav-item[data-route="${item.route}"]`);
    if (!navEl) return;
    const val = item.badgeFn();
    let badgeEl = navEl.querySelector('.sidebar-badge-count');
    if (val != null) {
      if (badgeEl) {
        badgeEl.textContent = val;
      } else {
        badgeEl = document.createElement('span');
        badgeEl.className = 'sidebar-badge sidebar-badge-count';
        badgeEl.textContent = val;
        navEl.appendChild(badgeEl);
      }
    } else if (badgeEl) {
      badgeEl.remove();
    }
  });
}
