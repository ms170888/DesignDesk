// Mood Board Builder — Production Canvas Editor
// Full drag-drop, multi-select, resize, rotate, z-order, snap, undo integration

import { getState, setState, getActiveProject, addActivity, undo, redo, canUndo, canRedo } from '../store.js';
import { generateId, clamp, formatCurrency, sanitizeHtml } from '../core/utils.js';
import { icons } from '../core/icons.js';
import { showToast } from '../components/toast.js';

// ── State ────────────────────────────────────────────────────────────────
let activeBoardId = null;
let selectedIds = new Set();
let dragState = null;       // { ids, startX, startY, origPositions }
let resizeState = null;     // { id, handle, startX, startY, origRect }
let rotateState = null;     // { id, startAngle, origRotation, cx, cy }
let rubberBand = null;      // { startX, startY, curX, curY }
let contextMenu = null;     // { x, y, itemId }
let zoom = 1;
let gridVisible = true;
let snapToGrid = true;
let snapToItems = true;
let editingTextId = null;
let editingLabelId = null;
let canvasOffset = { x: 0, y: 0 };
let _el = null;
let _eventCleanup = [];

const GRID_SIZE = 20;
const MIN_SIZE = 30;
const SNAP_THRESHOLD = 6;
const HANDLE_SIZE = 8;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.1;

// ── Helpers ──────────────────────────────────────────────────────────────
function getBoard() {
  const state = getState();
  const project = getActiveProject();
  if (!state || !project) return null;
  const boards = state.moodboards.filter(b => b.projectId === project.id);
  return boards.find(b => b.id === activeBoardId) || null;
}

function getBoardMut() {
  const state = getState();
  const project = getActiveProject();
  if (!state || !project) return { state: null, board: null };
  const board = state.moodboards.find(b => b.id === activeBoardId);
  return { state, board };
}

function snapValue(v) {
  if (!snapToGrid) return v;
  return Math.round(v / GRID_SIZE) * GRID_SIZE;
}

function getCanvasEl() {
  return _el?.querySelector('#moodboard-canvas');
}

function canvasCoords(e) {
  const canvas = getCanvasEl();
  if (!canvas) return { x: 0, y: 0 };
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) / zoom,
    y: (e.clientY - rect.top) / zoom
  };
}

function getItemById(board, id) {
  return board?.items?.find(i => i.id === id) || null;
}

function rerender() {
  if (!_el) return;
  _el.innerHTML = render();
  mount(_el);
}

function getAlignmentGuides(board, movingIds, positions) {
  if (!snapToItems || !board) return [];
  const guides = [];
  const others = board.items.filter(i => !movingIds.has(i.id));

  for (const [id, pos] of positions) {
    const cx = pos.x + pos.w / 2;
    const cy = pos.y + pos.h / 2;
    const right = pos.x + pos.w;
    const bottom = pos.y + pos.h;

    for (const other of others) {
      const ocx = other.x + other.w / 2;
      const ocy = other.y + other.h / 2;
      const oright = other.x + other.w;
      const obottom = other.y + other.h;

      // Vertical guides
      if (Math.abs(pos.x - other.x) < SNAP_THRESHOLD) guides.push({ type: 'v', val: other.x });
      if (Math.abs(right - oright) < SNAP_THRESHOLD) guides.push({ type: 'v', val: oright });
      if (Math.abs(cx - ocx) < SNAP_THRESHOLD) guides.push({ type: 'v', val: ocx });
      if (Math.abs(pos.x - oright) < SNAP_THRESHOLD) guides.push({ type: 'v', val: oright });
      if (Math.abs(right - other.x) < SNAP_THRESHOLD) guides.push({ type: 'v', val: other.x });

      // Horizontal guides
      if (Math.abs(pos.y - other.y) < SNAP_THRESHOLD) guides.push({ type: 'h', val: other.y });
      if (Math.abs(bottom - obottom) < SNAP_THRESHOLD) guides.push({ type: 'h', val: obottom });
      if (Math.abs(cy - ocy) < SNAP_THRESHOLD) guides.push({ type: 'h', val: ocy });
      if (Math.abs(pos.y - obottom) < SNAP_THRESHOLD) guides.push({ type: 'h', val: obottom });
      if (Math.abs(bottom - other.y) < SNAP_THRESHOLD) guides.push({ type: 'h', val: other.y });
    }
  }
  return guides;
}

