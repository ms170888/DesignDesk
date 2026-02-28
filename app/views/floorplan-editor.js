// Floor Plan Editor — Production SVG-based with pan, zoom, tools, furniture, rooms
// Full wall drawing, doors, windows, dimensions, furniture library, properties panel

import { getState, setState, getActiveProject, addActivity, undo, redo, canUndo, canRedo } from '../store.js';
import { generateId, clamp, formatCurrency, sanitizeHtml } from '../core/utils.js';
import { icons } from '../core/icons.js';
import { showToast } from '../components/toast.js';

// ── Constants ────────────────────────────────────────────────────────────
const GRID_SIZE = 20;
const WALL_THICKNESS = 8;
const DOOR_SIZE = 40;
const WINDOW_SIZE = 40;
const PX_PER_METER = 100; // 100px = 1 metre
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;
const RULER_SIZE = 28;
const SNAP_THRESHOLD = 10;

// ── Furniture Library ────────────────────────────────────────────────────
const FURNITURE_LIBRARY = {
  Living: [
    { type: 'sofa', label: 'Sofa', w: 180, h: 80, color: '#6366f1', svg: (w, h) => `<rect x="2" y="2" width="${w-4}" height="${h-4}" rx="6" fill="#6366f120" stroke="#6366f1" stroke-width="1.5"/><rect x="6" y="${h-20}" width="${w-12}" height="14" rx="4" fill="#6366f130"/>` },
    { type: 'armchair', label: 'Armchair', w: 70, h: 70, color: '#6366f1', svg: (w, h) => `<rect x="4" y="4" width="${w-8}" height="${h-8}" rx="8" fill="#6366f120" stroke="#6366f1" stroke-width="1.5"/><rect x="8" y="${h-22}" width="${w-16}" height="14" rx="4" fill="#6366f130"/>` },
    { type: 'coffee-table', label: 'Coffee Table', w: 100, h: 50, color: '#a16207', svg: (w, h) => `<rect x="3" y="3" width="${w-6}" height="${h-6}" rx="4" fill="#a1620720" stroke="#a16207" stroke-width="1.5"/>` },
    { type: 'tv-unit', label: 'TV Unit', w: 160, h: 40, color: '#475569', svg: (w, h) => `<rect x="2" y="2" width="${w-4}" height="${h-4}" rx="3" fill="#47556920" stroke="#475569" stroke-width="1.5"/><rect x="${w/2-20}" y="6" width="40" height="${h-12}" rx="2" fill="#47556940"/>` },
    { type: 'bookshelf', label: 'Bookshelf', w: 120, h: 30, color: '#92400e', svg: (w, h) => `<rect x="2" y="2" width="${w-4}" height="${h-4}" rx="2" fill="#92400e20" stroke="#92400e" stroke-width="1.5"/><line x1="${w*0.33}" y1="2" x2="${w*0.33}" y2="${h-2}" stroke="#92400e" stroke-width="0.5"/><line x1="${w*0.66}" y1="2" x2="${w*0.66}" y2="${h-2}" stroke="#92400e" stroke-width="0.5"/>` },
  ],
  Dining: [
    { type: 'dining-table', label: 'Dining Table', w: 160, h: 90, color: '#92400e', svg: (w, h) => `<rect x="4" y="4" width="${w-8}" height="${h-8}" rx="4" fill="#92400e15" stroke="#92400e" stroke-width="1.5"/>` },
    { type: 'dining-chair', label: 'Chair', w: 40, h: 40, color: '#92400e', svg: (w, h) => `<rect x="4" y="4" width="${w-8}" height="${h-8}" rx="4" fill="#92400e20" stroke="#92400e" stroke-width="1.5"/><rect x="8" y="${h-12}" width="${w-16}" height="6" rx="2" fill="#92400e40"/>` },
  ],
  Bedroom: [
    { type: 'bed-double', label: 'Double Bed', w: 140, h: 200, color: '#7c3aed', svg: (w, h) => `<rect x="2" y="2" width="${w-4}" height="${h-4}" rx="6" fill="#7c3aed10" stroke="#7c3aed" stroke-width="1.5"/><rect x="8" y="8" width="${w-16}" height="30" rx="4" fill="#7c3aed20"/><rect x="12" y="44" width="${(w-28)/2}" height="${h-56}" rx="3" fill="#7c3aed08" stroke="#7c3aed" stroke-width="0.5"/><rect x="${w/2+2}" y="44" width="${(w-28)/2}" height="${h-56}" rx="3" fill="#7c3aed08" stroke="#7c3aed" stroke-width="0.5"/>` },
    { type: 'bed-single', label: 'Single Bed', w: 90, h: 200, color: '#7c3aed', svg: (w, h) => `<rect x="2" y="2" width="${w-4}" height="${h-4}" rx="6" fill="#7c3aed10" stroke="#7c3aed" stroke-width="1.5"/><rect x="8" y="8" width="${w-16}" height="30" rx="4" fill="#7c3aed20"/><rect x="10" y="44" width="${w-20}" height="${h-56}" rx="3" fill="#7c3aed08" stroke="#7c3aed" stroke-width="0.5"/>` },
    { type: 'wardrobe', label: 'Wardrobe', w: 120, h: 55, color: '#a855f7', svg: (w, h) => `<rect x="2" y="2" width="${w-4}" height="${h-4}" rx="3" fill="#a855f710" stroke="#a855f7" stroke-width="1.5"/><line x1="${w/2}" y1="4" x2="${w/2}" y2="${h-4}" stroke="#a855f7" stroke-width="0.8"/>` },
    { type: 'nightstand', label: 'Nightstand', w: 45, h: 40, color: '#a855f7', svg: (w, h) => `<rect x="3" y="3" width="${w-6}" height="${h-6}" rx="3" fill="#a855f715" stroke="#a855f7" stroke-width="1.2"/>` },
    { type: 'dresser', label: 'Dresser', w: 100, h: 45, color: '#a855f7', svg: (w, h) => `<rect x="2" y="2" width="${w-4}" height="${h-4}" rx="3" fill="#a855f710" stroke="#a855f7" stroke-width="1.5"/><line x1="4" y1="${h*0.5}" x2="${w-4}" y2="${h*0.5}" stroke="#a855f7" stroke-width="0.5"/>` },
  ],
  Kitchen: [
    { type: 'island', label: 'Island', w: 160, h: 80, color: '#0891b2', svg: (w, h) => `<rect x="2" y="2" width="${w-4}" height="${h-4}" rx="4" fill="#0891b210" stroke="#0891b2" stroke-width="1.5"/>` },
    { type: 'kitchen-unit', label: 'Unit (60cm)', w: 60, h: 60, color: '#0891b2', svg: (w, h) => `<rect x="2" y="2" width="${w-4}" height="${h-4}" rx="2" fill="#0891b210" stroke="#0891b2" stroke-width="1.5"/><circle cx="${w/2}" cy="${h/2}" r="6" fill="none" stroke="#0891b2" stroke-width="0.8"/>` },
    { type: 'appliance', label: 'Appliance', w: 60, h: 60, color: '#475569', svg: (w, h) => `<rect x="2" y="2" width="${w-4}" height="${h-4}" rx="2" fill="#47556910" stroke="#475569" stroke-width="1.5"/><circle cx="${w/2}" cy="${h/2}" r="10" fill="none" stroke="#475569" stroke-width="0.8"/>` },
  ],
  Bathroom: [
    { type: 'bathtub', label: 'Bathtub', w: 170, h: 75, color: '#0ea5e9', svg: (w, h) => `<rect x="3" y="3" width="${w-6}" height="${h-6}" rx="20" fill="#0ea5e910" stroke="#0ea5e9" stroke-width="1.5"/><ellipse cx="${w-25}" cy="${h/2}" rx="6" ry="4" fill="#0ea5e9" opacity=".3"/>` },
    { type: 'shower', label: 'Shower', w: 90, h: 90, color: '#0ea5e9', svg: (w, h) => `<rect x="2" y="2" width="${w-4}" height="${h-4}" rx="4" fill="#0ea5e910" stroke="#0ea5e9" stroke-width="1.5"/><circle cx="${w/2}" cy="${h/2}" r="12" fill="none" stroke="#0ea5e9" stroke-width="0.8" stroke-dasharray="3,2"/>` },
    { type: 'basin', label: 'Basin', w: 50, h: 40, color: '#0ea5e9', svg: (w, h) => `<ellipse cx="${w/2}" cy="${h/2}" rx="${w/2-3}" ry="${h/2-3}" fill="#0ea5e910" stroke="#0ea5e9" stroke-width="1.5"/>` },
    { type: 'toilet', label: 'Toilet', w: 40, h: 55, color: '#64748b', svg: (w, h) => `<rect x="4" y="2" width="${w-8}" height="16" rx="3" fill="#64748b15" stroke="#64748b" stroke-width="1.2"/><ellipse cx="${w/2}" cy="${(h+16)/2}" rx="${w/2-4}" ry="${(h-20)/2}" fill="#64748b10" stroke="#64748b" stroke-width="1.5"/>` },
  ],
  Office: [
    { type: 'desk', label: 'Desk', w: 140, h: 70, color: '#3b82f6', svg: (w, h) => `<rect x="2" y="2" width="${w-4}" height="${h-4}" rx="3" fill="#3b82f610" stroke="#3b82f6" stroke-width="1.5"/>` },
    { type: 'office-chair', label: 'Office Chair', w: 55, h: 55, color: '#3b82f6', svg: (w, h) => `<circle cx="${w/2}" cy="${h/2}" r="${w/2-4}" fill="#3b82f615" stroke="#3b82f6" stroke-width="1.5"/>` },
    { type: 'filing-cabinet', label: 'Filing Cabinet', w: 45, h: 60, color: '#475569', svg: (w, h) => `<rect x="2" y="2" width="${w-4}" height="${h-4}" rx="2" fill="#47556910" stroke="#475569" stroke-width="1.5"/><line x1="6" y1="${h*0.33}" x2="${w-6}" y2="${h*0.33}" stroke="#475569" stroke-width="0.5"/><line x1="6" y1="${h*0.66}" x2="${w-6}" y2="${h*0.66}" stroke="#475569" stroke-width="0.5"/>` },
  ],
};

