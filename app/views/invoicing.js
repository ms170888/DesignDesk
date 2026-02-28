// Invoicing view — Production Quality with dual client/trade views, credit notes, reporting

import { getState, setState, getActiveProject, addActivity } from '../store.js';
import { formatCurrency, formatDate, generateId, debounce } from '../core/utils.js';
import { icons } from '../core/icons.js';
import { showModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

const STATUS_COLORS = { draft: '#94a3b8', sent: '#3b82f6', paid: '#10b981', overdue: '#ef4444', 'credit-note': '#a855f7' };
const PAYMENT_TERMS = [
  { label: 'Due on Receipt', days: 0 },
  { label: 'Net 14', days: 14 },
  { label: 'Net 30', days: 30 },
  { label: 'Net 60', days: 60 },
];

// Module state
let activeInvoice = null;
let viewMode = 'client'; // 'client' | 'trade'
let listFilter = 'all'; // 'all' | 'draft' | 'sent' | 'paid' | 'overdue' | 'credit-note'
let listSort = { col: 'date', dir: -1 };
let searchQuery = '';
let activeTab = 'list'; // 'list' | 'reporting'
let rootEl = null;

// --- Helpers ---
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function daysBetween(dateStr1, dateStr2) {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function calcInvoiceSubtotal(inv, state, useClientPrices = true) {
  let total = 0;
  // From procurement items
  if (inv.items && inv.items.length) {
    const items = inv.items.map(id => state.items.find(i => i.id === id)).filter(Boolean);
    total += items.reduce((s, i) => {
      if (useClientPrices) return s + (i.trade || 0) * (1 + (i.markup || 0) / 100);
      return s + (i.trade || 0);
    }, 0);
  }
  // Progress payment percentage
  if (inv.isProgressPayment && inv.progressPercent) {
    total = total * (inv.progressPercent / 100);
  }
  // Custom line items
  if (inv.customItems && inv.customItems.length) {
    total += inv.customItems.reduce((s, ci) => s + (ci.amount || 0), 0);
  }
  return total;
}

function calcInvoiceVAT(inv, state) {
  return calcInvoiceSubtotal(inv, state) * ((inv.vatRate || 0) / 100);
}

function calcInvoiceTotal(inv, state) {
  const sub = calcInvoiceSubtotal(inv, state);
  return sub + sub * ((inv.vatRate || 0) / 100);
}

function calcTradeSubtotal(inv, state) {
  return calcInvoiceSubtotal(inv, state, false);
}

function getInvoices() {
  const state = getState();
  const project = getActiveProject();
  if (!state || !project) return [];
  return (state.invoices || []).filter(i => i.projectId === project.id);
}

function getFilteredInvoices() {
  let invoices = getInvoices();

  // Status filter
  if (listFilter !== 'all') {
    invoices = invoices.filter(i => i.status === listFilter);
  }

  // Search
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    invoices = invoices.filter(i =>
      i.number.toLowerCase().includes(q) ||
      (i.notes || '').toLowerCase().includes(q)
    );
  }

  // Sort
  invoices.sort((a, b) => {
    let va = a[listSort.col];
    let vb = b[listSort.col];
    if (listSort.col === 'total') {
      const state = getState();
      va = calcInvoiceTotal(a, state);
      vb = calcInvoiceTotal(b, state);
    }
    if (va == null) va = '';
    if (vb == null) vb = '';
    if (typeof va === 'string') return va.localeCompare(vb) * listSort.dir;
    return ((va || 0) - (vb || 0)) * listSort.dir;
  });

  return invoices;
}

function getNextInvoiceNumber(state) {
  const existing = (state.invoices || []).map(i => {
    const match = i.number.match(/(\d+)$/);
    return match ? parseInt(match[1]) : 0;
  });
  const maxNum = existing.length > 0 ? Math.max(...existing) : 0;
  return `DD-2026-${String(maxNum + 1).padStart(3, '0')}`;
}

// --- Render ---
export function render() {
  const state = getState();
  const project = getActiveProject();
  if (!project || !state) {
    return `<div class="empty-state">
      <div class="empty-state-icon">${icons.invoicing}</div>
      <h2>No project selected</h2>
      <p class="text-muted">Select a project to manage invoices.</p>
    </div>`;
  }

  if (activeInvoice) return renderDetail(state, project);
  if (activeTab === 'reporting') return renderReporting(state, project);
  return renderList(state, project);
}

// --- Invoice List ---
function renderList(state, project) {
  const allInvoices = getInvoices();
  const filteredInvoices = getFilteredInvoices();

  // Running totals
  const totalInvoiced = allInvoices.reduce((s, i) => s + calcInvoiceTotal(i, state), 0);
  const totalPaid = allInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + calcInvoiceTotal(i, state), 0);
  const totalOutstanding = allInvoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + calcInvoiceTotal(i, state), 0);
  const totalOverdue = allInvoices.filter(i => i.status === 'overdue').reduce((s, i) => s + calcInvoiceTotal(i, state), 0);
  const totalCredits = allInvoices.filter(i => i.status === 'credit-note').reduce((s, i) => s + calcInvoiceTotal(i, state), 0);

  // Status tab counts
  const counts = { all: allInvoices.length };
  ['draft', 'sent', 'paid', 'overdue', 'credit-note'].forEach(s => {
    counts[s] = allInvoices.filter(i => i.status === s).length;
  });

  const sortArrow = (col) => {
    if (listSort.col === col) return listSort.dir === 1 ? ' &uarr;' : ' &darr;';
    return '';
  };

  return `
    <div class="view-invoicing">
      <div class="view-header">
        <h1>Invoicing</h1>
        <div class="view-header-actions">
          <button class="btn btn-ghost btn-sm ${activeTab === 'list' ? 'active' : ''}" id="tab-list-btn">${icons.grid} Invoices</button>
          <button class="btn btn-ghost btn-sm ${activeTab === 'reporting' ? 'active' : ''}" id="tab-report-btn">${icons.dashboard} Reports</button>
          <button class="btn btn-primary btn-sm" id="create-invoice-btn">${icons.plus} Create Invoice</button>
        </div>
      </div>

      <div class="invoice-stats">
        <div class="inv-stat"><span class="text-muted">Total Invoiced</span><strong>${formatCurrency(totalInvoiced)}</strong></div>
        <div class="inv-stat"><span class="text-muted">Paid</span><strong class="text-success">${formatCurrency(totalPaid)}</strong></div>
        <div class="inv-stat"><span class="text-muted">Outstanding</span><strong>${formatCurrency(totalOutstanding)}</strong></div>
        <div class="inv-stat"><span class="text-muted">Overdue</span><strong class="text-error">${formatCurrency(totalOverdue)}</strong></div>
        ${totalCredits > 0 ? `<div class="inv-stat"><span class="text-muted">Credits</span><strong style="color:var(--accent)">-${formatCurrency(totalCredits)}</strong></div>` : ''}
      </div>

      <div class="invoice-tabs">
        ${['all', 'draft', 'sent', 'paid', 'overdue', 'credit-note'].map(s => `
          <button class="tab-btn ${listFilter === s ? 'active' : ''}" data-filter="${s}">
            ${s === 'credit-note' ? 'Credit Notes' : s.charAt(0).toUpperCase() + s.slice(1)} ${counts[s] ? `<span class="tab-count">${counts[s]}</span>` : ''}
          </button>
        `).join('')}
      </div>

      <div class="table-controls" style="margin-bottom:12px;">
        <div class="search-input-wrap">
          ${icons.search}
          <input type="text" id="invoice-search" class="search-input" placeholder="Search invoices..." value="${escHtml(searchQuery)}" />
        </div>
      </div>

      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th class="sortable" data-sort="number">Invoice #${sortArrow('number')}</th>
              <th class="sortable" data-sort="date">Date${sortArrow('date')}</th>
              <th class="sortable" data-sort="dueDate">Due${sortArrow('dueDate')}</th>
              <th>Items</th>
              <th class="sortable text-right" data-sort="total">Total (inc. VAT)${sortArrow('total')}</th>
              <th class="sortable" data-sort="status">Status${sortArrow('status')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${filteredInvoices.map(inv => {
              const total = calcInvoiceTotal(inv, state);
              const isOverdue = inv.status === 'overdue' || (inv.status === 'sent' && inv.dueDate && new Date(inv.dueDate) < new Date());
              const daysPast = isOverdue && inv.dueDate ? daysBetween(inv.dueDate, today()) : 0;
              const isCreditNote = inv.status === 'credit-note';

              return `<tr class="clickable-row ${isOverdue ? 'row-overdue' : ''}" data-id="${inv.id}">
                <td><strong>${isCreditNote ? 'CN-' : ''}${escHtml(inv.number)}</strong></td>
                <td>${formatDate(inv.date)}</td>
                <td>
                  ${inv.dueDate ? formatDate(inv.dueDate) : '—'}
                  ${isOverdue && daysPast > 0 ? `<span class="overdue-badge">${daysPast}d overdue</span>` : ''}
                </td>
                <td>${(inv.items?.length || 0) + (inv.customItems?.length || 0)} items</td>
                <td class="text-right ${isCreditNote ? 'text-error' : ''}"><strong>${isCreditNote ? '-' : ''}${formatCurrency(total)}</strong></td>
                <td><span class="status-badge" style="background:${STATUS_COLORS[inv.status]}20;color:${STATUS_COLORS[inv.status]}">${inv.status === 'credit-note' ? 'Credit Note' : inv.status}</span></td>
                <td class="row-actions">
                  ${inv.status === 'draft' ? `<button class="icon-btn send-btn" data-id="${inv.id}" title="Mark as Sent">${icons.send}</button>` : ''}
                  ${inv.status === 'sent' || inv.status === 'overdue' ? `<button class="icon-btn pay-btn" data-id="${inv.id}" title="Record Payment">${icons.check}</button>` : ''}
                  ${inv.status !== 'credit-note' ? `<button class="icon-btn credit-btn" data-id="${inv.id}" title="Create Credit Note">${icons.reset}</button>` : ''}
                </td>
              </tr>`;
            }).join('')}
            ${filteredInvoices.length === 0 ? '<tr><td colspan="7" class="empty-cell">No invoices match your filters</td></tr>' : ''}
          </tbody>
          <tfoot>
            <tr class="footer-totals">
              <td colspan="4" class="text-right"><strong>Totals:</strong></td>
              <td class="text-right"><strong>${formatCurrency(filteredInvoices.reduce((s, i) => s + calcInvoiceTotal(i, state) * (i.status === 'credit-note' ? -1 : 1), 0))}</strong></td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>`;
}

