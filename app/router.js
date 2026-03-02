// Hash-based SPA router with transitions, guards, params, auth, and 404

import { isAuthenticated } from './core/auth.js';

const routes = new Map();
let currentView = null;
let currentPath = '';
let mainEl = null;
let beforeEachGuard = null;
let isTransitioning = false;

// Public routes that don't require authentication
const PUBLIC_ROUTES = new Set(['/login', '/signup', '/forgot-password']);

// ── Route registration ──────────────────────────────────────────────────

export function registerRoute(path, viewModule) {
  routes.set(path, viewModule);
}

export function navigate(path) {
  if (path !== window.location.hash.slice(1)) {
    window.location.hash = path;
  } else {
    handleRoute();
  }
}

export function currentRoute() {
  const hash = window.location.hash.slice(1) || '/dashboard';
  return hash.split('?')[0];
}

export function currentRouteParams() {
  const hash = window.location.hash.slice(1) || '/dashboard';
  const parts = hash.split('/').filter(Boolean);
  // e.g., #/invoice/inv-1 → { base: '/invoice', id: 'inv-1', segments: ['invoice', 'inv-1'] }
  return {
    base: '/' + (parts[0] || 'dashboard'),
    id: parts[1] || null,
    segments: parts,
    raw: hash
  };
}

export function getRouteParam() {
  return currentRouteParams().id;
}

// ── Route guard ─────────────────────────────────────────────────────────

export function beforeEach(guardFn) {
  beforeEachGuard = guardFn;
}

// ── Auth guard ──────────────────────────────────────────────────────────

function isPublicRoute(path) {
  const base = '/' + path.split('/').filter(Boolean)[0];
  return PUBLIC_ROUTES.has(base);
}

// ── 404 view ────────────────────────────────────────────────────────────

function render404(path) {
  return `
    <div class="view-404" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:60vh;text-align:center;">
      <div style="font-size:4rem;font-weight:700;color:var(--color-primary,#6366f1);margin-bottom:0.5rem;">404</div>
      <h2 style="margin:0 0 0.5rem;color:var(--color-text,#1e293b);">Page not found</h2>
      <p style="color:var(--color-text-muted,#64748b);margin-bottom:1.5rem;">
        The route <code style="background:var(--color-surface,#f1f5f9);padding:2px 8px;border-radius:4px;">${path}</code> does not exist.
      </p>
      <a href="#/dashboard" style="color:var(--color-primary,#6366f1);font-weight:600;text-decoration:none;">
        &larr; Back to Dashboard
      </a>
    </div>
  `;
}

// ── Transition helpers ──────────────────────────────────────────────────

function fadeOut(el) {
  return new Promise(resolve => {
    el.style.transition = 'opacity 120ms ease-out';
    el.style.opacity = '0';
    el.addEventListener('transitionend', () => resolve(), { once: true });
    // Safety timeout in case transitionend doesn't fire
    setTimeout(resolve, 150);
  });
}

function fadeIn(el) {
  el.style.opacity = '0';
  el.style.transition = 'opacity 150ms ease-in';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.opacity = '1';
    });
  });
}

// ── Loading state ───────────────────────────────────────────────────────

function showLoading(el) {
  el.innerHTML = `
    <div class="view-loading" style="display:flex;align-items:center;justify-content:center;height:40vh;opacity:0.6;">
      <div class="loading-spinner"></div>
    </div>
  `;
}

// ── Route resolution ────────────────────────────────────────────────────

function resolveRoute(path) {
  // Exact match first
  if (routes.has(path)) return { module: routes.get(path), params: {} };

  // Parametric match: /invoicing/inv-1 → route /invoicing with param inv-1
  const parts = path.split('/').filter(Boolean);
  if (parts.length >= 2) {
    const basePath = '/' + parts[0];
    if (routes.has(basePath)) {
      return { module: routes.get(basePath), params: { id: parts.slice(1).join('/') } };
    }
  }

  return null;
}

// ── Core route handler ──────────────────────────────────────────────────

