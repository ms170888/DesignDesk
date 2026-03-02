// Procurement & Orders view — Production Quality

import { getState, setState, getActiveProject, addActivity } from '../store.js';
import { formatCurrency, generateId, debounce } from '../core/utils.js';
import { icons } from '../core/icons.js';
import { showModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

const STATUSES = ['spec', 'quoted', 'ordered', 'shipped', 'delivered', 'installed'];
const STATUS_COLORS = { spec: '#94a3b8', quoted: '#6366f1', ordered: '#f59e0b', shipped: '#3b82f6', delivered: '#10b981', installed: '#8b5cf6' };
const CATEGORIES = ['Furniture', 'Fabric', 'Lighting', 'Paint', 'Tiles', 'Hardware'];
const ITEMS_PER_PAGE = 20;

const ALL_COLUMNS = [
  { key: 'checkbox', label: '', alwaysVisible: true, width: 40 },
  { key: 'name', label: 'Item', sortable: true, width: 200 },
  { key: 'supplier', label: 'Supplier', sortable: true, width: 140 },
  { key: 'room', label: 'Room', sortable: true, width: 120 },
  { key: 'category', label: 'Category', sortable: true, width: 100 },
  { key: 'trade', label: 'Trade', sortable: true, width: 100 },
  { key: 'markup', label: 'Markup', sortable: false, width: 80 },
  { key: 'clientPrice', label: 'Client Price', sortable: true, width: 110 },
  { key: 'status', label: 'Status', sortable: true, width: 110 },
  { key: 'actions', label: '', alwaysVisible: true, width: 80 },
];

// Module state
let filterStatus = 'all';
let filterRoom = 'all';
let sortCol = 'name';
let sortDir = 1;
let searchQuery = '';
let currentPage = 1;
let selectedIds = new Set();
let expandedRowId = null;
let viewType = 'table'; // 'table' | 'kanban'
let editingCell = null; // { id, col }
let visibleColumns = new Set(ALL_COLUMNS.map(c => c.key));
let columnWidths = {};
let lastDeletedItem = null;
let deleteUndoTimer = null;
let rootEl = null;

function loadPersistedState() {
  try {
    const state = getState();
    if (state?.settings?.procurementView) {
      const pv = state.settings.procurementView;
      if (pv.sortCol) sortCol = pv.sortCol;
      if (pv.sortDir) sortDir = pv.sortDir;
      if (pv.filterStatus) filterStatus = pv.filterStatus;
      if (pv.filterRoom) filterRoom = pv.filterRoom;
      if (pv.viewType) viewType = pv.viewType;
      if (pv.visibleColumns) visibleColumns = new Set(pv.visibleColumns);
      if (pv.columnWidths) columnWidths = pv.columnWidths;
    }
  } catch (e) { /* ignore */ }
}

function savePersistedState() {
  try {
    const state = getState();
    if (!state.settings) state.settings = {};
    state.settings.procurementView = {
      sortCol, sortDir, filterStatus, filterRoom, viewType,
      visibleColumns: [...visibleColumns],
      columnWidths,
    };
    setState(state);
  } catch (e) { /* ignore */ }
}

function getProjectItems() {
  const state = getState();
  const project = getActiveProject();
  if (!project || !state) return [];
  return state.items.filter(i => i.projectId === project.id);
}

function getFilteredSortedItems() {
  let items = getProjectItems();

  // Search
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    items = items.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.supplier.toLowerCase().includes(q) ||
      i.room.toLowerCase().includes(q) ||
      i.category?.toLowerCase().includes(q) ||
      i.status.toLowerCase().includes(q) ||
      i.notes?.toLowerCase().includes(q)
    );
  }

  // Filter
  if (filterStatus !== 'all') items = items.filter(i => i.status === filterStatus);
  if (filterRoom !== 'all') items = items.filter(i => i.room === filterRoom);

  // Sort
  items.sort((a, b) => {
    let va = a[sortCol], vb = b[sortCol];
    if (sortCol === 'clientPrice') { va = a.trade * (1 + a.markup / 100); vb = b.trade * (1 + b.markup / 100); }
    if (va == null) va = '';
    if (vb == null) vb = '';
    if (typeof va === 'string') return va.localeCompare(vb) * sortDir;
    return ((va || 0) - (vb || 0)) * sortDir;
  });

  return items;
}

function getPaginatedItems(items) {
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  return items.slice(start, start + ITEMS_PER_PAGE);
}

function getTotalPages(items) {
  return Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
}

function getColWidth(key) {
  if (columnWidths[key]) return columnWidths[key];
  const col = ALL_COLUMNS.find(c => c.key === key);
  return col ? col.width : 100;
}

// --- Render ---
export function render() {
  loadPersistedState();
  const state = getState();
  const project = getActiveProject();
  if (!project || !state) {
    return `<div class="empty-state">
      <div class="empty-state-icon">${icons.procurement}</div>
      <h2>No project selected</h2>
      <p class="text-muted">Select a project to manage procurement items.</p>
    </div>`;
  }

  const allItems = getProjectItems();
  if (allItems.length === 0 && !searchQuery && filterStatus === 'all' && filterRoom === 'all') {
    return renderEmptyState();
  }

  return viewType === 'kanban' ? renderKanbanView(state, project, allItems) : renderTableView(state, project, allItems);
}

function renderEmptyState() {
  return `
    <div class="view-procurement">
      <div class="view-header">
        <h1>Procurement & Orders</h1>
        <button class="btn btn-primary btn-sm" id="add-item-btn">${icons.plus} Add Item</button>
      </div>
      <div class="empty-state" style="margin-top:60px;">
        <div class="empty-state-icon" style="font-size:48px;opacity:.4;">${icons.procurement}</div>
        <h2 style="margin-top:16px;">Add your first item</h2>
        <p class="text-muted" style="margin-bottom:20px;">Start tracking procurement items for this project.</p>
        <button class="btn btn-primary" id="add-item-btn-empty">${icons.plus} Add Item</button>
      </div>
    </div>`;
}

