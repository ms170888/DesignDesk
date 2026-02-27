// Floor Plan Editor — SVG-based with grid

import { getState, setState, getActiveProject, addActivity } from '../store.js';
import { generateId } from '../core/utils.js';
import { icons } from '../core/icons.js';
import { showToast } from '../components/toast.js';

const GRID_SIZE = 20;
const FURNITURE_LIB = [
  { type: 'sofa', label: 'Sofa', w: 70, h: 30, color: '#6366f1' },
  { type: 'table', label: 'Table', w: 50, h: 30, color: '#f59e0b' },
  { type: 'chair', label: 'Chair', w: 18, h: 18, color: '#10b981' },
  { type: 'bed', label: 'Bed', w: 60, h: 70, color: '#8b5cf6' },
  { type: 'desk', label: 'Desk', w: 50, h: 25, color: '#3b82f6' },
  { type: 'wardrobe', label: 'Wardrobe', w: 50, h: 20, color: '#a855f7' },
];

let activeTool = 'select'; // select, wall, door, window
let selectedFurniture = null;
let dragFurn = null;
let wallStart = null;

export function render() {
  const state = getState();
  const project = getActiveProject();
  if (!project || !state) return '<div class="empty-state"><h2>No project selected</h2></div>';

  const plans = state.floorplans.filter(f => f.projectId === project.id);
  const plan = plans[0]; // Use first floor plan

  if (!plan) return `
    <div class="view-floorplan">
      <div class="view-header"><h1>Floor Plans</h1></div>
      <div class="empty-state"><h3>No floor plans yet</h3></div>
    </div>`;

  // Grid
  const svgW = 500, svgH = 350;
  let gridLines = '';
  for (let x = 0; x <= svgW; x += GRID_SIZE) gridLines += `<line x1="${x}" y1="0" x2="${x}" y2="${svgH}" stroke="#f1f5f9" stroke-width="0.5"/>`;
  for (let y = 0; y <= svgH; y += GRID_SIZE) gridLines += `<line x1="0" y1="${y}" x2="${svgW}" y2="${y}" stroke="#f1f5f9" stroke-width="0.5"/>`;

  // Rooms
  const rooms = plan.rooms.map(r => `
    <rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="#f8fafc" stroke="#64748b" stroke-width="2" rx="2"/>
    <text x="${r.x + r.w / 2}" y="${r.y + r.h / 2}" text-anchor="middle" dominant-baseline="middle" font-size="11" fill="#64748b" font-weight="500">${r.label}</text>
    <text x="${r.x + r.w / 2}" y="${r.y + r.h / 2 + 14}" text-anchor="middle" font-size="9" fill="#94a3b8">${r.w / 10}m x ${r.h / 10}m</text>
  `).join('');

  // Walls
  const walls = (plan.walls || []).map(w => `<line x1="${w.x1}" y1="${w.y1}" x2="${w.x2}" y2="${w.y2}" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>`).join('');

  // Furniture
  const furniture = plan.furniture.map(f => {
    const libItem = FURNITURE_LIB.find(l => l.type === f.type) || { color: '#94a3b8' };
    const sel = selectedFurniture === f.id;
    return `<g class="fp-furniture" data-id="${f.id}">
      <rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" fill="${libItem.color}20" stroke="${sel ? '#6366f1' : libItem.color}" stroke-width="${sel ? 2 : 1}" rx="3" style="cursor:grab"/>
      <text x="${f.x + f.w / 2}" y="${f.y + f.h / 2 + 3}" text-anchor="middle" font-size="8" fill="${libItem.color}" font-weight="500">${f.label}</text>
    </g>`;
  }).join('');

  // Scale
  const scale = `
    <line x1="20" y1="${svgH - 15}" x2="120" y2="${svgH - 15}" stroke="#64748b" stroke-width="1.5"/>
    <line x1="20" y1="${svgH - 20}" x2="20" y2="${svgH - 10}" stroke="#64748b" stroke-width="1.5"/>
    <line x1="120" y1="${svgH - 20}" x2="120" y2="${svgH - 10}" stroke="#64748b" stroke-width="1.5"/>
    <text x="70" y="${svgH - 20}" text-anchor="middle" font-size="9" fill="#64748b">1 metre</text>
  `;

  return `
    <div class="view-floorplan">
      <div class="view-header">
        <h1>Floor Plans — ${plan.name}</h1>
      </div>

      <div class="fp-layout">
        <div class="fp-toolbar">
          <h4>Tools</h4>
          <button class="toolbar-btn ${activeTool === 'select' ? 'active' : ''}" data-tool="select">${icons.cursor} Select</button>
          <button class="toolbar-btn ${activeTool === 'wall' ? 'active' : ''}" data-tool="wall">${icons.wall} Draw Wall</button>
          <button class="toolbar-btn ${activeTool === 'door' ? 'active' : ''}" data-tool="door">${icons.door} Add Door</button>
          <button class="toolbar-btn ${activeTool === 'window' ? 'active' : ''}" data-tool="window">${icons.window} Add Window</button>

          <h4>Furniture</h4>
          <div class="furniture-lib">
            ${FURNITURE_LIB.map(f => `
              <div class="furniture-lib-item" data-type="${f.type}">
                <div class="furn-preview" style="background:${f.color}20;border:1px solid ${f.color};width:${f.w * 0.5}px;height:${f.h * 0.5}px;border-radius:3px"></div>
                <span>${f.label}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="fp-canvas-wrapper">
          <svg width="${svgW}" height="${svgH}" class="fp-svg" id="fp-svg">
            ${gridLines}
            ${rooms}
            ${walls}
            ${furniture}
            ${scale}
          </svg>
        </div>
      </div>
    </div>
  `;
}

export function mount(el) {
  const state = getState();
  const project = getActiveProject();
  const plans = state.floorplans.filter(f => f.projectId === project.id);
  const plan = plans[0];
  if (!plan) return;

  // Tools
  el.querySelectorAll('[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTool = btn.dataset.tool;
      selectedFurniture = null;
      el.innerHTML = render();
      mount(el);
    });
  });

  // Furniture library — click to place
  el.querySelectorAll('.furniture-lib-item').forEach(item => {
    item.addEventListener('click', () => {
      const type = item.dataset.type;
      const lib = FURNITURE_LIB.find(f => f.type === type);
      if (!lib) return;
      plan.furniture.push({
        id: generateId(), type, label: lib.label,
        x: 100 + Math.random() * 100, y: 100 + Math.random() * 100,
        w: lib.w, h: lib.h
      });
      setState(state);
      showToast(`${lib.label} placed`);
      el.innerHTML = render();
      mount(el);
    });
  });

  // SVG interactions
  const svg = el.querySelector('#fp-svg');
  if (!svg) return;

  svg.addEventListener('mousedown', (e) => {
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'select') {
      const furn = e.target.closest('.fp-furniture');
      if (furn) {
        selectedFurniture = furn.dataset.id;
        dragFurn = { id: furn.dataset.id, startX: e.clientX, startY: e.clientY };
        el.innerHTML = render();
        mount(el);
      } else {
        if (selectedFurniture) { selectedFurniture = null; el.innerHTML = render(); mount(el); }
      }
    }
    if (activeTool === 'wall') {
      const snappedX = Math.round(x / GRID_SIZE) * GRID_SIZE;
      const snappedY = Math.round(y / GRID_SIZE) * GRID_SIZE;
      if (!wallStart) {
        wallStart = { x: snappedX, y: snappedY };
      } else {
        if (!plan.walls) plan.walls = [];
        plan.walls.push({ x1: wallStart.x, y1: wallStart.y, x2: snappedX, y2: snappedY });
        wallStart = null;
        setState(state);
        el.innerHTML = render();
        mount(el);
      }
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragFurn) return;
    const f = plan.furniture.find(f => f.id === dragFurn.id);
    if (!f) return;
    const dx = e.clientX - dragFurn.startX;
    const dy = e.clientY - dragFurn.startY;
    f.x = Math.round((f.x + dx) / GRID_SIZE) * GRID_SIZE;
    f.y = Math.round((f.y + dy) / GRID_SIZE) * GRID_SIZE;
    dragFurn.startX = e.clientX;
    dragFurn.startY = e.clientY;
    setState(state);
    el.innerHTML = render();
    mount(el);
  });

  document.addEventListener('mouseup', () => { dragFurn = null; });

  // Delete selected furniture
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' && selectedFurniture) {
      plan.furniture = plan.furniture.filter(f => f.id !== selectedFurniture);
      selectedFurniture = null;
      setState(state);
      el.innerHTML = render();
      mount(el);
    }
  });
}

export function destroy() { activeTool = 'select'; selectedFurniture = null; dragFurn = null; wallStart = null; }
