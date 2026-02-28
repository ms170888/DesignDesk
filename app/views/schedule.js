// Construction Schedule — Production Gantt Chart + List + Board Views

import { getState, setState, getActiveProject, addActivity } from '../store.js';
import { formatDate, formatDateShort, generateId, downloadAsCsv, capitalize, sanitizeHtml } from '../core/utils.js';
import { icons } from '../core/icons.js';
import { showModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

// ── Constants ──────────────────────────────────────────────────────────
const PHASE_COLORS = {
  structural: { bg: '#ef4444', label: 'Structural' },
  firstfix:   { bg: '#f59e0b', label: 'First Fix' },
  finishing:  { bg: '#3b82f6', label: 'Finishing' },
  install:    { bg: '#10b981', label: 'Install' },
};
const DAY_MS = 86400000;
const ZOOM_LEVELS = { day: { dayWidth: 36, label: 'Day' }, week: { dayWidth: 18, label: 'Week' }, month: { dayWidth: 6, label: 'Month' } };
const ROW_HEIGHT = 44;
const HEADER_HEIGHT = 54;
const LABEL_WIDTH = 220;

// ── Module state ───────────────────────────────────────────────────────
let dragState = null;
let currentView = 'gantt'; // gantt | list | board
let zoomLevel = 'week';
let contextMenu = null;
let selectedTasks = new Set();
let dependencyMode = null; // null | { sourceId }

// ── Helpers ────────────────────────────────────────────────────────────
function getProjectTasks() {
  const state = getState();
  const project = getActiveProject();
  if (!state || !project) return [];
  return state.tasks.filter(t => t.projectId === project.id);
}

function toDateStr(d) {
  return d.toISOString().split('T')[0];
}

function parseLeadWeeks(str) {
  if (!str) return 0;
  const m = str.match(/(\d+)/);
  return m ? parseInt(m[1]) : 0;
}

function getDateRange(tasks) {
  if (!tasks.length) return { minDate: new Date(), maxDate: new Date(), totalDays: 60 };
  const allDates = tasks.flatMap(t => [new Date(t.start), new Date(t.end)]);
  const minDate = new Date(Math.min(...allDates));
  const maxDate = new Date(Math.max(...allDates));
  minDate.setDate(minDate.getDate() - 10);
  maxDate.setDate(maxDate.getDate() + 21);
  const totalDays = Math.ceil((maxDate - minDate) / DAY_MS);
  return { minDate, maxDate, totalDays };
}

function dayX(date, minDate, dayWidth) {
  return Math.round((date - minDate) / DAY_MS) * dayWidth;
}

function isWeekend(date) {
  const d = date.getDay();
  return d === 0 || d === 6;
}

function phaseColor(phase) {
  return PHASE_COLORS[phase]?.bg || '#6366f1';
}

function phaseLabel(phase) {
  return PHASE_COLORS[phase]?.label || capitalize(phase);
}

function taskDuration(task) {
  return Math.max(1, Math.ceil((new Date(task.end) - new Date(task.start)) / DAY_MS));
}

function isMilestone(task) {
  return task.milestone === true;
}

// ── Critical Path ──────────────────────────────────────────────────────
function computeCriticalPath(tasks) {
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const memo = new Map();

  function longestPath(taskId) {
    if (memo.has(taskId)) return memo.get(taskId);
    const task = taskMap.get(taskId);
    if (!task) { memo.set(taskId, { length: 0, chain: [] }); return memo.get(taskId); }

    const deps = (task.depends || []).filter(d => taskMap.has(d));
    if (deps.length === 0) {
      const result = { length: taskDuration(task), chain: [taskId] };
      memo.set(taskId, result);
      return result;
    }

    let best = { length: 0, chain: [] };
    for (const depId of deps) {
      const sub = longestPath(depId);
      if (sub.length > best.length) best = sub;
    }
    const result = { length: best.length + taskDuration(task), chain: [...best.chain, taskId] };
    memo.set(taskId, result);
    return result;
  }

  // Find the task with the longest path (the end of the critical path)
  let longest = { length: 0, chain: [] };
  for (const task of tasks) {
    const path = longestPath(task.id);
    if (path.length > longest.length) longest = path;
  }
  return new Set(longest.chain);
}

// ── Circular dependency detection ──────────────────────────────────────
function hasCircularDependency(tasks, fromId, toId) {
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const visited = new Set();

  function dfs(id) {
    if (id === fromId) return true;
    if (visited.has(id)) return false;
    visited.add(id);
    const task = taskMap.get(id);
    if (!task) return false;
    for (const dep of (task.depends || [])) {
      if (dfs(dep)) return true;
    }
    return false;
  }

  return dfs(toId);
}

// ── Overall project progress (weighted by duration) ────────────────────
function overallProgress(tasks) {
  if (!tasks.length) return 0;
  let totalWeight = 0, totalProgress = 0;
  for (const t of tasks) {
    const dur = taskDuration(t);
    totalWeight += dur;
    totalProgress += dur * (t.progress || 0);
  }
  return totalWeight > 0 ? Math.round(totalProgress / totalWeight) : 0;
}

function behindScheduleTasks(tasks) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return tasks.filter(t => new Date(t.end) < today && (t.progress || 0) < 100);
}

// ── Confetti animation ─────────────────────────────────────────────────
function fireConfetti(el) {
  const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#ec4899'];
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;overflow:hidden;';
  document.body.appendChild(container);
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    const size = 6 + Math.random() * 6;
    piece.style.cssText = `position:absolute;width:${size}px;height:${size}px;background:${colors[Math.floor(Math.random() * colors.length)]};border-radius:${Math.random() > 0.5 ? '50%' : '2px'};left:${Math.random() * 100}%;top:-10px;opacity:1;`;
    container.appendChild(piece);
    const duration = 1500 + Math.random() * 1500;
    const xDrift = (Math.random() - 0.5) * 200;
    piece.animate([
      { transform: `translate(0, 0) rotate(0deg)`, opacity: 1 },
      { transform: `translate(${xDrift}px, ${window.innerHeight + 50}px) rotate(${360 + Math.random() * 360}deg)`, opacity: 0 }
    ], { duration, easing: 'cubic-bezier(.2,.8,.3,1)' });
  }
  setTimeout(() => container.remove(), 3500);
}