function renderStickyFinancialSummary(allItems) {
  const totalTrade = allItems.reduce((s, i) => s + (i.trade || 0), 0);
  const totalClient = allItems.reduce((s, i) => s + (i.trade || 0) * (1 + (i.markup || 0) / 100), 0);
  const totalMargin = totalClient - totalTrade;
  const marginPct = totalClient ? Math.round(totalMargin / totalClient * 100) : 0;

  // Room breakdown
  const rooms = [...new Set(allItems.map(i => i.room))].sort();
  const roomBreakdown = rooms.map(room => {
    const roomItems = allItems.filter(i => i.room === room);
    const trade = roomItems.reduce((s, i) => s + (i.trade || 0), 0);
    const client = roomItems.reduce((s, i) => s + (i.trade || 0) * (1 + (i.markup || 0) / 100), 0);
    return { room, trade, client, margin: client - trade, count: roomItems.length };
  });

  // Category breakdown
  const categories = [...new Set(allItems.map(i => i.category || 'Uncategorised'))].sort();
  const catBreakdown = categories.map(cat => {
    const catItems = allItems.filter(i => (i.category || 'Uncategorised') === cat);
    const trade = catItems.reduce((s, i) => s + (i.trade || 0), 0);
    const client = catItems.reduce((s, i) => s + (i.trade || 0) * (1 + (i.markup || 0) / 100), 0);
    return { category: cat, trade, client, margin: client - trade, count: catItems.length };
  });

  // Margin warnings
  const lowMarginItems = allItems.filter(i => i.markup < 15);

  return `
    <div class="financial-summary-sticky">
      <div class="summary-bar">
        <div class="summary-item"><span class="text-muted">Total Trade</span> <strong>${formatCurrency(totalTrade)}</strong></div>
        <div class="summary-item"><span class="text-muted">Total Client</span> <strong>${formatCurrency(totalClient)}</strong></div>
        <div class="summary-item"><span class="text-muted">Gross Margin</span> <strong class="text-success">${formatCurrency(totalMargin)} (${marginPct}%)</strong></div>
        <div class="summary-item"><span class="text-muted">Items</span> <strong>${allItems.length}</strong></div>
        <button class="btn btn-outline btn-xs" id="export-csv-btn" title="Export CSV">${icons.printer} CSV</button>
      </div>
      ${lowMarginItems.length > 0 ? `<div class="margin-warnings"><span class="text-warning">Warning:</span> ${lowMarginItems.length} item${lowMarginItems.length > 1 ? 's' : ''} below 15% markup: ${lowMarginItems.slice(0, 3).map(i => i.name).join(', ')}${lowMarginItems.length > 3 ? '...' : ''}</div>` : ''}
      <div class="breakdown-toggles">
        <button class="btn btn-ghost btn-xs toggle-breakdown" data-target="room-breakdown">${icons.chevronRight} By Room</button>
        <button class="btn btn-ghost btn-xs toggle-breakdown" data-target="category-breakdown">${icons.chevronRight} By Category</button>
      </div>
      <div class="breakdown-panel" id="room-breakdown" style="display:none;">
        <table class="breakdown-table">
          <thead><tr><th>Room</th><th>Items</th><th>Trade</th><th>Client</th><th>Margin</th></tr></thead>
          <tbody>${roomBreakdown.map(r => `<tr><td>${r.room}</td><td>${r.count}</td><td>${formatCurrency(r.trade)}</td><td>${formatCurrency(r.client)}</td><td class="text-success">${formatCurrency(r.margin)}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="breakdown-panel" id="category-breakdown" style="display:none;">
        <table class="breakdown-table">
          <thead><tr><th>Category</th><th>Items</th><th>Trade</th><th>Client</th><th>Margin</th></tr></thead>
          <tbody>${catBreakdown.map(c => `<tr><td>${c.category}</td><td>${c.count}</td><td>${formatCurrency(c.trade)}</td><td>${formatCurrency(c.client)}</td><td class="text-success">${formatCurrency(c.margin)}</td></tr>`).join('')}</tbody>
        </table>
      </div>
    </div>`;
}

function renderPipeline(allItems) {
  const pipeline = STATUSES.map(s => {
    const stageItems = allItems.filter(i => i.status === s);
    const count = stageItems.length;
    const value = stageItems.reduce((sum, i) => sum + (i.trade || 0) * (1 + (i.markup || 0) / 100), 0);
    const isActive = filterStatus === s;
    return `<div class="pipeline-stage ${isActive ? 'pipeline-active' : ''}" data-status="${s}" title="Click to filter">
      <div class="pipeline-dot" style="background:${STATUS_COLORS[s]}"></div>
      <span class="pipeline-label">${s}</span>
      <span class="pipeline-count">${count}</span>
      <span class="pipeline-value">${formatCurrency(value)}</span>
    </div>`;
  }).join('<div class="pipeline-arrow">&rarr;</div>');

  return `<div class="pipeline-bar">${pipeline}</div>`;
}

function renderTableView(state, project, allItems) {
  const filteredItems = getFilteredSortedItems();
  const totalPages = getTotalPages(filteredItems);
  if (currentPage > totalPages) currentPage = totalPages;
  const pageItems = getPaginatedItems(filteredItems);
  const rooms = [...new Set(allItems.map(i => i.room))].sort();
  const allSelected = pageItems.length > 0 && pageItems.every(i => selectedIds.has(i.id));
  const someSelected = selectedIds.size > 0;

  const visCols = ALL_COLUMNS.filter(c => visibleColumns.has(c.key));

  return `
    <div class="view-procurement">
      <div class="view-header">
        <h1>Procurement & Orders</h1>
        <div class="view-header-actions">
          <div class="view-type-toggle">
            <button class="toggle-btn ${viewType === 'table' ? 'active' : ''}" data-view="table" title="Table view">${icons.grid}</button>
            <button class="toggle-btn ${viewType === 'kanban' ? 'active' : ''}" data-view="kanban" title="Kanban view">${icons.grip}</button>
          </div>
          <button class="btn btn-primary btn-sm" id="add-item-btn">${icons.plus} Add Item</button>
        </div>
      </div>

      ${renderPipeline(allItems)}
      ${renderStickyFinancialSummary(allItems)}

      <div class="table-controls">
        <div class="table-controls-left">
          <div class="search-input-wrap">
            ${icons.search}
            <input type="text" id="search-input" class="search-input" placeholder="Search items..." value="${escHtml(searchQuery)}" />
          </div>
          <select id="filter-status" class="filter-select">
            <option value="all">All Statuses</option>
            ${STATUSES.map(s => `<option value="${s}" ${filterStatus === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
          <select id="filter-room" class="filter-select">
            <option value="all">All Rooms</option>
            ${rooms.map(r => `<option value="${r}" ${filterRoom === r ? 'selected' : ''}>${escHtml(r)}</option>`).join('')}
          </select>
        </div>
        <div class="table-controls-right">
          <div class="column-toggle-wrap">
            <button class="btn btn-ghost btn-xs" id="col-toggle-btn">${icons.eye} Columns</button>
            <div class="column-toggle-dropdown" id="col-toggle-dropdown" style="display:none;">
              ${ALL_COLUMNS.filter(c => !c.alwaysVisible).map(c => `
                <label class="checkbox-item">
                  <input type="checkbox" data-col="${c.key}" ${visibleColumns.has(c.key) ? 'checked' : ''} />
                  <span>${c.label}</span>
                </label>
              `).join('')}
            </div>
          </div>
          <span class="text-muted text-sm">${filteredItems.length} item${filteredItems.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      ${someSelected ? renderBulkActionsBar() : ''}

      <div class="table-wrapper">
        <table class="data-table" id="procurement-table">
          <thead>
            <tr>
              ${visCols.map(col => {
                if (col.key === 'checkbox') {
                  return `<th style="width:${getColWidth(col.key)}px;" class="th-checkbox"><input type="checkbox" id="select-all-cb" ${allSelected ? 'checked' : ''} /></th>`;
                }
                if (col.key === 'actions') {
                  return `<th style="width:${getColWidth(col.key)}px;"></th>`;
                }
                const isSorted = sortCol === col.key;
                const arrow = isSorted ? (sortDir === 1 ? ' &uarr;' : ' &darr;') : '';
                return `<th class="${col.sortable ? 'sortable' : ''} resizable-th" data-sort="${col.key}" style="width:${getColWidth(col.key)}px;">
                  <div class="th-content">${col.label}${arrow}</div>
                  <div class="col-resizer" data-col="${col.key}"></div>
                </th>`;
              }).join('')}
            </tr>
          </thead>
          <tbody>
            ${pageItems.map(item => renderTableRow(item, visCols)).join('')}
            ${pageItems.length === 0 ? `<tr><td colspan="${visCols.length}" class="empty-cell">No items match your filters</td></tr>` : ''}
          </tbody>
        </table>
      </div>

      ${totalPages > 1 ? renderPagination(filteredItems.length, totalPages) : ''}
    </div>`;
}

function renderTableRow(item, visCols) {
  const clientPrice = (item.trade || 0) * (1 + (item.markup || 0) / 100);
  const isSelected = selectedIds.has(item.id);
  const isExpanded = expandedRowId === item.id;
  const lowMargin = item.markup < 15;

  let row = `<tr class="data-row ${isSelected ? 'row-selected' : ''} ${lowMargin ? 'row-low-margin' : ''}" data-id="${item.id}">`;

  for (const col of visCols) {
    const isEditing = editingCell && editingCell.id === item.id && editingCell.col === col.key;
    switch (col.key) {
      case 'checkbox':
        row += `<td class="td-checkbox"><input type="checkbox" class="row-cb" data-id="${item.id}" ${isSelected ? 'checked' : ''} /></td>`;
        break;
      case 'name':
        row += `<td class="cell-editable" data-id="${item.id}" data-col="name">${isEditing ? `<input type="text" class="inline-edit-input" value="${escHtml(item.name)}" data-id="${item.id}" data-col="name" />` : `<span class="item-name">${escHtml(item.name)}</span>`}</td>`;
        break;
      case 'supplier':
        row += `<td class="cell-editable" data-id="${item.id}" data-col="supplier">${isEditing ? `<input type="text" class="inline-edit-input" value="${escHtml(item.supplier)}" data-id="${item.id}" data-col="supplier" />` : escHtml(item.supplier)}</td>`;
        break;
      case 'room':
        row += `<td class="cell-editable" data-id="${item.id}" data-col="room">${isEditing ? `<select class="inline-edit-select" data-id="${item.id}" data-col="room">${(getActiveProject()?.rooms || []).map(r => `<option ${r === item.room ? 'selected' : ''}>${escHtml(r)}</option>`).join('')}</select>` : `<span class="room-badge">${escHtml(item.room)}</span>`}</td>`;
        break;
      case 'category':
        row += `<td class="cell-editable" data-id="${item.id}" data-col="category">${isEditing ? `<select class="inline-edit-select" data-id="${item.id}" data-col="category">${CATEGORIES.map(c => `<option ${c === item.category ? 'selected' : ''}>${c}</option>`).join('')}</select>` : (item.category || '')}</td>`;
        break;
      case 'trade':
        row += `<td class="cell-editable text-right" data-id="${item.id}" data-col="trade">${isEditing ? `<input type="number" class="inline-edit-input" value="${item.trade}" step="0.01" min="0" data-id="${item.id}" data-col="trade" />` : formatCurrency(item.trade)}</td>`;
        break;
      case 'markup':
        row += `<td class="cell-editable text-right ${lowMargin ? 'text-warning' : ''}" data-id="${item.id}" data-col="markup">${isEditing ? `<input type="number" class="inline-edit-input" value="${item.markup}" step="1" min="0" max="200" data-id="${item.id}" data-col="markup" />` : `${item.markup}%`}</td>`;
        break;
      case 'clientPrice':
        row += `<td class="text-right"><strong>${formatCurrency(clientPrice)}</strong></td>`;
        break;
      case 'status':
        row += `<td><span class="status-badge status-${item.status}" style="background:${STATUS_COLORS[item.status]}20;color:${STATUS_COLORS[item.status]}">${item.status}</span></td>`;
        break;
      case 'actions':
        row += `<td class="row-actions">
          <button class="icon-btn edit-btn" data-id="${item.id}" title="Edit">${icons.edit}</button>
          <button class="icon-btn duplicate-btn" data-id="${item.id}" title="Duplicate">${icons.plus}</button>
          <button class="icon-btn delete-btn" data-id="${item.id}" title="Delete">${icons.trash}</button>
        </td>`;
        break;
    }
  }

  row += '</tr>';

  // Expanded detail row
  if (isExpanded) {
    row += renderExpandedRow(item, visCols.length);
  }

  return row;
}

function renderExpandedRow(item, colspan) {
  const clientPrice = (item.trade || 0) * (1 + (item.markup || 0) / 100);
  const priceHistory = item.priceHistory || [];

  return `<tr class="expanded-row"><td colspan="${colspan}">
    <div class="expanded-detail">
      <div class="expanded-grid">
        <div class="expanded-section">
          <h4>Item Details</h4>
          <div class="detail-row"><span class="text-muted">Name:</span> ${escHtml(item.name)}</div>
          <div class="detail-row"><span class="text-muted">Supplier:</span> ${escHtml(item.supplier)}</div>
          <div class="detail-row"><span class="text-muted">Room:</span> ${escHtml(item.room)}</div>
          <div class="detail-row"><span class="text-muted">Category:</span> ${item.category || 'N/A'}</div>
          <div class="detail-row"><span class="text-muted">Status:</span> <span class="status-badge status-${item.status}" style="background:${STATUS_COLORS[item.status]}20;color:${STATUS_COLORS[item.status]}">${item.status}</span></div>
        </div>
        <div class="expanded-section">
          <h4>Pricing</h4>
          <div class="detail-row"><span class="text-muted">Trade Price:</span> ${formatCurrency(item.trade)}</div>
          <div class="detail-row"><span class="text-muted">Markup:</span> ${item.markup}%</div>
          <div class="detail-row"><span class="text-muted">Client Price:</span> <strong>${formatCurrency(clientPrice)}</strong></div>
          <div class="detail-row"><span class="text-muted">Margin:</span> <span class="text-success">${formatCurrency(clientPrice - item.trade)}</span></div>
        </div>
        <div class="expanded-section">
          <h4>Notes</h4>
          <p>${item.notes ? escHtml(item.notes) : '<span class="text-muted">No notes</span>'}</p>
          ${item.imageUrl ? `<div class="item-image-preview"><img src="${item.imageUrl}" alt="${escHtml(item.name)}" /></div>` : ''}
        </div>
        <div class="expanded-section">
          <h4>Delivery Timeline</h4>
          <div class="delivery-timeline">
            ${STATUSES.map(s => {
              const idx = STATUSES.indexOf(s);
              const currentIdx = STATUSES.indexOf(item.status);
              const done = idx <= currentIdx;
              return `<div class="timeline-step ${done ? 'timeline-done' : ''}">
                <div class="timeline-dot" style="background:${done ? STATUS_COLORS[s] : '#e2e8f0'}"></div>
                <span class="timeline-label">${s}</span>
              </div>`;
            }).join('<div class="timeline-connector"></div>')}
          </div>
        </div>
      </div>
      ${priceHistory.length > 0 ? `
        <div class="expanded-section" style="margin-top:12px;">
          <h4>Price History</h4>
          <div class="price-history-list">
            ${priceHistory.map(ph => `<div class="price-history-item"><span class="text-muted">${ph.date}</span> ${formatCurrency(ph.oldPrice)} &rarr; ${formatCurrency(ph.newPrice)}</div>`).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  </td></tr>`;
}

function renderBulkActionsBar() {
  return `<div class="bulk-actions-bar">
    <span>${selectedIds.size} item${selectedIds.size > 1 ? 's' : ''} selected</span>
    <button class="btn btn-outline btn-xs" id="bulk-status-btn">Change Status</button>
    <button class="btn btn-outline btn-xs" id="bulk-invoice-btn">Create Invoice</button>
    <button class="btn btn-outline btn-xs" id="bulk-export-btn">${icons.printer} Export</button>
    <button class="btn btn-outline btn-xs text-error" id="bulk-delete-btn">${icons.trash} Delete</button>
    <button class="btn btn-ghost btn-xs" id="bulk-clear-btn">${icons.close} Clear</button>
  </div>`;
}

function renderPagination(totalItems, totalPages) {
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return `<div class="pagination-bar">
    <span class="text-muted text-sm">Showing ${(currentPage - 1) * ITEMS_PER_PAGE + 1}–${Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of ${totalItems}</span>
    <div class="pagination-controls">
      <button class="btn btn-ghost btn-xs" id="page-prev" ${currentPage <= 1 ? 'disabled' : ''}>&laquo; Prev</button>
      ${pages.map(p => p === '...' ? '<span class="pagination-ellipsis">...</span>' : `<button class="btn btn-ghost btn-xs page-num ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`).join('')}
      <button class="btn btn-ghost btn-xs" id="page-next" ${currentPage >= totalPages ? 'disabled' : ''}>Next &raquo;</button>
    </div>
  </div>`;
}

// --- Kanban ---
function renderKanbanView(state, project, allItems) {
  const rooms = [...new Set(allItems.map(i => i.room))].sort();

  let filteredItems = allItems;
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filteredItems = filteredItems.filter(i =>
      i.name.toLowerCase().includes(q) || i.supplier.toLowerCase().includes(q) || i.room.toLowerCase().includes(q)
    );
  }
  if (filterRoom !== 'all') filteredItems = filteredItems.filter(i => i.room === filterRoom);

  return `
    <div class="view-procurement">
      <div class="view-header">
        <h1>Procurement & Orders</h1>
        <div class="view-header-actions">
          <div class="view-type-toggle">
            <button class="toggle-btn ${viewType === 'table' ? 'active' : ''}" data-view="table" title="Table view">${icons.grid}</button>
            <button class="toggle-btn ${viewType === 'kanban' ? 'active' : ''}" data-view="kanban" title="Kanban view">${icons.grip}</button>
          </div>
          <button class="btn btn-primary btn-sm" id="add-item-btn">${icons.plus} Add Item</button>
        </div>
      </div>

      ${renderPipeline(allItems)}
      ${renderStickyFinancialSummary(allItems)}

      <div class="table-controls">
        <div class="table-controls-left">
          <div class="search-input-wrap">
            ${icons.search}
            <input type="text" id="search-input" class="search-input" placeholder="Search items..." value="${escHtml(searchQuery)}" />
          </div>
          <select id="filter-room" class="filter-select">
            <option value="all">All Rooms</option>
            ${rooms.map(r => `<option value="${r}" ${filterRoom === r ? 'selected' : ''}>${escHtml(r)}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="kanban-board">
        ${STATUSES.map(status => {
          const stageItems = filteredItems.filter(i => i.status === status);
          const stageValue = stageItems.reduce((s, i) => s + (i.trade || 0) * (1 + (i.markup || 0) / 100), 0);
          return `<div class="kanban-column" data-status="${status}">
            <div class="kanban-column-header" style="border-top:3px solid ${STATUS_COLORS[status]}">
              <div class="kanban-col-title">
                <span class="kanban-col-name">${status}</span>
                <span class="kanban-col-count">${stageItems.length}</span>
              </div>
              <span class="kanban-col-value">${formatCurrency(stageValue)}</span>
            </div>
            <div class="kanban-cards" data-status="${status}">
              ${stageItems.map(item => {
                const cp = (item.trade || 0) * (1 + (item.markup || 0) / 100);
                return `<div class="kanban-card" draggable="true" data-id="${item.id}">
                  <div class="kanban-card-name">${escHtml(item.name)}</div>
                  <div class="kanban-card-supplier text-muted">${escHtml(item.supplier)}</div>
                  <div class="kanban-card-meta">
                    <span class="room-badge">${escHtml(item.room)}</span>
                    <strong>${formatCurrency(cp)}</strong>
                  </div>
                </div>`;
              }).join('')}
              ${stageItems.length === 0 ? '<div class="kanban-empty">Drop items here</div>' : ''}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

// --- Mount ---
export function mount(el) {
  rootEl = el;

  // Add item buttons
  el.querySelector('#add-item-btn')?.addEventListener('click', () => showItemForm());
  el.querySelector('#add-item-btn-empty')?.addEventListener('click', () => showItemForm());

  // View type toggle
  el.querySelectorAll('.view-type-toggle .toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      viewType = btn.dataset.view;
      savePersistedState();
      refresh(el);
    });
  });

  // Search
  const searchInput = el.querySelector('#search-input');
  if (searchInput) {
    const doSearch = debounce(() => {
      searchQuery = searchInput.value;
      currentPage = 1;
      refresh(el);
    }, 250);
    searchInput.addEventListener('input', doSearch);
  }

  // Filters
  el.querySelector('#filter-status')?.addEventListener('change', (e) => {
    filterStatus = e.target.value;
    currentPage = 1;
    savePersistedState();
    refresh(el);
  });
  el.querySelector('#filter-room')?.addEventListener('change', (e) => {
    filterRoom = e.target.value;
    currentPage = 1;
    savePersistedState();
    refresh(el);
  });

  // Pipeline clicks
  el.querySelectorAll('.pipeline-stage').forEach(stage => {
    stage.addEventListener('click', () => {
      const status = stage.dataset.status;
      filterStatus = filterStatus === status ? 'all' : status;
      currentPage = 1;
      savePersistedState();
      refresh(el);
    });
  });

  // Sort
  el.querySelectorAll('.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.sort;
      if (sortCol === col) sortDir *= -1; else { sortCol = col; sortDir = 1; }
      savePersistedState();
      refresh(el);
    });
  });

  // Column resize
  el.querySelectorAll('.col-resizer').forEach(resizer => {
    resizer.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const col = resizer.dataset.col;
      const th = resizer.parentElement;
      const startX = e.clientX;
      const startWidth = th.offsetWidth;
      const onMouseMove = (ev) => {
        const newWidth = Math.max(60, startWidth + ev.clientX - startX);
        columnWidths[col] = newWidth;
        th.style.width = newWidth + 'px';
      };
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        savePersistedState();
      };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  });

  // Column visibility dropdown
  el.querySelector('#col-toggle-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const dd = el.querySelector('#col-toggle-dropdown');
    dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
  });
  el.querySelectorAll('#col-toggle-dropdown input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const col = cb.dataset.col;
      if (cb.checked) visibleColumns.add(col); else visibleColumns.delete(col);
      savePersistedState();
      refresh(el);
    });
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    const dd = el.querySelector('#col-toggle-dropdown');
    if (dd && dd.style.display === 'block' && !e.target.closest('.column-toggle-wrap')) {
      dd.style.display = 'none';
    }
  }, { once: false });

  // Select all
  el.querySelector('#select-all-cb')?.addEventListener('change', (e) => {
    const items = getPaginatedItems(getFilteredSortedItems());
    if (e.target.checked) {
      items.forEach(i => selectedIds.add(i.id));
    } else {
      items.forEach(i => selectedIds.delete(i.id));
    }
    refresh(el);
  });

  // Row checkboxes with shift+click
  let lastCheckedIdx = null;
  el.querySelectorAll('.row-cb').forEach((cb, idx) => {
    cb.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = cb.dataset.id;
      if (e.shiftKey && lastCheckedIdx !== null) {
        const allCbs = [...el.querySelectorAll('.row-cb')];
        const start = Math.min(lastCheckedIdx, idx);
        const end = Math.max(lastCheckedIdx, idx);
        for (let i = start; i <= end; i++) {
          const cid = allCbs[i].dataset.id;
          if (cb.checked) selectedIds.add(cid); else selectedIds.delete(cid);
        }
      } else {
        if (cb.checked) selectedIds.add(id); else selectedIds.delete(id);
      }
      lastCheckedIdx = idx;
      refresh(el);
    });
  });

  // Row click to expand
  el.querySelectorAll('.data-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.row-actions') || e.target.closest('.td-checkbox') ||
          e.target.closest('.inline-edit-input') || e.target.closest('.inline-edit-select') ||
          e.target.closest('.cell-editable') && editingCell) return;
      const id = row.dataset.id;
      expandedRowId = expandedRowId === id ? null : id;
      refresh(el);
    });
  });

  // Inline editing — double-click
  el.querySelectorAll('.cell-editable').forEach(cell => {
    cell.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      const id = cell.dataset.id;
      const col = cell.dataset.col;
      if (!id || !col) return;
      editingCell = { id, col };
      refresh(el);
      setTimeout(() => {
        const input = el.querySelector(`.inline-edit-input[data-id="${id}"][data-col="${col}"], .inline-edit-select[data-id="${id}"][data-col="${col}"]`);
        if (input) {
          input.focus();
          if (input.select) input.select();
        }
      }, 50);
    });
  });

  // Inline edit save/cancel
  el.querySelectorAll('.inline-edit-input, .inline-edit-select').forEach(input => {
    const saveInlineEdit = () => {
      const id = input.dataset.id;
      const col = input.dataset.col;
      const state = getState();
      const item = state.items.find(i => i.id === id);
      if (!item) return;

      let val = input.value;
      if (col === 'trade' || col === 'markup') {
        val = parseFloat(val) || 0;
        if (col === 'trade' && val < 0) val = 0;
        if (col === 'markup') val = Math.max(0, Math.min(200, val));
        // Price history tracking for trade price changes
        if (col === 'trade' && val !== item.trade) {
          if (!item.priceHistory) item.priceHistory = [];
          item.priceHistory.push({
            date: new Date().toISOString().split('T')[0],
            oldPrice: item.trade,
            newPrice: val,
          });
        }
      }

      item[col] = val;
      setState(state);
      addActivity('Item updated', `${item.name}: ${col} changed`, 'edit');
      editingCell = null;
      refresh(el);
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); saveInlineEdit(); }
      if (e.key === 'Escape') { editingCell = null; refresh(el); }
    });
    input.addEventListener('blur', () => {
      if (editingCell) saveInlineEdit();
    });
    if (input.tagName === 'SELECT') {
      input.addEventListener('change', saveInlineEdit);
    }
  });

  // Edit / Delete / Duplicate
  el.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const state = getState();
      const item = state.items.find(i => i.id === btn.dataset.id);
      if (item) showItemForm(item);
    });
  });
  el.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteItem(btn.dataset.id, el);
    });
  });
  el.querySelectorAll('.duplicate-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      duplicateItem(btn.dataset.id, el);
    });
  });

  // Pagination
  el.querySelector('#page-prev')?.addEventListener('click', () => { if (currentPage > 1) { currentPage--; refresh(el); } });
  el.querySelector('#page-next')?.addEventListener('click', () => {
    const total = getTotalPages(getFilteredSortedItems());
    if (currentPage < total) { currentPage++; refresh(el); }
  });
  el.querySelectorAll('.page-num').forEach(btn => {
    btn.addEventListener('click', () => { currentPage = parseInt(btn.dataset.page); refresh(el); });
  });

  // Bulk actions
  el.querySelector('#bulk-status-btn')?.addEventListener('click', () => showBulkStatusChange(el));
  el.querySelector('#bulk-delete-btn')?.addEventListener('click', () => bulkDelete(el));
  el.querySelector('#bulk-invoice-btn')?.addEventListener('click', () => bulkCreateInvoice(el));
  el.querySelector('#bulk-export-btn')?.addEventListener('click', () => exportSelectedCSV());
  el.querySelector('#bulk-clear-btn')?.addEventListener('click', () => { selectedIds.clear(); refresh(el); });

  // Export CSV
  el.querySelector('#export-csv-btn')?.addEventListener('click', () => exportAllCSV());

  // Breakdown toggles
  el.querySelectorAll('.toggle-breakdown').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      if (target) {
        const isHidden = target.style.display === 'none';
        target.style.display = isHidden ? 'block' : 'none';
        btn.innerHTML = `${isHidden ? icons.chevronDown : icons.chevronRight} ${btn.textContent.trim()}`;
      }
    });
  });

  // Kanban drag & drop
  if (viewType === 'kanban') {
    mountKanbanDragDrop(el);
  }

  // Keyboard shortcuts
  const keyHandler = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    if (document.querySelector('.modal-backdrop')) return;

    if (e.key === 'n' || e.key === 'N') { e.preventDefault(); showItemForm(); }
    if (e.key === 'e' || e.key === 'E') {
      if (selectedIds.size === 1) {
        e.preventDefault();
        const id = [...selectedIds][0];
        const state = getState();
        const item = state.items.find(i => i.id === id);
        if (item) showItemForm(item);
      }
    }
    if (e.key === 'Delete') {
      if (selectedIds.size > 0) {
        e.preventDefault();
        bulkDelete(el);
      }
    }
  };
  document.addEventListener('keydown', keyHandler);
  el._keyHandler = keyHandler;
}