// --- Invoice Detail ---
function renderDetail(state, project) {
  const inv = state.invoices.find(i => i.id === activeInvoice);
  if (!inv) { activeInvoice = null; return render(); }

  const items = (inv.items || []).map(id => state.items.find(i => i.id === id)).filter(Boolean);
  const customItems = inv.customItems || [];
  const isClient = viewMode === 'client';
  const isCreditNote = inv.status === 'credit-note';
  const isPaid = inv.status === 'paid';

  const subtotal = calcInvoiceSubtotal(inv, state, true);
  const tradeTotal = calcInvoiceSubtotal(inv, state, false);
  const vat = subtotal * ((inv.vatRate || 0) / 100);
  const total = subtotal + vat;
  const margin = subtotal - tradeTotal;

  const footerColspan = isClient ? 2 : 4;

  return `
    <div class="view-invoicing">
      <div class="view-header no-print">
        <button class="btn btn-outline btn-sm" id="back-btn">&larr; All Invoices</button>
        <div class="view-toggle">
          <button class="toggle-btn ${viewMode === 'client' ? 'active' : ''}" data-mode="client">${icons.eye} Client View</button>
          <button class="toggle-btn ${viewMode === 'trade' ? 'active' : ''}" data-mode="trade">${icons.edit} Trade View</button>
        </div>
        <div class="detail-actions">
          ${inv.status === 'draft' ? `<button class="btn btn-outline btn-sm" id="edit-invoice-btn">${icons.edit} Edit</button>` : ''}
          <button class="btn btn-outline btn-sm" id="print-btn">${icons.printer} Print</button>
        </div>
      </div>

      <div class="invoice-detail ${isClient ? 'invoice-client' : 'invoice-trade'}" id="invoice-printable">
        ${isPaid ? '<div class="paid-watermark">PAID</div>' : ''}
        ${isCreditNote ? '<div class="credit-note-watermark">CREDIT NOTE</div>' : ''}

        ${!isClient ? '<div class="trade-warning no-print">Trade View — margins visible. Do not share with client.</div>' : ''}

        <div class="invoice-brand-header">
          <div class="invoice-brand-left">
            <div class="invoice-logo-placeholder">DD</div>
            <div>
              <h2 class="invoice-company-name">${escHtml(state.settings?.companyName || 'DesignDesk Studio')}</h2>
              <p class="text-muted text-sm">42 Kings Road, London SW3 4ND</p>
              <p class="text-muted text-sm">VAT Reg: GB 123 4567 89</p>
              <p class="text-muted text-sm">Company No: 12345678</p>
            </div>
          </div>
          <div class="invoice-title-block">
            <h1 class="invoice-title">${isCreditNote ? 'Credit Note' : 'Invoice'}</h1>
            <div class="invoice-number">${isCreditNote ? 'CN-' : ''}${escHtml(inv.number)}</div>
          </div>
        </div>

        <div class="invoice-parties">
          <div class="invoice-from">
            <span class="text-muted text-xs">From</span>
            <p><strong>${escHtml(state.settings?.companyName || 'DesignDesk Studio')}</strong></p>
            <p class="text-muted text-sm">42 Kings Road, London SW3 4ND</p>
            <p class="text-muted text-sm">hello@designdesk.studio</p>
          </div>
          <div class="invoice-to">
            <span class="text-muted text-xs">Bill To</span>
            <p><strong>${escHtml(project.client)}</strong></p>
            <p class="text-muted text-sm">${escHtml(project.address)}</p>
            <p class="text-muted text-sm">Project: ${escHtml(project.name)}</p>
          </div>
          <div class="invoice-dates">
            <div><span class="text-muted">Invoice Date:</span> ${formatDate(inv.date)}</div>
            <div><span class="text-muted">Due Date:</span> ${inv.dueDate ? formatDate(inv.dueDate) : 'TBD'}</div>
            <div><span class="text-muted">Payment Terms:</span> ${inv.paymentTerms || 'Net 30'}</div>
            <div><span class="text-muted">Status:</span> <span class="status-badge" style="background:${STATUS_COLORS[inv.status]}20;color:${STATUS_COLORS[inv.status]}">${inv.status === 'credit-note' ? 'Credit Note' : inv.status}</span></div>
            ${inv.paidDate ? `<div><span class="text-muted">Paid:</span> ${formatDate(inv.paidDate)}</div>` : ''}
            ${inv.paymentMethod ? `<div><span class="text-muted">Method:</span> ${escHtml(inv.paymentMethod)}</div>` : ''}
            ${inv.paymentReference ? `<div><span class="text-muted">Ref:</span> ${escHtml(inv.paymentReference)}</div>` : ''}
          </div>
        </div>

        ${inv.isProgressPayment ? `<div class="progress-payment-banner">Progress Payment: ${inv.progressPercent}% of total</div>` : ''}

        <table class="invoice-table">
          <thead>
            <tr>
              <th style="width:40px;">#</th>
              <th>Description</th>
              <th>Room</th>
              ${!isClient ? '<th class="text-right">Trade Price</th><th class="text-right">Markup</th><th class="text-right">Margin</th>' : ''}
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, idx) => {
              const clientPrice = (item.trade || 0) * (1 + (item.markup || 0) / 100);
              const itemMargin = clientPrice - (item.trade || 0);
              return `<tr>
                <td class="text-muted">${idx + 1}</td>
                <td><strong>${escHtml(item.name)}</strong>${item.notes ? `<br/><span class="text-muted text-sm">${escHtml(item.notes)}</span>` : ''}</td>
                <td>${escHtml(item.room)}</td>
                ${!isClient ? `<td class="text-right">${formatCurrency(item.trade)}</td><td class="text-right">${item.markup}%</td><td class="text-right text-success">${formatCurrency(itemMargin)}</td>` : ''}
                <td class="text-right">${formatCurrency(clientPrice)}</td>
              </tr>`;
            }).join('')}
            ${customItems.map((ci, idx) => `<tr>
              <td class="text-muted">${items.length + idx + 1}</td>
              <td><strong>${escHtml(ci.description)}</strong></td>
              <td>—</td>
              ${!isClient ? '<td class="text-right">—</td><td class="text-right">—</td><td class="text-right">—</td>' : ''}
              <td class="text-right">${formatCurrency(ci.amount)}</td>
            </tr>`).join('')}
          </tbody>
          <tfoot>
            <tr><td colspan="${isClient ? 3 : 6}" class="text-right">Subtotal</td><td class="text-right">${formatCurrency(subtotal)}</td></tr>
            ${inv.isProgressPayment ? `<tr><td colspan="${isClient ? 3 : 6}" class="text-right">Progress (${inv.progressPercent}%)</td><td class="text-right">${formatCurrency(subtotal)}</td></tr>` : ''}
            <tr><td colspan="${isClient ? 3 : 6}" class="text-right">VAT (${inv.vatRate || 0}%)</td><td class="text-right">${formatCurrency(vat)}</td></tr>
            <tr class="total-row"><td colspan="${isClient ? 3 : 6}" class="text-right"><strong>Total ${isCreditNote ? '(Credit)' : ''}</strong></td><td class="text-right"><strong>${isCreditNote ? '-' : ''}${formatCurrency(total)}</strong></td></tr>
            ${!isClient ? `<tr class="margin-row"><td colspan="6" class="text-right text-success">Total Margin</td><td class="text-right text-success"><strong>${formatCurrency(margin)}</strong> (${subtotal ? Math.round(margin / subtotal * 100) : 0}%)</td></tr>` : ''}
          </tfoot>
        </table>

        ${inv.notes ? `<div class="invoice-notes"><h4>Notes</h4><p>${escHtml(inv.notes)}</p></div>` : ''}
        ${inv.terms ? `<div class="invoice-terms"><h4>Terms & Conditions</h4><p>${escHtml(inv.terms)}</p></div>` : ''}

        ${isClient ? `
          <div class="invoice-payment-details">
            <h4>Payment Details</h4>
            <div class="payment-grid">
              <div><span class="text-muted">Bank:</span> Lloyds Bank</div>
              <div><span class="text-muted">Sort Code:</span> 30-00-00</div>
              <div><span class="text-muted">Account:</span> 12345678</div>
              <div><span class="text-muted">Reference:</span> ${escHtml(inv.number)}</div>
            </div>
          </div>
          <div class="invoice-footer-text text-muted text-sm">
            Thank you for your business. Please quote invoice number ${escHtml(inv.number)} with all payments.
          </div>
        ` : ''}
      </div>
    </div>`;
}