// ── Render ───────────────────────────────────────────────────────────────
export function render() {
  const state = getState();
  const project = getActiveProject();
  if (!project || !state) return '<div class="empty-state"><h2>No project selected</h2></div>';

  if (!state.moodboards) state.moodboards = [];
  const boards = state.moodboards.filter(b => b.projectId === project.id);
  if (!activeBoardId && boards.length > 0) activeBoardId = boards[0].id;
  const board = boards.find(b => b.id === activeBoardId);
  const items = state.items?.filter(i => i.projectId === project.id) || [];
  const rooms = project.rooms || [];
  const hasSelection = selectedIds.size > 0;

  return `
    <div class="view-moodboard">
      <div class="view-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
        <h1>Mood Boards</h1>
        <div style="display:flex;gap:6px;align-items:center;">
          <button class="toolbar-btn" id="mb-undo" ${!canUndo() ? 'disabled style="opacity:.4;pointer-events:none"' : ''} title="Undo (Ctrl+Z)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h8a3 3 0 1 1 0 6H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M6 5L3 8l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button class="toolbar-btn" id="mb-redo" ${!canRedo() ? 'disabled style="opacity:.4;pointer-events:none"' : ''} title="Redo (Ctrl+Y)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13 8H5a3 3 0 1 0 0 6h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M10 5l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </div>

      <div class="board-tabs" style="margin-bottom:12px;">
        ${boards.map(b => `
          <button class="board-tab ${b.id === activeBoardId ? 'active' : ''}" data-id="${b.id}" title="Double-click to rename">
            ${sanitizeHtml(b.name)}${b.room ? ` <span style="opacity:.6;font-size:10px">(${sanitizeHtml(b.room)})</span>` : ''}
          </button>
        `).join('')}
        <button class="board-tab board-tab-add" id="add-board-btn" title="New board">+</button>
      </div>

      ${board ? `
        <div class="moodboard-toolbar">
          <button class="toolbar-btn" id="mb-upload">${icons.upload} Upload Image</button>
          <button class="toolbar-btn" id="mb-color">${icons.palette} Add Color</button>
          <button class="toolbar-btn" id="mb-text">${icons.text} Add Text</button>
          <button class="toolbar-btn" id="mb-link-item">${icons.link} Link Item</button>
          <button class="toolbar-btn" id="mb-add-shape">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="1" stroke="currentColor" stroke-width="1.5"/></svg>
            Shape
          </button>
          <span style="border-left:1px solid var(--border);height:24px;margin:0 4px;"></span>
          <button class="toolbar-btn" id="mb-auto-layout">${icons.grid} Auto Layout</button>
          <button class="toolbar-btn ${gridVisible ? 'active' : ''}" id="mb-toggle-grid" title="Toggle grid">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M0 4h16M0 8h16M0 12h16M4 0v16M8 0v16M12 0v16" stroke="currentColor" stroke-width=".5" opacity=".6"/></svg>
          </button>
          <button class="toolbar-btn ${snapToGrid ? 'active' : ''}" id="mb-toggle-snap" title="Snap to grid">Snap</button>
          <span style="border-left:1px solid var(--border);height:24px;margin:0 4px;"></span>
          <button class="toolbar-btn" id="mb-zoom-out" title="Zoom out">-</button>
          <span style="font-size:11px;min-width:40px;text-align:center;color:var(--text-secondary)">${Math.round(zoom * 100)}%</span>
          <button class="toolbar-btn" id="mb-zoom-in" title="Zoom in">+</button>
          <span style="border-left:1px solid var(--border);height:24px;margin:0 4px;"></span>
          ${hasSelection ? `
            <button class="toolbar-btn" id="mb-duplicate" title="Duplicate selection">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="9" height="9" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="5" y="1" width="9" height="9" rx="1" stroke="currentColor" stroke-width="1.3" fill="var(--surface)"/></svg>
            </button>
            <button class="toolbar-btn toolbar-delete" id="mb-delete">${icons.trash} Delete</button>
          ` : ''}
          <span style="flex:1"></span>
          <button class="toolbar-btn" id="mb-export-png" title="Export as PNG">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 10v3h12v-3M8 2v8M5 7l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Export PNG
          </button>
          <button class="toolbar-btn" id="mb-clear" title="Clear canvas">${icons.trash}</button>
        </div>

        <input type="file" id="mb-file-input" accept="image/*" multiple style="display:none" />

        <div class="mb-board-meta" style="display:flex;gap:12px;margin-bottom:8px;align-items:center;">
          <label style="font-size:11px;color:var(--text-muted);">Board name:</label>
          <input type="text" id="mb-board-name" value="${sanitizeHtml(board.name)}" style="border:1px solid var(--border);border-radius:4px;padding:3px 8px;font-size:12px;width:160px;font-family:inherit;" />
          <label style="font-size:11px;color:var(--text-muted);">Room:</label>
          <select id="mb-board-room" style="border:1px solid var(--border);border-radius:4px;padding:3px 8px;font-size:12px;font-family:inherit;">
            <option value="">-- None --</option>
            ${rooms.map(r => `<option value="${sanitizeHtml(r)}" ${board.room === r ? 'selected' : ''}>${sanitizeHtml(r)}</option>`).join('')}
          </select>
        </div>

        <div class="moodboard-canvas-outer" id="moodboard-canvas-outer" style="position:relative;overflow:auto;border:2px dashed var(--border);border-radius:var(--radius);background:#fafbfc;">
          <div class="moodboard-canvas" id="moodboard-canvas" style="position:relative;min-height:600px;min-width:900px;transform:scale(${zoom});transform-origin:0 0;${gridVisible ? `background-image:radial-gradient(circle,var(--border) 1px,transparent 1px);background-size:${GRID_SIZE}px ${GRID_SIZE}px;` : ''}">
            ${board.items.map(item => renderBoardItem(item, board)).join('')}
            <div id="mb-guides" style="position:absolute;inset:0;pointer-events:none;z-index:900;"></div>
            <div id="mb-rubber-band" style="display:none;position:absolute;border:1px dashed var(--primary);background:rgba(99,102,241,.08);pointer-events:none;z-index:901;"></div>
          </div>
        </div>

        ${contextMenu ? renderContextMenu() : ''}

        <div id="mb-shape-menu" style="display:none;position:absolute;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:6px 0;box-shadow:var(--shadow-lg);z-index:1100;">
          <button class="ctx-menu-item" data-shape="rect">Rectangle</button>
          <button class="ctx-menu-item" data-shape="circle">Circle</button>
          <button class="ctx-menu-item" data-shape="line">Line</button>
        </div>

        <div id="mb-layout-menu" style="display:none;position:absolute;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:6px 0;box-shadow:var(--shadow-lg);z-index:1100;">
          <button class="ctx-menu-item" data-layout="grid">Grid Layout</button>
          <button class="ctx-menu-item" data-layout="masonry">Masonry Layout</button>
          <button class="ctx-menu-item" data-layout="freeform">Reset to Freeform</button>
        </div>

        <div id="mb-link-menu" style="display:none;position:absolute;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:8px;box-shadow:var(--shadow-lg);z-index:1100;width:260px;max-height:300px;overflow-y:auto;">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;font-weight:600;">Link Procurement Item</div>
          ${items.length === 0 ? '<div style="font-size:11px;color:var(--text-muted);padding:8px 0;">No items in this project</div>' :
            items.map(it => `
              <button class="ctx-menu-item" data-link-item="${it.id}" style="text-align:left;">
                <div style="font-size:12px;font-weight:500;">${sanitizeHtml(it.name)}</div>
                <div style="font-size:10px;color:var(--text-muted);">${sanitizeHtml(it.supplier || '')} &middot; ${formatCurrency(it.trade || 0)}</div>
              </button>
            `).join('')}
        </div>
      ` : `
        <div class="empty-state">
          <h3>No mood boards yet</h3>
          <p>Create a board to start collecting inspiration, colors, and material references.</p>
          <button class="toolbar-btn" id="add-board-btn-empty" style="margin-top:12px;">${icons.plus} Create Board</button>
        </div>
      `}
    </div>
  `;
}

