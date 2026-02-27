// Invoicing view — dual client/trade views

import { getState, setState, getActiveProject, addActivity } from '../store.js';
import { formatCurrency, formatDate, generateId } from '../core/utils.js';
import { icons } from '../core/icons.js';
import { showModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

const STATUS_COLORS = { draft: '#94a3b8', sent: '#3b82f6', paid: '#10b981', overdue: '#ef4444' };
let activeInvoice = null;
let viewMode = 'client'; // 'client' or 'trade'

export function render() {
  const state = getState();
  const project = getActiveProject();
  if (!project || !state) return '<div class="empty-state"><h2>No project selected</h2></div>';

  const invoices = state.invoices.filter(i => i.projectId === project.id);

  if (activeInvoice) return renderDetail(state, project);

  return `
    <div class="view-invoicing">
      <div class="view-header">
        <h1>Invoicing</h1>
        <button class="btn btn-primary btn-sm" id="create-invoice-btn">${icons.plus} Create Invoice</button>
      </div>

      <div class="invoice-stats">
        <div class="inv-stat"><span class="text-muted">Total Invoiced</span><strong>${formatCurrency(calcTotal(invoices, state, 'all'))}</strong></div>
        <div class="inv-stat"><span class="text-muted">Paid</span><strong class="text-success">${formatCurrency(calcTotal(invoices.filter(i => i.status === 'paid'), state, 'all'))}</strong></div>
        <div class="inv-stat"><span class="text-muted">Outstanding</span><strong>${formatCurrency(calcTotal(invoices.filter(i => ['sent', 'overdue'].includes(i.status)), state, 'all'))}</strong></div>
        <div class="inv-stat"><span class="text-muted">Overdue</span><strong class="text-error">${formatCurrency(calcTotal(invoices.filter(i => i.status === 'overdue'), state, 'all'))}</strong></div>
      </div>

      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Date</th>
              <th>Due</th>
              <th>Items</th>
              <th>Total (inc. VAT)</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${invoices.map(inv => {
              const total = calcInvoiceTotal(inv, state);
              return `<tr class="clickable-row" data-id="${inv.id}">
                <td><strong>${inv.number}</strong></td>
                <td>${formatDate(inv.date)}</td>
                <td>${inv.dueDate ? formatDate(inv.dueDate) : '—'}</td>
                <td>${inv.items.length} items</td>
                <td>${formatCurrency(total)}</td>
                <td><span class="status-badge" style="background:${STATUS_COLORS[inv.status]}20;color:${STATUS_COLORS[inv.status]}">${inv.status}</span></td>
                <td class="row-actions">
                  ${inv.status === 'draft' ? `<button class="icon-btn send-btn" data-id="${inv.id}" title="Mark as Sent">${icons.send}</button>` : ''}
                  ${inv.status === 'sent' || inv.status === 'overdue' ? `<button class="icon-btn pay-btn" data-id="${inv.id}" title="Mark as Paid">${icons.check}</button>` : ''}
                </td>
              </tr>`;
            }).join('')}
            ${invoices.length === 0 ? '<tr><td colspan="7" class="empty-cell">No invoices yet</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderDetail(state, project) {
  const inv = state.invoices.find(i => i.id === activeInvoice);
  if (!inv) { activeInvoice = null; return render(); }

  const items = inv.items.map(id => state.items.find(i => i.id === id)).filter(Boolean);
  const isClient = viewMode === 'client';

  const subtotal = items.reduce((s, i) => s + (isClient ? i.trade * (1 + i.markup / 100) : i.trade), 0);
  const vat = subtotal * (inv.vatRate / 100);
  const total = subtotal + vat;

  return `
    <div class="view-invoicing">
      <div class="view-header">
        <button class="btn btn-outline btn-sm" id="back-btn">&larr; All Invoices</button>
        <div class="view-toggle">
          <button class="toggle-btn ${viewMode === 'client' ? 'active' : ''}" data-mode="client">Client View</button>
          <button class="toggle-btn ${viewMode === 'trade' ? 'active' : ''}" data-mode="trade">Trade View</button>
        </div>
        <button class="btn btn-outline btn-sm" onclick="window.print()">${icons.printer} Print</button>
      </div>

      <div class="invoice-detail ${isClient ? 'invoice-client' : 'invoice-trade'}">
        <div class="invoice-header-detail">
          <div>
            <h2>${inv.number}</h2>
            <p class="text-muted">${inv.notes || ''}</p>
          </div>
          <div class="invoice-meta">
            <div><span class="text-muted">Date:</span> ${formatDate(inv.date)}</div>
            <div><span class="text-muted">Due:</span> ${inv.dueDate ? formatDate(inv.dueDate) : 'TBD'}</div>
            <div><span class="text-muted">Status:</span> <span class="status-badge" style="background:${STATUS_COLORS[inv.status]}20;color:${STATUS_COLORS[inv.status]}">${inv.status}</span></div>
          </div>
        </div>

        ${isClient ? `
          <div class="invoice-brand">
            <h3>DesignDesk Studio</h3>
            <p class="text-muted">42 Kings Road, London SW3 4ND</p>
          </div>
          <div class="invoice-client-info">
            <p><strong>To:</strong> ${project.client}</p>
            <p>${project.address}</p>
          </div>
        ` : `<div class="trade-warning">Trade View — margins visible. Do not share with client.</div>`}

        <table class="invoice-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Room</th>
              ${!isClient ? '<th>Trade Price</th><th>Markup</th>' : ''}
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => {
              const clientPrice = item.trade * (1 + item.markup / 100);
              return `<tr>
                <td>${item.name}</td>
                <td>${item.room}</td>
                ${!isClient ? `<td>${formatCurrency(item.trade)}</td><td>${item.markup}%</td>` : ''}
                <td>${formatCurrency(isClient ? clientPrice : item.trade)}</td>
              </tr>`;
            }).join('')}
          </tbody>
          <tfoot>
            <tr><td colspan="${isClient ? 2 : 4}" class="text-right">Subtotal</td><td>${formatCurrency(subtotal)}</td></tr>
            <tr><td colspan="${isClient ? 2 : 4}" class="text-right">VAT (${inv.vatRate}%)</td><td>${formatCurrency(vat)}</td></tr>
            <tr class="total-row"><td colspan="${isClient ? 2 : 4}" class="text-right"><strong>Total</strong></td><td><strong>${formatCurrency(total)}</strong></td></tr>
            ${!isClient ? `<tr class="margin-row"><td colspan="4" class="text-right text-success">Margin</td><td class="text-success"><strong>${formatCurrency(items.reduce((s, i) => s + i.trade * i.markup / 100, 0))}</strong></td></tr>` : ''}
          </tfoot>
        </table>

        ${isClient ? '<p class="invoice-footer-text text-muted">Payment terms: 30 days. Bank details provided separately.</p>' : ''}
      </div>
    </div>
  `;
}

export function mount(el) {
  // Invoice list clicks
  el.querySelectorAll('.clickable-row').forEach(row => {
    row.addEventListener('click', () => {
      activeInvoice = row.dataset.id;
      el.innerHTML = render();
      mount(el);
    });
  });

  // Back button
  el.querySelector('#back-btn')?.addEventListener('click', () => {
    activeInvoice = null;
    el.innerHTML = render();
    mount(el);
  });

  // View toggle
  el.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      viewMode = btn.dataset.mode;
      el.innerHTML = render();
      mount(el);
    });
  });

  // Status actions
  el.querySelectorAll('.send-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      updateInvoiceStatus(btn.dataset.id, 'sent', el);
    });
  });
  el.querySelectorAll('.pay-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      updateInvoiceStatus(btn.dataset.id, 'paid', el);
    });
  });

  // Create invoice
  el.querySelector('#create-invoice-btn')?.addEventListener('click', () => showCreateInvoice(el));
}

export function destroy() { activeInvoice = null; viewMode = 'client'; }

function updateInvoiceStatus(id, newStatus, el) {
  const state = getState();
  const inv = state.invoices.find(i => i.id === id);
  if (!inv) return;
  inv.status = newStatus;
  if (newStatus === 'paid') inv.paidDate = new Date().toISOString().split('T')[0];
  addActivity(`Invoice ${newStatus}`, `${inv.number} marked as ${newStatus}`, 'check');
  setState(state);
  showToast(`Invoice ${newStatus}`);
  el.innerHTML = render();
  mount(el);
}

function showCreateInvoice(el) {
  const state = getState();
  const project = getActiveProject();
  const uninvoicedItems = state.items.filter(i =>
    i.projectId === project.id &&
    !state.invoices.some(inv => inv.items.includes(i.id))
  );

  const body = `
    <form id="invoice-form" class="form-grid">
      <div class="form-group full">
        <label>Select Items</label>
        <div class="checkbox-list">
          ${uninvoicedItems.map(item => `
            <label class="checkbox-item">
              <input type="checkbox" name="items" value="${item.id}" />
              <span>${item.name} — ${formatCurrency(item.trade * (1 + item.markup / 100))}</span>
            </label>
          `).join('')}
          ${uninvoicedItems.length === 0 ? '<p class="text-muted">All items are already invoiced</p>' : ''}
        </div>
      </div>
      <div class="form-group">
        <label>Invoice Date</label>
        <input type="date" name="date" value="${new Date().toISOString().split('T')[0]}" />
      </div>
      <div class="form-group">
        <label>Notes</label>
        <input type="text" name="notes" placeholder="Optional notes..." />
      </div>
    </form>
  `;

  showModal('Create Invoice', body, [
    { id: 'cancel', label: 'Cancel', onClick: () => {} },
    { id: 'create', label: 'Create Invoice', primary: true, onClick: () => {
      const form = document.getElementById('invoice-form');
      const checked = [...form.querySelectorAll('[name="items"]:checked')].map(cb => cb.value);
      if (checked.length === 0) { showToast('Select at least one item', 'error'); return; }

      const invNum = `DD-2026-${String(state.invoices.length + 1).padStart(3, '0')}`;
      const dueDate = new Date(form.querySelector('[name="date"]').value);
      dueDate.setDate(dueDate.getDate() + 30);

      state.invoices.push({
        id: generateId(),
        projectId: project.id,
        number: invNum,
        type: 'client',
        status: 'draft',
        items: checked,
        date: form.querySelector('[name="date"]').value,
        dueDate: dueDate.toISOString().split('T')[0],
        paidDate: null,
        vatRate: state.settings.vatRate,
        notes: form.querySelector('[name="notes"]').value,
      });

      addActivity('Invoice created', `${invNum} created with ${checked.length} items`, 'plus');
      setState(state);
      showToast('Invoice created');
      closeModal();
      el.innerHTML = render();
      mount(el);
    }},
  ]);
}

function calcInvoiceTotal(inv, state) {
  const items = inv.items.map(id => state.items.find(i => i.id === id)).filter(Boolean);
  const subtotal = items.reduce((s, i) => s + i.trade * (1 + i.markup / 100), 0);
  return subtotal * (1 + inv.vatRate / 100);
}

function calcTotal(invoices, state, mode) {
  return invoices.reduce((s, inv) => s + calcInvoiceTotal(inv, state), 0);
}