// --- Reporting ---
function renderReporting(state, project) {
  const invoices = getInvoices().filter(i => i.status !== 'credit-note');
  const credits = getInvoices().filter(i => i.status === 'credit-note');

  // Monthly revenue (last 12 months)
  const months = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
    const monthInvoices = invoices.filter(inv => inv.date?.startsWith(key));
    const total = monthInvoices.reduce((s, inv) => s + calcInvoiceTotal(inv, state), 0);
    months.push({ key, label, total });
  }
  const maxMonthly = Math.max(1, ...months.map(m => m.total));

  // Payment aging
  const openInvoices = invoices.filter(i => ['sent', 'overdue'].includes(i.status));
  const aging = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  openInvoices.forEach(inv => {
    if (!inv.dueDate) return;
    const days = daysBetween(inv.dueDate, today());
    if (days <= 0) return; // not yet due
    const total = calcInvoiceTotal(inv, state);
    if (days <= 30) aging['0-30'] += total;
    else if (days <= 60) aging['31-60'] += total;
    else if (days <= 90) aging['61-90'] += total;
    else aging['90+'] += total;
  });

  // Top clients by revenue (across all projects)
  const allInvoices = (state.invoices || []).filter(i => i.status !== 'credit-note');
  const clientRevenue = {};
  allInvoices.forEach(inv => {
    const proj = state.projects.find(p => p.id === inv.projectId);
    if (!proj) return;
    const client = proj.client;
    if (!clientRevenue[client]) clientRevenue[client] = 0;
    clientRevenue[client] += calcInvoiceTotal(inv, state);
  });
  const topClients = Object.entries(clientRevenue).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maxClientRev = topClients.length > 0 ? topClients[0][1] : 1;

  return `
    <div class="view-invoicing">
      <div class="view-header">
        <h1>Reports & Analytics</h1>
        <div class="view-header-actions">
          <button class="btn btn-ghost btn-sm ${activeTab === 'list' ? 'active' : ''}" id="tab-list-btn">${icons.grid} Invoices</button>
          <button class="btn btn-ghost btn-sm ${activeTab === 'reporting' ? 'active' : ''}" id="tab-report-btn">${icons.dashboard} Reports</button>
        </div>
      </div>

      <div class="reports-grid">
        <div class="report-card">
          <h3>Monthly Revenue</h3>
          <div class="chart-bar-container">
            ${months.map(m => {
              const height = m.total > 0 ? Math.max(4, (m.total / maxMonthly) * 160) : 4;
              return `<div class="chart-bar-col" title="${m.label}: ${formatCurrency(m.total)}">
                <div class="chart-bar" style="height:${height}px;background:${m.total > 0 ? 'var(--primary)' : 'var(--border)'}"></div>
                <span class="chart-bar-label">${m.label}</span>
              </div>`;
            }).join('')}
          </div>
        </div>

        <div class="report-card">
          <h3>Payment Aging</h3>
          <div class="aging-grid">
            ${Object.entries(aging).map(([bracket, amount]) => {
              const barWidth = amount > 0 ? Math.max(10, (amount / Math.max(1, ...Object.values(aging))) * 100) : 0;
              const color = bracket === '0-30' ? 'var(--success)' : bracket === '31-60' ? 'var(--warning)' : 'var(--error)';
              return `<div class="aging-row">
                <span class="aging-label">${bracket} days</span>
                <div class="aging-bar-wrap"><div class="aging-bar" style="width:${barWidth}%;background:${color}"></div></div>
                <span class="aging-amount">${formatCurrency(amount)}</span>
              </div>`;
            }).join('')}
          </div>
          <div class="aging-total">
            <strong>Total Outstanding: ${formatCurrency(Object.values(aging).reduce((s, v) => s + v, 0))}</strong>
          </div>
        </div>

        <div class="report-card">
          <h3>Top Clients by Revenue</h3>
          <div class="clients-list">
            ${topClients.map(([client, revenue], idx) => {
              const barWidth = Math.max(10, (revenue / maxClientRev) * 100);
              return `<div class="client-row">
                <span class="client-rank">${idx + 1}</span>
                <span class="client-name">${escHtml(client)}</span>
                <div class="client-bar-wrap"><div class="client-bar" style="width:${barWidth}%"></div></div>
                <span class="client-amount">${formatCurrency(revenue)}</span>
              </div>`;
            }).join('')}
            ${topClients.length === 0 ? '<p class="text-muted">No invoice data yet</p>' : ''}
          </div>
        </div>

        <div class="report-card">
          <h3>Summary</h3>
          <div class="summary-stats-grid">
            <div class="summary-stat"><span class="text-muted">Total Invoices</span><strong>${invoices.length}</strong></div>
            <div class="summary-stat"><span class="text-muted">Credit Notes</span><strong>${credits.length}</strong></div>
            <div class="summary-stat"><span class="text-muted">Avg Invoice</span><strong>${formatCurrency(invoices.length > 0 ? invoices.reduce((s, i) => s + calcInvoiceTotal(i, state), 0) / invoices.length : 0)}</strong></div>
            <div class="summary-stat"><span class="text-muted">Collection Rate</span><strong>${invoices.length > 0 ? Math.round(invoices.filter(i => i.status === 'paid').length / invoices.length * 100) : 0}%</strong></div>
          </div>
        </div>
      </div>
    </div>`;
}

