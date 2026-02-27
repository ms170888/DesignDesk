// DesignDesk Demo — Main entry point

import { initStore } from './store.js';
import { registerRoute, initRouter } from './router.js';
import { seedData } from './seed-data.js';
import { renderSidebar, mountSidebar } from './components/sidebar.js';
import { renderTopbar, mountTopbar } from './components/topbar.js';
import { initModal, showModal, closeModal } from './components/modal.js';
import { initToast } from './components/toast.js';
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

// Expose modal/store for topbar notifications
window.__designdesk_modal = { showModal, closeModal };
window.__designdesk_store = storeModule;

function init() {
  // Init store with seed data
  initStore(seedData);

  // Render shell components
  document.getElementById('app-sidebar').innerHTML = renderSidebar();
  document.getElementById('app-topbar').innerHTML = renderTopbar();

  // Mount shell interactivity
  mountSidebar();
  mountTopbar();

  // Init modal and toast
  initModal();
  initToast();

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

  // Init router
  initRouter(document.getElementById('app-main'));

  // Re-render sidebar and topbar on route change
  window.addEventListener('hashchange', () => {
    document.getElementById('app-sidebar').innerHTML = renderSidebar();
    document.getElementById('app-topbar').innerHTML = renderTopbar();
    mountSidebar();
    mountTopbar();
  });

  // Global escape to close modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

// Boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