export function destroy() {
  if (rootEl?._keyHandler) {
    document.removeEventListener('keydown', rootEl._keyHandler);
  }
  rootEl = null;
}

function mountKanbanDragDrop(el) {
  let draggedId = null;

  el.querySelectorAll('.kanban-card').forEach(card => {
    card.addEventListener('dragstart', (e) => {
      draggedId = card.dataset.id;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      draggedId = null;
      el.querySelectorAll('.kanban-cards').forEach(col => col.classList.remove('drag-over'));
    });
  });

  el.querySelectorAll('.kanban-cards').forEach(col => {
    col.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      col.classList.add('drag-over');
    });
    col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
    col.addEventListener('drop', (e) => {
      e.preventDefault();
      col.classList.remove('drag-over');
      if (!draggedId) return;
      const newStatus = col.dataset.status;
      const state = getState();
      const item = state.items.find(i => i.id === draggedId);
      if (item && item.status !== newStatus) {
        item.status = newStatus;
        addActivity('Status changed', `${item.name} moved to ${newStatus}`, 'edit');
        setState(state);
        showToast(`${item.name} moved to ${newStatus}`);
        refresh(el);
      }
    });
  });
}

function refresh(el) {
  el.innerHTML = render();
  mount(el);
}

// --- Item Form ---
function showItemForm(existing = null) {
  const project = getActiveProject();
  const state = getState();
  const suppliers = state.suppliers.map(s => s.name).sort();
  const rooms = project ? project.rooms : [];
  const isEdit = !!existing;

  const body = `
    <form id="item-form" class="form-grid">
      <div class="form-group full">
        <label>Item Name <span class="required">*</span></label>
        <input type="text" name="name" value="${existing ? escHtml(existing.name) : ''}" required placeholder="e.g. Velvet Sofa — Emerald" />
        <span class="form-error" id="err-name"></span>
      </div>
      <div class="form-group">
        <label>Supplier</label>
        <div class="typeahead-wrap">
          <input type="text" name="supplier" id="supplier-input" value="${existing ? escHtml(existing.supplier) : ''}" autocomplete="off" placeholder="Type to search..." />
          <div class="typeahead-dropdown" id="supplier-dropdown" style="display:none;"></div>
        </div>
      </div>
      <div class="form-group">
        <label>Room</label>
        <select name="room">
          ${rooms.map(r => `<option value="${r}" ${existing?.room === r ? 'selected' : ''}>${r}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Trade Price (£) <span class="required">*</span></label>
        <input type="number" name="trade" value="${existing ? existing.trade : ''}" min="0.01" step="0.01" required placeholder="0.00" />
        <span class="form-error" id="err-trade"></span>
      </div>
      <div class="form-group">
        <label>Markup (%)</label>
        <input type="number" name="markup" value="${existing ? existing.markup : state.settings.defaultMarkup}" min="0" max="200" step="1" />
        <span class="form-error" id="err-markup"></span>
      </div>
      <div class="form-group">
        <label>Client Price</label>
        <div class="calc-price" id="calc-price">${existing ? formatCurrency(existing.trade * (1 + existing.markup / 100)) : '—'}</div>
      </div>
      <div class="form-group">
        <label>Category</label>
        <select name="category">
          ${CATEGORIES.map(c => `<option value="${c}" ${existing?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Status</label>
        <select name="status">
          ${STATUSES.map(s => `<option value="${s}" ${existing?.status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group full">
        <label>Notes</label>
        <textarea name="notes" rows="2" placeholder="Any details, specs, or instructions...">${existing ? escHtml(existing.notes || '') : ''}</textarea>
      </div>
      <div class="form-group full">
        <label>Item Photo</label>
        <div class="image-upload-area" id="image-upload-area">
          ${existing?.imageUrl ? `<img src="${existing.imageUrl}" class="image-preview" id="image-preview" />` : '<span class="text-muted">Click or drag to upload an image</span>'}
          <input type="file" name="image" id="image-file-input" accept="image/*" style="display:none;" />
        </div>
      </div>
    </form>
  `;

  showModal(isEdit ? 'Edit Item' : 'Add Item', body, [
    { id: 'cancel', label: 'Cancel', onClick: () => {} },
    { id: 'save', label: isEdit ? 'Save Changes' : 'Add Item', primary: true, onClick: () => saveItem(existing?.id) },
  ]);

  // Wire up interactive elements after modal renders
  setTimeout(() => {
    const form = document.getElementById('item-form');
    if (!form) return;

    // Live price calc
    const tradeInput = form.querySelector('[name="trade"]');
    const markupInput = form.querySelector('[name="markup"]');
    const priceEl = document.getElementById('calc-price');
    const updatePrice = () => {
      const t = parseFloat(tradeInput.value) || 0;
      const m = parseFloat(markupInput.value) || 0;
      priceEl.textContent = formatCurrency(t * (1 + m / 100));
    };
    tradeInput.addEventListener('input', updatePrice);
    markupInput.addEventListener('input', updatePrice);

    // Supplier typeahead
    const supplierInput = document.getElementById('supplier-input');
    const supplierDropdown = document.getElementById('supplier-dropdown');
    supplierInput.addEventListener('input', () => {
      const val = supplierInput.value.toLowerCase();
      if (!val) { supplierDropdown.style.display = 'none'; return; }
      const matches = suppliers.filter(s => s.toLowerCase().includes(val));
      if (matches.length === 0) { supplierDropdown.style.display = 'none'; return; }
      supplierDropdown.innerHTML = matches.map(s => `<div class="typeahead-option" data-value="${escHtml(s)}">${escHtml(s)}</div>`).join('');
      supplierDropdown.style.display = 'block';
      supplierDropdown.querySelectorAll('.typeahead-option').forEach(opt => {
        opt.addEventListener('click', () => {
          supplierInput.value = opt.dataset.value;
          supplierDropdown.style.display = 'none';
        });
      });
    });
    supplierInput.addEventListener('blur', () => {
      setTimeout(() => { supplierDropdown.style.display = 'none'; }, 200);
    });

    // Auto-suggest room based on category
    const catSelect = form.querySelector('[name="category"]');
    const roomSelect = form.querySelector('[name="room"]');
    if (!existing) {
      catSelect.addEventListener('change', () => {
        const cat = catSelect.value;
        const state = getState();
        const project = getActiveProject();
        if (!project) return;
        const itemsOfCat = state.items.filter(i => i.projectId === project.id && i.category === cat);
        if (itemsOfCat.length > 0) {
          // Suggest most common room for this category
          const roomCounts = {};
          itemsOfCat.forEach(i => { roomCounts[i.room] = (roomCounts[i.room] || 0) + 1; });
          const topRoom = Object.entries(roomCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
          if (topRoom) {
            roomSelect.value = topRoom;
          }
        }
      });
    }

    // Image upload
    const imageUploadArea = document.getElementById('image-upload-area');
    const imageFileInput = document.getElementById('image-file-input');
    imageUploadArea.addEventListener('click', () => imageFileInput.click());
    imageUploadArea.addEventListener('dragover', (e) => { e.preventDefault(); imageUploadArea.classList.add('drag-active'); });
    imageUploadArea.addEventListener('dragleave', () => imageUploadArea.classList.remove('drag-active'));
    imageUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      imageUploadArea.classList.remove('drag-active');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) handleImageFile(file, imageUploadArea);
    });
    imageFileInput.addEventListener('change', () => {
      if (imageFileInput.files[0]) handleImageFile(imageFileInput.files[0], imageUploadArea);
    });
  }, 150);
}

function handleImageFile(file, container) {
  // Validate file type before reading
  if (!file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const url = e.target.result;
    // Only allow data: image URIs to prevent javascript: injection
    if (!url || !(/^data:image\//.test(url))) return;
    container.innerHTML = `<img src="${url}" class="image-preview" id="image-preview" /><input type="file" name="image" id="image-file-input" accept="image/*" style="display:none;" />`;
    container.dataset.imageUrl = url;
  };
  reader.readAsDataURL(file);
}

function saveItem(existingId) {
  const form = document.getElementById('item-form');
  if (!form) return;
  const fd = new FormData(form);
  const project = getActiveProject();
  const state = getState();

  const name = fd.get('name')?.trim();
  const trade = parseFloat(fd.get('trade'));
  const markup = parseFloat(fd.get('markup')) || 0;

  // Validation
  let valid = true;
  const errName = document.getElementById('err-name');
  const errTrade = document.getElementById('err-trade');
  const errMarkup = document.getElementById('err-markup');

  if (!name) {
    if (errName) errName.textContent = 'Item name is required';
    valid = false;
  } else if (errName) errName.textContent = '';

  if (isNaN(trade) || trade <= 0) {
    if (errTrade) errTrade.textContent = 'Trade price must be positive';
    valid = false;
  } else if (errTrade) errTrade.textContent = '';

  if (markup < 0 || markup > 200) {
    if (errMarkup) errMarkup.textContent = 'Markup must be 0–200%';
    valid = false;
  } else if (errMarkup) errMarkup.textContent = '';

  if (!valid) return;

  const imageUploadArea = document.getElementById('image-upload-area');
  const imageUrl = imageUploadArea?.dataset?.imageUrl || (existingId ? state.items.find(i => i.id === existingId)?.imageUrl : null);

  const data = {
    name,
    supplier: fd.get('supplier') || '',
    room: fd.get('room') || '',
    trade,
    markup,
    category: fd.get('category') || '',
    status: fd.get('status') || 'spec',
    notes: fd.get('notes') || '',
    projectId: project.id,
    imageUrl: imageUrl || null,
  };

  if (existingId) {
    const idx = state.items.findIndex(i => i.id === existingId);
    if (idx >= 0) {
      const oldItem = state.items[idx];
      // Track price history
      if (oldItem.trade !== data.trade) {
        if (!oldItem.priceHistory) oldItem.priceHistory = [];
        oldItem.priceHistory.push({
          date: new Date().toISOString().split('T')[0],
          oldPrice: oldItem.trade,
          newPrice: data.trade,
        });
        data.priceHistory = oldItem.priceHistory;
      } else {
        data.priceHistory = oldItem.priceHistory || [];
      }
      state.items[idx] = { ...oldItem, ...data };
    }
    addActivity('Item updated', `${data.name} updated`, 'edit');
  } else {
    data.id = generateId();
    data.priceHistory = [];
    state.items.push(data);
    addActivity('Item added', `${data.name} added to ${data.room}`, 'plus');
  }

  setState(state);
  showToast(existingId ? 'Item updated' : 'Item added');
  closeModal();
  if (rootEl) refresh(rootEl);
  else window.dispatchEvent(new HashChangeEvent('hashchange'));
}

function deleteItem(id, el) {
  const state = getState();
  const item = state.items.find(i => i.id === id);
  if (!item) return;

  // Store for undo
  lastDeletedItem = { ...item };
  if (deleteUndoTimer) clearTimeout(deleteUndoTimer);

  state.items = state.items.filter(i => i.id !== id);
  selectedIds.delete(id);
  if (expandedRowId === id) expandedRowId = null;
  addActivity('Item deleted', `${item.name} removed`, 'trash');
  setState(state);

  showToastWithUndo(`"${item.name}" deleted`, () => {
    // Undo
    const s = getState();
    s.items.push(lastDeletedItem);
    setState(s);
    lastDeletedItem = null;
    showToast('Item restored');
    refresh(el);
  });

  deleteUndoTimer = setTimeout(() => { lastDeletedItem = null; }, 5000);
  refresh(el);
}

function duplicateItem(id, el) {
  const state = getState();
  const item = state.items.find(i => i.id === id);
  if (!item) return;

  // Open form pre-filled with existing data
  const duplicate = { ...item, id: undefined, name: item.name + ' (Copy)', status: 'spec', priceHistory: [] };
  showItemForm(null);

  // After modal opens, fill in values
  setTimeout(() => {
    const form = document.getElementById('item-form');
    if (!form) return;
    form.querySelector('[name="name"]').value = duplicate.name;
    form.querySelector('[name="supplier"]').value = duplicate.supplier || '';
    const roomSel = form.querySelector('[name="room"]');
    if (roomSel) roomSel.value = duplicate.room;
    form.querySelector('[name="trade"]').value = duplicate.trade;
    form.querySelector('[name="markup"]').value = duplicate.markup;
    const catSel = form.querySelector('[name="category"]');
    if (catSel) catSel.value = duplicate.category || '';
    form.querySelector('[name="notes"]').value = duplicate.notes || '';
    // Trigger price calc
    form.querySelector('[name="trade"]').dispatchEvent(new Event('input'));
  }, 200);
}

// --- Bulk Actions ---
function showBulkStatusChange(el) {
  const body = `
    <form id="bulk-status-form">
      <div class="form-group">
        <label>New Status</label>
        <select name="status" class="filter-select" style="width:100%;">
          ${STATUSES.map(s => `<option value="${s}">${s}</option>`).join('')}
        </select>
      </div>
    </form>`;

  showModal('Change Status', body, [
    { id: 'cancel', label: 'Cancel', onClick: () => {} },
    { id: 'apply', label: `Update ${selectedIds.size} Items`, primary: true, onClick: () => {
      const form = document.getElementById('bulk-status-form');
      const newStatus = form.querySelector('[name="status"]').value;
      const state = getState();
      let count = 0;
      state.items.forEach(item => {
        if (selectedIds.has(item.id)) {
          item.status = newStatus;
          count++;
        }
      });
      addActivity('Bulk status change', `${count} items moved to ${newStatus}`, 'edit');
      setState(state);
      selectedIds.clear();
      showToast(`${count} items updated to ${newStatus}`);
      closeModal();
      refresh(el);
    }},
  ]);
}

function bulkDelete(el) {
  const count = selectedIds.size;
  const body = `<p>Are you sure you want to delete ${count} item${count > 1 ? 's' : ''}? This cannot be undone.</p>`;

  showModal('Delete Items', body, [
    { id: 'cancel', label: 'Cancel', onClick: () => {} },
    { id: 'delete', label: `Delete ${count} Items`, primary: true, onClick: () => {
      const state = getState();
      const deletedNames = [];
      state.items = state.items.filter(i => {
        if (selectedIds.has(i.id)) { deletedNames.push(i.name); return false; }
        return true;
      });
      addActivity('Bulk delete', `${count} items deleted: ${deletedNames.slice(0, 3).join(', ')}${deletedNames.length > 3 ? '...' : ''}`, 'trash');
      setState(state);
      selectedIds.clear();
      expandedRowId = null;
      showToast(`${count} items deleted`);
      closeModal();
      refresh(el);
    }},
  ]);
}

function bulkCreateInvoice(el) {
  const state = getState();
  const project = getActiveProject();
  const ids = [...selectedIds];
  const items = ids.map(id => state.items.find(i => i.id === id)).filter(Boolean);
  const total = items.reduce((s, i) => s + (i.trade || 0) * (1 + (i.markup || 0) / 100), 0);
  const vatTotal = total * (1 + (state.settings.vatRate || 20) / 100);

  const body = `<p>Create invoice for ${items.length} selected items?</p>
    <p><strong>Subtotal:</strong> ${formatCurrency(total)}<br/>
    <strong>Total (inc. VAT):</strong> ${formatCurrency(vatTotal)}</p>`;

  showModal('Create Invoice from Selection', body, [
    { id: 'cancel', label: 'Cancel', onClick: () => {} },
    { id: 'create', label: 'Create Invoice', primary: true, onClick: () => {
      const invNum = `DD-2026-${String((state.invoices?.length || 0) + 1).padStart(3, '0')}`;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      if (!state.invoices) state.invoices = [];
      state.invoices.push({
        id: generateId(),
        projectId: project.id,
        number: invNum,
        type: 'client',
        status: 'draft',
        items: ids,
        date: new Date().toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0],
        paidDate: null,
        vatRate: state.settings.vatRate || 20,
        notes: `Created from bulk selection (${items.length} items)`,
      });
      addActivity('Invoice created', `${invNum} created from ${items.length} selected items`, 'plus');
      setState(state);
      selectedIds.clear();
      showToast(`Invoice ${invNum} created`);
      closeModal();
      refresh(el);
    }},
  ]);
}

// --- CSV Export ---
function exportAllCSV() {
  const items = getFilteredSortedItems();
  downloadCSV(items, 'procurement-all');
}

function exportSelectedCSV() {
  const state = getState();
  const items = [...selectedIds].map(id => state.items.find(i => i.id === id)).filter(Boolean);
  downloadCSV(items, 'procurement-selected');
}

function downloadCSV(items, filename) {
  const headers = ['Name', 'Supplier', 'Room', 'Category', 'Trade Price', 'Markup %', 'Client Price', 'Margin', 'Status', 'Notes'];
  const rows = items.map(i => {
    const cp = (i.trade || 0) * (1 + (i.markup || 0) / 100);
    return [
      csvEscape(i.name), csvEscape(i.supplier), csvEscape(i.room), csvEscape(i.category || ''),
      i.trade.toFixed(2), i.markup, cp.toFixed(2), (cp - i.trade).toFixed(2),
      i.status, csvEscape(i.notes || '')
    ];
  });

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`Exported ${items.length} items to CSV`);
}

// --- Toast with Undo ---
function showToastWithUndo(message, undoCallback) {
  const containerEl = document.getElementById('toast-container');
  if (!containerEl) { showToast(message); return; }

  const toast = document.createElement('div');
  toast.className = 'toast toast-success';
  toast.innerHTML = `
    <span class="toast-icon">&#10003;</span>
    <span class="toast-msg">${message}</span>
    <button class="toast-undo-btn">Undo</button>
  `;
  containerEl.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));

  const undoBtn = toast.querySelector('.toast-undo-btn');
  undoBtn.addEventListener('click', () => {
    undoCallback();
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// --- Helpers ---
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function csvEscape(str) {
  if (!str) return '';
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
