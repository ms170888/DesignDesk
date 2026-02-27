// Procurement & Orders view

import { getState, setState, getActiveProject, addActivity } from '../store.js';
import { formatCurrency, generateId } from '../core/utils.js';
import { icons } from '../core/icons.js';
import { showModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

const STATUSES = ['spec', 'quoted', 'ordered', 'shipped', 'delivered', 'installed'];
const STATUS_COLORS = { spec: '#94a3b8', quoted: '#6366f1', ordered: '#f59e0b', shipped: '#3b82f6', delivered: '#10b981', installed: '#8b5cf6' };

let filterStatus = 'all';
let filterRoom = 'all';
let sortCol = 'name';
let sortDir = 1;

export function render() {
  const state = getState();
  const project = getActiveProject();
  if (!project || !state) return '<div class="empty-state"><h2>No project selected</h2></div>';

  let items = state.items.filter(i => i.projectId === project.id);

  // Get unique rooms
  const rooms = [...new Set(items.map(i => i.room))].sort();

  // Filter
  if (filterStatus !== 'all') items = items.filter(i => i.status === filterStatus);
  if (filterRoom !== 'all') items = items.filter(i => i.room === filterRoom);

  // Sort
  items.sort((a, b) => {
    let va = a[sortCol], vb = b[sortCol];
    if (sortCol === 'clientPrice') { va = a.trade * (1 + a.markup / 100); vb = b.trade * (1 + b.markup / 100); }
    if (typeof va === 'string') return va.localeCompare(vb) * sortDir;
    return (va - vb) * sortDir;
  });

  // Totals
  const allItems = state.items.filter(i => i.projectId === project.id);
  const totalTrade = allItems.reduce((s, i) => s + i.trade, 0);
  const totalClient = allItems.reduce((s, i) => s + i.trade * (1 + i.markup / 100), 0);
  const totalMargin = totalClient - totalTrade;

  // Status pipeline
  const pipeline = STATUSES.map(s => {
    const count = allItems.filter(i => i.status === s).length;
    return `<div class="pipeline-stage">
      <div class="pipeline-dot" style="background:${STATUS_COLORS[s]}"></div>
      <span class="pipeline-label">${s}</span>
      <span class="pipeline-count">${count}</span>
    </div>`;
  }).join('<div class="pipeline-arrow">&rarr;</div>');

  return `
    <div class="view-procurement">
      <div class="view-header">
        <h1>Procurement & Orders</h1>
        <button class="btn btn-primary btn-sm" id="add-item-btn">${icons.plus} Add Item</button>
      </div>

      <div class="pipeline-bar">${pipeline}</div>

      <div class="summary-bar">
        <div class="summary-item"><span class="text-muted">Total Trade</span> <strong>${formatCurrency(totalTrade)}</strong></div>
        <div class="summary-item"><span class="text-muted">Total Client</span> <strong>${formatCurrency(totalClient)}</strong></div>
        <div class="summary-item"><span class="text-muted">Gross Margin</span> <strong class="text-success">${formatCurrency(totalMargin)} (${totalClient ? Math.round(totalMargin / totalClient * 100) : 0}%)</strong></div>
      </div>

      <div class="table-controls">
        <div class="filter-group">
          <select id="filter-status" class="filter-select">
            <option value="all">All Statuses</option>
            ${STATUSES.map(s => `<option value="${s}" ${filterStatus === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
          <select id="filter-room" class="filter-select">
            <option value="all">All Rooms</option>
            ${rooms.map(r => `<option value="${r}" ${filterRoom === r ? 'selected' : ''}>${r}</option>`).join('')}
          </select>
        </div>
        <span class="text-muted">${items.length} items</span>
      </div>

      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th class="sortable" data-sort="name">Item</th>
              <th class="sortable" data-sort="supplier">Supplier</th>
              <th class="sortable" data-sort="room">Room</th>
              <th class="sortable" data-sort="trade">Trade</th>
              <th>Markup</th>
              <th class="sortable" data-sort="clientPrice">Client Price</th>
              <th class="sortable" data-sort="status">Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => {
              const clientPrice = item.trade * (1 + item.markup / 100);
              return `<tr data-id="${item.id}">
                <td class="item-name">${item.name}</td>
                <td>${item.supplier}</td>
                <td><span class="room-badge">${item.room}</span></td>
                <td>${formatCurrency(item.trade)}</td>
                <td>${item.markup}%</td>
                <td><strong>${formatCurrency(clientPrice)}</strong></td>
                <td><span class="status-badge status-${item.status}">${item.status}</span></td>
                <td class="row-actions">
                  <button class="icon-btn edit-btn" data-id="${item.id}" title="Edit">${icons.edit}</button>
                  <button class="icon-btn delete-btn" data-id="${item.id}" title="Delete">${icons.trash}</button>
                </td>
              </tr>`;
            }).join('')}
            ${items.length === 0 ? '<tr><td colspan="8" class="empty-cell">No items match your filters</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

export function mount(el) {
  // Add item
  el.querySelector('#add-item-btn')?.addEventListener('click', () => showItemForm());

  // Filters
  el.querySelector('#filter-status')?.addEventListener('change', (e) => {
    filterStatus = e.target.value;
    refresh(el);
  });
  el.querySelector('#filter-room')?.addEventListener('change', (e) => {
    filterRoom = e.target.value;
    refresh(el);
  });

  // Sort
  el.querySelectorAll('.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.sort;
      if (sortCol === col) sortDir *= -1; else { sortCol = col; sortDir = 1; }
      refresh(el);
    });
  });

  // Edit / Delete
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
}

