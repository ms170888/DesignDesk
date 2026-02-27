// Construction Schedule — Interactive Gantt Chart

import { getState, setState, getActiveProject, addActivity } from '../store.js';
import { formatDateShort, generateId } from '../core/utils.js';
import { icons } from '../core/icons.js';
import { showModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

const PHASE_COLORS = { structural: '#ef4444', firstfix: '#f59e0b', finishing: '#3b82f6', install: '#10b981' };
const DAY_MS = 86400000;

let dragState = null;

export function render() {
  const state = getState();
  const project = getActiveProject();
  if (!project || !state) return '<div class="empty-state"><h2>No project selected</h2></div>';

  const tasks = state.tasks.filter(t => t.projectId === project.id);
  if (tasks.length === 0) return `<div class="view-schedule"><div class="view-header"><h1>Construction Schedule</h1><button class="btn btn-primary btn-sm" id="add-task-btn">${icons.plus} Add Task</button></div><div class="empty-state"><h2>No tasks yet</h2><p>Add your first construction task to get started.</p></div></div>`;

  // Date range
  const allDates = tasks.flatMap(t => [new Date(t.start), new Date(t.end)]);
  const minDate = new Date(Math.min(...allDates));
  const maxDate = new Date(Math.max(...allDates));
  minDate.setDate(minDate.getDate() - 7);
  maxDate.setDate(maxDate.getDate() + 14);
  const totalDays = Math.ceil((maxDate - minDate) / DAY_MS);
  const dayWidth = 18;
  const rowHeight = 44;
  const headerHeight = 50;
  const labelWidth = 200;
  const chartWidth = totalDays * dayWidth;
  const chartHeight = headerHeight + tasks.length * rowHeight + 20;

  // Month headers
  let months = [];
  let d = new Date(minDate);
  while (d < maxDate) {
    const monthStart = new Date(d);
    const daysInView = Math.min(
      Math.ceil((maxDate - d) / DAY_MS),
      new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() - d.getDate() + 1
    );
    months.push({ label: d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }), x: Math.ceil((d - minDate) / DAY_MS) * dayWidth, width: daysInView * dayWidth });
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }

  // Today marker
  const today = new Date();
  const todayX = Math.ceil((today - minDate) / DAY_MS) * dayWidth;

  // Task bars
  const bars = tasks.map((task, i) => {
    const startX = Math.ceil((new Date(task.start) - minDate) / DAY_MS) * dayWidth;
    const endX = Math.ceil((new Date(task.end) - minDate) / DAY_MS) * dayWidth;
    const w = endX - startX;
    const y = headerHeight + i * rowHeight + 8;
    const color = PHASE_COLORS[task.phase] || '#6366f1';

    return `<g class="gantt-bar" data-id="${task.id}">
      <rect x="${startX}" y="${y}" width="${w}" height="28" rx="4" fill="${color}" opacity="0.2" class="gantt-bar-bg"/>
      <rect x="${startX}" y="${y}" width="${w * task.progress / 100}" height="28" rx="4" fill="${color}" class="gantt-bar-fill"/>
      <rect x="${startX}" y="${y}" width="${w}" height="28" rx="4" fill="transparent" stroke="${color}" stroke-width="1.5" class="gantt-bar-outline" style="cursor:grab"/>
      <text x="${startX + 6}" y="${y + 18}" class="gantt-bar-text" fill="${task.progress > 50 ? '#fff' : color}" font-size="11" font-weight="500">${task.progress}%</text>
      <rect x="${endX - 6}" y="${y + 6}" width="6" height="16" rx="2" fill="${color}" opacity="0.4" class="gantt-resize-handle" style="cursor:ew-resize"/>
    </g>`;
  }).join('');

  // Dependency arrows
  const arrows = tasks.flatMap((task, i) =>
    task.depends.map(depId => {
      const depIdx = tasks.findIndex(t => t.id === depId);
      if (depIdx < 0) return '';
      const dep = tasks[depIdx];
      const fromX = Math.ceil((new Date(dep.end) - minDate) / DAY_MS) * dayWidth;
      const fromY = headerHeight + depIdx * rowHeight + 22;
      const toX = Math.ceil((new Date(task.start) - minDate) / DAY_MS) * dayWidth;
      const toY = headerHeight + i * rowHeight + 22;
      return `<path d="M${fromX},${fromY} C${fromX + 20},${fromY} ${toX - 20},${toY} ${toX},${toY}" fill="none" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#arrowhead)"/>`;
    })
  ).join('');

  // Grid lines (weeks)
  let gridLines = '';
  for (let i = 0; i < totalDays; i += 7) {
    gridLines += `<line x1="${i * dayWidth}" y1="${headerHeight}" x2="${i * dayWidth}" y2="${chartHeight}" stroke="#f1f5f9" stroke-width="1"/>`;
  }

  return `
    <div class="view-schedule">
      <div class="view-header">
        <h1>Construction Schedule</h1>
        <button class="btn btn-primary btn-sm" id="add-task-btn">${icons.plus} Add Task</button>
      </div>

      <div class="gantt-legend">
        ${Object.entries(PHASE_COLORS).map(([phase, color]) => `<span class="gantt-legend-item"><span class="legend-dot" style="background:${color}"></span>${phase}</span>`).join('')}
      </div>

      <div class="gantt-container">
        <div class="gantt-labels">
          <div class="gantt-label-header">Task</div>
          ${tasks.map(t => `<div class="gantt-label" style="height:${rowHeight}px">
            <span class="gantt-task-name">${t.name}</span>
            <span class="gantt-task-contractor text-muted">${t.contractor}</span>
          </div>`).join('')}
        </div>
        <div class="gantt-scroll" id="gantt-scroll">
          <svg width="${chartWidth}" height="${chartHeight}" class="gantt-svg" id="gantt-svg">
            <defs>
              <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <path d="M0,0 L8,3 L0,6" fill="#94a3b8"/>
              </marker>
            </defs>
            ${gridLines}
            ${months.map(m => `<g>
              <rect x="${m.x}" y="0" width="${m.width}" height="${headerHeight}" fill="#f8fafc" stroke="#e2e8f0" stroke-width="0.5"/>
              <text x="${m.x + 8}" y="30" font-size="12" fill="#64748b" font-weight="500">${m.label}</text>
            </g>`).join('')}
            ${todayX > 0 && todayX < chartWidth ? `<line x1="${todayX}" y1="${headerHeight}" x2="${todayX}" y2="${chartHeight}" stroke="#ef4444" stroke-width="2" stroke-dasharray="4"/>
            <text x="${todayX + 4}" y="${headerHeight + 14}" font-size="10" fill="#ef4444" font-weight="600">Today</text>` : ''}
            ${arrows}
            ${bars}
          </svg>
        </div>
      </div>
    </div>
  `;
}