const FURNITURE_LIST = Object.values(FURNITURE_LIBRARY).flat();

function getFurnDef(type) {
  return FURNITURE_LIST.find(f => f.type === type) || { type, label: type, w: 60, h: 60, color: '#94a3b8', svg: (w, h) => `<rect x="2" y="2" width="${w-4}" height="${h-4}" rx="3" fill="#94a3b820" stroke="#94a3b8" stroke-width="1"/>` };
}

// ── Editor State ─────────────────────────────────────────────────────────
let activeFloorId = null;
let activeTool = 'select';
let selectedId = null;       // furniture or room id
let selectedType = null;     // 'furniture' | 'room' | 'wall' | 'door' | 'window' | 'dimension'
let dragState = null;
let wallDraw = null;         // { x1, y1 } — first click of wall tool
let wallPreview = null;      // { x1, y1, x2, y2 } — preview line
let panState = null;         // { startX, startY, origVX, origVY }
let viewportX = 0;
let viewportY = 0;
let zoomLevel = 1;
let spaceDown = false;
let showProperties = false;
let cursorPos = { x: 0, y: 0 }; // in SVG coords
let _el = null;
let _eventCleanup = [];

// ── Helpers ──────────────────────────────────────────────────────────────
function getPlans() {
  const state = getState();
  const project = getActiveProject();
  if (!state || !project) return [];
  return (state.floorplans || []).filter(f => f.projectId === project.id);
}

function getActivePlan() {
  const plans = getPlans();
  return plans.find(p => p.id === activeFloorId) || plans[0] || null;
}

function getPlanMut() {
  const state = getState();
  const project = getActiveProject();
  if (!state || !project) return { state: null, plan: null };
  const plan = (state.floorplans || []).find(f => f.id === activeFloorId);
  return { state, plan };
}

function snap(v) { return Math.round(v / GRID_SIZE) * GRID_SIZE; }
function toMeters(px) { return (px / PX_PER_METER).toFixed(2); }
function toSqMeters(wpx, hpx) { return ((wpx / PX_PER_METER) * (hpx / PX_PER_METER)).toFixed(1); }

function svgCoords(e, svg) {
  const rect = svg.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left - RULER_SIZE) / zoomLevel + viewportX,
    y: (e.clientY - rect.top - RULER_SIZE) / zoomLevel + viewportY
  };
}

function rerender() {
  if (!_el) return;
  _el.innerHTML = render();
  mount(_el);
}

function wallLength(w) {
  return Math.sqrt((w.x2 - w.x1) ** 2 + (w.y2 - w.y1) ** 2);
}

