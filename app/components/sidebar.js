// Sidebar navigation component

import { icons } from '../core/icons.js';
import { getState, getActiveProject, setActiveProject, on } from '../store.js';
import { navigate } from '../router.js';

const navItems = [
  { route: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { route: '/procurement', label: 'Procurement', icon: 'procurement' },
  { route: '/schedule', label: 'Schedule', icon: 'schedule' },
  { route: '/invoicing', label: 'Invoicing', icon: 'invoicing' },
  { route: '/suppliers', label: 'Suppliers', icon: 'suppliers' },
  { route: '/moodboard', label: 'Mood Boards', icon: 'moodboard' },
  { route: '/floorplan', label: 'Floor Plans', icon: 'floorplan' },
  { route: '/client-portal', label: 'Client Portal', icon: 'clientPortal' },
  { route: '/ai-assistant', label: 'AI Assistant', icon: 'ai', badge: 'NEW' },
  { route: '/presentations', label: 'Presentations', icon: 'presentations' },
  { route: '/settings', label: 'Settings', icon: 'settings' },
];

export function renderSidebar() {
  const state = getState();
  const activeProject = getActiveProject();
  const projects = state ? state.projects : [];

  const projectOptions = projects.map(p =>
    `<option value="${p.id}" ${p.id === (activeProject?.id) ? 'selected' : ''}>${p.name}</option>`
  ).join('');

  const navHtml = navItems.map(item => {
    const badge = item.badge ? `<span class="sidebar-badge">${item.badge}</span>` : '';
    return `<a class="sidebar-nav-item" data-route="${item.route}" href="#${item.route}">
      <span class="sidebar-icon">${icons[item.icon]}</span>
      <span class="sidebar-label">${item.label}</span>
      ${badge}
    </a>`;
  }).join('');

  return `
    <div class="sidebar-header">
      <div class="sidebar-logo">
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="url(#logo-grad-sb)"/>
          <path d="M8 12h16M8 16h12M8 20h8" stroke="white" stroke-width="2" stroke-linecap="round"/>
          <circle cx="24" cy="20" r="4" fill="white" fill-opacity="0.3"/>
          <defs><linearGradient id="logo-grad-sb" x1="0" y1="0" x2="32" y2="32"><stop stop-color="#6366f1"/><stop offset="1" stop-color="#a855f7"/></linearGradient></defs>
        </svg>
        <span>DesignDesk</span>
      </div>
    </div>
    <div class="sidebar-project-selector">
      <label>Project</label>
      <select id="project-selector">${projectOptions}</select>
    </div>
    <nav class="sidebar-nav">${navHtml}</nav>
    <div class="sidebar-footer">
      <a href="index.html" class="sidebar-back">&larr; Back to Site</a>
    </div>
  `;
}

export function mountSidebar() {
  const selector = document.getElementById('project-selector');
  if (selector) {
    selector.addEventListener('change', (e) => {
      setActiveProject(e.target.value);
      // Re-render current view
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
  }

  // Nav item clicks
  document.querySelectorAll('.sidebar-nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(item.dataset.route);
    });
  });

  // Mobile toggle
  const toggle = document.getElementById('sidebar-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      document.querySelector('.app-sidebar').classList.toggle('open');
    });
  }

  // Highlight active
  const current = window.location.hash.slice(1) || '/dashboard';
  document.querySelectorAll('.sidebar-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.route === current);
  });
}