export function mount(el) {
  el.querySelector('#add-task-btn')?.addEventListener('click', () => showTaskForm());

  // Double-click bar to edit
  el.querySelectorAll('.gantt-bar').forEach(bar => {
    bar.addEventListener('dblclick', () => {
      const state = getState();
      const task = state.tasks.find(t => t.id === bar.dataset.id);
      if (task) showTaskForm(task);
    });
  });

  // Drag to move bars
  const svg = el.querySelector('#gantt-svg');
  if (!svg) return;

  svg.addEventListener('mousedown', (e) => {
    const bar = e.target.closest('.gantt-bar');
    if (!bar) return;
    const isResize = e.target.classList.contains('gantt-resize-handle');
    dragState = { id: bar.dataset.id, startX: e.clientX, isResize };
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragState) return;
    const dx = e.clientX - dragState.startX;
    const dayShift = Math.round(dx / 18);
    if (dayShift === 0) return;

    const state = getState();
    const task = state.tasks.find(t => t.id === dragState.id);
    if (!task) return;

    if (dragState.isResize) {
      const end = new Date(task.end);
      end.setDate(end.getDate() + dayShift);
      if (end > new Date(task.start)) {
        task.end = end.toISOString().split('T')[0];
      }
    } else {
      const start = new Date(task.start);
      const end = new Date(task.end);
      start.setDate(start.getDate() + dayShift);
      end.setDate(end.getDate() + dayShift);
      task.start = start.toISOString().split('T')[0];
      task.end = end.toISOString().split('T')[0];
    }

    setState(state);
    dragState.startX = e.clientX;
    refresh(el);
  });

  document.addEventListener('mouseup', () => {
    if (dragState) {
      dragState = null;
    }
  });

  // Scroll to today
  const scroll = el.querySelector('#gantt-scroll');
  if (scroll) {
    const state = getState();
    const tasks = state.tasks.filter(t => t.projectId === getActiveProject().id);
    if (tasks.length) {
      const allDates = tasks.flatMap(t => [new Date(t.start), new Date(t.end)]);
      const minDate = new Date(Math.min(...allDates));
      minDate.setDate(minDate.getDate() - 7);
      const today = new Date();
      const todayOffset = Math.ceil((today - minDate) / DAY_MS) * 18 - 200;
      scroll.scrollLeft = Math.max(0, todayOffset);
    }
  }
}