// --- Mount ---
export function mount(el) {
  rootEl = el;

  // Tab switches
  el.querySelector('#tab-list-btn')?.addEventListener('click', () => {
    activeTab = 'list';
    refresh(el);
  });
  el.querySelector('#tab-report-btn')?.addEventListener('click', () => {
    activeTab = 'reporting';
    refresh(el);
  });

  // Invoice list clicks
  el.querySelectorAll('.clickable-row').forEach(row => {
    row.addEventListener('click', () => {
      activeInvoice = row.dataset.id;
      refresh(el);
    });
  });

  // Back button
  el.querySelector('#back-btn')?.addEventListener('click', () => {
    activeInvoice = null;
    refresh(el);
  });

  // View toggle (client/trade)
  el.querySelectorAll('.view-toggle .toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      viewMode = btn.dataset.mode;
      refresh(el);
    });
  });

  // Print
  el.querySelector('#print-btn')?.addEventListener('click', () => {
    window.print();
  });

  // Filter tabs
  el.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      listFilter = btn.dataset.filter;
      refresh(el);
    });
  });

  // Search
  const searchInput = el.querySelector('#invoice-search');
  if (searchInput) {
    const doSearch = debounce(() => {
      searchQuery = searchInput.value;
      refresh(el);
    }, 250);
    searchInput.addEventListener('input', doSearch);
  }

  // Sort
  el.querySelectorAll('.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.sort;
      if (listSort.col === col) listSort.dir *= -1;
      else { listSort.col = col; listSort.dir = 1; }
      refresh(el);
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
      showPaymentRecordModal(btn.dataset.id, el);
    });
  });
  el.querySelectorAll('.credit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      createCreditNote(btn.dataset.id, el);
    });
  });

  // Create invoice
  el.querySelector('#create-invoice-btn')?.addEventListener('click', () => showCreateInvoiceWizard(el));

  // Edit invoice (draft only)
  el.querySelector('#edit-invoice-btn')?.addEventListener('click', () => {
    if (activeInvoice) showEditInvoiceModal(activeInvoice, el);
  });
}