async function handleRoute() {
  if (!mainEl || isTransitioning) return;

  const params = currentRouteParams();
  const path = params.raw;

  // ── Auth guard: redirect unauthenticated users to login ──
  if (!isPublicRoute(path) && !isAuthenticated()) {
    // Save the intended destination
    if (path && path !== '/login' && path !== '/signup' && path !== '/forgot-password') {
      sessionStorage.setItem('designdesk_return_url', path);
    }
    history.replaceState(null, '', '#/login');
    // Route to login
    const loginResolved = resolveRoute('/login');
    if (loginResolved) {
      await renderView(loginResolved, { base: '/login', id: null, segments: ['login'], raw: '/login' }, '/login');
    }
    return;
  }

  // ── Auth redirect: if authenticated and on a public route, go to dashboard ──
  if (isPublicRoute(path) && isAuthenticated()) {
    history.replaceState(null, '', '#/dashboard');
    handleRoute();
    return;
  }

  const resolved = resolveRoute(params.base) || resolveRoute(path);

  // Guard check
  if (beforeEachGuard) {
    const allowed = await Promise.resolve(beforeEachGuard({
      from: currentPath,
      to: path,
      params
    }));
    if (allowed === false) {
      // Revert hash silently
      if (currentPath) {
        history.replaceState(null, '', '#' + currentPath);
      }
      return;
    }
  }

  if (!resolved) {
    // 404
    isTransitioning = true;
    if (mainEl.children.length > 0 && currentPath !== '') {
      await fadeOut(mainEl);
    }
    if (currentView && currentView.destroy) {
      try { currentView.destroy(); } catch (e) { console.error('[router] View cleanup error:', e); }
    }
    mainEl.innerHTML = render404(path);
    fadeIn(mainEl);
    currentView = null;
    currentPath = path;
    isTransitioning = false;
    updateActiveNav(params.base);
    return;
  }

  await renderView(resolved, params, path);
}

async function renderView(resolved, params, path) {
  isTransitioning = true;
  const startTime = performance.now();

  // Fade out current content
  if (mainEl.children.length > 0 && currentPath !== '') {
    await fadeOut(mainEl);
  }

  // Cleanup previous view
  if (currentView && currentView.destroy) {
    try { currentView.destroy(); } catch (e) { console.error('[router] View cleanup error:', e); }
  }

  // Show loading briefly for perceived responsiveness
  showLoading(mainEl);

  try {
    const viewModule = resolved.module;
    currentView = viewModule;
    currentPath = path;

    const html = viewModule.render(resolved.params);
    mainEl.innerHTML = html;
    fadeIn(mainEl);

    if (viewModule.mount) {
      viewModule.mount(mainEl, resolved.params);
    }

    const elapsed = (performance.now() - startTime).toFixed(1);
    console.debug(`[router] ${params.base} rendered in ${elapsed}ms`);
  } catch (e) {
    console.error('[router] Route error:', e);
    mainEl.innerHTML = `
      <div class="view-error" style="padding:2rem;text-align:center;">
        <h2 style="color:var(--color-error,#ef4444);margin-bottom:0.5rem;">Something went wrong</h2>
        <p style="color:var(--color-text-muted,#64748b);margin-bottom:1rem;">${e.message}</p>
        <a href="#/dashboard" style="color:var(--color-primary,#6366f1);font-weight:600;text-decoration:none;">
          &larr; Back to Dashboard
        </a>
      </div>
    `;
    fadeIn(mainEl);
  }

  isTransitioning = false;
  updateActiveNav(params.base);
}

function updateActiveNav(basePath) {
  document.querySelectorAll('.sidebar-nav-item').forEach(item => {
    const itemRoute = item.dataset.route;
    item.classList.toggle('active', itemRoute === basePath || itemRoute === currentPath);
  });
}

// ── Init ────────────────────────────────────────────────────────────────

export function initRouter(containerEl) {
  mainEl = containerEl;

  window.addEventListener('hashchange', handleRoute);

  // Handle browser back/forward
  window.addEventListener('popstate', () => {
    // hashchange will fire, but popstate gives us a chance to cancel if needed
  });

  // Initial route
  if (!window.location.hash) {
    window.location.hash = isAuthenticated() ? '/dashboard' : '/login';
  } else {
    handleRoute();
  }
}