// ══════════════════════════════════════════════════════════════════════════
//  RENDER
// ══════════════════════════════════════════════════════════════════════════
export function render() {
  const project = getActiveProject();
  if (!project) return '<div class="empty-state"><h2>No project selected</h2></div>';

  const tasks = getProjectTasks();
  const progress = overallProgress(tasks);
  const behind = behindScheduleTasks(tasks);

  return `
    <div class="view-schedule">
      <div class="view-header">
        <div>
          <h1>Construction Schedule</h1>
          <div class="schedule-project-info">${sanitizeHtml(project.name)} &mdash; ${tasks.length} tasks</div>
        </div>
        <div class="header-actions">
          <button class="btn btn-outline btn-sm" id="export-csv-btn">${icons.printer} Export CSV</button>
          <button class="btn btn-outline btn-sm" id="print-btn">${icons.printer} Print</button>
          <button class="btn btn-primary btn-sm" id="add-task-btn">${icons.plus} Add Task</button>
        </div>
      </div>

      <!-- Progress bar -->
      <div class="schedule-progress-bar">
        <div class="schedule-progress-label">
          <span>Overall Progress</span>
          <span class="schedule-progress-pct">${progress}%</span>
        </div>
        <div class="schedule-progress-track">
          <div class="schedule-progress-fill" style="width:${progress}%;background:${progress >= 100 ? 'var(--success)' : 'var(--primary)'}"></div>
        </div>
        ${behind.length > 0 ? `<div class="schedule-behind-warning">${icons.bell} ${behind.length} task${behind.length > 1 ? 's' : ''} behind schedule</div>` : ''}
      </div>

      <!-- View tabs + Zoom controls -->
      <div class="schedule-toolbar">
        <div class="schedule-view-tabs">
          <button class="schedule-tab ${currentView === 'gantt' ? 'active' : ''}" data-view="gantt">${icons.schedule} Gantt</button>
          <button class="schedule-tab ${currentView === 'list' ? 'active' : ''}" data-view="list">${icons.procurement} List</button>
          <button class="schedule-tab ${currentView === 'board' ? 'active' : ''}" data-view="board">${icons.dashboard} Board</button>
        </div>
        ${currentView === 'gantt' ? `
        <div class="schedule-zoom-controls">
          <span class="zoom-label">Zoom:</span>
          ${Object.entries(ZOOM_LEVELS).map(([key, val]) => `<button class="zoom-btn ${zoomLevel === key ? 'active' : ''}" data-zoom="${key}">${val.label}</button>`).join('')}
        </div>
        <div class="schedule-gantt-legend">
          ${Object.entries(PHASE_COLORS).map(([key, val]) => `<span class="gantt-legend-item"><span class="legend-dot" style="background:${val.bg}"></span>${val.label}</span>`).join('')}
          <span class="gantt-legend-item"><span class="legend-dot" style="background:#ef4444;border:2px solid #ef4444;box-shadow:0 0 0 2px rgba(239,68,68,.3)"></span>Critical</span>
        </div>
        ` : ''}
        ${selectedTasks.size > 0 ? `
        <div class="schedule-bulk-actions">
          <span>${selectedTasks.size} selected</span>
          <button class="btn btn-sm btn-outline" id="bulk-progress-btn">Set Progress</button>
          <button class="btn btn-sm btn-outline" id="bulk-clear-btn">${icons.close} Clear</button>
        </div>
        ` : ''}
      </div>

      <!-- View content -->
      <div class="schedule-view-content">
        ${currentView === 'gantt' ? renderGantt(tasks) : currentView === 'list' ? renderList(tasks) : renderBoard(tasks)}
      </div>

      <!-- Context menu placeholder -->
      <div id="gantt-context-menu" class="gantt-context-menu hidden"></div>
    </div>
  `;
}