export function destroy() {
  activeInvoice = null;
  viewMode = 'client';
  activeTab = 'list';
  rootEl = null;
}

function refresh(el) {
  el.innerHTML = render();
  mount(el);
}

// --- Status Update ---
function updateInvoiceStatus(id, newStatus, el) {
  const state = getState();
  const inv = state.invoices.find(i => i.id === id);
  if (!inv) return;
  inv.status = newStatus;
  if (newStatus === 'sent') inv.sentDate = today();
  addActivity(`Invoice ${newStatus}`, `${inv.number} marked as ${newStatus}`, 'check');
  setState(state);
  showToast(`Invoice ${inv.number} marked as ${newStatus}`);
  refresh(el);
}

// --- Payment Recording ---
function showPaymentRecordModal(id, el) {
  const state = getState();
  const inv = state.invoices.find(i => i.id === id);
  if (!inv) return;
  const total = calcInvoiceTotal(inv, state);

  const body = `
    <form id="payment-form" class="form-grid">
      <div class="form-group full">
        <p>Recording payment for <strong>${escHtml(inv.number)}</strong> — ${formatCurrency(total)}</p>
      </div>
      <div class="form-group">
        <label>Payment Date</label>
        <input type="date" name="paidDate" value="${today()}" required />
      </div>
      <div class="form-group">
        <label>Payment Method</label>
        <select name="method">
          <option value="Bank Transfer">Bank Transfer</option>
          <option value="Cheque">Cheque</option>
          <option value="Credit Card">Credit Card</option>
          <option value="Cash">Cash</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div class="form-group full">
        <label>Reference Number</label>
        <input type="text" name="reference" placeholder="e.g. TXN-123456" />
      </div>
    </form>`;

  showModal('Record Payment', body, [
    { id: 'cancel', label: 'Cancel', onClick: () => {} },
    { id: 'record', label: 'Record Payment', primary: true, onClick: () => {
      const form = document.getElementById('payment-form');
      if (!form) return;
      const fd = new FormData(form);
      inv.status = 'paid';
      inv.paidDate = fd.get('paidDate') || today();
      inv.paymentMethod = fd.get('method');
      inv.paymentReference = fd.get('reference') || '';
      addActivity('Payment recorded', `${inv.number} paid via ${inv.paymentMethod}`, 'check');
      setState(state);
      showToast(`Payment recorded for ${inv.number}`);
      closeModal();
      refresh(el);
    }},
  ]);
}

// --- Credit Note ---
function createCreditNote(invoiceId, el) {
  const state = getState();
  const inv = state.invoices.find(i => i.id === invoiceId);
  if (!inv) return;
  const total = calcInvoiceTotal(inv, state);

  const body = `<p>Create a credit note reversing invoice <strong>${escHtml(inv.number)}</strong>?</p>
    <p>Total to credit: <strong class="text-error">-${formatCurrency(total)}</strong></p>
    <form id="credit-form">
      <div class="form-group full">
        <label>Reason</label>
        <textarea name="reason" rows="2" placeholder="Reason for credit note..."></textarea>
      </div>
    </form>`;

  showModal('Create Credit Note', body, [
    { id: 'cancel', label: 'Cancel', onClick: () => {} },
    { id: 'create', label: 'Create Credit Note', primary: true, onClick: () => {
      const form = document.getElementById('credit-form');
      const reason = form ? form.querySelector('[name="reason"]').value : '';
      const cnNumber = getNextInvoiceNumber(state);

      state.invoices.push({
        id: generateId(),
        projectId: inv.projectId,
        number: cnNumber,
        type: 'credit-note',
        status: 'credit-note',
        items: [...(inv.items || [])],
        customItems: inv.customItems ? [...inv.customItems] : [],
        date: today(),
        dueDate: null,
        paidDate: null,
        vatRate: inv.vatRate,
        notes: `Credit note for ${inv.number}. ${reason}`.trim(),
        originalInvoiceId: inv.id,
        isProgressPayment: inv.isProgressPayment,
        progressPercent: inv.progressPercent,
      });

      addActivity('Credit note created', `CN-${cnNumber} reversing ${inv.number}`, 'reset');
      setState(state);
      showToast(`Credit note CN-${cnNumber} created`);
      closeModal();
      refresh(el);
    }},
  ]);
}

