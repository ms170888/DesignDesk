// Reactive localStorage store with event bus, undo/redo, computed getters, batch updates

const STORAGE_KEY = 'designdesk_data';
const UNDO_LIMIT = 20;

const listeners = new Map();
let state = null;
let undoStack = [];
let redoStack = [];
let batchDepth = 0;
let batchPendingEvents = [];

// ── Deep clone ──────────────────────────────────────────────────────────

function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (Array.isArray(obj)) return obj.map(deepClone);
  const cloned = {};
  for (const key of Object.keys(obj)) {
    cloned[key] = deepClone(obj[key]);
  }
  return cloned;
}

// ── Persistence ─────────────────────────────────────────────────────────

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.warn('[store] localStorage quota exceeded. Attempting to trim activities.');
      if (state && state.activities && state.activities.length > 20) {
        state.activities = state.activities.slice(0, 20);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* give up */ }
      }
    }
  }
}

// ── Validation ──────────────────────────────────────────────────────────

const REQUIRED_ROOT_KEYS = ['projects', 'items', 'tasks', 'invoices', 'suppliers', 'activities', 'notifications', 'settings', 'moodboards', 'floorplans'];

function validateState(s) {
  if (!s || typeof s !== 'object') return 'State must be a non-null object';
  for (const key of REQUIRED_ROOT_KEYS) {
    if (!(key in s)) return `Missing required key: "${key}"`;
  }
  if (!Array.isArray(s.projects)) return '"projects" must be an array';
  if (!Array.isArray(s.items)) return '"items" must be an array';
  if (!Array.isArray(s.tasks)) return '"tasks" must be an array';
  if (!Array.isArray(s.invoices)) return '"invoices" must be an array';
  if (typeof s.settings !== 'object') return '"settings" must be an object';
  return null;
}

// ── Public API: State access ────────────────────────────────────────────

export function getState() {
  if (!state) {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try { state = JSON.parse(raw); } catch { state = null; }
    }
  }
  return state ? deepClone(state) : null;
}

/** Returns direct reference for internal reads (no clone overhead). Do NOT mutate. */
function getStateRef() {
  if (!state) {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try { state = JSON.parse(raw); } catch { state = null; }
    }
  }
  return state;
}

export function setState(newState) {
  const error = validateState(newState);
  if (error) {
    console.error('[store] setState validation failed:', error);
    return;
  }
  pushUndo();
  state = deepClone(newState);
  persist();
  emit('stateChanged', null);
}

export function updateState(path, value) {
  const s = getStateRef();
  if (!s) return;
  pushUndo();
  const keys = path.split('.');
  let obj = s;
  for (let i = 0; i < keys.length - 1; i++) {
    if (obj[keys[i]] == null || typeof obj[keys[i]] !== 'object') obj[keys[i]] = {};
    obj = obj[keys[i]];
  }
  obj[keys[keys.length - 1]] = value;
  persist();
  emitOrBatch(path, value);
}

// ── Batch updates ───────────────────────────────────────────────────────