// ── Render ───────────────────────────────────────────────────────────────
export function render() {
  const state = getState();
  const project = getActiveProject();
  if (!project || !state) return '<div class="empty-state"><h2>No project selected</h2></div>';

  if (!state.floorplans) state.floorplans = [];
  const plans = state.floorplans.filter(f => f.projectId === project.id);
  if (!activeFloorId && plans.length > 0) activeFloorId = plans[0].id;
  const plan = plans.find(p => p.id === activeFloorId);

  if (!plan) return `
    <div class="view-floorplan">
      <div class="view-header"><h1>Floor Plans</h1></div>
      <div class="empty-state">
        <h3>No floor plans yet</h3>
        <p>Create a floor plan to start designing room layouts.</p>
        <button class="toolbar-btn" id="fp-add-plan-empty" style="margin-top:12px;">${icons.plus} Create Floor Plan</button>
      </div>
    </div>`;

  const items = state.items?.filter(i => i.projectId === project.id) || [];
  const svgW = 1200;
  const svgH = 800;

  // Compute total floor area
  const totalArea = (plan.rooms || []).reduce((sum, r) => sum + (r.w / PX_PER_METER) * (r.h / PX_PER_METER), 0);

  return `
    <div class="view-floorplan">
      <div class="view-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
        <h1>Floor Plans</h1>
        <div style="display:flex;gap:6px;align-items:center;">
          <button class="toolbar-btn" id="fp-undo" ${!canUndo() ? 'disabled style="opacity:.4;pointer-events:none"' : ''} title="Undo (Ctrl+Z)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h8a3 3 0 1 1 0 6H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M6 5L3 8l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button class="toolbar-btn" id="fp-redo" ${!canRedo() ? 'disabled style="opacity:.4;pointer-events:none"' : ''} title="Redo (Ctrl+Y)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13 8H5a3 3 0 1 0 0 6h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M10 5l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </div>

      <div class="board-tabs" style="margin-bottom:10px;">
        ${plans.map(p => `
          <button class="board-tab ${p.id === activeFloorId ? 'active' : ''}" data-floor-id="${p.id}" title="Double-click to rename">${sanitizeHtml(p.name)}</button>
        `).join('')}
        <button class="board-tab board-tab-add" id="fp-add-plan" title="Add floor">+</button>
      </div>

      <div class="fp-layout">
        <!-- LEFT TOOLBAR -->
        <div class="fp-toolbar" style="width:180px;flex-shrink:0;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px;overflow-y:auto;max-height:calc(100vh - 200px);">
          <h4 style="font-size:11px;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px;">Tools</h4>
          ${renderToolBtn('select', 'V', icons.cursor, 'Select')}
          ${renderToolBtn('wall', 'W', icons.wall, 'Draw Wall')}
          ${renderToolBtn('door', 'D', icons.door, 'Add Door')}
          ${renderToolBtn('window', 'N', icons.windowIcon, 'Add Window')}
          ${renderToolBtn('dimension', 'M', `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8h12M2 6v4M14 6v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`, 'Dimension')}
          ${renderToolBtn('text', 'T', icons.text, 'Text Label')}
          ${renderToolBtn('eraser', 'E', icons.trash, 'Eraser')}

          <h4 style="font-size:11px;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px;margin-top:16px;">Rooms</h4>
          <button class="toolbar-btn" id="fp-add-room" style="width:100%;justify-content:flex-start;margin-bottom:6px;">
            ${icons.plus} Add Room
          </button>

          <h4 style="font-size:11px;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px;margin-top:16px;">Info</h4>
          <div style="font-size:11px;color:var(--text-secondary);line-height:1.6;">
            <div>Total area: <strong>${totalArea.toFixed(1)} m&sup2;</strong></div>
            <div>Rooms: <strong>${(plan.rooms || []).length}</strong></div>
            <div>Cursor: ${toMeters(cursorPos.x)}m, ${toMeters(cursorPos.y)}m</div>
            <div>Zoom: ${Math.round(zoomLevel * 100)}%</div>
          </div>

          <h4 style="font-size:11px;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px;margin-top:16px;">Export</h4>
          <button class="toolbar-btn" id="fp-export-svg" style="width:100%;justify-content:flex-start;margin-bottom:4px;">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 10v3h12v-3M8 2v8M5 7l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Export SVG
          </button>
          <button class="toolbar-btn" id="fp-export-png" style="width:100%;justify-content:flex-start;">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 10v3h12v-3M8 2v8M5 7l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Export PNG
          </button>
        </div>

        <!-- CANVAS -->
        <div class="fp-canvas-wrapper" id="fp-canvas-wrapper" style="flex:1;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;position:relative;cursor:${spaceDown ? 'grab' : activeTool === 'wall' ? 'crosshair' : activeTool === 'eraser' ? 'pointer' : activeTool === 'text' ? 'text' : 'default'};">
          <svg id="fp-svg" width="100%" height="100%" style="display:block;min-height:${svgH}px;">
            <defs>
              <pattern id="grid-dots" width="${GRID_SIZE}" height="${GRID_SIZE}" patternUnits="userSpaceOnUse" patternTransform="translate(${-viewportX * zoomLevel + RULER_SIZE} ${-viewportY * zoomLevel + RULER_SIZE}) scale(${zoomLevel})">
                <circle cx="${GRID_SIZE/2}" cy="${GRID_SIZE/2}" r="0.8" fill="#cbd5e1"/>
              </pattern>
            </defs>

            <!-- Grid background -->
            <rect width="100%" height="100%" fill="url(#grid-dots)"/>

            <!-- Rulers -->
            ${renderRulers(svgW, svgH)}

            <!-- Main content group with pan/zoom transform -->
            <g transform="translate(${-viewportX * zoomLevel + RULER_SIZE} ${-viewportY * zoomLevel + RULER_SIZE}) scale(${zoomLevel})" id="fp-content">
              <!-- Rooms -->
              ${(plan.rooms || []).map(r => renderRoom(r)).join('')}

              <!-- Walls -->
              ${(plan.walls || []).map(w => renderWall(w)).join('')}

              <!-- Doors -->
              ${(plan.doors || []).map(d => renderDoor(d)).join('')}

              <!-- Windows -->
              ${(plan.windows || []).map(w => renderWindow(w)).join('')}

              <!-- Dimensions -->
              ${(plan.dimensions || []).map(d => renderDimension(d)).join('')}

              <!-- Text labels -->
              ${(plan.labels || []).map(l => renderLabel(l)).join('')}

              <!-- Furniture -->
              ${(plan.furniture || []).map(f => renderFurniture(f)).join('')}

              <!-- Wall draw preview -->
              ${wallPreview ? `<line x1="${wallPreview.x1}" y1="${wallPreview.y1}" x2="${wallPreview.x2}" y2="${wallPreview.y2}" stroke="#6366f1" stroke-width="${WALL_THICKNESS}" stroke-linecap="round" stroke-dasharray="8,4" opacity=".6"/>` : ''}

              <!-- Scale bar -->
              ${renderScaleBar()}
            </g>

            <!-- Zoom indicator -->
            <text x="${svgW - 10}" y="${svgH - 10}" text-anchor="end" font-size="10" fill="#94a3b8" font-family="Inter, sans-serif">${Math.round(zoomLevel * 100)}%</text>
          </svg>
        </div>

        <!-- RIGHT PANEL: Furniture Library + Properties -->
        <div class="fp-right-panel" style="width:220px;flex-shrink:0;display:flex;flex-direction:column;gap:12px;max-height:calc(100vh - 200px);overflow-y:auto;">
          <!-- Properties Panel -->
          ${selectedId ? renderPropertiesPanel(plan, items) : ''}

          <!-- Furniture Library -->
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px;">
            <h4 style="font-size:11px;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px;">Furniture Library</h4>
            ${Object.entries(FURNITURE_LIBRARY).map(([cat, pieces]) => `
              <div class="fp-furn-cat" style="margin-bottom:10px;">
                <div style="font-size:10px;font-weight:600;color:var(--text-secondary);margin-bottom:4px;cursor:pointer;" data-toggle-cat="${cat}">${cat} (${pieces.length})</div>
                <div class="fp-furn-list" data-cat="${cat}" style="display:flex;flex-direction:column;gap:4px;">
                  ${pieces.map(p => `
                    <div class="furniture-lib-item" data-furn-type="${p.type}" draggable="true" style="display:flex;align-items:center;gap:8px;padding:5px 6px;border:1px solid var(--border);border-radius:6px;font-size:11px;cursor:grab;transition:border-color .15s;">
                      <svg width="${Math.min(p.w * 0.25, 32)}" height="${Math.min(p.h * 0.25, 24)}" viewBox="0 0 ${p.w} ${p.h}" style="flex-shrink:0;">${p.svg(p.w, p.h)}</svg>
                      <div>
                        <div style="font-weight:500;">${p.label}</div>
                        <div style="font-size:9px;color:var(--text-muted);">${toMeters(p.w)}m x ${toMeters(p.h)}m</div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderToolBtn(tool, key, icon, label) {
  return `<button class="toolbar-btn ${activeTool === tool ? 'active' : ''}" data-tool="${tool}" style="width:100%;justify-content:flex-start;margin-bottom:4px;" title="${label} (${key})">
    <span style="display:inline-flex;width:16px;height:16px;align-items:center;justify-content:center;">${icon}</span>
    ${label}
    <span style="margin-left:auto;font-size:9px;opacity:.5;">${key}</span>
  </button>`;
}

function renderRulers(svgW, svgH) {
  // Top ruler
  let topTicks = '';
  const step = GRID_SIZE * 5; // Major tick every 5 grid units (1m)
  const startX = Math.floor(viewportX / step) * step;
  const endX = viewportX + svgW / zoomLevel;
  for (let x = startX; x <= endX; x += step) {
    const sx = (x - viewportX) * zoomLevel + RULER_SIZE;
    if (sx < RULER_SIZE || sx > svgW) continue;
    topTicks += `<line x1="${sx}" y1="0" x2="${sx}" y2="${RULER_SIZE}" stroke="#cbd5e1" stroke-width="0.5"/>`;
    topTicks += `<text x="${sx + 2}" y="10" font-size="8" fill="#94a3b8" font-family="Inter, sans-serif">${toMeters(x)}m</text>`;
  }

  // Left ruler
  let leftTicks = '';
  const startY = Math.floor(viewportY / step) * step;
  const endY = viewportY + svgH / zoomLevel;
  for (let y = startY; y <= endY; y += step) {
    const sy = (y - viewportY) * zoomLevel + RULER_SIZE;
    if (sy < RULER_SIZE || sy > svgH) continue;
    leftTicks += `<line x1="0" y1="${sy}" x2="${RULER_SIZE}" y2="${sy}" stroke="#cbd5e1" stroke-width="0.5"/>`;
    leftTicks += `<text x="2" y="${sy - 2}" font-size="8" fill="#94a3b8" font-family="Inter, sans-serif">${toMeters(y)}m</text>`;
  }

  return `
    <rect x="0" y="0" width="${svgW}" height="${RULER_SIZE}" fill="#f8fafc"/>
    <rect x="0" y="0" width="${RULER_SIZE}" height="${svgH}" fill="#f8fafc"/>
    <rect x="0" y="0" width="${RULER_SIZE}" height="${RULER_SIZE}" fill="#f1f5f9"/>
    ${topTicks}
    ${leftTicks}
    <line x1="${RULER_SIZE}" y1="0" x2="${RULER_SIZE}" y2="${svgH}" stroke="#e2e8f0" stroke-width="1"/>
    <line x1="0" y1="${RULER_SIZE}" x2="${svgW}" y2="${RULER_SIZE}" stroke="#e2e8f0" stroke-width="1"/>
  `;
}

function renderRoom(r) {
  const sel = selectedId === r.id && selectedType === 'room';
  const area = toSqMeters(r.w, r.h);
  return `
    <g class="fp-room" data-room-id="${r.id}" style="cursor:pointer;">
      <rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${r.fill || '#f0fdf4'}" stroke="${sel ? '#6366f1' : '#94a3b8'}" stroke-width="${sel ? 2.5 : 1.5}" rx="2" opacity=".8"/>
      <text x="${r.x + r.w / 2}" y="${r.y + r.h / 2 - 6}" text-anchor="middle" dominant-baseline="middle" font-size="12" fill="#475569" font-weight="600" font-family="Inter, sans-serif">${sanitizeHtml(r.label)}</text>
      <text x="${r.x + r.w / 2}" y="${r.y + r.h / 2 + 10}" text-anchor="middle" font-size="10" fill="#94a3b8" font-family="Inter, sans-serif">${toMeters(r.w)}m &times; ${toMeters(r.h)}m</text>
      <text x="${r.x + r.w / 2}" y="${r.y + r.h / 2 + 24}" text-anchor="middle" font-size="9" fill="#a3e635" font-family="Inter, sans-serif">${area} m&sup2;</text>
      ${sel ? `
        <rect x="${r.x - 4}" y="${r.y - 4}" width="8" height="8" fill="#6366f1" rx="1" style="cursor:nw-resize;" class="fp-room-handle" data-rhandle="nw"/>
        <rect x="${r.x + r.w - 4}" y="${r.y - 4}" width="8" height="8" fill="#6366f1" rx="1" style="cursor:ne-resize;" class="fp-room-handle" data-rhandle="ne"/>
        <rect x="${r.x - 4}" y="${r.y + r.h - 4}" width="8" height="8" fill="#6366f1" rx="1" style="cursor:sw-resize;" class="fp-room-handle" data-rhandle="sw"/>
        <rect x="${r.x + r.w - 4}" y="${r.y + r.h - 4}" width="8" height="8" fill="#6366f1" rx="1" style="cursor:se-resize;" class="fp-room-handle" data-rhandle="se"/>
      ` : ''}
    </g>
  `;
}

function renderWall(w) {
  const sel = selectedId === w.id && selectedType === 'wall';
  const len = wallLength(w);
  const mx = (w.x1 + w.x2) / 2;
  const my = (w.y1 + w.y2) / 2;
  const angle = Math.atan2(w.y2 - w.y1, w.x2 - w.x1) * 180 / Math.PI;
  return `
    <g class="fp-wall" data-wall-id="${w.id}">
      <line x1="${w.x1}" y1="${w.y1}" x2="${w.x2}" y2="${w.y2}" stroke="${sel ? '#6366f1' : '#1e293b'}" stroke-width="${w.thickness || WALL_THICKNESS}" stroke-linecap="round" style="cursor:pointer;"/>
      <text x="${mx}" y="${my - 8}" text-anchor="middle" font-size="9" fill="#64748b" font-family="Inter, sans-serif" transform="rotate(${Math.abs(angle) > 90 ? angle + 180 : angle} ${mx} ${my - 8})">${toMeters(len)}m</text>
    </g>
  `;
}

function renderDoor(d) {
  const sel = selectedId === d.id && selectedType === 'door';
  const size = d.size || DOOR_SIZE;
  // Door is drawn as an arc gap
  const dir = d.swing || 1; // 1 or -1
  return `
    <g class="fp-door" data-door-id="${d.id}" style="cursor:pointer;">
      <line x1="${d.x}" y1="${d.y}" x2="${d.x + size}" y2="${d.y}" stroke="none" stroke-width="0"/>
      <rect x="${d.x}" y="${d.y - 2}" width="${size}" height="4" fill="#f8fafc" stroke="none"/>
      <path d="M${d.x},${d.y} A${size},${size} 0 0,${dir > 0 ? 1 : 0} ${d.x + size},${d.y}" fill="none" stroke="${sel ? '#6366f1' : '#f59e0b'}" stroke-width="1.5" stroke-dasharray="4,2"/>
      <line x1="${d.x}" y1="${d.y - 4}" x2="${d.x}" y2="${d.y + 4}" stroke="${sel ? '#6366f1' : '#f59e0b'}" stroke-width="2"/>
      <line x1="${d.x + size}" y1="${d.y - 4}" x2="${d.x + size}" y2="${d.y + 4}" stroke="${sel ? '#6366f1' : '#f59e0b'}" stroke-width="2"/>
    </g>
  `;
}

function renderWindow(w) {
  const sel = selectedId === w.id && selectedType === 'window';
  const size = w.size || WINDOW_SIZE;
  return `
    <g class="fp-window" data-window-id="${w.id}" style="cursor:pointer;">
      <rect x="${w.x}" y="${w.y - 3}" width="${size}" height="6" fill="#f8fafc" stroke="none"/>
      <line x1="${w.x}" y1="${w.y - 3}" x2="${w.x + size}" y2="${w.y - 3}" stroke="${sel ? '#6366f1' : '#0ea5e9'}" stroke-width="2"/>
      <line x1="${w.x}" y1="${w.y + 3}" x2="${w.x + size}" y2="${w.y + 3}" stroke="${sel ? '#6366f1' : '#0ea5e9'}" stroke-width="2"/>
      <line x1="${w.x}" y1="${w.y - 3}" x2="${w.x}" y2="${w.y + 3}" stroke="${sel ? '#6366f1' : '#0ea5e9'}" stroke-width="1.5"/>
      <line x1="${w.x + size}" y1="${w.y - 3}" x2="${w.x + size}" y2="${w.y + 3}" stroke="${sel ? '#6366f1' : '#0ea5e9'}" stroke-width="1.5"/>
    </g>
  `;
}

function renderDimension(d) {
  const sel = selectedId === d.id && selectedType === 'dimension';
  const len = Math.sqrt((d.x2 - d.x1) ** 2 + (d.y2 - d.y1) ** 2);
  const mx = (d.x1 + d.x2) / 2;
  const my = (d.y1 + d.y2) / 2;
  const angle = Math.atan2(d.y2 - d.y1, d.x2 - d.x1) * 180 / Math.PI;
  return `
    <g class="fp-dimension" data-dim-id="${d.id}" style="cursor:pointer;">
      <line x1="${d.x1}" y1="${d.y1}" x2="${d.x2}" y2="${d.y2}" stroke="${sel ? '#6366f1' : '#e11d48'}" stroke-width="1" stroke-dasharray="4,2"/>
      <line x1="${d.x1}" y1="${d.y1 - 6}" x2="${d.x1}" y2="${d.y1 + 6}" stroke="${sel ? '#6366f1' : '#e11d48'}" stroke-width="1.5"/>
      <line x1="${d.x2}" y1="${d.y2 - 6}" x2="${d.x2}" y2="${d.y2 + 6}" stroke="${sel ? '#6366f1' : '#e11d48'}" stroke-width="1.5"/>
      <rect x="${mx - 22}" y="${my - 9}" width="44" height="14" rx="3" fill="white" stroke="${sel ? '#6366f1' : '#e11d48'}" stroke-width="0.5"/>
      <text x="${mx}" y="${my + 2}" text-anchor="middle" font-size="9" fill="#e11d48" font-weight="600" font-family="Inter, sans-serif">${toMeters(len)}m</text>
    </g>
  `;
}

function renderLabel(l) {
  const sel = selectedId === l.id && selectedType === 'label';
  return `
    <g class="fp-label" data-label-id="${l.id}" style="cursor:pointer;">
      <text x="${l.x}" y="${l.y}" font-size="${l.fontSize || 12}" fill="${sel ? '#6366f1' : '#475569'}" font-weight="500" font-family="Inter, sans-serif">${sanitizeHtml(l.text)}</text>
    </g>
  `;
}

function renderFurniture(f) {
  const def = getFurnDef(f.type);
  const sel = selectedId === f.id && selectedType === 'furniture';
  const rotation = f.rotation || 0;
  const cx = f.x + f.w / 2;
  const cy = f.y + f.h / 2;
  return `
    <g class="fp-furniture" data-furn-id="${f.id}" transform="rotate(${rotation} ${cx} ${cy})" style="cursor:${activeTool === 'eraser' ? 'pointer' : 'grab'};">
      <svg x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" viewBox="0 0 ${f.w} ${f.h}" overflow="visible">
        ${def.svg(f.w, f.h)}
      </svg>
      ${sel ? `
        <rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" fill="none" stroke="#6366f1" stroke-width="2" stroke-dasharray="4,2" rx="3"/>
        <rect x="${f.x - 4}" y="${f.y - 4}" width="8" height="8" fill="#6366f1" rx="1" style="cursor:nw-resize;" class="fp-furn-handle" data-fhandle="nw"/>
        <rect x="${f.x + f.w - 4}" y="${f.y - 4}" width="8" height="8" fill="#6366f1" rx="1" style="cursor:ne-resize;" class="fp-furn-handle" data-fhandle="ne"/>
        <rect x="${f.x + f.w - 4}" y="${f.y + f.h - 4}" width="8" height="8" fill="#6366f1" rx="1" style="cursor:se-resize;" class="fp-furn-handle" data-fhandle="se"/>
        <rect x="${f.x - 4}" y="${f.y + f.h - 4}" width="8" height="8" fill="#6366f1" rx="1" style="cursor:sw-resize;" class="fp-furn-handle" data-fhandle="sw"/>
        <circle cx="${f.x + f.w + 12}" cy="${f.y - 12}" r="6" fill="none" stroke="#6366f1" stroke-width="1.5" style="cursor:grab;" class="fp-rotate-handle"/>
      ` : `
        <text x="${cx}" y="${f.y + f.h + 12}" text-anchor="middle" font-size="8" fill="${def.color}" font-weight="500" font-family="Inter, sans-serif" opacity=".7">${sanitizeHtml(f.label)}</text>
      `}
    </g>
  `;
}

function renderScaleBar() {
  const barPx = PX_PER_METER;
  return `
    <g transform="translate(20 ${20})">
      <line x1="0" y1="0" x2="${barPx}" y2="0" stroke="#64748b" stroke-width="1.5"/>
      <line x1="0" y1="-5" x2="0" y2="5" stroke="#64748b" stroke-width="1.5"/>
      <line x1="${barPx}" y1="-5" x2="${barPx}" y2="5" stroke="#64748b" stroke-width="1.5"/>
      <text x="${barPx / 2}" y="-8" text-anchor="middle" font-size="9" fill="#64748b" font-family="Inter, sans-serif">1 metre</text>
    </g>
  `;
}

function renderPropertiesPanel(plan, items) {
  let item = null;
  let itemType = selectedType;

  if (selectedType === 'furniture') item = (plan.furniture || []).find(f => f.id === selectedId);
  else if (selectedType === 'room') item = (plan.rooms || []).find(r => r.id === selectedId);
  else if (selectedType === 'wall') item = (plan.walls || []).find(w => w.id === selectedId);
  else if (selectedType === 'door') item = (plan.doors || []).find(d => d.id === selectedId);
  else if (selectedType === 'window') item = (plan.windows || []).find(w => w.id === selectedId);
  else if (selectedType === 'dimension') item = (plan.dimensions || []).find(d => d.id === selectedId);
  else if (selectedType === 'label') item = (plan.labels || []).find(l => l.id === selectedId);

  if (!item) return '';

  const pastelColors = ['#f0fdf4', '#eff6ff', '#fef3c7', '#fce7f3', '#f3e8ff', '#ecfdf5', '#fff7ed', '#faf5ff'];

  return `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px;">
      <h4 style="font-size:11px;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px;">Properties</h4>
      <div style="display:flex;flex-direction:column;gap:8px;font-size:11px;">
        ${item.label || item.text ? `
          <div>
            <label style="color:var(--text-muted);display:block;margin-bottom:2px;">Label</label>
            <input type="text" class="fp-prop-input" data-prop="label" value="${sanitizeHtml(item.label || item.text || '')}" style="width:100%;padding:4px 8px;border:1px solid var(--border);border-radius:4px;font-size:11px;font-family:inherit;" />
          </div>
        ` : ''}
        ${item.x !== undefined && item.y !== undefined ? `
          <div style="display:flex;gap:6px;">
            <div style="flex:1;">
              <label style="color:var(--text-muted);display:block;margin-bottom:2px;">X (m)</label>
              <input type="number" class="fp-prop-input" data-prop="x" value="${toMeters(item.x)}" step="0.1" style="width:100%;padding:4px 6px;border:1px solid var(--border);border-radius:4px;font-size:11px;font-family:inherit;" />
            </div>
            <div style="flex:1;">
              <label style="color:var(--text-muted);display:block;margin-bottom:2px;">Y (m)</label>
              <input type="number" class="fp-prop-input" data-prop="y" value="${toMeters(item.y)}" step="0.1" style="width:100%;padding:4px 6px;border:1px solid var(--border);border-radius:4px;font-size:11px;font-family:inherit;" />
            </div>
          </div>
        ` : ''}
        ${item.w !== undefined && item.h !== undefined ? `
          <div style="display:flex;gap:6px;">
            <div style="flex:1;">
              <label style="color:var(--text-muted);display:block;margin-bottom:2px;">W (m)</label>
              <input type="number" class="fp-prop-input" data-prop="w" value="${toMeters(item.w)}" step="0.1" min="0.1" style="width:100%;padding:4px 6px;border:1px solid var(--border);border-radius:4px;font-size:11px;font-family:inherit;" />
            </div>
            <div style="flex:1;">
              <label style="color:var(--text-muted);display:block;margin-bottom:2px;">H (m)</label>
              <input type="number" class="fp-prop-input" data-prop="h" value="${toMeters(item.h)}" step="0.1" min="0.1" style="width:100%;padding:4px 6px;border:1px solid var(--border);border-radius:4px;font-size:11px;font-family:inherit;" />
            </div>
          </div>
        ` : ''}
        ${item.rotation !== undefined ? `
          <div>
            <label style="color:var(--text-muted);display:block;margin-bottom:2px;">Rotation</label>
            <input type="number" class="fp-prop-input" data-prop="rotation" value="${item.rotation || 0}" step="15" style="width:100%;padding:4px 8px;border:1px solid var(--border);border-radius:4px;font-size:11px;font-family:inherit;" />
          </div>
        ` : ''}
        ${selectedType === 'room' ? `
          <div>
            <label style="color:var(--text-muted);display:block;margin-bottom:2px;">Fill</label>
            <div style="display:flex;gap:4px;flex-wrap:wrap;">
              ${pastelColors.map(c => `<div class="fp-color-swatch" data-room-fill="${c}" style="width:20px;height:20px;border-radius:4px;background:${c};border:2px solid ${item.fill === c ? '#6366f1' : 'var(--border)'};cursor:pointer;"></div>`).join('')}
            </div>
          </div>
        ` : ''}
        ${selectedType === 'furniture' ? `
          <div>
            <label style="color:var(--text-muted);display:block;margin-bottom:2px;">Linked Item</label>
            <select class="fp-prop-input" data-prop="linkedItemId" style="width:100%;padding:4px 6px;border:1px solid var(--border);border-radius:4px;font-size:11px;font-family:inherit;">
              <option value="">-- None --</option>
              ${items.map(i => `<option value="${i.id}" ${item.linkedItemId === i.id ? 'selected' : ''}>${sanitizeHtml(i.name)}</option>`).join('')}
            </select>
          </div>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
            <input type="checkbox" class="fp-prop-input" data-prop="locked" ${item.locked ? 'checked' : ''} />
            <span style="color:var(--text-secondary);">Lock position</span>
          </label>
        ` : ''}
        <button class="toolbar-btn toolbar-delete" id="fp-prop-delete" style="width:100%;justify-content:center;margin-top:4px;">${icons.trash} Delete</button>
      </div>
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

  const plan = getActivePlan();

  // ── Floor Tabs ─────────────────────────────────────────────────────
  el.querySelectorAll('[data-floor-id]').forEach(tab => {
    tab.addEventListener('click', () => {
      activeFloorId = tab.dataset.floorId;
      selectedId = null; selectedType = null;
      rerender();
    });
    tab.addEventListener('dblclick', () => {
      const name = prompt('Rename floor:', tab.textContent.trim());
      if (!name) return;
      const { state: s, plan: p } = getPlanMut();
      if (!p || !s) return;
      p.name = name;
      setState(s);
      rerender();
    });
  });

  const addPlanFn = () => {
    const name = prompt('Floor name (e.g. First Floor):');
    if (!name) return;
    const s = getState();
    s.floorplans.push({
      id: generateId(), projectId: project.id, name,
      rooms: [], furniture: [], walls: [], doors: [], windows: [], dimensions: [], labels: [], scale: 1
    });
    setState(s);
    activeFloorId = s.floorplans[s.floorplans.length - 1].id;
    addActivity('Floor plan created', `${name} floor plan added`, 'plus');
    rerender();
  };
  el.querySelector('#fp-add-plan')?.addEventListener('click', addPlanFn);
  el.querySelector('#fp-add-plan-empty')?.addEventListener('click', addPlanFn);

  // ── Undo/Redo ──────────────────────────────────────────────────────
  el.querySelector('#fp-undo')?.addEventListener('click', () => { undo(); rerender(); });
  el.querySelector('#fp-redo')?.addEventListener('click', () => { redo(); rerender(); });

  // ── Tool buttons ───────────────────────────────────────────────────
  el.querySelectorAll('[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTool = btn.dataset.tool;
      wallDraw = null; wallPreview = null;
      if (activeTool !== 'select') { selectedId = null; selectedType = null; }
      rerender();
    });
  });

  // ── Add Room ────────────────────────────────────────────────────────
  el.querySelector('#fp-add-room')?.addEventListener('click', () => {
    const label = prompt('Room name:');
    if (!label) return;
    const { state: s, plan: p } = getPlanMut();
    if (!p || !s) return;
    if (!p.rooms) p.rooms = [];
    p.rooms.push({
      id: generateId(), label,
      x: snap(60 + p.rooms.length * 40),
      y: snap(60 + p.rooms.length * 40),
      w: 200, h: 160,
      fill: '#f0fdf4'
    });
    setState(s);
    showToast(`Room "${label}" added`);
    rerender();
  });

  // ── Properties panel ───────────────────────────────────────────────
  el.querySelectorAll('.fp-prop-input').forEach(input => {
    const onChange = () => {
      const prop = input.dataset.prop;
      const { state: s, plan: p } = getPlanMut();
      if (!p || !s || !selectedId) return;

      let item = null;
      if (selectedType === 'furniture') item = (p.furniture || []).find(f => f.id === selectedId);
      else if (selectedType === 'room') item = (p.rooms || []).find(r => r.id === selectedId);
      else if (selectedType === 'wall') item = (p.walls || []).find(w => w.id === selectedId);
      else if (selectedType === 'door') item = (p.doors || []).find(d => d.id === selectedId);
      else if (selectedType === 'window') item = (p.windows || []).find(w => w.id === selectedId);
      else if (selectedType === 'label') item = (p.labels || []).find(l => l.id === selectedId);
      if (!item) return;

      if (prop === 'label') { item.label = input.value; }
      else if (prop === 'x') { item.x = parseFloat(input.value) * PX_PER_METER; }
      else if (prop === 'y') { item.y = parseFloat(input.value) * PX_PER_METER; }
      else if (prop === 'w') { item.w = Math.max(20, parseFloat(input.value) * PX_PER_METER); }
      else if (prop === 'h') { item.h = Math.max(20, parseFloat(input.value) * PX_PER_METER); }
      else if (prop === 'rotation') { item.rotation = parseInt(input.value) || 0; }
      else if (prop === 'linkedItemId') { item.linkedItemId = input.value || null; }
      else if (prop === 'locked') { item.locked = input.checked; }
      else if (prop === 'text' && selectedType === 'label') { item.text = input.value; }

      setState(s);
      rerender();
    };
    input.addEventListener('change', onChange);
    if (input.type === 'checkbox') input.addEventListener('click', onChange);
  });

  // Room fill color
  el.querySelectorAll('.fp-color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      const { state: s, plan: p } = getPlanMut();
      if (!p || !s || selectedType !== 'room') return;
      const room = (p.rooms || []).find(r => r.id === selectedId);
      if (!room) return;
      room.fill = swatch.dataset.roomFill;
      setState(s);
      rerender();
    });
  });

  // Delete selected
  el.querySelector('#fp-prop-delete')?.addEventListener('click', () => deleteSelected());

  // ── Export ──────────────────────────────────────────────────────────
  el.querySelector('#fp-export-svg')?.addEventListener('click', () => exportSvg());
  el.querySelector('#fp-export-png')?.addEventListener('click', () => exportPng());

  // ── Furniture library — click to place ──────────────────────────────
  el.querySelectorAll('.furniture-lib-item').forEach(item => {
    item.addEventListener('click', () => {
      const type = item.dataset.furnType;
      const def = getFurnDef(type);
      const { state: s, plan: p } = getPlanMut();
      if (!p || !s) return;
      if (!p.furniture) p.furniture = [];
      p.furniture.push({
        id: generateId(), type, label: def.label,
        x: snap(viewportX + 100 + Math.random() * 80),
        y: snap(viewportY + 100 + Math.random() * 80),
        w: def.w, h: def.h, rotation: 0, locked: false
      });
      setState(s);
      showToast(`${def.label} placed`);
      rerender();
    });
  });

  // Category toggle
  el.querySelectorAll('[data-toggle-cat]').forEach(header => {
    header.addEventListener('click', () => {
      const list = el.querySelector(`[data-cat="${header.dataset.toggleCat}"]`);
      if (list) list.style.display = list.style.display === 'none' ? 'flex' : 'none';
    });
  });

  // ── SVG Canvas Interactions ────────────────────────────────────────
  const svg = el.querySelector('#fp-svg');
  const wrapper = el.querySelector('#fp-canvas-wrapper');
  if (!svg || !wrapper) return;

  // Mouse down
  svg.addEventListener('mousedown', (e) => {
    const pos = svgCoords(e, svg);
    const snapped = { x: snap(pos.x), y: snap(pos.y) };

    // Middle-click or space+click = pan
    if (e.button === 1 || (e.button === 0 && spaceDown)) {
      panState = { startX: e.clientX, startY: e.clientY, origVX: viewportX, origVY: viewportY };
      wrapper.style.cursor = 'grabbing';
      e.preventDefault();
      return;
    }

    if (e.button !== 0) return;

    // ── TOOL: Select ──────────────────────────────────────────────────
    if (activeTool === 'select') {
      // Check furniture
      const furnEl = e.target.closest('.fp-furniture');
      if (furnEl) {
        const id = furnEl.dataset.furnId;
        selectedId = id; selectedType = 'furniture';
        const { state: s, plan: p } = getPlanMut();
        const furn = p?.furniture?.find(f => f.id === id);
        if (furn && !furn.locked) {
          // Check for resize handle
          const fHandle = e.target.closest('.fp-furn-handle');
          if (fHandle) {
            dragState = {
              type: 'resize-furn', id, handle: fHandle.dataset.fhandle,
              startX: pos.x, startY: pos.y,
              orig: { x: furn.x, y: furn.y, w: furn.w, h: furn.h }
            };
          } else if (e.target.closest('.fp-rotate-handle')) {
            const cx = furn.x + furn.w / 2;
            const cy = furn.y + furn.h / 2;
            dragState = {
              type: 'rotate-furn', id,
              cx, cy,
              startAngle: Math.atan2(pos.y - cy, pos.x - cx) * 180 / Math.PI,
              origRotation: furn.rotation || 0
            };
          } else {
            dragState = { type: 'move-furn', id, startX: pos.x, startY: pos.y, origX: furn.x, origY: furn.y };
          }
        }
        rerender();
        e.preventDefault();
        return;
      }

      // Check room
      const roomEl = e.target.closest('.fp-room');
      if (roomEl) {
        const id = roomEl.dataset.roomId;
        selectedId = id; selectedType = 'room';
        const { state: s, plan: p } = getPlanMut();
        const room = p?.rooms?.find(r => r.id === id);
        if (room) {
          const rHandle = e.target.closest('.fp-room-handle');
          if (rHandle) {
            dragState = {
              type: 'resize-room', id, handle: rHandle.dataset.rhandle,
              startX: pos.x, startY: pos.y,
              orig: { x: room.x, y: room.y, w: room.w, h: room.h }
            };
          } else {
            dragState = { type: 'move-room', id, startX: pos.x, startY: pos.y, origX: room.x, origY: room.y };
          }
        }
        rerender();
        e.preventDefault();
        return;
      }

      // Check wall
      const wallEl = e.target.closest('.fp-wall');
      if (wallEl) { selectedId = wallEl.dataset.wallId; selectedType = 'wall'; rerender(); return; }

      // Check door
      const doorEl = e.target.closest('.fp-door');
      if (doorEl) { selectedId = doorEl.dataset.doorId; selectedType = 'door'; rerender(); return; }

      // Check window
      const winEl = e.target.closest('.fp-window');
      if (winEl) { selectedId = winEl.dataset.windowId; selectedType = 'window'; rerender(); return; }

      // Check dimension
      const dimEl = e.target.closest('.fp-dimension');
      if (dimEl) { selectedId = dimEl.dataset.dimId; selectedType = 'dimension'; rerender(); return; }

      // Check label
      const labelEl = e.target.closest('.fp-label');
      if (labelEl) { selectedId = labelEl.dataset.labelId; selectedType = 'label'; rerender(); return; }

      // Deselect
      if (selectedId) { selectedId = null; selectedType = null; rerender(); }
      return;
    }

    // ── TOOL: Wall ──────────────────────────────────────────────────
    if (activeTool === 'wall') {
      if (!wallDraw) {
        wallDraw = { x1: snapped.x, y1: snapped.y };
        wallPreview = { x1: snapped.x, y1: snapped.y, x2: snapped.x, y2: snapped.y };
      } else {
        const { state: s, plan: p } = getPlanMut();
        if (!p || !s) return;
        if (!p.walls) p.walls = [];
        p.walls.push({
          id: generateId(),
          x1: wallDraw.x1, y1: wallDraw.y1,
          x2: snapped.x, y2: snapped.y,
          thickness: WALL_THICKNESS
        });
        // Continue wall from this point
        wallDraw = { x1: snapped.x, y1: snapped.y };
        wallPreview = { x1: snapped.x, y1: snapped.y, x2: snapped.x, y2: snapped.y };
        setState(s);
        rerender();
      }
      return;
    }

    // ── TOOL: Door ──────────────────────────────────────────────────
    if (activeTool === 'door') {
      const { state: s, plan: p } = getPlanMut();
      if (!p || !s) return;
      if (!p.doors) p.doors = [];
      p.doors.push({ id: generateId(), x: snapped.x, y: snapped.y, size: DOOR_SIZE, swing: 1 });
      setState(s);
      showToast('Door placed');
      rerender();
      return;
    }

    // ── TOOL: Window ────────────────────────────────────────────────
    if (activeTool === 'window') {
      const { state: s, plan: p } = getPlanMut();
      if (!p || !s) return;
      if (!p.windows) p.windows = [];
      p.windows.push({ id: generateId(), x: snapped.x, y: snapped.y, size: WINDOW_SIZE });
      setState(s);
      showToast('Window placed');
      rerender();
      return;
    }

    // ── TOOL: Dimension ─────────────────────────────────────────────
    if (activeTool === 'dimension') {
      if (!wallDraw) {
        wallDraw = { x1: snapped.x, y1: snapped.y };
      } else {
        const { state: s, plan: p } = getPlanMut();
        if (!p || !s) return;
        if (!p.dimensions) p.dimensions = [];
        p.dimensions.push({
          id: generateId(),
          x1: wallDraw.x1, y1: wallDraw.y1,
          x2: snapped.x, y2: snapped.y
        });
        wallDraw = null; wallPreview = null;
        setState(s);
        rerender();
      }
      return;
    }

    // ── TOOL: Text ──────────────────────────────────────────────────
    if (activeTool === 'text') {
      const text = prompt('Label text:');
      if (!text) return;
      const { state: s, plan: p } = getPlanMut();
      if (!p || !s) return;
      if (!p.labels) p.labels = [];
      p.labels.push({ id: generateId(), x: snapped.x, y: snapped.y, text, fontSize: 12 });
      setState(s);
      rerender();
      return;
    }

    // ── TOOL: Eraser ────────────────────────────────────────────────
    if (activeTool === 'eraser') {
      const target = e.target.closest('.fp-furniture, .fp-wall, .fp-door, .fp-window, .fp-dimension, .fp-label, .fp-room');
      if (!target) return;
      const { state: s, plan: p } = getPlanMut();
      if (!p || !s) return;

      if (target.classList.contains('fp-furniture')) {
        p.furniture = (p.furniture || []).filter(f => f.id !== target.dataset.furnId);
      } else if (target.classList.contains('fp-wall')) {
        p.walls = (p.walls || []).filter(w => w.id !== target.dataset.wallId);
      } else if (target.classList.contains('fp-door')) {
        p.doors = (p.doors || []).filter(d => d.id !== target.dataset.doorId);
      } else if (target.classList.contains('fp-window')) {
        p.windows = (p.windows || []).filter(w => w.id !== target.dataset.windowId);
      } else if (target.classList.contains('fp-dimension')) {
        p.dimensions = (p.dimensions || []).filter(d => d.id !== target.dataset.dimId);
      } else if (target.classList.contains('fp-label')) {
        p.labels = (p.labels || []).filter(l => l.id !== target.dataset.labelId);
      } else if (target.classList.contains('fp-room')) {
        if (confirm('Delete this room?')) {
          p.rooms = (p.rooms || []).filter(r => r.id !== target.dataset.roomId);
        }
      }
      selectedId = null; selectedType = null;
      setState(s);
      rerender();
    }
  });

  // Mouse move
  const onMouseMove = (e) => {
    const pos = svgCoords(e, svg);
    cursorPos = pos;

    // Pan
    if (panState) {
      viewportX = panState.origVX - (e.clientX - panState.startX) / zoomLevel;
      viewportY = panState.origVY - (e.clientY - panState.startY) / zoomLevel;
      rerender();
      return;
    }

    // Wall preview
    if (wallDraw && (activeTool === 'wall' || activeTool === 'dimension')) {
      wallPreview = { x1: wallDraw.x1, y1: wallDraw.y1, x2: snap(pos.x), y2: snap(pos.y) };
      // Constrain to horizontal/vertical if shift held
      if (e.shiftKey) {
        const dx = Math.abs(wallPreview.x2 - wallPreview.x1);
        const dy = Math.abs(wallPreview.y2 - wallPreview.y1);
        if (dx > dy) wallPreview.y2 = wallPreview.y1;
        else wallPreview.x2 = wallPreview.x1;
      }
      // Update the preview line directly in the DOM
      const content = el.querySelector('#fp-content');
      if (content) {
        const existing = content.querySelector('.wall-preview-line');
        if (existing) existing.remove();
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('class', 'wall-preview-line');
        line.setAttribute('x1', wallPreview.x1);
        line.setAttribute('y1', wallPreview.y1);
        line.setAttribute('x2', wallPreview.x2);
        line.setAttribute('y2', wallPreview.y2);
        line.setAttribute('stroke', activeTool === 'wall' ? '#6366f1' : '#e11d48');
        line.setAttribute('stroke-width', activeTool === 'wall' ? WALL_THICKNESS : '1');
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('stroke-dasharray', '8,4');
        line.setAttribute('opacity', '0.6');
        content.appendChild(line);
      }
      return;
    }

    // Drag states
    if (!dragState) return;

    const { state: s, plan: p } = getPlanMut();
    if (!p || !s) return;

    if (dragState.type === 'move-furn') {
      const furn = (p.furniture || []).find(f => f.id === dragState.id);
      if (!furn || furn.locked) return;
      furn.x = snap(dragState.origX + (pos.x - dragState.startX));
      furn.y = snap(dragState.origY + (pos.y - dragState.startY));
      // Direct DOM update for smooth dragging
      const furnEl = el.querySelector(`[data-furn-id="${dragState.id}"]`);
      if (furnEl) {
        const svgChild = furnEl.querySelector('svg');
        if (svgChild) { svgChild.setAttribute('x', furn.x); svgChild.setAttribute('y', furn.y); }
      }
    } else if (dragState.type === 'resize-furn') {
      const furn = (p.furniture || []).find(f => f.id === dragState.id);
      if (!furn) return;
      const dx = pos.x - dragState.startX;
      const dy = pos.y - dragState.startY;
      const handle = dragState.handle;
      const orig = dragState.orig;
      if (handle.includes('e')) furn.w = Math.max(20, snap(orig.w + dx));
      if (handle.includes('w')) { furn.w = Math.max(20, snap(orig.w - dx)); furn.x = snap(orig.x + dx); }
      if (handle.includes('s')) furn.h = Math.max(20, snap(orig.h + dy));
      if (handle.includes('n')) { furn.h = Math.max(20, snap(orig.h - dy)); furn.y = snap(orig.y + dy); }
    } else if (dragState.type === 'rotate-furn') {
      const furn = (p.furniture || []).find(f => f.id === dragState.id);
      if (!furn) return;
      const angle = Math.atan2(pos.y - dragState.cy, pos.x - dragState.cx) * 180 / Math.PI;
      let rot = dragState.origRotation + (angle - dragState.startAngle);
      if (e.shiftKey) rot = Math.round(rot / 90) * 90;
      furn.rotation = Math.round(rot);
    } else if (dragState.type === 'move-room') {
      const room = (p.rooms || []).find(r => r.id === dragState.id);
      if (!room) return;
      room.x = snap(dragState.origX + (pos.x - dragState.startX));
      room.y = snap(dragState.origY + (pos.y - dragState.startY));
    } else if (dragState.type === 'resize-room') {
      const room = (p.rooms || []).find(r => r.id === dragState.id);
      if (!room) return;
      const dx = pos.x - dragState.startX;
      const dy = pos.y - dragState.startY;
      const handle = dragState.handle;
      const orig = dragState.orig;
      if (handle.includes('e') || handle === 'ne' || handle === 'se') room.w = Math.max(40, snap(orig.w + dx));
      if (handle.includes('w') || handle === 'nw' || handle === 'sw') { room.w = Math.max(40, snap(orig.w - dx)); room.x = snap(orig.x + dx); }
      if (handle.includes('s') || handle === 'se' || handle === 'sw') room.h = Math.max(40, snap(orig.h + dy));
      if (handle.includes('n') || handle === 'ne' || handle === 'nw') { room.h = Math.max(40, snap(orig.h - dy)); room.y = snap(orig.y + dy); }
    }

    // Re-render for drag states that need visual update
    if (dragState.type.startsWith('resize') || dragState.type.startsWith('rotate')) {
      rerender();
    }
  };
  document.addEventListener('mousemove', onMouseMove);
  _eventCleanup.push(() => document.removeEventListener('mousemove', onMouseMove));

  // Mouse up
  const onMouseUp = () => {
    if (panState) {
      panState = null;
      if (wrapper) wrapper.style.cursor = '';
      return;
    }
    if (dragState) {
      const { state: s } = getPlanMut();
      if (s) setState(s);
      dragState = null;
      rerender();
    }
  };
  document.addEventListener('mouseup', onMouseUp);
  _eventCleanup.push(() => document.removeEventListener('mouseup', onMouseUp));

  // ── Keyboard ────────────────────────────────────────────────────────
  const onKeyDown = (e) => {
    if (e.target.closest('input, select, [contenteditable]')) return;

    // Tool shortcuts
    if (e.key === 'v' || e.key === 'V') { activeTool = 'select'; wallDraw = null; wallPreview = null; rerender(); }
    if (e.key === 'w' || e.key === 'W') { activeTool = 'wall'; rerender(); }
    if (e.key === 'd' || e.key === 'D') { activeTool = 'door'; rerender(); }
    if (e.key === 'n' || e.key === 'N') { activeTool = 'window'; rerender(); }
    if (e.key === 'm' || e.key === 'M') { activeTool = 'dimension'; rerender(); }
    if (e.key === 't' || e.key === 'T') { activeTool = 'text'; rerender(); }
    if (e.key === 'e' || e.key === 'E') { activeTool = 'eraser'; rerender(); }

    // Space for pan
    if (e.key === ' ' && !spaceDown) { spaceDown = true; if (wrapper) wrapper.style.cursor = 'grab'; e.preventDefault(); }

    // Delete
    if (e.key === 'Delete' || e.key === 'Backspace') { if (selectedId) { e.preventDefault(); deleteSelected(); } }

    // Rotate selected furniture
    if (e.key === 'r' || e.key === 'R') {
      if (selectedType === 'furniture' && selectedId) {
        const { state: s, plan: p } = getPlanMut();
        if (!p || !s) return;
        const furn = (p.furniture || []).find(f => f.id === selectedId);
        if (furn) {
          furn.rotation = ((furn.rotation || 0) + (e.shiftKey ? 90 : 15)) % 360;
          setState(s);
          rerender();
        }
      }
    }

    // Undo/Redo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); rerender(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); rerender(); }

    // Escape cancels wall draw
    if (e.key === 'Escape') {
      wallDraw = null; wallPreview = null;
      selectedId = null; selectedType = null;
      rerender();
    }

    // Arrow nudge
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedId) {
      e.preventDefault();
      const step = e.shiftKey ? GRID_SIZE : 5;
      const { state: s, plan: p } = getPlanMut();
      if (!p || !s) return;
      let item = null;
      if (selectedType === 'furniture') item = (p.furniture || []).find(f => f.id === selectedId);
      else if (selectedType === 'room') item = (p.rooms || []).find(r => r.id === selectedId);
      if (item && !item.locked) {
        if (e.key === 'ArrowUp') item.y -= step;
        if (e.key === 'ArrowDown') item.y += step;
        if (e.key === 'ArrowLeft') item.x -= step;
        if (e.key === 'ArrowRight') item.x += step;
        setState(s);
        rerender();
      }
    }
  };
  const onKeyUp = (e) => {
    if (e.key === ' ') { spaceDown = false; if (wrapper) wrapper.style.cursor = ''; }
  };
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  _eventCleanup.push(() => { document.removeEventListener('keydown', onKeyDown); document.removeEventListener('keyup', onKeyUp); });

  // ── Zoom with scroll wheel ──────────────────────────────────────────
  const onWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    const newZoom = clamp(zoomLevel + delta, MIN_ZOOM, MAX_ZOOM);
    // Zoom toward cursor
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left - RULER_SIZE;
    const my = e.clientY - rect.top - RULER_SIZE;
    const worldX = mx / zoomLevel + viewportX;
    const worldY = my / zoomLevel + viewportY;
    zoomLevel = newZoom;
    viewportX = worldX - mx / zoomLevel;
    viewportY = worldY - my / zoomLevel;
    rerender();
  };
  wrapper.addEventListener('wheel', onWheel, { passive: false });
  _eventCleanup.push(() => wrapper.removeEventListener('wheel', onWheel));

  // Prevent context menu on SVG
  svg.addEventListener('contextmenu', (e) => e.preventDefault());
}