// ══════════════════════════════════════════════════════════════════════════
//  GANTT VIEW
// ══════════════════════════════════════════════════════════════════════════
function renderGantt(tasks) {
  if (tasks.length === 0) return '<div class="empty-state"><h2>No tasks yet</h2><p>Add your first construction task to get started.</p></div>';

  const { dayWidth } = ZOOM_LEVELS[zoomLevel];
  const { minDate, maxDate, totalDays } = getDateRange(tasks);
  const chartWidth = totalDays * dayWidth;
  const chartHeight = HEADER_HEIGHT + tasks.length * ROW_HEIGHT + 20;
  const criticalPath = computeCriticalPath(tasks);

  // Build month headers
  const months = [];
  let d = new Date(minDate);
  while (d < maxDate) {
    const mStart = new Date(d);
    const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const mEnd = nextMonth < maxDate ? nextMonth : maxDate;
    const x = dayX(mStart, minDate, dayWidth);
    const w = dayX(mEnd, minDate, dayWidth) - x;
    months.push({ label: d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }), x, width: w });
    d = nextMonth;
  }

  // Build day/week sub-headers based on zoom
  let subHeaders = '';
  if (zoomLevel === 'day') {
    for (let i = 0; i < totalDays; i++) {
      const dd = new Date(minDate.getTime() + i * DAY_MS);
      const x = i * dayWidth;
      subHeaders += `<text x="${x + dayWidth / 2}" y="48" font-size="9" fill="${isWeekend(dd) ? '#cbd5e1' : '#94a3b8'}" text-anchor="middle">${dd.getDate()}</text>`;
    }
  } else if (zoomLevel === 'week') {
    for (let i = 0; i < totalDays; i += 7) {
      const dd = new Date(minDate.getTime() + i * DAY_MS);
      const x = i * dayWidth;
      subHeaders += `<text x="${x + 4}" y="48" font-size="9" fill="#94a3b8">${dd.getDate()} ${dd.toLocaleDateString('en-GB', { month: 'short' })}</text>`;
    }
  }

  // Weekend highlighting
  let weekendBars = '';
  if (zoomLevel !== 'month') {
    for (let i = 0; i < totalDays; i++) {
      const dd = new Date(minDate.getTime() + i * DAY_MS);
      if (isWeekend(dd)) {
        weekendBars += `<rect x="${i * dayWidth}" y="${HEADER_HEIGHT}" width="${dayWidth}" height="${chartHeight - HEADER_HEIGHT}" fill="#f8fafc" opacity="0.7"/>`;
      }
    }
  }

  // Grid lines
  let gridLines = '';
  const gridStep = zoomLevel === 'day' ? 1 : zoomLevel === 'week' ? 7 : 30;
  for (let i = 0; i < totalDays; i += gridStep) {
    gridLines += `<line x1="${i * dayWidth}" y1="${HEADER_HEIGHT}" x2="${i * dayWidth}" y2="${chartHeight}" stroke="#f1f5f9" stroke-width="0.5"/>`;
  }

  // Row backgrounds
  let rowBgs = '';
  for (let i = 0; i < tasks.length; i++) {
    rowBgs += `<rect x="0" y="${HEADER_HEIGHT + i * ROW_HEIGHT}" width="${chartWidth}" height="${ROW_HEIGHT}" fill="${i % 2 === 0 ? 'transparent' : '#fafbfc'}"/>`;
  }

  // Today marker
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayX = dayX(today, minDate, dayWidth);
  const showToday = todayX > 0 && todayX < chartWidth;

  // Dependency arrows (bezier)
  const arrows = tasks.flatMap((task, i) =>
    (task.depends || []).map(depId => {
      const depIdx = tasks.findIndex(t => t.id === depId);
      if (depIdx < 0) return '';
      const dep = tasks[depIdx];
      const lag = task.lagDays || 0;
      const fromX = dayX(new Date(dep.end), minDate, dayWidth);
      const fromY = HEADER_HEIGHT + depIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
      const toX = dayX(new Date(task.start), minDate, dayWidth);
      const toY = HEADER_HEIGHT + i * ROW_HEIGHT + ROW_HEIGHT / 2;
      const midX = (fromX + toX) / 2;
      const isCritical = criticalPath.has(task.id) && criticalPath.has(dep.id);
      const color = isCritical ? '#ef4444' : '#94a3b8';
      return `<path d="M${fromX},${fromY} C${midX},${fromY} ${midX},${toY} ${toX},${toY}" fill="none" stroke="${color}" stroke-width="${isCritical ? 2 : 1.5}" stroke-dasharray="${lag > 0 ? '4,3' : 'none'}" marker-end="url(#arrow${isCritical ? '-critical' : ''})"/>`;
    })
  ).join('');

  // Task bars
  const bars = tasks.map((task, i) => {
    const startPx = dayX(new Date(task.start), minDate, dayWidth);
    const endPx = dayX(new Date(task.end), minDate, dayWidth);
    const w = Math.max(endPx - startPx, dayWidth);
    const y = HEADER_HEIGHT + i * ROW_HEIGHT + 8;
    const barH = ROW_HEIGHT - 16;
    const color = phaseColor(task.phase);
    const isCrit = criticalPath.has(task.id);
    const isSel = selectedTasks.has(task.id);
    const prog = task.progress || 0;
    const isBehind = new Date(task.end) < today && prog < 100;
    const milestone = isMilestone(task);

    if (milestone) {
      // Diamond milestone marker
      const cx = startPx;
      const cy = y + barH / 2;
      const r = 8;
      return `<g class="gantt-bar" data-id="${task.id}">
        <polygon points="${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}" fill="${color}" stroke="${isCrit ? '#ef4444' : color}" stroke-width="${isCrit ? 2.5 : 1.5}"/>
        <text x="${cx + r + 4}" y="${cy + 4}" font-size="11" fill="${color}" font-weight="600">${sanitizeHtml(task.name)}</text>
      </g>`;
    }

    // Truncated label fitting
    const maxTextChars = Math.floor((w - 12) / 7);
    const barLabel = task.name.length > maxTextChars && maxTextChars > 3
      ? task.name.slice(0, maxTextChars - 1) + '\u2026'
      : maxTextChars > 3 ? task.name : '';

    return `<g class="gantt-bar ${isSel ? 'selected' : ''}" data-id="${task.id}">
      <!-- Full bar background -->
      <rect x="${startPx}" y="${y}" width="${w}" height="${barH}" rx="4" fill="${color}" opacity="0.15" class="gantt-bar-bg"/>
      <!-- Progress fill -->
      <rect x="${startPx}" y="${y}" width="${Math.round(w * prog / 100)}" height="${barH}" rx="4" fill="${color}" opacity="0.6" class="gantt-bar-fill"/>
      <!-- Striped progress overlay -->
      <rect x="${startPx}" y="${y}" width="${Math.round(w * prog / 100)}" height="${barH}" rx="4" fill="url(#stripe-pattern)" opacity="0.1"/>
      <!-- Outline -->
      <rect x="${startPx}" y="${y}" width="${w}" height="${barH}" rx="4" fill="transparent" stroke="${isCrit ? '#ef4444' : isBehind ? '#ef4444' : color}" stroke-width="${isCrit ? 2.5 : isSel ? 2 : 1.5}" stroke-dasharray="${isBehind && !isCrit ? '4,2' : 'none'}" class="gantt-bar-outline" style="cursor:grab"/>
      <!-- Label on bar -->
      <text x="${startPx + 6}" y="${y + barH / 2 + 4}" font-size="11" fill="${prog > 40 ? '#fff' : color}" font-weight="600" class="gantt-bar-text">${sanitizeHtml(barLabel)}</text>
      <!-- Left resize handle -->
      <rect x="${startPx}" y="${y + 4}" width="6" height="${barH - 8}" rx="2" fill="${color}" opacity="0.01" class="gantt-resize-left" style="cursor:ew-resize"/>
      <!-- Right resize handle -->
      <rect x="${endPx - 6}" y="${y + 4}" width="6" height="${barH - 8}" rx="2" fill="${color}" opacity="0.3" class="gantt-resize-right" style="cursor:ew-resize"/>
      ${isBehind ? `<text x="${endPx + 6}" y="${y + barH / 2 + 4}" font-size="10" fill="#ef4444" font-weight="600">LATE</text>` : ''}
      ${(task.depends || []).some(d => !getProjectTasks().find(t2 => t2.id === d)) ? `<circle cx="${startPx - 6}" cy="${y + barH / 2}" r="4" fill="#f59e0b" stroke="#fff" stroke-width="1"/>` : ''}
    </g>`;
  }).join('');

  // Label panel
  const labels = tasks.map((t, i) => {
    const isSel = selectedTasks.has(t.id);
    const indent = (t.indent || 0) * 16;
    return `<div class="gantt-label ${isSel ? 'selected' : ''}" data-id="${t.id}" style="height:${ROW_HEIGHT}px">
      <input type="checkbox" class="gantt-select-cb" data-id="${t.id}" ${isSel ? 'checked' : ''} />
      <div style="margin-left:${indent}px">
        <span class="gantt-task-name" title="${sanitizeHtml(t.name)}">${sanitizeHtml(t.name)}</span>
        <span class="gantt-task-contractor text-muted">${sanitizeHtml(t.contractor || '')}</span>
      </div>
    </div>`;
  }).join('');

  return `
    <div class="gantt-container">
      <div class="gantt-labels" style="width:${LABEL_WIDTH}px">
        <div class="gantt-label-header" style="height:${HEADER_HEIGHT}px">Task</div>
        ${labels}
      </div>
      <div class="gantt-scroll" id="gantt-scroll">
        <svg width="${chartWidth}" height="${chartHeight}" class="gantt-svg" id="gantt-svg">
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <path d="M0,0 L8,3 L0,6" fill="#94a3b8"/>
            </marker>
            <marker id="arrow-critical" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <path d="M0,0 L8,3 L0,6" fill="#ef4444"/>
            </marker>
            <pattern id="stripe-pattern" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="#fff" stroke-width="2"/>
            </pattern>
          </defs>
          ${weekendBars}
          ${rowBgs}
          ${gridLines}
          ${months.map(m => `<g>
            <rect x="${m.x}" y="0" width="${m.width}" height="32" fill="#f8fafc" stroke="#e2e8f0" stroke-width="0.5"/>
            <text x="${m.x + 8}" y="22" font-size="12" fill="#64748b" font-weight="600">${m.label}</text>
          </g>`).join('')}
          ${subHeaders}
          ${showToday ? `
            <line x1="${todayX}" y1="${HEADER_HEIGHT}" x2="${todayX}" y2="${chartHeight}" stroke="#ef4444" stroke-width="2" stroke-dasharray="6,3"/>
            <rect x="${todayX - 18}" y="${HEADER_HEIGHT - 2}" width="36" height="16" rx="3" fill="#ef4444"/>
            <text x="${todayX}" y="${HEADER_HEIGHT + 10}" font-size="9" fill="#fff" font-weight="700" text-anchor="middle">Today</text>
          ` : ''}
          ${arrows}
          ${bars}
        </svg>
      </div>
    </div>
  `;
}

