// Topbar — command palette, notification dropdown, clickable breadcrumbs, user avatar menu

import { icons } from '../core/icons.js';
import { getState, getActiveProject, on, updateState, exportData, resetStore } from '../store.js';
import { currentRoute, navigate } from '../router.js';
import { sanitizeHtml, relativeTime, debounce, filterBySearch, downloadAsJson } from '../core/utils.js';
import { seedData } from '../seed-data.js';
import { showToast } from './toast.js';

const routeTitles = {
  '/dashboard': 'Dashboard',
  '/procurement': 'Procurement & Orders',
  '/schedule': 'Construction Schedule',
  '/invoicing': 'Invoicing',
  '/suppliers': 'Supplier Database',
  '/moodboard': 'Mood Boards',
  '/floorplan': 'Floor Plans',
  '/client-portal': 'Client Portal',
  '/ai-assistant': 'AI Assistant',
  '/presentations': 'Presentations',
  '/settings': 'Settings',
};

let paletteOpen = false;
let notifOpen = false;
let avatarOpen = false;
let cleanupFns = [];

export function renderTopbar() {
  const project = getActiveProject();
  const route = currentRoute();
  const title = routeTitles[route] || 'Dashboard';
  const state = getState();
  const unread = state ? state.notifications.filter(n => !n.read).length : 0;
  const badge = unread > 0 ? `<span class="notif-badge">${unread}</span>` : '';

  return `
    <div class="topbar-left">
      <button class="topbar-menu-btn" id="sidebar-toggle" type="button" aria-label="Toggle sidebar">${icons.procurement}</button>
      <div class="topbar-breadcrumb">
        <a class="topbar-breadcrumb-link topbar-project" href="#/dashboard" data-nav="/dashboard">${project ? sanitizeHtml(project.name) : ''}</a>
        <span class="topbar-sep">/</span>
        <span class="topbar-title">${title}</span>
      </div>
    </div>
    <div class="topbar-right">
      <button class="topbar-search-trigger" id="cmd-palette-btn" type="button" aria-label="Search or run command">
        <span class="topbar-search-icon">${icons.search}</span>
        <span class="topbar-search-text">Search...</span>
        <kbd class="topbar-shortcut">Ctrl+K</kbd>
      </button>
      <div class="topbar-notif-wrapper" style="position:relative;">
        <button class="topbar-notif" id="notif-btn" type="button" aria-label="Notifications">
          ${icons.bell}
          ${badge}
        </button>
        <div class="notif-dropdown" id="notif-dropdown" style="display:none;"></div>
      </div>
      <div class="topbar-avatar-wrapper" style="position:relative;">
        <button class="topbar-avatar" id="avatar-btn" type="button" aria-label="User menu">DD</button>
        <div class="avatar-dropdown" id="avatar-dropdown" style="display:none;"></div>
      </div>
    </div>
  `;
}

export function mountTopbar() {
  cleanupAll();

  // Breadcrumb clicks
  document.querySelectorAll('.topbar-breadcrumb-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.dataset.nav || '/dashboard');
    });
  });

  // Command palette
  setupCommandPalette();

  // Notifications dropdown
  setupNotifications();

  // Avatar dropdown
  setupAvatarMenu();

  // Close all dropdowns on outside click
  const outsideClick = (e) => {
    if (notifOpen && !e.target.closest('.topbar-notif-wrapper')) closeNotifDropdown();
    if (avatarOpen && !e.target.closest('.topbar-avatar-wrapper')) closeAvatarDropdown();
  };
  document.addEventListener('click', outsideClick);
  cleanupFns.push(() => document.removeEventListener('click', outsideClick));
}

function cleanupAll() {
  cleanupFns.forEach(fn => fn());
  cleanupFns = [];
}

// ── Command Palette ─────────────────────────────────────────────────────

function setupCommandPalette() {
  const btn = document.getElementById('cmd-palette-btn');
  if (btn) btn.addEventListener('click', openPalette);
}

