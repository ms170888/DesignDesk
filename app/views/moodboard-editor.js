// Mood Board Builder

import { getState, setState, getActiveProject, addActivity } from '../store.js';
import { generateId } from '../core/utils.js';
import { icons } from '../core/icons.js';
import { showToast } from '../components/toast.js';

let activeBoardId = null;
let selectedItemId = null;
let dragItem = null;
let resizeItem = null;

export function render() {
  const state = getState();
  const project = getActiveProject();
  if (!project || !state) return '<div class="empty-state"><h2>No project selected</h2></div>';

  const boards = state.moodboards.filter(b => b.projectId === project.id);

  if (!activeBoardId && boards.length > 0) activeBoardId = boards[0].id;
  const board = boards.find(b => b.id === activeBoardId);

  return `
    <div class="view-moodboard">
      <div class="view-header">
        <h1>Mood Boards</h1>
        <div class="board-tabs">
          ${boards.map(b => `<button class="board-tab ${b.id === activeBoardId ? 'active' : ''}" data-id="${b.id}">${b.name}</button>`).join('')}
          <button class="board-tab board-tab-add" id="add-board-btn">+</button>
        </div>
      </div>

      ${board ? `
        <div class="moodboard-toolbar">
          <button class="toolbar-btn" id="mb-upload">${icons.upload} Upload Image</button>
          <button class="toolbar-btn" id="mb-color">${icons.palette} Add Color</button>
          <button class="toolbar-btn" id="mb-text">${icons.text} Add Text</button>
          <button class="toolbar-btn" id="mb-auto-layout">${icons.grid} Auto Layout</button>
          ${selectedItemId ? `<button class="toolbar-btn toolbar-delete" id="mb-delete">${icons.trash} Delete</button>` : ''}
        </div>
        <input type="file" id="mb-file-input" accept="image/*" style="display:none" />
        <div class="moodboard-canvas" id="moodboard-canvas">
          ${board.items.map(item => renderBoardItem(item)).join('')}
        </div>
      ` : '<div class="empty-state"><h3>No mood boards yet</h3><p>Create one to start collecting inspiration.</p></div>'}
    </div>
  `;
}

function renderBoardItem(item) {
  const selected = item.id === selectedItemId;
  const style = `left:${item.x}px;top:${item.y}px;width:${item.w}px;height:${item.h}px;`;

  if (item.type === 'color') {
    return `<div class="mb-item ${selected ? 'mb-selected' : ''}" data-id="${item.id}" style="${style}">
      <div class="mb-color-swatch" style="background:${item.value};width:100%;height:100%;border-radius:8px"></div>
      <div class="mb-color-label">${item.label}</div>
      ${selected ? '<div class="mb-resize-handle"></div>' : ''}
    </div>`;
  }
  if (item.type === 'image') {
    return `<div class="mb-item ${selected ? 'mb-selected' : ''}" data-id="${item.id}" style="${style}">
      <img src="${item.value}" style="width:100%;height:100%;object-fit:cover;border-radius:8px" />
      ${selected ? '<div class="mb-resize-handle"></div>' : ''}
    </div>`;
  }
  if (item.type === 'text') {
    return `<div class="mb-item mb-text-item ${selected ? 'mb-selected' : ''}" data-id="${item.id}" style="${style}">
      <span>${item.value}</span>
      ${selected ? '<div class="mb-resize-handle"></div>' : ''}
    </div>`;
  }
  return '';
}

