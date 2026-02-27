// Reactive localStorage store with event bus

const STORAGE_KEY = 'designdesk_data';
const listeners = new Map();
let state = null;

export function getState() {
  if (!state) {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try { state = JSON.parse(raw); } catch { state = null; }
    }
  }
  return state;
}

export function setState(newState) {
  state = newState;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function updateState(path, value) {
  const s = getState();
  if (!s) return;
  const keys = path.split('.');
  let obj = s;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!obj[keys[i]]) obj[keys[i]] = {};
    obj = obj[keys[i]];
  }
  obj[keys[keys.length - 1]] = value;
  setState(s);
  emit(path, value);
}

export function getActiveProject() {
  const s = getState();
  if (!s) return null;
  return s.projects.find(p => p.id === s.activeProjectId) || s.projects[0];
}

export function setActiveProject(id) {
  updateState('activeProjectId', id);
  emit('projectChanged', id);
}

// Event bus
export function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(fn);
  return () => listeners.get(event).delete(fn);
}

export function emit(event, data) {
  if (listeners.has(event)) {
    listeners.get(event).forEach(fn => fn(data));
  }
}

export function initStore(seedData) {
  if (!getState()) {
    setState(seedData);
  }
}

export function resetStore(seedData) {
  localStorage.removeItem(STORAGE_KEY);
  state = null;
  setState(seedData);
  emit('reset');
}

// Helper to add activity log entries
export function addActivity(action, detail, icon = 'check') {
  const s = getState();
  if (!s.activities) s.activities = [];
  s.activities.unshift({
    id: Date.now().toString(36),
    action,
    detail,
    icon,
    timestamp: new Date().toISOString(),
    projectId: s.activeProjectId
  });
  if (s.activities.length > 50) s.activities = s.activities.slice(0, 50);
  setState(s);
  emit('activityAdded');
}