// ── Delete Selected ──────────────────────────────────────────────────────
function deleteSelected() {
  if (!selectedId) return;
  const { state: s, plan: p } = getPlanMut();
  if (!p || !s) return;

  if (selectedType === 'furniture') p.furniture = (p.furniture || []).filter(f => f.id !== selectedId);
  else if (selectedType === 'room') p.rooms = (p.rooms || []).filter(r => r.id !== selectedId);
  else if (selectedType === 'wall') p.walls = (p.walls || []).filter(w => w.id !== selectedId);
  else if (selectedType === 'door') p.doors = (p.doors || []).filter(d => d.id !== selectedId);
  else if (selectedType === 'window') p.windows = (p.windows || []).filter(w => w.id !== selectedId);
  else if (selectedType === 'dimension') p.dimensions = (p.dimensions || []).filter(d => d.id !== selectedId);
  else if (selectedType === 'label') p.labels = (p.labels || []).filter(l => l.id !== selectedId);

  selectedId = null; selectedType = null;
  setState(s);
  rerender();
}

// ── Export SVG ────────────────────────────────────────────────────────────
function exportSvg() {
  const plan = getActivePlan();
  if (!plan) return;

  let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" style="background:white;">
  <style>text { font-family: Inter, Arial, sans-serif; }</style>
  <text x="20" y="30" font-size="18" font-weight="bold" fill="#1e293b">${sanitizeHtml(plan.name)}</text>
  <g transform="translate(0 40)">`;

  (plan.rooms || []).forEach(r => {
    svgContent += `
    <rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${r.fill || '#f0fdf4'}" stroke="#94a3b8" stroke-width="1.5" rx="2"/>
    <text x="${r.x + r.w/2}" y="${r.y + r.h/2 - 6}" text-anchor="middle" font-size="12" fill="#475569" font-weight="600">${sanitizeHtml(r.label)}</text>
    <text x="${r.x + r.w/2}" y="${r.y + r.h/2 + 10}" text-anchor="middle" font-size="10" fill="#94a3b8">${toMeters(r.w)}m x ${toMeters(r.h)}m</text>`;
  });

  (plan.walls || []).forEach(w => {
    svgContent += `<line x1="${w.x1}" y1="${w.y1}" x2="${w.x2}" y2="${w.y2}" stroke="#1e293b" stroke-width="${w.thickness || WALL_THICKNESS}" stroke-linecap="round"/>`;
  });

  (plan.doors || []).forEach(d => {
    const size = d.size || DOOR_SIZE;
    svgContent += `<path d="M${d.x},${d.y} A${size},${size} 0 0,${d.swing > 0 ? 1 : 0} ${d.x + size},${d.y}" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="4,2"/>`;
  });

  (plan.windows || []).forEach(w => {
    const size = w.size || WINDOW_SIZE;
    svgContent += `<line x1="${w.x}" y1="${w.y - 3}" x2="${w.x + size}" y2="${w.y - 3}" stroke="#0ea5e9" stroke-width="2"/>
    <line x1="${w.x}" y1="${w.y + 3}" x2="${w.x + size}" y2="${w.y + 3}" stroke="#0ea5e9" stroke-width="2"/>`;
  });

  (plan.furniture || []).forEach(f => {
    const def = getFurnDef(f.type);
    const cx = f.x + f.w / 2;
    const cy = f.y + f.h / 2;
    svgContent += `<g transform="rotate(${f.rotation || 0} ${cx} ${cy})"><svg x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" viewBox="0 0 ${f.w} ${f.h}">${def.svg(f.w, f.h)}</svg><text x="${cx}" y="${f.y + f.h + 12}" text-anchor="middle" font-size="8" fill="${def.color}">${sanitizeHtml(f.label)}</text></g>`;
  });

  (plan.dimensions || []).forEach(d => {
    const len = Math.sqrt((d.x2 - d.x1) ** 2 + (d.y2 - d.y1) ** 2);
    const mx = (d.x1 + d.x2) / 2;
    const my = (d.y1 + d.y2) / 2;
    svgContent += `<line x1="${d.x1}" y1="${d.y1}" x2="${d.x2}" y2="${d.y2}" stroke="#e11d48" stroke-width="1" stroke-dasharray="4,2"/>
    <text x="${mx}" y="${my - 4}" text-anchor="middle" font-size="9" fill="#e11d48" font-weight="600">${toMeters(len)}m</text>`;
  });

  (plan.labels || []).forEach(l => {
    svgContent += `<text x="${l.x}" y="${l.y}" font-size="${l.fontSize || 12}" fill="#475569" font-weight="500">${sanitizeHtml(l.text)}</text>`;
  });

  svgContent += `
    <line x1="20" y1="720" x2="${20 + PX_PER_METER}" y2="720" stroke="#64748b" stroke-width="1.5"/>
    <line x1="20" y1="715" x2="20" y2="725" stroke="#64748b" stroke-width="1.5"/>
    <line x1="${20 + PX_PER_METER}" y1="715" x2="${20 + PX_PER_METER}" y2="725" stroke="#64748b" stroke-width="1.5"/>
    <text x="${20 + PX_PER_METER/2}" y="710" text-anchor="middle" font-size="9" fill="#64748b">1 metre</text>`;

  svgContent += '</g></svg>';

  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(plan.name || 'floorplan').replace(/\s+/g, '_')}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('SVG exported');
}

// ── Export PNG ────────────────────────────────────────────────────────────
function exportPng() {
  const plan = getActivePlan();
  if (!plan) return;

  const svgEl = _el?.querySelector('#fp-svg');
  if (!svgEl) return;

  const clone = svgEl.cloneNode(true);
  const svgStr = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width * 2;
    canvas.height = img.height * 2;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, img.width, img.height);
    ctx.drawImage(img, 0, 0, img.width, img.height);

    const pngUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = `${(plan.name || 'floorplan').replace(/\s+/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('PNG exported');
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    showToast('PNG export failed', 'error');
  };
  img.src = url;
}

// ── Cleanup ──────────────────────────────────────────────────────────────
function cleanupEvents() {
  _eventCleanup.forEach(fn => fn());
  _eventCleanup = [];
}

export function destroy() {
  cleanupEvents();
  activeFloorId = null;
  activeTool = 'select';
  selectedId = null;
  selectedType = null;
  dragState = null;
  wallDraw = null;
  wallPreview = null;
  panState = null;
  viewportX = 0;
  viewportY = 0;
  zoomLevel = 1;
  spaceDown = false;
  _el = null;
}