function refresh(el) {
  el.innerHTML = render();
  mount(el);
}

function showItemForm(existing = null) {
  const project = getActiveProject();
  const state = getState();
  const suppliers = state.suppliers.map(s => s.name);
  const rooms = project ? project.rooms : [];
  const isEdit = !!existing;

  const body = `
    <form id="item-form" class="form-grid">
      <div class="form-group full">
        <label>Item Name</label>
        <input type="text" name="name" value="${existing ? existing.name : ''}" required />
      </div>
      <div class="form-group">
        <label>Supplier</label>
        <select name="supplier">
          <option value="">Select...</option>
          ${suppliers.map(s => `<option value="${s}" ${existing?.supplier === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Room</label>
        <select name="room">
          ${rooms.map(r => `<option value="${r}" ${existing?.room === r ? 'selected' : ''}>${r}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Trade Price (£)</label>
        <input type="number" name="trade" value="${existing ? existing.trade : ''}" min="0" step="0.01" required />
      </div>
      <div class="form-group">
        <label>Markup (%)</label>
        <input type="number" name="markup" value="${existing ? existing.markup : state.settings.defaultMarkup}" min="0" max="200" />
      </div>
      <div class="form-group">
        <label>Client Price</label>
        <div class="calc-price" id="calc-price">${existing ? formatCurrency(existing.trade * (1 + existing.markup / 100)) : '—'}</div>
      </div>
      <div class="form-group">
        <label>Category</label>
        <select name="category">
          ${['Furniture', 'Fabric', 'Lighting', 'Paint', 'Tiles', 'Hardware'].map(c => `<option value="${c}" ${existing?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
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
        <textarea name="notes" rows="2">${existing ? existing.notes : ''}</textarea>
      </div>
    </form>
  `;

  showModal(isEdit ? 'Edit Item' : 'Add Item', body, [
    { id: 'cancel', label: 'Cancel', onClick: () => {} },
    { id: 'save', label: isEdit ? 'Save Changes' : 'Add Item', primary: true, onClick: () => saveItem(existing?.id) },
  ]);

  // Live price calc
  setTimeout(() => {
    const form = document.getElementById('item-form');
    if (!form) return;
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
  }, 150);
}

function saveItem(existingId) {
  const form = document.getElementById('item-form');
  if (!form) return;
  const fd = new FormData(form);
  const project = getActiveProject();
  const state = getState();

  const data = {
    name: fd.get('name'),
    supplier: fd.get('supplier'),
    room: fd.get('room'),
    trade: parseFloat(fd.get('trade')) || 0,
    markup: parseFloat(fd.get('markup')) || 0,
    category: fd.get('category'),
    status: fd.get('status'),
    notes: fd.get('notes'),
    projectId: project.id,
  };

  if (!data.name) { showToast('Item name is required', 'error'); return; }

  if (existingId) {
    const idx = state.items.findIndex(i => i.id === existingId);
    if (idx >= 0) state.items[idx] = { ...state.items[idx], ...data };
    addActivity('Item updated', `${data.name} updated`, 'edit');
  } else {
    data.id = generateId();
    state.items.push(data);
    addActivity('Item added', `${data.name} added to ${data.room}`, 'plus');
  }

  setState(state);
  showToast(existingId ? 'Item updated' : 'Item added');
  closeModal();
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

function deleteItem(id, el) {
  const state = getState();
  const item = state.items.find(i => i.id === id);
  if (!item) return;
  state.items = state.items.filter(i => i.id !== id);
  addActivity('Item deleted', `${item.name} removed`, 'trash');
  setState(state);
  showToast('Item deleted');
  refresh(el);
}