// --- Multi-Step Create Invoice Wizard ---
function showCreateInvoiceWizard(el) {
  const state = getState();
  const project = getActiveProject();

  // Wizard state
  const wiz = {
    step: 1,
    selectedItems: [],
    customItems: [],
    invoiceDate: today(),
    paymentTerms: 'Net 30',
    dueDate: '',
    notes: '',
    terms: '',
    vatRate: state.settings?.vatRate || 20,
    isProgressPayment: false,
    progressPercent: 100,
  };

  // Calculate due date from terms
  function calcDueDate() {
    const term = PAYMENT_TERMS.find(t => t.label === wiz.paymentTerms);
    if (term && wiz.invoiceDate) {
      const d = new Date(wiz.invoiceDate);
      d.setDate(d.getDate() + term.days);
      wiz.dueDate = d.toISOString().split('T')[0];
    }
  }
  calcDueDate();

  function renderWizard() {
    switch (wiz.step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
    }
  }

  function renderStep1() {
    const uninvoicedItems = state.items.filter(i =>
      i.projectId === project.id
    );
    const selectedTotal = wiz.selectedItems.reduce((s, id) => {
      const item = state.items.find(i => i.id === id);
      return item ? s + (item.trade || 0) * (1 + (item.markup || 0) / 100) : s;
    }, 0);
    const customTotal = wiz.customItems.reduce((s, ci) => s + (ci.amount || 0), 0);

    return `
      <div class="wizard-step">
        <div class="wizard-progress">
          <div class="wizard-dot active">1</div><div class="wizard-line"></div>
          <div class="wizard-dot">2</div><div class="wizard-line"></div>
          <div class="wizard-dot">3</div><div class="wizard-line"></div>
          <div class="wizard-dot">4</div>
        </div>
        <h3>Step 1: Select Items</h3>
        <p class="text-muted">Choose procurement items and/or add custom line items.</p>

        <div class="wizard-running-total">
          Running Total: <strong>${formatCurrency(selectedTotal + customTotal)}</strong>
          (${wiz.selectedItems.length} procurement items + ${wiz.customItems.length} custom items)
        </div>

        <div class="checkbox-list" style="max-height:250px;overflow-y:auto;">
          ${uninvoicedItems.map(item => {
            const cp = (item.trade || 0) * (1 + (item.markup || 0) / 100);
            const checked = wiz.selectedItems.includes(item.id);
            return `<label class="checkbox-item">
              <input type="checkbox" name="items" value="${item.id}" ${checked ? 'checked' : ''} />
              <span class="checkbox-item-detail">
                <strong>${escHtml(item.name)}</strong>
                <span class="text-muted">${escHtml(item.room)} — ${formatCurrency(cp)}</span>
              </span>
            </label>`;
          }).join('')}
          ${uninvoicedItems.length === 0 ? '<p class="text-muted">No items available</p>' : ''}
        </div>

        <div style="margin-top:16px;">
          <h4>Custom Line Items</h4>
          <div id="custom-items-list">
            ${wiz.customItems.map((ci, idx) => `
              <div class="custom-item-row" data-idx="${idx}">
                <input type="text" class="custom-desc" value="${escHtml(ci.description)}" placeholder="Description" />
                <input type="number" class="custom-amount" value="${ci.amount}" step="0.01" min="0" placeholder="Amount" />
                <button class="icon-btn remove-custom-btn" data-idx="${idx}">${icons.close}</button>
              </div>
            `).join('')}
          </div>
          <button class="btn btn-ghost btn-xs" id="add-custom-item-btn">${icons.plus} Add Line Item</button>
        </div>
      </div>`;
  }

  function renderStep2() {
    return `
      <div class="wizard-step">
        <div class="wizard-progress">
          <div class="wizard-dot done">1</div><div class="wizard-line done"></div>
          <div class="wizard-dot active">2</div><div class="wizard-line"></div>
          <div class="wizard-dot">3</div><div class="wizard-line"></div>
          <div class="wizard-dot">4</div>
        </div>
        <h3>Step 2: Terms & Dates</h3>
        <form id="wizard-step2" class="form-grid">
          <div class="form-group">
            <label>Invoice Date</label>
            <input type="date" name="invoiceDate" value="${wiz.invoiceDate}" />
          </div>
          <div class="form-group">
            <label>Payment Terms</label>
            <select name="paymentTerms">
              ${PAYMENT_TERMS.map(t => `<option value="${t.label}" ${wiz.paymentTerms === t.label ? 'selected' : ''}>${t.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Due Date</label>
            <input type="date" name="dueDate" value="${wiz.dueDate}" />
          </div>
          <div class="form-group">
            <label>VAT Rate (%)</label>
            <input type="number" name="vatRate" value="${wiz.vatRate}" min="0" max="100" step="0.5" />
          </div>
          <div class="form-group full">
            <label class="checkbox-item">
              <input type="checkbox" name="isProgressPayment" ${wiz.isProgressPayment ? 'checked' : ''} />
              <span>Progress Payment (partial invoice)</span>
            </label>
          </div>
          <div class="form-group" id="progress-pct-group" style="${wiz.isProgressPayment ? '' : 'display:none;'}">
            <label>Percentage (%)</label>
            <input type="number" name="progressPercent" value="${wiz.progressPercent}" min="1" max="100" step="1" />
          </div>
        </form>
      </div>`;
  }

  function renderStep3() {
    return `
      <div class="wizard-step">
        <div class="wizard-progress">
          <div class="wizard-dot done">1</div><div class="wizard-line done"></div>
          <div class="wizard-dot done">2</div><div class="wizard-line done"></div>
          <div class="wizard-dot active">3</div><div class="wizard-line"></div>
          <div class="wizard-dot">4</div>
        </div>
        <h3>Step 3: Notes & Terms</h3>
        <form id="wizard-step3" class="form-grid">
          <div class="form-group full">
            <label>Invoice Notes</label>
            <textarea name="notes" rows="3" placeholder="Notes that appear on the invoice...">${escHtml(wiz.notes)}</textarea>
          </div>
          <div class="form-group full">
            <label>Terms & Conditions</label>
            <textarea name="terms" rows="3" placeholder="Payment terms, late fees, etc...">${escHtml(wiz.terms || 'Payment is due within the specified terms. Late payments may incur interest at 2% per month.')}</textarea>
          </div>
        </form>
      </div>`;
  }

  function renderStep4() {
    const items = wiz.selectedItems.map(id => state.items.find(i => i.id === id)).filter(Boolean);
    const itemsSubtotal = items.reduce((s, i) => s + (i.trade || 0) * (1 + (i.markup || 0) / 100), 0);
    const customSubtotal = wiz.customItems.reduce((s, ci) => s + (ci.amount || 0), 0);
    let subtotal = itemsSubtotal + customSubtotal;
    if (wiz.isProgressPayment) subtotal = subtotal * (wiz.progressPercent / 100);
    const vat = subtotal * (wiz.vatRate / 100);
    const total = subtotal + vat;

    return `
      <div class="wizard-step">
        <div class="wizard-progress">
          <div class="wizard-dot done">1</div><div class="wizard-line done"></div>
          <div class="wizard-dot done">2</div><div class="wizard-line done"></div>
          <div class="wizard-dot done">3</div><div class="wizard-line done"></div>
          <div class="wizard-dot active">4</div>
        </div>
        <h3>Step 4: Review & Create</h3>
        <div class="wizard-preview">
          <div class="preview-row"><span class="text-muted">Invoice #:</span> <strong>${getNextInvoiceNumber(state)}</strong></div>
          <div class="preview-row"><span class="text-muted">Date:</span> ${formatDate(wiz.invoiceDate)}</div>
          <div class="preview-row"><span class="text-muted">Due:</span> ${formatDate(wiz.dueDate)}</div>
          <div class="preview-row"><span class="text-muted">Terms:</span> ${wiz.paymentTerms}</div>
          ${wiz.isProgressPayment ? `<div class="preview-row"><span class="text-muted">Progress:</span> ${wiz.progressPercent}%</div>` : ''}
          <hr/>
          <div class="preview-items">
            ${items.map(i => `<div class="preview-item"><span>${escHtml(i.name)}</span><span>${formatCurrency((i.trade || 0) * (1 + (i.markup || 0) / 100))}</span></div>`).join('')}
            ${wiz.customItems.map(ci => `<div class="preview-item"><span>${escHtml(ci.description)}</span><span>${formatCurrency(ci.amount)}</span></div>`).join('')}
          </div>
          <hr/>
          <div class="preview-row"><span class="text-muted">Subtotal:</span> ${formatCurrency(subtotal)}</div>
          <div class="preview-row"><span class="text-muted">VAT (${wiz.vatRate}%):</span> ${formatCurrency(vat)}</div>
          <div class="preview-row preview-total"><strong>Total:</strong> <strong>${formatCurrency(total)}</strong></div>
          ${wiz.notes ? `<div class="preview-row"><span class="text-muted">Notes:</span> ${escHtml(wiz.notes)}</div>` : ''}
        </div>
      </div>`;
  }

  function getActions() {
    const actions = [];
    if (wiz.step > 1) {
      actions.push({ id: 'back', label: '&larr; Back', onClick: () => {
        saveCurrentStepData();
        wiz.step--;
        updateModal();
      }});
    }
    actions.push({ id: 'cancel', label: 'Cancel', onClick: () => {} });
    if (wiz.step < 4) {
      actions.push({ id: 'next', label: 'Next &rarr;', primary: true, onClick: () => {
        saveCurrentStepData();
        if (wiz.step === 1 && wiz.selectedItems.length === 0 && wiz.customItems.length === 0) {
          showToast('Select at least one item or add a custom line item', 'error');
          return;
        }
        wiz.step++;
        updateModal();
      }});
    } else {
      actions.push({ id: 'create', label: 'Create Invoice', primary: true, onClick: () => {
        createInvoice();
      }});
    }
    return actions;
  }

  function saveCurrentStepData() {
    if (wiz.step === 1) {
      const modal = document.querySelector('.modal-body');
      if (!modal) return;
      wiz.selectedItems = [...modal.querySelectorAll('[name="items"]:checked')].map(cb => cb.value);
      // Save custom items
      const customRows = modal.querySelectorAll('.custom-item-row');
      wiz.customItems = [...customRows].map(row => ({
        description: row.querySelector('.custom-desc')?.value || '',
        amount: parseFloat(row.querySelector('.custom-amount')?.value) || 0,
      })).filter(ci => ci.description && ci.amount > 0);
    }
    if (wiz.step === 2) {
      const form = document.getElementById('wizard-step2');
      if (!form) return;
      const fd = new FormData(form);
      wiz.invoiceDate = fd.get('invoiceDate') || today();
      wiz.paymentTerms = fd.get('paymentTerms') || 'Net 30';
      wiz.dueDate = fd.get('dueDate') || '';
      wiz.vatRate = parseFloat(fd.get('vatRate')) || 20;
      wiz.isProgressPayment = !!form.querySelector('[name="isProgressPayment"]')?.checked;
      wiz.progressPercent = parseFloat(fd.get('progressPercent')) || 100;
      if (!wiz.dueDate) calcDueDate();
    }
    if (wiz.step === 3) {
      const form = document.getElementById('wizard-step3');
      if (!form) return;
      wiz.notes = form.querySelector('[name="notes"]')?.value || '';
      wiz.terms = form.querySelector('[name="terms"]')?.value || '';
    }
  }

  function updateModal() {
    showModal(`Create Invoice — Step ${wiz.step}/4`, renderWizard(), getActions());
    setTimeout(() => wireWizardEvents(), 100);
  }

  function wireWizardEvents() {
    const modal = document.querySelector('.modal-body');
    if (!modal) return;

    // Step 1: item selection updates running total
    modal.querySelectorAll('[name="items"]').forEach(cb => {
      cb.addEventListener('change', () => {
        wiz.selectedItems = [...modal.querySelectorAll('[name="items"]:checked')].map(c => c.value);
        const totalEl = modal.querySelector('.wizard-running-total');
        if (totalEl) {
          const selectedTotal = wiz.selectedItems.reduce((s, id) => {
            const item = state.items.find(i => i.id === id);
            return item ? s + (item.trade || 0) * (1 + (item.markup || 0) / 100) : s;
          }, 0);
          const customTotal = wiz.customItems.reduce((s, ci) => s + (ci.amount || 0), 0);
          totalEl.innerHTML = `Running Total: <strong>${formatCurrency(selectedTotal + customTotal)}</strong> (${wiz.selectedItems.length} procurement items + ${wiz.customItems.length} custom items)`;
        }
      });
    });

    // Step 1: add custom line item
    modal.querySelector('#add-custom-item-btn')?.addEventListener('click', () => {
      wiz.customItems.push({ description: '', amount: 0 });
      saveCurrentStepData();
      updateModal();
    });
    modal.querySelectorAll('.remove-custom-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        wiz.customItems.splice(idx, 1);
        saveCurrentStepData();
        updateModal();
      });
    });

    // Step 2: payment terms auto-calc due date
    const termsSelect = modal.querySelector('[name="paymentTerms"]');
    const dateInput = modal.querySelector('[name="invoiceDate"]');
    const dueDateInput = modal.querySelector('[name="dueDate"]');
    if (termsSelect && dateInput && dueDateInput) {
      const updateDue = () => {
        wiz.invoiceDate = dateInput.value;
        wiz.paymentTerms = termsSelect.value;
        calcDueDate();
        dueDateInput.value = wiz.dueDate;
      };
      termsSelect.addEventListener('change', updateDue);
      dateInput.addEventListener('change', updateDue);
    }

    // Step 2: progress payment toggle
    const progCb = modal.querySelector('[name="isProgressPayment"]');
    const progGroup = modal.querySelector('#progress-pct-group');
    if (progCb && progGroup) {
      progCb.addEventListener('change', () => {
        progGroup.style.display = progCb.checked ? '' : 'none';
      });
    }
  }

  function createInvoice() {
    const invNum = getNextInvoiceNumber(state);

    const newInv = {
      id: generateId(),
      projectId: project.id,
      number: invNum,
      type: 'client',
      status: 'draft',
      items: wiz.selectedItems,
      customItems: wiz.customItems.filter(ci => ci.description && ci.amount > 0),
      date: wiz.invoiceDate,
      dueDate: wiz.dueDate,
      paidDate: null,
      vatRate: wiz.vatRate,
      paymentTerms: wiz.paymentTerms,
      notes: wiz.notes,
      terms: wiz.terms,
      isProgressPayment: wiz.isProgressPayment,
      progressPercent: wiz.isProgressPayment ? wiz.progressPercent : 100,
    };

    if (!state.invoices) state.invoices = [];
    state.invoices.push(newInv);

    const totalItems = newInv.items.length + newInv.customItems.length;
    addActivity('Invoice created', `${invNum} created with ${totalItems} items`, 'plus');
    setState(state);
    showToast(`Invoice ${invNum} created`);
    closeModal();
    activeInvoice = newInv.id;
    refresh(el);
  }

  // Launch wizard
  updateModal();
}

// --- Edit Invoice (draft only) ---
function showEditInvoiceModal(invoiceId, el) {
  const state = getState();
  const inv = state.invoices.find(i => i.id === invoiceId);
  if (!inv || inv.status !== 'draft') return;

  const body = `
    <form id="edit-invoice-form" class="form-grid">
      <div class="form-group">
        <label>Invoice Date</label>
        <input type="date" name="date" value="${inv.date}" />
      </div>
      <div class="form-group">
        <label>Payment Terms</label>
        <select name="paymentTerms">
          ${PAYMENT_TERMS.map(t => `<option value="${t.label}" ${inv.paymentTerms === t.label ? 'selected' : ''}>${t.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Due Date</label>
        <input type="date" name="dueDate" value="${inv.dueDate || ''}" />
      </div>
      <div class="form-group">
        <label>VAT Rate (%)</label>
        <input type="number" name="vatRate" value="${inv.vatRate}" min="0" max="100" step="0.5" />
      </div>
      <div class="form-group full">
        <label>Notes</label>
        <textarea name="notes" rows="2">${escHtml(inv.notes || '')}</textarea>
      </div>
      <div class="form-group full">
        <label>Terms</label>
        <textarea name="terms" rows="2">${escHtml(inv.terms || '')}</textarea>
      </div>
    </form>`;

  showModal('Edit Invoice', body, [
    { id: 'cancel', label: 'Cancel', onClick: () => {} },
    { id: 'save', label: 'Save Changes', primary: true, onClick: () => {
      const form = document.getElementById('edit-invoice-form');
      if (!form) return;
      const fd = new FormData(form);
      inv.date = fd.get('date') || inv.date;
      inv.dueDate = fd.get('dueDate') || inv.dueDate;
      inv.paymentTerms = fd.get('paymentTerms') || inv.paymentTerms;
      inv.vatRate = parseFloat(fd.get('vatRate')) || 20;
      inv.notes = fd.get('notes') || '';
      inv.terms = fd.get('terms') || '';
      addActivity('Invoice updated', `${inv.number} edited`, 'edit');
      setState(state);
      showToast('Invoice updated');
      closeModal();
      refresh(el);
    }},
  ]);

  // Auto-calc due date
  setTimeout(() => {
    const form = document.getElementById('edit-invoice-form');
    if (!form) return;
    const termsSelect = form.querySelector('[name="paymentTerms"]');
    const dateInput = form.querySelector('[name="date"]');
    const dueDateInput = form.querySelector('[name="dueDate"]');
    const updateDue = () => {
      const term = PAYMENT_TERMS.find(t => t.label === termsSelect.value);
      if (term && dateInput.value) {
        const d = new Date(dateInput.value);
        d.setDate(d.getDate() + term.days);
        dueDateInput.value = d.toISOString().split('T')[0];
      }
    };
    termsSelect.addEventListener('change', updateDue);
    dateInput.addEventListener('change', updateDue);
  }, 100);
}
