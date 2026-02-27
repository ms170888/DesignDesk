// Topbar component

import { icons } from '../core/icons.js';
import { getState, getActiveProject } from '../store.js';
import { currentRoute } from '../router.js';

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

export function renderTopbar() {
  const project = getActiveProject();
  const route = currentRoute();
  const title = routeTitles[route] || 'Dashboard';
  const state = getState();
  const unread = state ? state.notifications.filter(n => !n.read).length : 0;
  const badge = unread > 0 ? `<span class="notif-badge">${unread}</span>` : '';

  return `
    <div class="topbar-left">
      <button class="topbar-menu-btn" id="sidebar-toggle">${icons.procurement}</button>
      <div class="topbar-breadcrumb">
        <span class="topbar-project">${project ? project.name : ''}</span>
        <span class="topbar-sep">/</span>
        <span class="topbar-title">${title}</span>
      </div>
    </div>
    <div class="topbar-right">
      <div class="topbar-search">
        <span class="topbar-search-icon">${icons.search}</span>
        <input type="text" placeholder="Search... (Ctrl+K)" id="global-search" />
      </div>
      <button class="topbar-notif" id="notif-btn">
        ${icons.bell}
        ${badge}
      </button>
      <div class="topbar-avatar">DD</div>
    </div>
  `;
}

export function mountTopbar() {
  const searchInput = document.getElementById('global-search');
  if (searchInput) {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
      }
      if (e.key === 'Escape') searchInput.blur();
    });
  }

  const notifBtn = document.getElementById('notif-btn');
  if (notifBtn) {
    notifBtn.addEventListener('click', () => {
      const state = getState();
      if (!state) return;
      const list = state.notifications.map(n => `
        <div class="notif-item ${n.read ? '' : 'unread'}">
          <strong>${n.title}</strong>
          <p>${n.body}</p>
        </div>
      `).join('');

      const { showModal } = window.__designdesk_modal;
      showModal('Notifications', `<div class="notif-list">${list}</div>`);

      // Mark all as read
      state.notifications.forEach(n => n.read = true);
      const { setState } = window.__designdesk_store;
      setState(state);
    });
  }
}
