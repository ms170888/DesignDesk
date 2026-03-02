// Local analytics — privacy-respecting, no external requests, localStorage only

const ANALYTICS_KEY = 'designdesk_analytics';
const SESSION_KEY = 'designdesk_session';
const MAX_EVENTS = 500;
const MAX_PAGE_VIEWS = 200;

let sessionStart = null;
let sessionId = null;

// ── Init ────────────────────────────────────────────────────────────────

export function initAnalytics() {
  sessionStart = Date.now();
  sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  // Track session start
  const data = getData();
  data.totalSessions = (data.totalSessions || 0) + 1;
  data.lastSessionStart = new Date().toISOString();
  saveData(data);

  // Track session duration on unload
  const unloadHandler = () => {
    const duration = Math.round((Date.now() - sessionStart) / 1000);
    const data = getData();
    data.totalSessionDuration = (data.totalSessionDuration || 0) + duration;
    data.lastSessionEnd = new Date().toISOString();
    data.lastSessionDuration = duration;
    saveData(data);
  };

  window.addEventListener('beforeunload', unloadHandler);

  // Track route changes
  const hashHandler = () => {
    const route = window.location.hash.slice(1) || '/dashboard';
    trackPageView(route);
  };
  window.addEventListener('hashchange', hashHandler);

  // Track initial page view
  const initialRoute = window.location.hash.slice(1) || '/dashboard';
  trackPageView(initialRoute);

  return () => {
    window.removeEventListener('beforeunload', unloadHandler);
    window.removeEventListener('hashchange', hashHandler);
  };
}

// ── Track page view ─────────────────────────────────────────────────────

export function trackPageView(route) {
  const data = getData();
  if (!data.pageViews) data.pageViews = [];
  if (!data.viewCounts) data.viewCounts = {};

  // Increment view count for this route
  const basePath = route.split('?')[0].split('/').slice(0, 2).join('/') || '/dashboard';
  data.viewCounts[basePath] = (data.viewCounts[basePath] || 0) + 1;

  // Store recent page views
  data.pageViews.unshift({
    route: basePath,
    timestamp: new Date().toISOString(),
    sessionId
  });

  // Trim to max
  if (data.pageViews.length > MAX_PAGE_VIEWS) {
    data.pageViews = data.pageViews.slice(0, MAX_PAGE_VIEWS);
  }

  saveData(data);
}

// ── Track generic event ─────────────────────────────────────────────────

export function trackEvent(category, action, label = '') {
  const data = getData();
  if (!data.events) data.events = [];

  data.events.unshift({
    category,
    action,
    label,
    timestamp: new Date().toISOString(),
    sessionId
  });

  // Trim
  if (data.events.length > MAX_EVENTS) {
    data.events = data.events.slice(0, MAX_EVENTS);
  }

  // Increment category counters
  if (!data.eventCounts) data.eventCounts = {};
  const key = `${category}:${action}`;
  data.eventCounts[key] = (data.eventCounts[key] || 0) + 1;

  saveData(data);
}

// ── Get analytics summary ───────────────────────────────────────────────

export function getAnalytics() {
  const data = getData();

  // Most visited pages
  const viewCounts = data.viewCounts || {};
  const topPages = Object.entries(viewCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([route, count]) => ({ route, count }));

  // Average session duration
  const totalDuration = data.totalSessionDuration || 0;
  const totalSessions = data.totalSessions || 1;
  const avgDuration = Math.round(totalDuration / totalSessions);

  // Recent activity
  const recentEvents = (data.events || []).slice(0, 20);
  const recentPageViews = (data.pageViews || []).slice(0, 20);

  // Feature usage
  const eventCounts = data.eventCounts || {};
  const topFeatures = Object.entries(eventCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([key, count]) => {
      const [category, action] = key.split(':');
      return { category, action, count };
    });

  return {
    totalSessions,
    totalSessionDuration: totalDuration,
    avgSessionDuration: avgDuration,
    lastSessionStart: data.lastSessionStart || null,
    lastSessionEnd: data.lastSessionEnd || null,
    lastSessionDuration: data.lastSessionDuration || 0,
    topPages,
    topFeatures,
    recentEvents,
    recentPageViews,
    totalPageViews: Object.values(viewCounts).reduce((s, v) => s + v, 0),
    totalEvents: (data.events || []).length
  };
}

// ── Clear analytics ─────────────────────────────────────────────────────

export function clearAnalytics() {
  localStorage.removeItem(ANALYTICS_KEY);
}

// ── Storage helpers ─────────────────────────────────────────────────────

function getData() {
  try {
    const raw = localStorage.getItem(ANALYTICS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveData(data) {
  try {
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(data));
  } catch (e) {
    // Silently fail — analytics should never break the app
    if (e.name === 'QuotaExceededError') {
      // Trim aggressively
      data.events = (data.events || []).slice(0, 50);
      data.pageViews = (data.pageViews || []).slice(0, 50);
      try { localStorage.setItem(ANALYTICS_KEY, JSON.stringify(data)); } catch { /* give up */ }
    }
  }
}