// ══════════════════════════════════════════════════════════════════════════
//  LIST VIEW
// ══════════════════════════════════════════════════════════════════════════
function renderList(tasks) {
  if (tasks.length === 0) return '<div class="empty-state"><h2>No tasks yet</h2></div>';

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const criticalPath = computeCriticalPath(tasks);

  const rows = tasks.map(t => {
    const dur = taskDuration(t);
    const prog = t.progress || 0;
    const isBehind = new Date(t.end) < today && prog < 100;
    const isCrit = criticalPath.has(t.id);
    const color = phaseColor(t.phase);

    return `<tr class="schedule-list-row ${isBehind ? 'behind' : ''}" data-id="${t.id}">
      <td><input type="checkbox" class="gantt-select-cb" data-id="${t.id}" ${selectedTasks.has(t.id) ? 'checked' : ''} /></td>
      <td>
        <span class="phase-dot" style="background:${color}"></span>
        <strong>${sanitizeHtml(t.name)}</strong>
        ${isMilestone(t) ? '<span class="milestone-badge">Milestone</span>' : ''}
        ${isCrit ? '<span class="critical-badge">Critical</span>' : ''}
      </td>
      <td>${sanitizeHtml(t.contractor || '-')}</td>
      <td><span class="phase-chip" style="background:${color}20;color:${color}">${phaseLabel(t.phase)}</span></td>
      <td>${formatDateShort(t.start)}</td>
      <td>${formatDateShort(t.end)}</td>
      <td>${dur}d</td>
      <td>
        <div class="list-progress">
          <div class="list-progress-bar" style="width:${prog}%;background:${prog >= 100 ? 'var(--success)' : color}"></div>
        </div>
        <span class="list-progress-label">${prog}%</span>
      </td>
      <td>
        ${isBehind ? '<span class="status-badge status-overdue">Behind</span>' : prog >= 100 ? '<span class="status-badge status-done">Done</span>' : '<span class="status-badge status-active">Active</span>'}
      </td>
      <td>
        <button class="btn-icon list-edit-btn" data-id="${t.id}" title="Edit">${icons.edit}</button>
        <button class="btn-icon list-delete-btn" data-id="${t.id}" title="Delete">${icons.trash}</button>
      </td>
    </tr>`;
  }).join('');

  return `
    <div class="schedule-list-wrapper">
      <table class="schedule-list-table">
        <thead>
          <tr>
            <th style="width:32px"></th>
            <th>Task</th>
            <th>Contractor</th>
            <th>Phase</th>
            <th>Start</th>
            <th>End</th>
            <th>Duration</th>
            <th style="width:140px">Progress</th>
            <th>Status</th>
            <th style="width:80px">Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// ══════════════════════════════════════════════════════════════════════════
//  BOARD VIEW (Kanban by phase)
// ══════════════════════════════════════════════════════════════════════════
function renderBoard(tasks) {
  const phases = Object.entries(PHASE_COLORS);
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const columns = phases.map(([key, val]) => {
    const phaseTasks = tasks.filter(t => t.phase === key);
    const cards = phaseTasks.map(t => {
      const prog = t.progress || 0;
      const isBehind = new Date(t.end) < today && prog < 100;
      return `<div class="board-card ${isBehind ? 'behind' : ''}" data-id="${t.id}">
        <div class="board-card-header">
          <strong>${sanitizeHtml(t.name)}</strong>
          ${isMilestone(t) ? '<span class="milestone-badge">M</span>' : ''}
        </div>
        <div class="board-card-meta">
          <span>${sanitizeHtml(t.contractor || '-')}</span>
          <span>${formatDateShort(t.start)} - ${formatDateShort(t.end)}</span>
        </div>
        <div class="board-card-progress">
          <div class="board-progress-bar" style="width:${prog}%;background:${val.bg}"></div>
        </div>
        <span class="board-progress-label">${prog}%</span>
        ${isBehind ? '<span class="board-behind-flag">Behind schedule</span>' : ''}
      </div>`;
    }).join('');

    return `<div class="board-column">
      <div class="board-column-header" style="border-top:3px solid ${val.bg}">
        <span>${val.label}</span>
        <span class="board-count">${phaseTasks.length}</span>
      </div>
      <div class="board-column-body">${cards || '<div class="board-empty">No tasks</div>'}</div>
    </div>`;
  }).join('');

  return `<div class="schedule-board">${columns}</div>`;
}

// ══════════════════════════════════════════════════════════════════════════
//  TOOLTIP
// ══════════════════════════════════════════════════════════════════════════
function showTooltip(task, x, y) {
  removeTooltip();
  const tasks = getProjectTasks();
  const deps = (task.depends || []).map(dId => tasks.find(t => t.id === dId)?.name || 'Unknown').join(', ');
  const dur = taskDuration(task);
  const tip = document.createElement('div');
  tip.className = 'gantt-tooltip';
  tip.innerHTML = `
    <div class="gantt-tooltip-title">${sanitizeHtml(task.name)}</div>
    <div class="gantt-tooltip-row"><span>Contractor:</span> ${sanitizeHtml(task.contractor || '-')}</div>
    <div class="gantt-tooltip-row"><span>Phase:</span> ${phaseLabel(task.phase)}</div>
    <div class="gantt-tooltip-row"><span>Start:</span> ${formatDate(task.start)}</div>
    <div class="gantt-tooltip-row"><span>End:</span> ${formatDate(task.end)}</div>
    <div class="gantt-tooltip-row"><span>Duration:</span> ${dur} day${dur !== 1 ? 's' : ''}</div>
    <div class="gantt-tooltip-row"><span>Progress:</span> ${task.progress || 0}%</div>
    ${deps ? `<div class="gantt-tooltip-row"><span>Depends on:</span> ${sanitizeHtml(deps)}</div>` : ''}
    ${task.notes ? `<div class="gantt-tooltip-notes">${sanitizeHtml(task.notes)}</div>` : ''}
  `;
  tip.style.left = x + 'px';
  tip.style.top = y + 'px';
  document.body.appendChild(tip);

  // Clamp within viewport
  const rect = tip.getBoundingClientRect();
  if (rect.right > window.innerWidth - 10) tip.style.left = (x - rect.width - 10) + 'px';
  if (rect.bottom > window.innerHeight - 10) tip.style.top = (y - rect.height - 10) + 'px';
}

function removeTooltip() {
  document.querySelectorAll('.gantt-tooltip').forEach(t => t.remove());
}

// ══════════════════════════════════════════════════════════════════════════
//  CONTEXT MENU
// ══════════════════════════════════════════════════════════════════════════
function showContextMenu(task, x, y, el) {
  hideContextMenu();
  const menu = el.querySelector('#gantt-context-menu');
  if (!menu) return;

  menu.innerHTML = `
    <div class="ctx-item" data-action="edit">${icons.edit} Edit Task</div>
    <div class="ctx-item" data-action="progress">Set Progress</div>
    <div class="ctx-item" data-action="phase">Change Phase</div>
    <div class="ctx-item" data-action="dep-add">Add Dependency</div>
    <div class="ctx-item" data-action="dep-remove">Remove Dependency</div>
    <div class="ctx-divider"></div>
    <div class="ctx-item ctx-danger" data-action="delete">${icons.trash} Delete</div>
  `;
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  menu.classList.remove('hidden');

  menu.querySelectorAll('.ctx-item').forEach(item => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      hideContextMenu();
      handleContextAction(action, task, el);
    });
  });

  // Close on click outside
  const closeHandler = (e) => {
    if (!menu.contains(e.target)) {
      hideContextMenu();
      document.removeEventListener('click', closeHandler);
    }
  };
  setTimeout(() => document.addEventListener('click', closeHandler), 10);
}

function hideContextMenu() {
  document.querySelectorAll('.gantt-context-menu').forEach(m => {
    m.classList.add('hidden');
    m.innerHTML = '';
  });
}

function handleContextAction(action, task, el) {
  const state = getState();
  const tasks = state.tasks;
  const idx = tasks.findIndex(t => t.id === task.id);
  if (idx < 0 && action !== 'edit') return;

  switch (action) {
    case 'edit':
      showTaskForm(task);
      break;
    case 'progress':
      showProgressModal(task, el);
      break;
    case 'phase':
      showPhaseModal(task, el);
      break;
    case 'dep-add':
      dependencyMode = { sourceId: task.id };
      showToast('Click another task bar to create dependency', 'info');
      break;
    case 'dep-remove':
      showRemoveDependencyModal(task, el);
      break;
    case 'delete':
      deleteTask(task.id, el);
      break;
  }
}

function showProgressModal(task, el) {
  const body = `
    <form id="progress-form">
      <div class="form-group">
        <label>Progress for "${sanitizeHtml(task.name)}"</label>
        <input type="range" name="progress" min="0" max="100" step="5" value="${task.progress || 0}" />
        <div class="progress-display" id="progress-display">${task.progress || 0}%</div>
      </div>
    </form>
  `;
  showModal('Set Progress', body, [
    { id: 'cancel', label: 'Cancel', onClick: () => {} },
    { id: 'save', label: 'Save', primary: true, onClick: () => {
      const val = parseInt(document.querySelector('#progress-form [name="progress"]').value);
      const state = getState();
      const t = state.tasks.find(t2 => t2.id === task.id);
      if (t) {
        const oldProg = t.progress;
        t.progress = val;
        setState(state);
        addActivity('Progress updated', `${t.name}: ${val}%`, 'edit');
        showToast(`Progress: ${val}%`);
        if (val >= 100 && oldProg < 100) fireConfetti(el);
      }
      refresh(el);
    }}
  ]);
  setTimeout(() => {
    const r = document.querySelector('#progress-form [name="progress"]');
    const d = document.getElementById('progress-display');
    if (r && d) r.addEventListener('input', () => { d.textContent = r.value + '%'; });
  }, 100);
}

function showPhaseModal(task, el) {
  const body = `
    <form id="phase-form">
      <div class="form-group">
        <label>Phase for "${sanitizeHtml(task.name)}"</label>
        <div class="phase-option-list">
          ${Object.entries(PHASE_COLORS).map(([key, val]) => `
            <label class="phase-option ${task.phase === key ? 'active' : ''}">
              <input type="radio" name="phase" value="${key}" ${task.phase === key ? 'checked' : ''} />
              <span class="phase-dot-lg" style="background:${val.bg}"></span> ${val.label}
            </label>
          `).join('')}
        </div>
      </div>
    </form>
  `;
  showModal('Change Phase', body, [
    { id: 'cancel', label: 'Cancel', onClick: () => {} },
    { id: 'save', label: 'Save', primary: true, onClick: () => {
      const val = document.querySelector('#phase-form [name="phase"]:checked')?.value;
      if (!val) return;
      const state = getState();
      const t = state.tasks.find(t2 => t2.id === task.id);
      if (t) {
        t.phase = val;
        setState(state);
        addActivity('Phase changed', `${t.name} moved to ${phaseLabel(val)}`, 'edit');
        showToast(`Phase: ${phaseLabel(val)}`);
      }
      refresh(el);
    }}
  ]);
}

function showRemoveDependencyModal(task, el) {
  const tasks = getProjectTasks();
  const deps = (task.depends || []).map(dId => tasks.find(t => t.id === dId)).filter(Boolean);
  if (deps.length === 0) { showToast('No dependencies to remove', 'info'); return; }

  const body = `
    <form id="dep-remove-form">
      <div class="form-group">
        <label>Remove dependency from "${sanitizeHtml(task.name)}"</label>
        ${deps.map(d => `<label class="dep-option"><input type="checkbox" name="remove" value="${d.id}" /> ${sanitizeHtml(d.name)}</label>`).join('')}
      </div>
    </form>
  `;
  showModal('Remove Dependencies', body, [
    { id: 'cancel', label: 'Cancel', onClick: () => {} },
    { id: 'save', label: 'Remove Selected', primary: true, onClick: () => {
      const checked = [...document.querySelectorAll('#dep-remove-form [name="remove"]:checked')].map(c => c.value);
      if (checked.length === 0) return;
      const state = getState();
      const t = state.tasks.find(t2 => t2.id === task.id);
      if (t) {
        t.depends = (t.depends || []).filter(d => !checked.includes(d));
        setState(state);
        addActivity('Dependencies removed', `${checked.length} dependency removed from ${t.name}`, 'edit');
        showToast('Dependencies removed');
      }
      refresh(el);
    }}
  ]);
}

// ══════════════════════════════════════════════════════════════════════════
//  TASK FORM (Add/Edit Modal)
// ══════════════════════════════════════════════════════════════════════════
function showTaskForm(existing = null) {
  const state = getState();
  const project = getActiveProject();
  const tasks = state.tasks.filter(t => t.projectId === project.id);
  const isEdit = !!existing;

  // Collect existing contractors for datalist
  const contractors = [...new Set(tasks.map(t => t.contractor).filter(Boolean))].sort();

  const today = new Date().toISOString().split('T')[0];
  const defaultStart = existing?.start || today;
  const defaultEnd = existing?.end || toDateStr(new Date(Date.now() + 7 * DAY_MS));

  const body = `
    <form id="task-form" class="form-grid">
      <div class="form-group full">
        <label>Task Name <span class="required">*</span></label>
        <input type="text" name="name" value="${sanitizeHtml(existing?.name || '')}" required maxlength="120" placeholder="e.g. Kitchen Tiling" />
      </div>
      <div class="form-group">
        <label>Contractor</label>
        <input type="text" name="contractor" value="${sanitizeHtml(existing?.contractor || '')}" list="contractor-list" placeholder="Select or type new" />
        <datalist id="contractor-list">
          ${contractors.map(c => `<option value="${sanitizeHtml(c)}">`).join('')}
        </datalist>
      </div>
      <div class="form-group">
        <label>Phase</label>
        <select name="phase">
          ${Object.entries(PHASE_COLORS).map(([key, val]) => `<option value="${key}" ${existing?.phase === key ? 'selected' : ''}>${val.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Start Date <span class="required">*</span></label>
        <input type="date" name="start" value="${defaultStart}" required />
      </div>
      <div class="form-group">
        <label>End Date <span class="required">*</span></label>
        <input type="date" name="end" value="${defaultEnd}" required />
      </div>
      <div class="form-group">
        <label>Duration (days)</label>
        <input type="number" name="duration" id="task-duration" min="1" max="365" value="${existing ? taskDuration(existing) : 7}" />
      </div>
      <div class="form-group full">
        <label>Progress: <span id="progress-val">${existing?.progress || 0}%</span></label>
        <input type="range" name="progress" min="0" max="100" step="5" value="${existing?.progress || 0}" />
      </div>
      <div class="form-group">
        <label>Dependencies</label>
        <select name="depends" multiple size="4">
          ${tasks.filter(t => t.id !== existing?.id).map(t => `<option value="${t.id}" ${(existing?.depends || []).includes(t.id) ? 'selected' : ''}>${sanitizeHtml(t.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Lag Days</label>
        <input type="number" name="lagDays" min="0" max="90" value="${existing?.lagDays || 0}" />
        <small class="text-muted">Offset days after dependency ends</small>
      </div>
      <div class="form-group">
        <label>Subtask Indent</label>
        <select name="indent">
          <option value="0" ${(existing?.indent || 0) === 0 ? 'selected' : ''}>None (Top Level)</option>
          <option value="1" ${existing?.indent === 1 ? 'selected' : ''}>Indent 1 (Subtask)</option>
          <option value="2" ${existing?.indent === 2 ? 'selected' : ''}>Indent 2 (Sub-subtask)</option>
        </select>
      </div>
      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" name="milestone" ${existing?.milestone ? 'checked' : ''} /> Milestone (zero-duration marker)
        </label>
      </div>
      <div class="form-group full">
        <label>Notes</label>
        <textarea name="notes" rows="3" placeholder="Additional notes...">${sanitizeHtml(existing?.notes || '')}</textarea>
      </div>
    </form>
  `;

  showModal(isEdit ? 'Edit Task' : 'Add Task', body, [
    { id: 'cancel', label: 'Cancel', onClick: () => {} },
    ...(isEdit ? [{ id: 'delete', label: 'Delete', onClick: () => {
      const mainEl = document.querySelector('.view-schedule')?.parentElement;
      deleteTask(existing.id, mainEl);
    }}] : []),
    { id: 'save', label: isEdit ? 'Save Changes' : 'Add Task', primary: true, onClick: () => saveTask(existing?.id) },
  ]);

  // Wire up duration <-> date sync and progress display
  setTimeout(() => {
    const startInput = document.querySelector('[name="start"]');
    const endInput = document.querySelector('[name="end"]');
    const durInput = document.querySelector('#task-duration');
    const rangeInput = document.querySelector('[name="progress"]');
    const rangeVal = document.getElementById('progress-val');

    if (rangeInput && rangeVal) {
      rangeInput.addEventListener('input', () => { rangeVal.textContent = rangeInput.value + '%'; });
    }

    if (startInput && endInput && durInput) {
      // End date changes -> update duration
      endInput.addEventListener('change', () => {
        const s = new Date(startInput.value);
        const e = new Date(endInput.value);
        if (s && e && e > s) durInput.value = Math.ceil((e - s) / DAY_MS);
      });
      // Start date changes -> update duration
      startInput.addEventListener('change', () => {
        const s = new Date(startInput.value);
        const e = new Date(endInput.value);
        if (s && e && e > s) durInput.value = Math.ceil((e - s) / DAY_MS);
      });
      // Duration changes -> update end date
      durInput.addEventListener('change', () => {
        const s = new Date(startInput.value);
        if (s) {
          const newEnd = new Date(s.getTime() + parseInt(durInput.value) * DAY_MS);
          endInput.value = toDateStr(newEnd);
        }
      });
    }
  }, 120);
}

function saveTask(existingId) {
  const form = document.getElementById('task-form');
  if (!form) return;
  const fd = new FormData(form);
  const state = getState();
  const project = getActiveProject();
  const tasks = state.tasks.filter(t => t.projectId === project.id);

  const data = {
    name: fd.get('name')?.trim(),
    contractor: fd.get('contractor')?.trim() || '',
    phase: fd.get('phase'),
    start: fd.get('start'),
    end: fd.get('end'),
    progress: parseInt(fd.get('progress')) || 0,
    depends: fd.getAll('depends'),
    lagDays: parseInt(fd.get('lagDays')) || 0,
    indent: parseInt(fd.get('indent')) || 0,
    milestone: !!fd.get('milestone'),
    notes: fd.get('notes')?.trim() || '',
    projectId: project.id,
  };

  if (!data.name || !data.start || !data.end) {
    showToast('Fill in task name, start, and end date', 'error');
    return;
  }
  if (new Date(data.end) < new Date(data.start)) {
    showToast('End date must be after start date', 'error');
    return;
  }

  // Circular dependency check
  if (data.depends.length > 0 && existingId) {
    for (const depId of data.depends) {
      if (hasCircularDependency(tasks, existingId, depId)) {
        showToast(`Circular dependency detected with "${tasks.find(t => t.id === depId)?.name}"`, 'error');
        return;
      }
    }
  }

  const mainEl = document.querySelector('.view-schedule')?.parentElement;

  if (existingId) {
    const idx = state.tasks.findIndex(t => t.id === existingId);
    if (idx >= 0) {
      const oldProg = state.tasks[idx].progress;
      state.tasks[idx] = { ...state.tasks[idx], ...data };
      if (data.progress >= 100 && oldProg < 100 && mainEl) fireConfetti(mainEl);
    }
    addActivity('Task updated', `${data.name} schedule updated`, 'edit');
  } else {
    data.id = generateId();
    state.tasks.push(data);
    addActivity('Task added', `${data.name} added to schedule`, 'plus');
  }

  setState(state);
  showToast(existingId ? 'Task updated' : 'Task added');
  closeModal();
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

function deleteTask(id, el) {
  const state = getState();
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  state.tasks = state.tasks.filter(t => t.id !== id);
  // Remove from all dependency lists
  state.tasks.forEach(t => { t.depends = (t.depends || []).filter(d => d !== id); });
  selectedTasks.delete(id);
  addActivity('Task deleted', `${task.name} removed from schedule`, 'trash');
  setState(state);
  showToast('Task deleted');
  closeModal();
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

// ══════════════════════════════════════════════════════════════════════════
//  EXPORT
// ══════════════════════════════════════════════════════════════════════════
function exportCsv() {
  const tasks = getProjectTasks();
  const allTasks = getProjectTasks();
  const rows = tasks.map(t => ({
    Name: t.name,
    Contractor: t.contractor || '',
    Phase: phaseLabel(t.phase),
    Start: t.start,
    End: t.end,
    Duration: taskDuration(t),
    Progress: (t.progress || 0) + '%',
    Dependencies: (t.depends || []).map(d => allTasks.find(t2 => t2.id === d)?.name || '').join('; '),
    Milestone: t.milestone ? 'Yes' : 'No',
    Notes: t.notes || '',
  }));
  const project = getActiveProject();
  downloadAsCsv(rows, `${project?.name || 'schedule'}_schedule.csv`);
  showToast('Schedule exported as CSV');
}

function printSchedule() {
  window.print();
}

// ══════════════════════════════════════════════════════════════════════════
//  MOUNT (event binding)
// ══════════════════════════════════════════════════════════════════════════
export function mount(el) {
  // Header buttons
  el.querySelector('#add-task-btn')?.addEventListener('click', () => showTaskForm());
  el.querySelector('#export-csv-btn')?.addEventListener('click', exportCsv);
  el.querySelector('#print-btn')?.addEventListener('click', printSchedule);

  // View tabs
  el.querySelectorAll('.schedule-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      currentView = tab.dataset.view;
      refresh(el);
    });
  });

  // Zoom controls
  el.querySelectorAll('.zoom-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      zoomLevel = btn.dataset.zoom;
      refresh(el);
    });
  });

  // Bulk actions
  el.querySelector('#bulk-progress-btn')?.addEventListener('click', () => showBulkProgressModal(el));
  el.querySelector('#bulk-clear-btn')?.addEventListener('click', () => {
    selectedTasks.clear();
    refresh(el);
  });

  // Selection checkboxes
  el.querySelectorAll('.gantt-select-cb').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) selectedTasks.add(cb.dataset.id);
      else selectedTasks.delete(cb.dataset.id);
      refresh(el);
    });
  });

  // ── Gantt-specific interactions ────────────────────────────────────
  if (currentView === 'gantt') {
    mountGantt(el);
  }

  // ── List view interactions ─────────────────────────────────────────
  if (currentView === 'list') {
    el.querySelectorAll('.list-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const state = getState();
        const task = state.tasks.find(t => t.id === btn.dataset.id);
        if (task) showTaskForm(task);
      });
    });
    el.querySelectorAll('.list-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTask(btn.dataset.id, el);
      });
    });
    el.querySelectorAll('.schedule-list-row').forEach(row => {
      row.addEventListener('dblclick', () => {
        const state = getState();
        const task = state.tasks.find(t => t.id === row.dataset.id);
        if (task) showTaskForm(task);
      });
    });
  }

  // ── Board view interactions ────────────────────────────────────────
  if (currentView === 'board') {
    el.querySelectorAll('.board-card').forEach(card => {
      card.addEventListener('dblclick', () => {
        const state = getState();
        const task = state.tasks.find(t => t.id === card.dataset.id);
        if (task) showTaskForm(task);
      });
    });
  }
}

function mountGantt(el) {
  const svg = el.querySelector('#gantt-svg');
  const scroll = el.querySelector('#gantt-scroll');
  if (!svg) return;

  const { dayWidth } = ZOOM_LEVELS[zoomLevel];
  const tasks = getProjectTasks();
  const { minDate } = getDateRange(tasks);

  // ── Hover tooltip ──────────────────────────────────────────────────
  svg.addEventListener('mouseover', (e) => {
    const bar = e.target.closest('.gantt-bar');
    if (!bar) return;
    const task = getState().tasks.find(t => t.id === bar.dataset.id);
    if (!task) return;
    const rect = svg.getBoundingClientRect();
    const scrollRect = scroll.getBoundingClientRect();
    showTooltip(task, e.clientX + 12, e.clientY - 10);
  });

  svg.addEventListener('mouseout', (e) => {
    const bar = e.target.closest('.gantt-bar');
    if (bar && !bar.contains(e.relatedTarget)) removeTooltip();
    if (!bar) removeTooltip();
  });

  // ── Double click bar to edit ───────────────────────────────────────
  svg.addEventListener('dblclick', (e) => {
    const bar = e.target.closest('.gantt-bar');
    if (bar) {
      const task = getState().tasks.find(t => t.id === bar.dataset.id);
      if (task) showTaskForm(task);
      return;
    }

    // Double-click empty space to add task at that date
    const rect = svg.getBoundingClientRect();
    const svgX = e.clientX - rect.left + scroll.scrollLeft;
    const dayOffset = Math.floor(svgX / dayWidth);
    const clickDate = new Date(minDate.getTime() + dayOffset * DAY_MS);
    const startStr = toDateStr(clickDate);
    const endStr = toDateStr(new Date(clickDate.getTime() + 7 * DAY_MS));
    showTaskForm({ start: startStr, end: endStr, progress: 0, depends: [], phase: 'structural' });
  });

  // ── Right-click context menu ───────────────────────────────────────
  svg.addEventListener('contextmenu', (e) => {
    const bar = e.target.closest('.gantt-bar');
    if (!bar) return;
    e.preventDefault();
    const task = getState().tasks.find(t => t.id === bar.dataset.id);
    if (!task) return;
    const viewEl = el.querySelector('.view-schedule');
    const vRect = viewEl.getBoundingClientRect();
    showContextMenu(task, e.clientX - vRect.left, e.clientY - vRect.top, el.querySelector('.view-schedule'));
  });

  // ── Click for dependency mode ──────────────────────────────────────
  svg.addEventListener('click', (e) => {
    if (!dependencyMode) return;
    const bar = e.target.closest('.gantt-bar');
    if (!bar) { dependencyMode = null; return; }
    const targetId = bar.dataset.id;
    if (targetId === dependencyMode.sourceId) { dependencyMode = null; return; }

    const state = getState();
    const tasks2 = state.tasks.filter(t => t.projectId === getActiveProject().id);
    const target = state.tasks.find(t => t.id === targetId);
    if (!target) { dependencyMode = null; return; }

    // Check circular
    if (hasCircularDependency(tasks2, targetId, dependencyMode.sourceId)) {
      showToast('Cannot add dependency: circular reference detected', 'error');
      dependencyMode = null;
      return;
    }

    if (!target.depends) target.depends = [];
    if (!target.depends.includes(dependencyMode.sourceId)) {
      target.depends.push(dependencyMode.sourceId);
      setState(state);
      const source = state.tasks.find(t => t.id === dependencyMode.sourceId);
      addActivity('Dependency added', `${target.name} now depends on ${source?.name}`, 'link');
      showToast(`Dependency added: ${source?.name} -> ${target.name}`);
      refresh(el);
    }
    dependencyMode = null;
  });

  // ── Drag to move / resize ─────────────────────────────────────────
  svg.addEventListener('mousedown', (e) => {
    if (dependencyMode) return;
    const bar = e.target.closest('.gantt-bar');
    if (!bar) return;
    const isResizeRight = e.target.classList.contains('gantt-resize-right');
    const isResizeLeft = e.target.classList.contains('gantt-resize-left');
    dragState = { id: bar.dataset.id, startX: e.clientX, isResizeRight, isResizeLeft, moved: false };
    e.preventDefault();
    removeTooltip();
  });

  const mouseMoveHandler = (e) => {
    if (!dragState) return;
    const dx = e.clientX - dragState.startX;
    const dayShift = Math.round(dx / dayWidth);
    if (dayShift === 0) return;
    dragState.moved = true;

    const state = getState();
    const task = state.tasks.find(t => t.id === dragState.id);
    if (!task) return;

    if (dragState.isResizeRight) {
      const end = new Date(task.end);
      end.setDate(end.getDate() + dayShift);
      if (end > new Date(task.start)) {
        task.end = toDateStr(end);
      }
    } else if (dragState.isResizeLeft) {
      const start = new Date(task.start);
      start.setDate(start.getDate() + dayShift);
      if (start < new Date(task.end)) {
        task.start = toDateStr(start);
      }
    } else {
      // Move entire bar
      const start = new Date(task.start);
      const end = new Date(task.end);
      start.setDate(start.getDate() + dayShift);
      end.setDate(end.getDate() + dayShift);
      task.start = toDateStr(start);
      task.end = toDateStr(end);
    }

    setState(state);
    dragState.startX = e.clientX;
    refresh(el);
  };

  const mouseUpHandler = () => {
    if (dragState && dragState.moved) {
      const state = getState();
      const task = state.tasks.find(t => t.id === dragState.id);
      if (task) addActivity('Task moved', `${task.name}: ${formatDateShort(task.start)} - ${formatDateShort(task.end)}`, 'edit');
    }
    dragState = null;
  };

  document.addEventListener('mousemove', mouseMoveHandler);
  document.addEventListener('mouseup', mouseUpHandler);

  // Store cleanup refs
  el.__scheduleCleanup = () => {
    document.removeEventListener('mousemove', mouseMoveHandler);
    document.removeEventListener('mouseup', mouseUpHandler);
    removeTooltip();
    hideContextMenu();
  };

  // Scroll to today
  if (scroll) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayOffset = dayX(today, minDate, dayWidth) - 300;
    scroll.scrollLeft = Math.max(0, todayOffset);
  }

  // Sync label scroll with chart scroll
  const labelContainer = el.querySelector('.gantt-labels');
  if (scroll && labelContainer) {
    scroll.addEventListener('scroll', () => {
      // Labels stay horizontally fixed; only vertical scroll syncs
      // (labels don't have horizontal scroll, chart does)
    });
  }
}

// ── Bulk progress ────────────────────────────────────────────────────
function showBulkProgressModal(el) {
  const body = `
    <form id="bulk-progress-form">
      <div class="form-group">
        <label>Set progress for ${selectedTasks.size} selected tasks</label>
        <input type="range" name="progress" min="0" max="100" step="5" value="50" />
        <div class="progress-display" id="bulk-progress-display">50%</div>
      </div>
    </form>
  `;
  showModal('Bulk Update Progress', body, [
    { id: 'cancel', label: 'Cancel', onClick: () => {} },
    { id: 'save', label: 'Apply', primary: true, onClick: () => {
      const val = parseInt(document.querySelector('#bulk-progress-form [name="progress"]').value);
      const state = getState();
      let anyComplete = false;
      for (const id of selectedTasks) {
        const t = state.tasks.find(t2 => t2.id === id);
        if (t) {
          if (val >= 100 && t.progress < 100) anyComplete = true;
          t.progress = val;
        }
      }
      setState(state);
      addActivity('Bulk progress', `${selectedTasks.size} tasks set to ${val}%`, 'edit');
      showToast(`${selectedTasks.size} tasks updated to ${val}%`);
      selectedTasks.clear();
      if (anyComplete) fireConfetti(el);
      refresh(el);
    }}
  ]);
  setTimeout(() => {
    const r = document.querySelector('#bulk-progress-form [name="progress"]');
    const d = document.getElementById('bulk-progress-display');
    if (r && d) r.addEventListener('input', () => { d.textContent = r.value + '%'; });
  }, 100);
}

// ── Refresh helper ───────────────────────────────────────────────────
function refresh(el) {
  if (el.__scheduleCleanup) el.__scheduleCleanup();
  el.innerHTML = render();
  mount(el);
}

export function destroy() {
  const el = document.querySelector('.app-main');
  if (el && el.__scheduleCleanup) el.__scheduleCleanup();
  dragState = null;
  contextMenu = null;
  dependencyMode = null;
  removeTooltip();
  hideContextMenu();
}