export function batchUpdate(updates) {
  if (!Array.isArray(updates) || updates.length === 0) return;
  batchDepth++;
  const s = getStateRef();
  if (!s) { batchDepth--; return; }
  pushUndo();
  for (const { path, value } of updates) {
    const keys = path.split('.');
    let obj = s;
    for (let i = 0; i < keys.length - 1; i++) {
      if (obj[keys[i]] == null || typeof obj[keys[i]] !== 'object') obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    batchPendingEvents.push({ path, value });
  }
  persist();
  batchDepth--;
  if (batchDepth === 0) {
    const events = batchPendingEvents.slice();
    batchPendingEvents = [];
    for (const { path, value } of events) {
      emit(path, value);
    }
    emit('stateChanged', null);
  }
}

function emitOrBatch(event, data) {
  if (batchDepth > 0) {
    batchPendingEvents.push({ path: event, value: data });
  } else {
    emit(event, data);
    emit('stateChanged', data);
  }
}

// ── Undo / Redo ─────────────────────────────────────────────────────────

function pushUndo() {
  if (!state) return;
  undoStack.push(JSON.stringify(state));
  if (undoStack.length > UNDO_LIMIT) undoStack.shift();
  redoStack = [];
}

export function undo() {
  if (undoStack.length === 0) return false;
  redoStack.push(JSON.stringify(state));
  const prev = undoStack.pop();
  state = JSON.parse(prev);
  persist();
  emit('stateChanged', null);
  emit('undo', null);
  return true;
}

export function redo() {
  if (redoStack.length === 0) return false;
  undoStack.push(JSON.stringify(state));
  const next = redoStack.pop();
  state = JSON.parse(next);
  persist();
  emit('stateChanged', null);
  emit('redo', null);
  return true;
}

export function canUndo() { return undoStack.length > 0; }
export function canRedo() { return redoStack.length > 0; }

// ── Project helpers ─────────────────────────────────────────────────────

export function getActiveProject() {
  const s = getStateRef();
  if (!s) return null;
  return s.projects.find(p => p.id === s.activeProjectId) || s.projects[0] || null;
}

export function setActiveProject(id) {
  updateState('activeProjectId', id);
  emit('projectChanged', id);
}

// ── Computed getters ────────────────────────────────────────────────────

export function getProjectItems(projectId) {
  const s = getStateRef();
  if (!s) return [];
  const pid = projectId || s.activeProjectId;
  return s.items.filter(i => i.projectId === pid);
}

export function getProjectTasks(projectId) {
  const s = getStateRef();
  if (!s) return [];
  const pid = projectId || s.activeProjectId;
  return s.tasks.filter(t => t.projectId === pid);
}

export function getProjectInvoices(projectId) {
  const s = getStateRef();
  if (!s) return [];
  const pid = projectId || s.activeProjectId;
  return s.invoices.filter(i => i.projectId === pid);
}

export function getProjectBudget(projectId) {
  const items = getProjectItems(projectId);
  const totalTrade = items.reduce((sum, i) => sum + (i.trade || 0), 0);
  const totalClient = items.reduce((sum, i) => sum + (i.trade || 0) * (1 + (i.markup || 0) / 100), 0);
  const totalMargin = totalClient - totalTrade;
  const marginPercent = totalClient > 0 ? Math.round((totalMargin / totalClient) * 100) : 0;
  return { totalTrade, totalClient, totalMargin, marginPercent };
}

// ── Event bus ───────────────────────────────────────────────────────────

export function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(fn);
  return () => listeners.get(event)?.delete(fn);
}

export function off(event, fn) {
  listeners.get(event)?.delete(fn);
}

export function emit(event, data) {
  if (listeners.has(event)) {
    listeners.get(event).forEach(fn => {
      try { fn(data); } catch (e) { console.error('[store] Listener error:', e); }
    });
  }
  // Wildcard listeners
  if (event !== '*' && listeners.has('*')) {
    listeners.get('*').forEach(fn => {
      try { fn({ event, data }); } catch (e) { console.error('[store] Wildcard listener error:', e); }
    });
  }
}

// ── Init / Reset ────────────────────────────────────────────────────────

export function initStore(seedData) {
  if (!getStateRef()) {
    const error = validateState(seedData);
    if (error) {
      console.error('[store] Seed data validation failed:', error);
      return;
    }
    state = deepClone(seedData);
    persist();
  }
  undoStack = [];
  redoStack = [];
}

export function resetStore(seedData) {
  localStorage.removeItem(STORAGE_KEY);
  state = null;
  undoStack = [];
  redoStack = [];
  const error = validateState(seedData);
  if (error) {
    console.error('[store] Seed data validation failed:', error);
    return;
  }
  state = deepClone(seedData);
  persist();
  emit('reset', null);
  emit('stateChanged', null);
}

// ── Activity log ────────────────────────────────────────────────────────

export function addActivity(action, detail, icon = 'check') {
  const s = getStateRef();
  if (!s) return;
  if (!s.activities) s.activities = [];
  pushUndo();
  s.activities.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    action,
    detail,
    icon,
    timestamp: new Date().toISOString(),
    projectId: s.activeProjectId
  });
  if (s.activities.length > 50) s.activities = s.activities.slice(0, 50);
  persist();
  emit('activityAdded', null);
  emit('stateChanged', null);
}

// ── Export / Import ─────────────────────────────────────────────────────

export function exportData() {
  const s = getStateRef();
  if (!s) return null;
  return deepClone(s);
}

export function importData(data) {
  const error = validateState(data);
  if (error) {
    console.error('[store] Import validation failed:', error);
    return false;
  }
  pushUndo();
  state = deepClone(data);
  persist();
  emit('stateChanged', null);
  emit('reset', null);
  return true;
}

// ── LocalStorage quota check ────────────────────────────────────────────

export function checkStorageQuota() {
  try {
    const total = Object.keys(localStorage).reduce((sum, key) => {
      return sum + ((localStorage.getItem(key) || '').length * 2);
    }, 0);
    const limitEstimate = 5 * 1024 * 1024; // 5MB typical
    return {
      usedBytes: total,
      usedMB: (total / (1024 * 1024)).toFixed(2),
      estimatedLimitMB: 5,
      percentUsed: Math.round((total / limitEstimate) * 100)
    };
  } catch {
    return { usedBytes: 0, usedMB: '0', estimatedLimitMB: 5, percentUsed: 0 };
  }
}