function renderBoardItem(item, board) {
  const selected = selectedIds.has(item.id);
  const rotation = item.rotation || 0;
  const zIndex = item.z || 0;
  const isEditing = editingTextId === item.id;
  const isEditingLabel = editingLabelId === item.id;

  const style = `left:${item.x}px;top:${item.y}px;width:${item.w}px;height:${item.h}px;z-index:${zIndex};transform:rotate(${rotation}deg);`;

  let content = '';

  if (item.type === 'color') {
    content = `
      <div style="background:${sanitizeHtml(item.value)};width:100%;height:calc(100% - 20px);border-radius:8px 8px 4px 4px;"></div>
      <div class="mb-color-label" ${isEditingLabel ? '' : `data-editable-label="${item.id}"`} style="font-size:10px;text-align:center;padding:2px 0;color:var(--text-secondary);height:20px;line-height:16px;cursor:text;">
        ${isEditingLabel ? `<input type="text" class="mb-inline-edit" data-label-input="${item.id}" value="${sanitizeHtml(item.label || '')}" style="width:100%;border:none;outline:none;text-align:center;font-size:10px;background:transparent;padding:0;" />` : sanitizeHtml(item.label || item.value)}
      </div>
      <div style="position:absolute;bottom:-16px;left:0;width:100%;text-align:center;font-size:9px;color:var(--text-muted);">${sanitizeHtml(item.value)}</div>
    `;
  } else if (item.type === 'image') {
    content = `<img src="${item.value}" draggable="false" style="width:100%;height:100%;object-fit:cover;border-radius:8px;pointer-events:none;" />`;
  } else if (item.type === 'text') {
    if (isEditing) {
      content = `<div class="mb-text-editable" contenteditable="true" data-text-edit="${item.id}" style="width:100%;height:100%;padding:8px 12px;font-size:${item.fontSize || 14}px;outline:none;background:var(--border-light);border-radius:6px;overflow:auto;${item.bold ? 'font-weight:700;' : ''}${item.italic ? 'font-style:italic;' : ''}">${sanitizeHtml(item.value)}</div>`;
    } else {
      content = `<div style="width:100%;height:100%;padding:8px 12px;font-size:${item.fontSize || 14}px;background:var(--border-light);border-radius:6px;overflow:hidden;${item.bold ? 'font-weight:700;' : ''}${item.italic ? 'font-style:italic;' : ''}">${sanitizeHtml(item.value)}</div>`;
    }
  } else if (item.type === 'material') {
    content = `
      <div style="width:100%;height:100%;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px;display:flex;flex-direction:column;justify-content:center;gap:2px;overflow:hidden;">
        <div style="font-size:12px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${sanitizeHtml(item.itemName || 'Linked Item')}</div>
        <div style="font-size:10px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${sanitizeHtml(item.supplier || '')}</div>
        <div style="font-size:11px;font-weight:600;color:var(--primary);margin-top:2px;">${item.price ? formatCurrency(item.price) : ''}</div>
      </div>
    `;
  } else if (item.type === 'shape') {
    if (item.shape === 'rect') {
      content = `<div style="width:100%;height:100%;background:${item.fill || 'rgba(99,102,241,.1)'};border:2px solid ${item.stroke || 'var(--primary)'};border-radius:4px;"></div>`;
    } else if (item.shape === 'circle') {
      content = `<div style="width:100%;height:100%;background:${item.fill || 'rgba(99,102,241,.1)'};border:2px solid ${item.stroke || 'var(--primary)'};border-radius:50%;"></div>`;
    } else if (item.shape === 'line') {
      content = `<svg width="100%" height="100%" style="position:absolute;inset:0;"><line x1="0" y1="50%" x2="100%" y2="50%" stroke="${item.stroke || 'var(--text-muted)'}" stroke-width="2"/></svg>`;
    }
  }

  const handles = selected ? `
    <div class="mb-handle mb-handle-nw" data-handle="nw" style="position:absolute;top:-${HANDLE_SIZE/2}px;left:-${HANDLE_SIZE/2}px;width:${HANDLE_SIZE}px;height:${HANDLE_SIZE}px;background:var(--primary);border-radius:2px;cursor:nw-resize;z-index:10;"></div>
    <div class="mb-handle mb-handle-n" data-handle="n" style="position:absolute;top:-${HANDLE_SIZE/2}px;left:calc(50% - ${HANDLE_SIZE/2}px);width:${HANDLE_SIZE}px;height:${HANDLE_SIZE}px;background:var(--primary);border-radius:2px;cursor:n-resize;z-index:10;"></div>
    <div class="mb-handle mb-handle-ne" data-handle="ne" style="position:absolute;top:-${HANDLE_SIZE/2}px;right:-${HANDLE_SIZE/2}px;width:${HANDLE_SIZE}px;height:${HANDLE_SIZE}px;background:var(--primary);border-radius:2px;cursor:ne-resize;z-index:10;"></div>
    <div class="mb-handle mb-handle-e" data-handle="e" style="position:absolute;top:calc(50% - ${HANDLE_SIZE/2}px);right:-${HANDLE_SIZE/2}px;width:${HANDLE_SIZE}px;height:${HANDLE_SIZE}px;background:var(--primary);border-radius:2px;cursor:e-resize;z-index:10;"></div>
    <div class="mb-handle mb-handle-se" data-handle="se" style="position:absolute;bottom:-${HANDLE_SIZE/2}px;right:-${HANDLE_SIZE/2}px;width:${HANDLE_SIZE}px;height:${HANDLE_SIZE}px;background:var(--primary);border-radius:2px;cursor:se-resize;z-index:10;"></div>
    <div class="mb-handle mb-handle-s" data-handle="s" style="position:absolute;bottom:-${HANDLE_SIZE/2}px;left:calc(50% - ${HANDLE_SIZE/2}px);width:${HANDLE_SIZE}px;height:${HANDLE_SIZE}px;background:var(--primary);border-radius:2px;cursor:s-resize;z-index:10;"></div>
    <div class="mb-handle mb-handle-sw" data-handle="sw" style="position:absolute;bottom:-${HANDLE_SIZE/2}px;left:-${HANDLE_SIZE/2}px;width:${HANDLE_SIZE}px;height:${HANDLE_SIZE}px;background:var(--primary);border-radius:2px;cursor:sw-resize;z-index:10;"></div>
    <div class="mb-handle mb-handle-w" data-handle="w" style="position:absolute;top:calc(50% - ${HANDLE_SIZE/2}px);left:-${HANDLE_SIZE/2}px;width:${HANDLE_SIZE}px;height:${HANDLE_SIZE}px;background:var(--primary);border-radius:2px;cursor:w-resize;z-index:10;"></div>
    <div class="mb-rotate-handle" data-handle="rotate" style="position:absolute;top:-28px;left:calc(50% - 6px);width:12px;height:12px;border:2px solid var(--primary);border-radius:50%;cursor:grab;z-index:10;background:var(--surface);"></div>
    <div style="position:absolute;top:-18px;left:50%;width:1px;height:14px;background:var(--primary);z-index:9;"></div>
  ` : '';

  return `
    <div class="mb-item ${selected ? 'mb-selected' : ''}" data-id="${item.id}" style="${style}">
      ${content}
      ${handles}
    </div>
  `;
}