export function openPalette() {
  if (paletteOpen) return;
  paletteOpen = true;

  const overlay = document.createElement('div');
  overlay.className = 'cmd-palette-overlay';
  overlay.innerHTML = `
    <div class="cmd-palette" role="dialog" aria-label="Command palette">
      <div class="cmd-palette-input-wrap">
        ${icons.search}
        <input type="text" class="cmd-palette-input" placeholder="Search items, navigate, or run a command..." autofocus />
        <kbd class="cmd-palette-esc">Esc</kbd>
      </div>
      <div class="cmd-palette-results"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const input = overlay.querySelector('.cmd-palette-input');
  const resultsEl = overlay.querySelector('.cmd-palette-results');
  let selectedIndex = 0;

  // Build searchable items
  const allResults = buildPaletteItems();
  renderPaletteResults(resultsEl, allResults.slice(0, 12), selectedIndex);

  const onInput = debounce(() => {
    const query = input.value.trim();
    let filtered;
    if (!query) {
      filtered = allResults.slice(0, 12);
    } else {
      filtered = allResults.filter(item => {
        const haystack = (item.label + ' ' + (item.sublabel || '')).toLowerCase();
        return query.toLowerCase().split(/\s+/).every(t => haystack.includes(t));
      }).slice(0, 12);
    }
    selectedIndex = 0;
    renderPaletteResults(resultsEl, filtered, selectedIndex);
  }, 100);

  input.addEventListener('input', onInput);

  const onKeydown = (e) => {
    const items = resultsEl.querySelectorAll('.cmd-palette-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
      updatePaletteSelection(items, selectedIndex);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      updatePaletteSelection(items, selectedIndex);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = items[selectedIndex];
      if (selected) selected.click();
    } else if (e.key === 'Escape') {
      closePalette(overlay);
    }
  };
  input.addEventListener('keydown', onKeydown);

  // Click on backdrop
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closePalette(overlay);
  });

  setTimeout(() => input.focus(), 50);
}

function closePalette(overlay) {
  paletteOpen = false;
  if (overlay && overlay.parentElement) {
    overlay.classList.add('closing');
    setTimeout(() => overlay.remove(), 150);
  }
}

function buildPaletteItems() {
  const results = [];
  const state = getState();

  // Navigation items
  Object.entries(routeTitles).forEach(([route, label]) => {
    results.push({
      type: 'nav',
      label: label,
      sublabel: 'Navigate',
      icon: 'chevronRight',
      action: () => navigate(route)
    });
  });

  // Quick actions
  results.push({ type: 'action', label: 'Export Data as JSON', sublabel: 'Action', icon: 'upload', action: () => {
    const data = exportData();
    if (data) downloadAsJson(data, 'designdesk-backup.json');
  }});
  results.push({ type: 'action', label: 'Reset Demo Data', sublabel: 'Action', icon: 'reset', action: () => {
    resetStore(seedData);
    showToast('Demo data reset', 'success');
    navigate('/dashboard');
  }});

  // Items
  if (state && state.items) {
    state.items.slice(0, 20).forEach(item => {
      results.push({
        type: 'item',
        label: item.name,
        sublabel: `${item.room} - ${item.supplier}`,
        icon: 'procurement',
        action: () => navigate('/procurement')
      });
    });
  }

  // Suppliers
  if (state && state.suppliers) {
    state.suppliers.forEach(sup => {
      results.push({
        type: 'supplier',
        label: sup.name,
        sublabel: sup.category,
        icon: 'suppliers',
        action: () => navigate('/suppliers')
      });
    });
  }

  // Invoices
  if (state && state.invoices) {
    state.invoices.forEach(inv => {
      results.push({
        type: 'invoice',
        label: inv.number,
        sublabel: `${inv.status} - ${inv.type}`,
        icon: 'invoicing',
        action: () => navigate(`/invoicing/${inv.id}`)
      });
    });
  }

  return results;
}

function renderPaletteResults(container, items, selectedIndex) {
  if (items.length === 0) {
    container.innerHTML = '<div class="cmd-palette-empty">No results found</div>';
    return;
  }
  container.innerHTML = items.map((item, i) => `
    <div class="cmd-palette-item ${i === selectedIndex ? 'selected' : ''}" data-index="${i}">
      <span class="cmd-palette-item-icon">${icons[item.icon] || ''}</span>
      <div class="cmd-palette-item-text">
        <span class="cmd-palette-item-label">${sanitizeHtml(item.label)}</span>
        <span class="cmd-palette-item-sub">${sanitizeHtml(item.sublabel || '')}</span>
      </div>
      <span class="cmd-palette-item-type">${item.type}</span>
    </div>
  `).join('');

  container.querySelectorAll('.cmd-palette-item').forEach((el, i) => {
    el.addEventListener('click', () => {
      items[i].action();
      closePalette(container.closest('.cmd-palette-overlay'));
    });
    el.addEventListener('mouseenter', () => {
      container.querySelectorAll('.cmd-palette-item').forEach(e => e.classList.remove('selected'));
      el.classList.add('selected');
    });
  });
}

function updatePaletteSelection(items, idx) {
  items.forEach((el, i) => el.classList.toggle('selected', i === idx));
  const selected = items[idx];
  if (selected) selected.scrollIntoView({ block: 'nearest' });
}

// ── Notifications Dropdown ──────────────────────────────────────────────

function setupNotifications() {
  const btn = document.getElementById('notif-btn');
  if (!btn) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (notifOpen) {
      closeNotifDropdown();
    } else {
      closeAvatarDropdown();
      openNotifDropdown();
    }
  });
}

function openNotifDropdown() {
  const dropdown = document.getElementById('notif-dropdown');
  if (!dropdown) return;
  notifOpen = true;

  const state = getState();
  const notifications = state ? state.notifications : [];

  const grouped = {
    warning: notifications.filter(n => n.type === 'warning'),
    info: notifications.filter(n => n.type === 'info'),
    success: notifications.filter(n => n.type === 'success')
  };

  const groupLabels = { warning: 'Alerts', info: 'Updates', success: 'Completed' };
  const groupIcons = {
    warning: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1L0.5 13h13L7 1z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>`,
    info: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.2"/><path d="M7 6v4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><circle cx="7" cy="4" r="0.8" fill="currentColor"/></svg>`,
    success: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.2"/><path d="M4.5 7l2 2 3.5-3.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  };

  let bodyHtml = '';
  for (const [type, items] of Object.entries(grouped)) {
    if (items.length === 0) continue;
    bodyHtml += `
      <div class="notif-group">
        <div class="notif-group-header">${groupIcons[type]} ${groupLabels[type]}</div>
        ${items.map(n => `
          <div class="notif-item ${n.read ? '' : 'unread'}">
            <strong>${sanitizeHtml(n.title)}</strong>
            <p>${sanitizeHtml(n.body)}</p>
            <span class="notif-time">${relativeTime(n.timestamp)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  if (!bodyHtml) {
    bodyHtml = '<div class="notif-empty">No notifications</div>';
  }

  const unreadCount = notifications.filter(n => !n.read).length;
  dropdown.innerHTML = `
    <div class="notif-dropdown-header">
      <span>Notifications</span>
      ${unreadCount > 0 ? '<button class="notif-mark-read" type="button">Mark all read</button>' : ''}
    </div>
    <div class="notif-dropdown-body">${bodyHtml}</div>
  `;
  dropdown.style.display = 'block';

  // Mark all read
  const markBtn = dropdown.querySelector('.notif-mark-read');
  if (markBtn) {
    markBtn.addEventListener('click', () => {
      const s = getState();
      if (s) {
        s.notifications.forEach(n => n.read = true);
        updateState('notifications', s.notifications);
      }
      // Update badge in topbar
      const badge = document.querySelector('.notif-badge');
      if (badge) badge.remove();
      dropdown.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
      if (markBtn) markBtn.remove();
    });
  }
}

function closeNotifDropdown() {
  const dropdown = document.getElementById('notif-dropdown');
  if (dropdown) dropdown.style.display = 'none';
  notifOpen = false;
}

// ── Avatar Dropdown ─────────────────────────────────────────────────────

function setupAvatarMenu() {
  const btn = document.getElementById('avatar-btn');
  if (!btn) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (avatarOpen) {
      closeAvatarDropdown();
    } else {
      closeNotifDropdown();
      openAvatarDropdown();
    }
  });
}

function openAvatarDropdown() {
  const dropdown = document.getElementById('avatar-dropdown');
  if (!dropdown) return;
  avatarOpen = true;

  dropdown.innerHTML = `
    <div class="avatar-dropdown-menu">
      <button class="avatar-menu-item" data-action="profile" type="button">
        ${icons.suppliers} <span>View Profile</span>
      </button>
      <button class="avatar-menu-item" data-action="export" type="button">
        ${icons.upload} <span>Export Data</span>
      </button>
      <button class="avatar-menu-item" data-action="reset" type="button">
        ${icons.reset} <span>Reset Demo</span>
      </button>
      <div class="avatar-menu-divider"></div>
      <a class="avatar-menu-item" href="index.html">
        ${icons.chevronRight} <span>Back to Site</span>
      </a>
    </div>
  `;
  dropdown.style.display = 'block';

  dropdown.querySelector('[data-action="profile"]')?.addEventListener('click', () => {
    navigate('/settings');
    closeAvatarDropdown();
  });

  dropdown.querySelector('[data-action="export"]')?.addEventListener('click', () => {
    const data = exportData();
    if (data) {
      downloadAsJson(data, `designdesk-backup-${new Date().toISOString().slice(0, 10)}.json`);
      showToast('Data exported', 'success');
    }
    closeAvatarDropdown();
  });

  dropdown.querySelector('[data-action="reset"]')?.addEventListener('click', () => {
    resetStore(seedData);
    showToast('Demo data reset', 'success');
    navigate('/dashboard');
    closeAvatarDropdown();
  });
}

function closeAvatarDropdown() {
  const dropdown = document.getElementById('avatar-dropdown');
  if (dropdown) dropdown.style.display = 'none';
  avatarOpen = false;
}