function refresh(el) {
  el.innerHTML = render();
  mount(el);
}

function showTaskForm(existing = null) {
  const state = getState();
  const project = getActiveProject();
  const tasks = state.tasks.filter(t => t.projectId === project.id);
  const isEdit = !!existing;

  const body = `
    <form id="task-form" class="form-grid">
      <div class="form-group full">
        <label>Task Name</label>
        <input type="text" name="name" value="${existing ? existing.name : ''}" required />
      </div>
      <div class="form-group">
        <label>Contractor</label>
        <input type="text" name="contractor" value="${existing ? existing.contractor : ''}" />
      </div>
      <div class="form-group">
        <label>Phase</label>
        <select name="phase">
          ${Object.keys(PHASE_COLORS).map(p => `<option value="${p}" ${existing?.phase === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Start Date</label>
        <input type="date" name="start" value="${existing ? existing.start : ''}" required />
      </div>
      <div class="form-group">
        <label>End Date</label>
        <input type="date" name="end" value="${existing ? existing.end : ''}" required />
      </div>
      <div class="form-group">
        <label>Progress (%)</label>
        <input type="range" name="progress" min="0" max="100" step="5" value="${existing ? existing.progress : 0}" />
        <span id="progress-val">${existing ? existing.progress : 0}%</span>
      </div>
      <div class="form-group">
        <label>Depends On</label>
        <select name="depends" multiple>
          ${tasks.filter(t => t.id !== existing?.id).map(t => `<option value="${t.id}" ${existing?.depends?.includes(t.id) ? 'selected' : ''}>${t.name}</option>`).join('')}
        </select>
      </div>
    </form>
  `;

  showModal(isEdit ? 'Edit Task' : 'Add Task', body, [
    { id: 'cancel', label: 'Cancel', onClick: () => {} },
    ...(isEdit ? [{ id: 'delete', label: 'Delete', onClick: () => deleteTask(existing.id) }] : []),
    { id: 'save', label: isEdit ? 'Save' : 'Add Task', primary: true, onClick: () => saveTask(existing?.id) },
  ]);

  setTimeout(() => {
    const range = document.querySelector('[name="progress"]');
    const val = document.getElementById('progress-val');
    if (range && val) range.addEventListener('input', () => val.textContent = range.value + '%');
  }, 100);
}

function saveTask(existingId) {
  const form = document.getElementById('task-form');
  if (!form) return;
  const fd = new FormData(form);
  const state = getState();
  const project = getActiveProject();

  const data = {
    name: fd.get('name'),
    contractor: fd.get('contractor'),
    phase: fd.get('phase'),
    start: fd.get('start'),
    end: fd.get('end'),
    progress: parseInt(fd.get('progress')) || 0,
    depends: fd.getAll('depends'),
    projectId: project.id,
  };

  if (!data.name || !data.start || !data.end) { showToast('Fill in all required fields', 'error'); return; }

  if (existingId) {
    const idx = state.tasks.findIndex(t => t.id === existingId);
    if (idx >= 0) state.tasks[idx] = { ...state.tasks[idx], ...data };
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

function deleteTask(id) {
  const state = getState();
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  state.tasks = state.tasks.filter(t => t.id !== id);
  state.tasks.forEach(t => { t.depends = t.depends.filter(d => d !== id); });
  addActivity('Task deleted', `${task.name} removed from schedule`, 'trash');
  setState(state);
  showToast('Task deleted');
  closeModal();
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}