export function mount(el) {
  const state = getState();
  const project = getActiveProject();
  const boards = state.moodboards.filter(b => b.projectId === project.id);

  // Board tabs
  el.querySelectorAll('.board-tab:not(.board-tab-add)').forEach(tab => {
    tab.addEventListener('click', () => {
      activeBoardId = tab.dataset.id;
      selectedItemId = null;
      el.innerHTML = render();
      mount(el);
    });
  });

  el.querySelector('#add-board-btn')?.addEventListener('click', () => {
    const name = prompt('Board name:');
    if (!name) return;
    const room = prompt('Room (optional):') || '';
    state.moodboards.push({ id: generateId(), projectId: project.id, name, room, items: [] });
    setState(state);
    activeBoardId = state.moodboards[state.moodboards.length - 1].id;
    addActivity('Mood board created', `${name} board created`, 'plus');
    el.innerHTML = render();
    mount(el);
  });

  // Canvas interactions
  const canvas = el.querySelector('#moodboard-canvas');
  if (!canvas) return;

  // Select / deselect
  canvas.addEventListener('mousedown', (e) => {
    const mbItem = e.target.closest('.mb-item');
    if (mbItem) {
      selectedItemId = mbItem.dataset.id;
      if (e.target.classList.contains('mb-resize-handle')) {
        resizeItem = { id: mbItem.dataset.id, startX: e.clientX, startY: e.clientY };
      } else {
        dragItem = { id: mbItem.dataset.id, startX: e.clientX, startY: e.clientY };
      }
    } else {
      selectedItemId = null;
    }
    el.innerHTML = render();
    mount(el);
  });

  document.addEventListener('mousemove', (e) => {
    const board = state.moodboards.find(b => b.id === activeBoardId);
    if (!board) return;

    if (dragItem) {
      const item = board.items.find(i => i.id === dragItem.id);
      if (item) {
        item.x += e.clientX - dragItem.startX;
        item.y += e.clientY - dragItem.startY;
        dragItem.startX = e.clientX;
        dragItem.startY = e.clientY;
        const domItem = canvas.querySelector(`[data-id="${dragItem.id}"]`);
        if (domItem) { domItem.style.left = item.x + 'px'; domItem.style.top = item.y + 'px'; }
      }
    }
    if (resizeItem) {
      const item = board.items.find(i => i.id === resizeItem.id);
      if (item) {
        item.w += e.clientX - resizeItem.startX;
        item.h += e.clientY - resizeItem.startY;
        item.w = Math.max(40, item.w);
        item.h = Math.max(40, item.h);
        resizeItem.startX = e.clientX;
        resizeItem.startY = e.clientY;
        const domItem = canvas.querySelector(`[data-id="${resizeItem.id}"]`);
        if (domItem) { domItem.style.width = item.w + 'px'; domItem.style.height = item.h + 'px'; }
      }
    }
  });

  document.addEventListener('mouseup', () => {
    if (dragItem || resizeItem) {
      setState(state);
      dragItem = null;
      resizeItem = null;
    }
  });

  // Toolbar actions
  el.querySelector('#mb-upload')?.addEventListener('click', () => {
    el.querySelector('#mb-file-input')?.click();
  });

  el.querySelector('#mb-file-input')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const board = state.moodboards.find(b => b.id === activeBoardId);
      if (!board) return;
      board.items.push({ id: generateId(), type: 'image', value: ev.target.result, x: 20 + Math.random() * 100, y: 20 + Math.random() * 100, w: 150, h: 150 });
      setState(state);
      showToast('Image added');
      el.innerHTML = render();
      mount(el);
    };
    reader.readAsDataURL(file);
  });

  el.querySelector('#mb-color')?.addEventListener('click', () => {
    const color = prompt('Enter hex color (e.g. #6366f1):') || '#6366f1';
    const label = prompt('Color name:') || 'Color';
    const board = state.moodboards.find(b => b.id === activeBoardId);
    if (!board) return;
    board.items.push({ id: generateId(), type: 'color', value: color, label, x: 20 + board.items.length * 30, y: 20 + board.items.length * 20, w: 80, h: 80 });
    setState(state);
    el.innerHTML = render();
    mount(el);
  });

  el.querySelector('#mb-text')?.addEventListener('click', () => {
    const text = prompt('Enter text:');
    if (!text) return;
    const board = state.moodboards.find(b => b.id === activeBoardId);
    if (!board) return;
    board.items.push({ id: generateId(), type: 'text', value: text, x: 20, y: 20 + board.items.length * 50, w: 260, h: 40 });
    setState(state);
    el.innerHTML = render();
    mount(el);
  });

  el.querySelector('#mb-auto-layout')?.addEventListener('click', () => {
    const board = state.moodboards.find(b => b.id === activeBoardId);
    if (!board) return;
    let x = 20, y = 20, maxH = 0, col = 0;
    board.items.forEach(item => {
      item.x = x; item.y = y;
      maxH = Math.max(maxH, item.h);
      x += item.w + 16;
      col++;
      if (col >= 3) { col = 0; x = 20; y += maxH + 16; maxH = 0; }
    });
    setState(state);
    showToast('Auto-layout applied');
    el.innerHTML = render();
    mount(el);
  });

  el.querySelector('#mb-delete')?.addEventListener('click', () => {
    if (!selectedItemId) return;
    const board = state.moodboards.find(b => b.id === activeBoardId);
    if (!board) return;
    board.items = board.items.filter(i => i.id !== selectedItemId);
    selectedItemId = null;
    setState(state);
    el.innerHTML = render();
    mount(el);
  });
}

export function destroy() { activeBoardId = null; selectedItemId = null; dragItem = null; resizeItem = null; }