function renderContextMenu() {
  if (!contextMenu) return '';
  return `
    <div id="mb-context-menu" style="position:fixed;left:${contextMenu.x}px;top:${contextMenu.y}px;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:4px 0;box-shadow:var(--shadow-lg);z-index:2000;min-width:180px;">
      <button class="ctx-menu-item" data-ctx="front">Bring to Front</button>
      <button class="ctx-menu-item" data-ctx="forward">Bring Forward</button>
      <button class="ctx-menu-item" data-ctx="backward">Send Backward</button>
      <button class="ctx-menu-item" data-ctx="back">Send to Back</button>
      <div style="height:1px;background:var(--border);margin:4px 0;"></div>
      <button class="ctx-menu-item" data-ctx="duplicate">Duplicate</button>
      <button class="ctx-menu-item" data-ctx="delete" style="color:var(--error);">Delete</button>
    </div>
  `;
}

// ── Mount ────────────────────────────────────────────────────────────────
export function mount(el) {
  _el = el;
  cleanupEvents();

  const state = getState();
  const project = getActiveProject();
  if (!state || !project) return;

  // ── Board Tabs ──────────────────────────────────────────────────────
  el.querySelectorAll('.board-tab:not(.board-tab-add)').forEach(tab => {
    tab.addEventListener('click', () => {
      activeBoardId = tab.dataset.id;
      selectedIds.clear();
      editingTextId = null;
      rerender();
    });
    tab.addEventListener('dblclick', () => {
      const name = prompt('Rename board:', tab.textContent.trim().split('(')[0].trim());
      if (!name) return;
      const { state: s, board } = getBoardMut();
      if (!board || !s) return;
      board.name = name;
      setState(s);
      rerender();
    });
  });

  const addBoardFn = () => {
    const name = prompt('Board name:');
    if (!name) return;
    const rooms = project.rooms || [];
    const room = rooms.length > 0 ? (prompt(`Room:\n${rooms.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n\nEnter room name or leave blank:`) || '') : '';
    const s = getState();
    s.moodboards.push({ id: generateId(), projectId: project.id, name, room, items: [] });
    setState(s);
    activeBoardId = s.moodboards[s.moodboards.length - 1].id;
    addActivity('Mood board created', `${name} board created`, 'plus');
    rerender();
  };
  el.querySelector('#add-board-btn')?.addEventListener('click', addBoardFn);
  el.querySelector('#add-board-btn-empty')?.addEventListener('click', addBoardFn);

  // ── Board Meta ────────────────────────────────────────────────────
  el.querySelector('#mb-board-name')?.addEventListener('change', (e) => {
    const { state: s, board } = getBoardMut();
    if (!board || !s) return;
    board.name = e.target.value || 'Untitled';
    setState(s);
    // Update tab text without full rerender
    const tab = el.querySelector(`.board-tab[data-id="${activeBoardId}"]`);
    if (tab) tab.textContent = board.name;
  });

  el.querySelector('#mb-board-room')?.addEventListener('change', (e) => {
    const { state: s, board } = getBoardMut();
    if (!board || !s) return;
    board.room = e.target.value;
    setState(s);
  });

  // ── Toolbar ────────────────────────────────────────────────────────
  el.querySelector('#mb-undo')?.addEventListener('click', () => { undo(); rerender(); });
  el.querySelector('#mb-redo')?.addEventListener('click', () => { redo(); rerender(); });

  el.querySelector('#mb-upload')?.addEventListener('click', () => el.querySelector('#mb-file-input')?.click());

  el.querySelector('#mb-file-input')?.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    let loaded = 0;
    files.forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const { state: s, board } = getBoardMut();
        if (!board || !s) return;
        const img = new Image();
        img.onload = () => {
          const maxW = 250;
          const scale = img.width > maxW ? maxW / img.width : 1;
          board.items.push({
            id: generateId(), type: 'image', value: ev.target.result,
            x: 30 + i * 40, y: 30 + i * 40,
            w: Math.round(img.width * scale), h: Math.round(img.height * scale),
            z: board.items.length, rotation: 0
          });
          loaded++;
          if (loaded === files.length) {
            setState(s);
            showToast(`${files.length} image${files.length > 1 ? 's' : ''} added`);
            rerender();
          }
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  });

  // Color picker
  el.querySelector('#mb-color')?.addEventListener('click', () => {
    const picker = document.createElement('input');
    picker.type = 'color';
    picker.value = '#6366f1';
    picker.style.position = 'fixed'; picker.style.opacity = '0'; picker.style.pointerEvents = 'none';
    document.body.appendChild(picker);
    picker.addEventListener('input', () => {});
    picker.addEventListener('change', () => {
      const color = picker.value;
      const label = prompt('Color name:') || color;
      const { state: s, board } = getBoardMut();
      if (!board || !s) { picker.remove(); return; }
      board.items.push({
        id: generateId(), type: 'color', value: color, label,
        x: 20 + (board.items.length % 6) * 100, y: 20 + Math.floor(board.items.length / 6) * 120,
        w: 80, h: 100, z: board.items.length, rotation: 0
      });
      setState(s);
      picker.remove();
      rerender();
    });
    picker.click();
    setTimeout(() => { if (document.body.contains(picker)) picker.remove(); }, 60000);
  });

  // Text
  el.querySelector('#mb-text')?.addEventListener('click', () => {
    const text = prompt('Enter text:');
    if (!text) return;
    const { state: s, board } = getBoardMut();
    if (!board || !s) return;
    board.items.push({
      id: generateId(), type: 'text', value: text,
      x: 40, y: 40 + board.items.length * 20,
      w: 260, h: 50, z: board.items.length, rotation: 0,
      fontSize: 14, bold: false, italic: false
    });
    setState(s);
    rerender();
  });

  // Link procurement item
  el.querySelector('#mb-link-item')?.addEventListener('click', (e) => {
    const menu = el.querySelector('#mb-link-menu');
    if (!menu) return;
    const rect = e.currentTarget.getBoundingClientRect();
    menu.style.display = 'block';
    menu.style.left = rect.left + 'px';
    menu.style.top = (rect.bottom + 4) + 'px';
  });

  el.querySelectorAll('[data-link-item]').forEach(btn => {
    btn.addEventListener('click', () => {
      const itemId = btn.dataset.linkItem;
      const pItem = state.items.find(i => i.id === itemId);
      if (!pItem) return;
      const { state: s, board } = getBoardMut();
      if (!board || !s) return;
      board.items.push({
        id: generateId(), type: 'material',
        itemName: pItem.name, supplier: pItem.supplier, price: pItem.trade,
        linkedItemId: pItem.id,
        x: 40, y: 40 + board.items.length * 20,
        w: 200, h: 80, z: board.items.length, rotation: 0
      });
      setState(s);
      el.querySelector('#mb-link-menu').style.display = 'none';
      showToast(`Linked: ${pItem.name}`);
      rerender();
    });
  });

  // Shape menu
  el.querySelector('#mb-add-shape')?.addEventListener('click', (e) => {
    const menu = el.querySelector('#mb-shape-menu');
    if (!menu) return;
    const rect = e.currentTarget.getBoundingClientRect();
    menu.style.display = 'block';
    menu.style.left = rect.left + 'px';
    menu.style.top = (rect.bottom + 4) + 'px';
  });

  el.querySelectorAll('[data-shape]').forEach(btn => {
    btn.addEventListener('click', () => {
      const shape = btn.dataset.shape;
      const { state: s, board } = getBoardMut();
      if (!board || !s) return;
      const w = shape === 'line' ? 200 : 100;
      const h = shape === 'line' ? 4 : 100;
      board.items.push({
        id: generateId(), type: 'shape', shape,
        x: 60, y: 60,
        w, h, z: board.items.length, rotation: 0,
        fill: 'rgba(99,102,241,.08)', stroke: '#6366f1'
      });
      setState(s);
      el.querySelector('#mb-shape-menu').style.display = 'none';
      rerender();
    });
  });

  // Layout menu
  el.querySelector('#mb-auto-layout')?.addEventListener('click', (e) => {
    const menu = el.querySelector('#mb-layout-menu');
    if (!menu) return;
    const rect = e.currentTarget.getBoundingClientRect();
    menu.style.display = 'block';
    menu.style.left = rect.left + 'px';
    menu.style.top = (rect.bottom + 4) + 'px';
  });

  el.querySelectorAll('[data-layout]').forEach(btn => {
    btn.addEventListener('click', () => {
      const layoutType = btn.dataset.layout;
      const { state: s, board } = getBoardMut();
      if (!board || !s || board.items.length === 0) return;

      const padding = 20;
      const gap = 16;

      if (layoutType === 'grid') {
        const cols = Math.max(2, Math.ceil(Math.sqrt(board.items.length)));
        const cellW = 150;
        const cellH = 150;
        board.items.forEach((item, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          item.x = padding + col * (cellW + gap);
          item.y = padding + row * (cellH + gap);
          item.w = cellW;
          item.h = item.type === 'text' ? 50 : item.type === 'color' ? 100 : cellH;
        });
      } else if (layoutType === 'masonry') {
        const cols = 3;
        const colWidth = 200;
        const colHeights = new Array(cols).fill(padding);
        board.items.forEach((item, i) => {
          const minCol = colHeights.indexOf(Math.min(...colHeights));
          item.x = padding + minCol * (colWidth + gap);
          item.y = colHeights[minCol];
          item.w = colWidth;
          colHeights[minCol] += item.h + gap;
        });
      }
      // freeform = no change

      setState(s);
      el.querySelector('#mb-layout-menu').style.display = 'none';
      showToast(`${layoutType.charAt(0).toUpperCase() + layoutType.slice(1)} layout applied`);
      rerender();
    });
  });

  // Grid / snap toggles
  el.querySelector('#mb-toggle-grid')?.addEventListener('click', () => { gridVisible = !gridVisible; rerender(); });
  el.querySelector('#mb-toggle-snap')?.addEventListener('click', () => { snapToGrid = !snapToGrid; rerender(); });

  // Zoom
  el.querySelector('#mb-zoom-in')?.addEventListener('click', () => { zoom = Math.min(ZOOM_MAX, zoom + ZOOM_STEP); rerender(); });
  el.querySelector('#mb-zoom-out')?.addEventListener('click', () => { zoom = Math.max(ZOOM_MIN, zoom - ZOOM_STEP); rerender(); });

  // Duplicate
  el.querySelector('#mb-duplicate')?.addEventListener('click', duplicateSelection);

  // Delete
  el.querySelector('#mb-delete')?.addEventListener('click', deleteSelection);

  // Clear canvas
  el.querySelector('#mb-clear')?.addEventListener('click', () => {
    if (!confirm('Clear all items from this board?')) return;
    const { state: s, board } = getBoardMut();
    if (!board || !s) return;
    board.items = [];
    selectedIds.clear();
    setState(s);
    rerender();
  });

  // Export PNG
  el.querySelector('#mb-export-png')?.addEventListener('click', exportAsPng);

  // ── Canvas Interactions ─────────────────────────────────────────────
  const canvas = getCanvasEl();
  if (!canvas) return;

  // Close menus on outside click
  const closeMenus = (e) => {
    ['#mb-shape-menu', '#mb-layout-menu', '#mb-link-menu'].forEach(sel => {
      const menu = el.querySelector(sel);
      if (menu && menu.style.display !== 'none' && !menu.contains(e.target) && !e.target.closest(`#${sel.replace('#', '')}`)) {
        menu.style.display = 'none';
      }
    });
    if (contextMenu && !e.target.closest('#mb-context-menu')) {
      contextMenu = null;
      const cmEl = el.querySelector('#mb-context-menu');
      if (cmEl) cmEl.remove();
    }
  };
  document.addEventListener('click', closeMenus);
  _eventCleanup.push(() => document.removeEventListener('click', closeMenus));

  // Context menu actions
  el.querySelectorAll('[data-ctx]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!contextMenu) return;
      const action = btn.dataset.ctx;
      const { state: s, board } = getBoardMut();
      if (!board || !s) return;
      const item = board.items.find(i => i.id === contextMenu.itemId);
      if (!item && action !== 'delete') return;

      if (action === 'front') {
        const maxZ = Math.max(0, ...board.items.map(i => i.z || 0));
        item.z = maxZ + 1;
      } else if (action === 'back') {
        board.items.forEach(i => { if (i.z !== undefined) i.z++; });
        item.z = 0;
      } else if (action === 'forward') {
        item.z = (item.z || 0) + 1;
      } else if (action === 'backward') {
        item.z = Math.max(0, (item.z || 0) - 1);
      } else if (action === 'duplicate') {
        selectedIds.clear();
        selectedIds.add(contextMenu.itemId);
        contextMenu = null;
        setState(s);
        duplicateSelection();
        return;
      } else if (action === 'delete') {
        selectedIds.add(contextMenu.itemId);
        contextMenu = null;
        setState(s);
        deleteSelection();
        return;
      }
      contextMenu = null;
      setState(s);
      rerender();
    });
  });

  // ── Mouse Down (select, drag, resize, rotate, rubber band) ─────────
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 2) return; // right click handled separately
    const pos = canvasCoords(e);
    const mbItem = e.target.closest('.mb-item');
    const handle = e.target.dataset?.handle;

    // Close text editing
    if (editingTextId && (!mbItem || mbItem.dataset.id !== editingTextId)) {
      commitTextEdit();
    }
    if (editingLabelId) commitLabelEdit();

    if (handle && mbItem) {
      const id = mbItem.dataset.id;
      const board = getBoard();
      const item = board ? getItemById(board, id) : null;
      if (!item) return;

      if (handle === 'rotate') {
        const cx = item.x + item.w / 2;
        const cy = item.y + item.h / 2;
        const startAngle = Math.atan2(pos.y - cy, pos.x - cx) * (180 / Math.PI);
        rotateState = { id, startAngle, origRotation: item.rotation || 0, cx, cy };
        e.preventDefault();
        return;
      }

      resizeState = {
        id, handle,
        startX: pos.x, startY: pos.y,
        origRect: { x: item.x, y: item.y, w: item.w, h: item.h },
        shiftKey: e.shiftKey
      };
      e.preventDefault();
      return;
    }

    if (mbItem) {
      const id = mbItem.dataset.id;
      if (e.ctrlKey || e.metaKey) {
        if (selectedIds.has(id)) selectedIds.delete(id);
        else selectedIds.add(id);
        rerender();
        return;
      }
      if (!selectedIds.has(id)) {
        selectedIds.clear();
        selectedIds.add(id);
        rerender();
      }

      // Start drag
      const board = getBoard();
      if (!board) return;
      const origPositions = new Map();
      for (const sid of selectedIds) {
        const item = getItemById(board, sid);
        if (item) origPositions.set(sid, { x: item.x, y: item.y });
      }
      dragState = { ids: new Set(selectedIds), startX: pos.x, startY: pos.y, origPositions };
      canvas.style.cursor = 'grabbing';
      e.preventDefault();
      return;
    }

    // Click on empty canvas = deselect + start rubber band
    selectedIds.clear();
    rubberBand = { startX: pos.x, startY: pos.y, curX: pos.x, curY: pos.y };
    rerender();
  });

  // Double-click for text edit / label edit
  canvas.addEventListener('dblclick', (e) => {
    const mbItem = e.target.closest('.mb-item');
    if (!mbItem) return;
    const id = mbItem.dataset.id;
    const board = getBoard();
    if (!board) return;
    const item = getItemById(board, id);
    if (!item) return;

    if (item.type === 'text') {
      editingTextId = id;
      rerender();
      setTimeout(() => {
        const editable = el.querySelector(`[data-text-edit="${id}"]`);
        if (editable) { editable.focus(); placeCaretAtEnd(editable); }
      }, 10);
    } else if (item.type === 'color') {
      editingLabelId = id;
      rerender();
      setTimeout(() => {
        const input = el.querySelector(`[data-label-input="${id}"]`);
        if (input) { input.focus(); input.select(); }
      }, 10);
    }
  });

  // Right-click context menu
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const mbItem = e.target.closest('.mb-item');
    if (!mbItem) return;
    const id = mbItem.dataset.id;
    if (!selectedIds.has(id)) {
      selectedIds.clear();
      selectedIds.add(id);
    }
    contextMenu = { x: e.clientX, y: e.clientY, itemId: id };
    rerender();
  });

  // ── Global Mouse Move ────────────────────────────────────────────────
  const onMouseMove = (e) => {
    const pos = canvasCoords(e);

    if (dragState) {
      const dx = pos.x - dragState.startX;
      const dy = pos.y - dragState.startY;
      const { state: s, board } = getBoardMut();
      if (!board || !s) return;

      for (const [id, orig] of dragState.origPositions) {
        const item = getItemById(board, id);
        if (!item) continue;
        let nx = orig.x + dx;
        let ny = orig.y + dy;
        if (snapToGrid) {
          nx = snapValue(nx);
          ny = snapValue(ny);
        }
        // Constrain to canvas
        nx = Math.max(0, nx);
        ny = Math.max(0, ny);
        item.x = nx;
        item.y = ny;

        // Update DOM directly for smooth drag
        const domItem = canvas.querySelector(`[data-id="${id}"]`);
        if (domItem) {
          domItem.style.left = nx + 'px';
          domItem.style.top = ny + 'px';
        }
      }
      return;
    }

    if (resizeState) {
      const dx = pos.x - resizeState.startX;
      const dy = pos.y - resizeState.startY;
      const { state: s, board } = getBoardMut();
      if (!board || !s) return;
      const item = getItemById(board, resizeState.id);
      if (!item) return;

      const orig = resizeState.origRect;
      const handle = resizeState.handle;
      const lockAspect = e.shiftKey;
      const aspect = orig.w / orig.h;

      let nx = orig.x, ny = orig.y, nw = orig.w, nh = orig.h;

      if (handle.includes('e')) nw = orig.w + dx;
      if (handle.includes('w')) { nw = orig.w - dx; nx = orig.x + dx; }
      if (handle.includes('s')) nh = orig.h + dy;
      if (handle.includes('n')) { nh = orig.h - dy; ny = orig.y + dy; }

      if (lockAspect) {
        if (handle === 'e' || handle === 'w') nh = nw / aspect;
        else if (handle === 'n' || handle === 's') nw = nh * aspect;
        else { nh = nw / aspect; }
      }

      nw = Math.max(MIN_SIZE, nw);
      nh = Math.max(MIN_SIZE, nh);

      item.x = snapToGrid ? snapValue(nx) : nx;
      item.y = snapToGrid ? snapValue(ny) : ny;
      item.w = snapToGrid ? snapValue(nw) : nw;
      item.h = snapToGrid ? snapValue(nh) : nh;

      const domItem = canvas.querySelector(`[data-id="${resizeState.id}"]`);
      if (domItem) {
        domItem.style.left = item.x + 'px';
        domItem.style.top = item.y + 'px';
        domItem.style.width = item.w + 'px';
        domItem.style.height = item.h + 'px';
      }
      return;
    }

    if (rotateState) {
      const { state: s, board } = getBoardMut();
      if (!board || !s) return;
      const item = getItemById(board, rotateState.id);
      if (!item) return;
      const angle = Math.atan2(pos.y - rotateState.cy, pos.x - rotateState.cx) * (180 / Math.PI);
      let newRot = rotateState.origRotation + (angle - rotateState.startAngle);
      if (e.shiftKey) newRot = Math.round(newRot / 15) * 15;
      item.rotation = Math.round(newRot);
      const domItem = canvas.querySelector(`[data-id="${rotateState.id}"]`);
      if (domItem) domItem.style.transform = `rotate(${item.rotation}deg)`;
      return;
    }

    if (rubberBand) {
      rubberBand.curX = pos.x;
      rubberBand.curY = pos.y;
      const rb = el.querySelector('#mb-rubber-band');
      if (rb) {
        const x = Math.min(rubberBand.startX, rubberBand.curX);
        const y = Math.min(rubberBand.startY, rubberBand.curY);
        const w = Math.abs(rubberBand.curX - rubberBand.startX);
        const h = Math.abs(rubberBand.curY - rubberBand.startY);
        rb.style.display = 'block';
        rb.style.left = x + 'px';
        rb.style.top = y + 'px';
        rb.style.width = w + 'px';
        rb.style.height = h + 'px';
      }
    }
  };
  document.addEventListener('mousemove', onMouseMove);
  _eventCleanup.push(() => document.removeEventListener('mousemove', onMouseMove));

  // ── Global Mouse Up ──────────────────────────────────────────────────
  const onMouseUp = () => {
    if (dragState) {
      const { state: s, board } = getBoardMut();
      if (s) setState(s);
      dragState = null;
      if (canvas) canvas.style.cursor = '';
    }
    if (resizeState) {
      const { state: s } = getBoardMut();
      if (s) setState(s);
      resizeState = null;
    }
    if (rotateState) {
      const { state: s } = getBoardMut();
      if (s) setState(s);
      rotateState = null;
    }
    if (rubberBand) {
      // Select items within rubber band rectangle
      const board = getBoard();
      if (board) {
        const rx = Math.min(rubberBand.startX, rubberBand.curX);
        const ry = Math.min(rubberBand.startY, rubberBand.curY);
        const rw = Math.abs(rubberBand.curX - rubberBand.startX);
        const rh = Math.abs(rubberBand.curY - rubberBand.startY);
        if (rw > 5 || rh > 5) {
          board.items.forEach(item => {
            if (item.x + item.w > rx && item.x < rx + rw && item.y + item.h > ry && item.y < ry + rh) {
              selectedIds.add(item.id);
            }
          });
        }
      }
      rubberBand = null;
      rerender();
    }
  };
  document.addEventListener('mouseup', onMouseUp);
  _eventCleanup.push(() => document.removeEventListener('mouseup', onMouseUp));

  // ── Keyboard ─────────────────────────────────────────────────────────
  const onKeyDown = (e) => {
    if (editingTextId || editingLabelId) return;

    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedIds.size > 0 && !e.target.closest('input, [contenteditable]')) {
        e.preventDefault();
        deleteSelection();
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); rerender(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); rerender(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); duplicateSelection(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      if (!e.target.closest('input, [contenteditable]')) {
        e.preventDefault();
        const board = getBoard();
        if (board) { board.items.forEach(i => selectedIds.add(i.id)); rerender(); }
      }
    }
    if (e.key === 'Escape') {
      selectedIds.clear();
      editingTextId = null;
      editingLabelId = null;
      rerender();
    }
    // Arrow key nudge
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedIds.size > 0) {
      if (e.target.closest('input, [contenteditable]')) return;
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const { state: s, board } = getBoardMut();
      if (!board || !s) return;
      for (const id of selectedIds) {
        const item = getItemById(board, id);
        if (!item) continue;
        if (e.key === 'ArrowUp') item.y -= step;
        if (e.key === 'ArrowDown') item.y += step;
        if (e.key === 'ArrowLeft') item.x -= step;
        if (e.key === 'ArrowRight') item.x += step;
        item.x = Math.max(0, item.x);
        item.y = Math.max(0, item.y);
      }
      setState(s);
      rerender();
    }
  };
  document.addEventListener('keydown', onKeyDown);
  _eventCleanup.push(() => document.removeEventListener('keydown', onKeyDown));

  // ── Zoom with scroll wheel on canvas ────────────────────────────────
  const outer = el.querySelector('#moodboard-canvas-outer');
  if (outer) {
    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        zoom = clamp(zoom + delta, ZOOM_MIN, ZOOM_MAX);
        rerender();
      }
    };
    outer.addEventListener('wheel', onWheel, { passive: false });
    _eventCleanup.push(() => outer.removeEventListener('wheel', onWheel));
  }

  // ── Drag-drop files from desktop ────────────────────────────────────
  if (canvas) {
    canvas.addEventListener('dragover', (e) => { e.preventDefault(); canvas.style.outline = '2px solid var(--primary)'; });
    canvas.addEventListener('dragleave', () => { canvas.style.outline = ''; });
    canvas.addEventListener('drop', (e) => {
      e.preventDefault();
      canvas.style.outline = '';
      const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type.startsWith('image/'));
      if (files.length === 0) return;
      const pos = canvasCoords(e);
      let loaded = 0;
      files.forEach((file, i) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const { state: s, board } = getBoardMut();
          if (!board || !s) return;
          const img = new Image();
          img.onload = () => {
            const maxW = 250;
            const scale = img.width > maxW ? maxW / img.width : 1;
            board.items.push({
              id: generateId(), type: 'image', value: ev.target.result,
              x: snapValue(pos.x + i * 30), y: snapValue(pos.y + i * 30),
              w: Math.round(img.width * scale), h: Math.round(img.height * scale),
              z: board.items.length, rotation: 0
            });
            loaded++;
            if (loaded === files.length) {
              setState(s);
              showToast(`${files.length} image${files.length > 1 ? 's' : ''} dropped`);
              rerender();
            }
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      });
    });
  }

  // ── Inline label edit commit ────────────────────────────────────────
  el.querySelectorAll('[data-label-input]').forEach(input => {
    input.addEventListener('blur', () => commitLabelEdit());
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); commitLabelEdit(); } });
  });

  // ── Inline text edit commit ──────────────────────────────────────────
  el.querySelectorAll('[data-text-edit]').forEach(div => {
    div.addEventListener('blur', () => setTimeout(() => commitTextEdit(), 50));
    div.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { editingTextId = null; rerender(); }
    });
  });
}

