// Hash-based SPA router

const routes = new Map();
let currentView = null;
let mainEl = null;

export function registerRoute(path, viewModule) {
  routes.set(path, viewModule);
}

export function navigate(path) {
  window.location.hash = path;
}

export function currentRoute() {
  return window.location.hash.slice(1) || '/dashboard';
}

export function initRouter(containerEl) {
  mainEl = containerEl;

  const handleRoute = async () => {
    const path = currentRoute();
    const viewModule = routes.get(path);

    if (!viewModule) {
      navigate('/dashboard');
      return;
    }

    // Cleanup previous view
    if (currentView && currentView.destroy) {
      currentView.destroy();
    }

    mainEl.innerHTML = '<div class="view-loading"><div class="loading-spinner"></div></div>';

    try {
      currentView = viewModule;
      const html = viewModule.render();
      mainEl.innerHTML = html;
      if (viewModule.mount) viewModule.mount(mainEl);
    } catch (e) {
      console.error('Route error:', e);
      mainEl.innerHTML = `<div class="view-error"><h2>Something went wrong</h2><p>${e.message}</p></div>`;
    }

    // Update active nav item
    document.querySelectorAll('.sidebar-nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.route === path);
    });
  };

  window.addEventListener('hashchange', handleRoute);

  // Initial route
  if (!window.location.hash) {
    window.location.hash = '/dashboard';
  } else {
    handleRoute();
  }
}