// ── Actions ──────────────────────────────────────────────────────────────
function deleteSelection() {
  if (selectedIds.size === 0) return;
  const { state: s, board } = getBoardMut();
  if (!board || !s) return;
  board.items = board.items.filter(i => !selectedIds.has(i.id));
  selectedIds.clear();
  setState(s);
  rerender();
}

function duplicateSelection() {
  if (selectedIds.size === 0) return;
  const { state: s, board } = getBoardMut();
  if (!board || !s) return;
  const newIds = new Set();
  for (const id of selectedIds) {
    const item = getItemById(board, id);
    if (!item) continue;
    const newItem = { ...item, id: generateId(), x: item.x + 20, y: item.y + 20, z: board.items.length };
    board.items.push(newItem);
    newIds.add(newItem.id);
  }
  selectedIds.clear();
  for (const nid of newIds) selectedIds.add(nid);
  setState(s);
  showToast('Duplicated');
  rerender();
}

function commitTextEdit() {
  if (!editingTextId) return;
  const div = _el?.querySelector(`[data-text-edit="${editingTextId}"]`);
  if (!div) { editingTextId = null; return; }
  const newText = div.textContent.trim();
  if (newText) {
    const { state: s, board } = getBoardMut();
    if (board && s) {
      const item = getItemById(board, editingTextId);
      if (item) { item.value = newText; setState(s); }
    }
  }
  editingTextId = null;
  rerender();
}

function commitLabelEdit() {
  if (!editingLabelId) return;
  const input = _el?.querySelector(`[data-label-input="${editingLabelId}"]`);
  if (!input) { editingLabelId = null; return; }
  const newLabel = input.value.trim();
  if (newLabel) {
    const { state: s, board } = getBoardMut();
    if (board && s) {
      const item = getItemById(board, editingLabelId);
      if (item) { item.label = newLabel; setState(s); }
    }
  }
  editingLabelId = null;
  rerender();
}

function placeCaretAtEnd(el) {
  const range = document.createRange();
  const sel = window.getSelection();
  range.selectNodeContents(el);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

// ── Export PNG ────────────────────────────────────────────────────────────
function exportAsPng() {
  const canvas = getCanvasEl();
  if (!canvas) return;

  const board = getBoard();
  if (!board || board.items.length === 0) {
    showToast('Nothing to export', 'error');
    return;
  }

  // Find bounding box
  let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
  board.items.forEach(item => {
    minX = Math.min(minX, item.x);
    minY = Math.min(minY, item.y);
    maxX = Math.max(maxX, item.x + item.w);
    maxY = Math.max(maxY, item.y + item.h);
  });

  const padding = 40;
  const w = maxX - minX + padding * 2;
  const h = maxY - minY + padding * 2;

  const offscreen = document.createElement('canvas');
  offscreen.width = w;
  offscreen.height = h;
  const ctx = offscreen.getContext('2d');

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  // Title
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 16px Inter, sans-serif';
  ctx.fillText(board.name || 'Mood Board', padding, 24);

  let loadCount = 0;
  const imageItems = board.items.filter(i => i.type === 'image');
  const totalImages = imageItems.length;

  const drawNonImages = () => {
    board.items.forEach(item => {
      const ix = item.x - minX + padding;
      const iy = item.y - minY + padding;

      ctx.save();
      if (item.rotation) {
        const cx = ix + item.w / 2;
        const cy = iy + item.h / 2;
        ctx.translate(cx, cy);
        ctx.rotate((item.rotation * Math.PI) / 180);
        ctx.translate(-cx, -cy);
      }

      if (item.type === 'color') {
        ctx.fillStyle = item.value;
        ctx.beginPath();
        ctx.roundRect(ix, iy, item.w, item.h - 20, 8);
        ctx.fill();
        ctx.fillStyle = '#64748b';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(item.label || item.value, ix + item.w / 2, iy + item.h - 4);
        ctx.textAlign = 'start';
      } else if (item.type === 'text') {
        ctx.fillStyle = '#f1f5f9';
        ctx.beginPath();
        ctx.roundRect(ix, iy, item.w, item.h, 6);
        ctx.fill();
        ctx.fillStyle = '#475569';
        ctx.font = `${item.bold ? 'bold' : 'normal'} ${item.italic ? 'italic' : 'normal'} ${item.fontSize || 14}px Inter, sans-serif`;
        ctx.fillText(item.value, ix + 12, iy + item.h / 2 + 5, item.w - 24);
      } else if (item.type === 'material') {
        ctx.strokeStyle = '#e2e8f0';
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(ix, iy, item.w, item.h, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillText(item.itemName || 'Item', ix + 10, iy + 24, item.w - 20);
        ctx.fillStyle = '#64748b';
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText(item.supplier || '', ix + 10, iy + 40, item.w - 20);
        if (item.price) {
          ctx.fillStyle = '#6366f1';
          ctx.font = 'bold 11px Inter, sans-serif';
          ctx.fillText(formatCurrency(item.price), ix + 10, iy + 58);
        }
      } else if (item.type === 'shape') {
        ctx.fillStyle = item.fill || 'rgba(99,102,241,.08)';
        ctx.strokeStyle = item.stroke || '#6366f1';
        ctx.lineWidth = 2;
        if (item.shape === 'rect') {
          ctx.beginPath();
          ctx.roundRect(ix, iy, item.w, item.h, 4);
          ctx.fill(); ctx.stroke();
        } else if (item.shape === 'circle') {
          ctx.beginPath();
          ctx.ellipse(ix + item.w / 2, iy + item.h / 2, item.w / 2, item.h / 2, 0, 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();
        } else if (item.shape === 'line') {
          ctx.beginPath();
          ctx.moveTo(ix, iy + item.h / 2);
          ctx.lineTo(ix + item.w, iy + item.h / 2);
          ctx.stroke();
        }
      }
      ctx.restore();
    });
  };

  if (totalImages === 0) {
    drawNonImages();
    triggerCanvasDownload(offscreen, board.name);
    return;
  }

  imageItems.forEach(item => {
    const img = new Image();
    img.onload = () => {
      const ix = item.x - minX + padding;
      const iy = item.y - minY + padding;
      ctx.save();
      if (item.rotation) {
        const cx = ix + item.w / 2;
        const cy = iy + item.h / 2;
        ctx.translate(cx, cy);
        ctx.rotate((item.rotation * Math.PI) / 180);
        ctx.translate(-cx, -cy);
      }
      ctx.beginPath();
      ctx.roundRect(ix, iy, item.w, item.h, 8);
      ctx.clip();
      ctx.drawImage(img, ix, iy, item.w, item.h);
      ctx.restore();
      loadCount++;
      if (loadCount === totalImages) {
        drawNonImages();
        triggerCanvasDownload(offscreen, board.name);
      }
    };
    img.onerror = () => {
      loadCount++;
      if (loadCount === totalImages) { drawNonImages(); triggerCanvasDownload(offscreen, board.name); }
    };
    img.src = item.value;
  });
}

function triggerCanvasDownload(canvas, name) {
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(name || 'moodboard').replace(/\s+/g, '_')}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('PNG exported');
}

// ── Cleanup ──────────────────────────────────────────────────────────────
function cleanupEvents() {
  _eventCleanup.forEach(fn => fn());
  _eventCleanup = [];
}

export function destroy() {
  cleanupEvents();
  activeBoardId = null;
  selectedIds.clear();
  dragState = null;
  resizeState = null;
  rotateState = null;
  rubberBand = null;
  contextMenu = null;
  editingTextId = null;
  editingLabelId = null;
  zoom = 1;
  _el = null;
}
