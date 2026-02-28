// Supplier Database — Production View with Cards, Detail Pages, Import/Export

import { getState, setState, getActiveProject, addActivity } from '../store.js';
import { generateId, sanitizeHtml, downloadAsCsv, capitalize, filterBySearch } from '../core/utils.js';
import { icons } from '../core/icons.js';
import { showModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

// ── Constants ──────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'Fabric',    color: '#a855f7' },
  { key: 'Furniture', color: '#6366f1' },
  { key: 'Lighting',  color: '#f59e0b' },
  { key: 'Paint',     color: '#10b981' },
  { key: 'Tiles',     color: '#3b82f6' },
  { key: 'Hardware',  color: '#ef4444' },
];

const LEAD_TIME_THRESHOLDS = { short: 14, medium: 42 }; // days

const SORT_OPTIONS = [
  { key: 'name',      label: 'Name' },
  { key: 'rating',    label: 'Rating' },
  { key: 'leadTime',  label: 'Lead Time' },
  { key: 'discount',  label: 'Discount' },
  { key: 'totalOrdered', label: 'Total Ordered' },
];

// ── Module state ───────────────────────────────────────────────────────
let searchQuery = '';
let filterCategories = new Set();
let filterRatingMin = 0;
let filterTradeOnly = false;
let filterLeadTime = 'all'; // all | short | medium | long
let sortBy = 'name';
let sortDir = 'asc';
let viewMode = 'grid'; // grid | list
let expandedCards = new Set();
let detailSupplierId = null; // For detail page view

// ── Helpers ────────────────────────────────────────────────────────────
function getCategoryColor(cat) {
  const found = CATEGORIES.find(c => c.key === cat);
  return found ? found.color : '#94a3b8';
}

function parseLeadWeeks(str) {
  if (!str) return 0;
  const matches = str.match(/(\d+)/g);
  if (!matches) return 0;
  // Return the first number as weeks
  return parseInt(matches[0]);
}

function leadTimeDays(str) {
  const weeks = parseLeadWeeks(str);
  // If string contains "days", treat as days
  if (str && str.toLowerCase().includes('day')) return parseInt(str.match(/(\d+)/)?.[1] || 0);
  return weeks * 7;
}

function leadTimeCategory(str) {
  const days = leadTimeDays(str);
  if (days <= LEAD_TIME_THRESHOLDS.short) return 'short';
  if (days <= LEAD_TIME_THRESHOLDS.medium) return 'medium';
  return 'long';
}

function leadTimeColor(str) {
  const cat = leadTimeCategory(str);
  return cat === 'short' ? '#10b981' : cat === 'medium' ? '#f59e0b' : '#ef4444';
}

function leadTimeLabel(cat) {
  return cat === 'short' ? 'Short' : cat === 'medium' ? 'Medium' : 'Long';
}

function getSupplierInitials(name) {
  return name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function getSupplierItems(supplierId, state) {
  const supplier = state.suppliers.find(s => s.id === supplierId);
  if (!supplier) return [];
  return (state.items || []).filter(item => item.supplier === supplier.name);
}

function getSupplierTotalOrdered(supplierId, state) {
  const items = getSupplierItems(supplierId, state);
  return items.reduce((sum, item) => sum + (item.trade || 0), 0);
}

function getSupplierProjects(supplierId, state) {
  const items = getSupplierItems(supplierId, state);
  const projectIds = [...new Set(items.map(i => i.projectId))];
  return projectIds.map(pid => state.projects.find(p => p.id === pid)).filter(Boolean);
}

function getFilteredSuppliers() {
  const state = getState();
  if (!state) return [];

  let suppliers = [...state.suppliers];

  // Search
  if (searchQuery.trim()) {
    suppliers = filterBySearch(suppliers, searchQuery, ['name', 'category', 'notes', 'address']);
  }

  // Category filter
  if (filterCategories.size > 0) {
    suppliers = suppliers.filter(s => filterCategories.has(s.category));
  }

  // Rating filter
  if (filterRatingMin > 0) {
    suppliers = suppliers.filter(s => (s.rating || 0) >= filterRatingMin);
  }

  // Trade account filter
  if (filterTradeOnly) {
    suppliers = suppliers.filter(s => s.tradeAccount);
  }

  // Lead time filter
  if (filterLeadTime !== 'all') {
    suppliers = suppliers.filter(s => leadTimeCategory(s.leadTime) === filterLeadTime);
  }

  // Sort
  suppliers.sort((a, b) => {
    let va, vb;
    switch (sortBy) {
      case 'rating': va = a.rating || 0; vb = b.rating || 0; break;
      case 'leadTime': va = leadTimeDays(a.leadTime); vb = leadTimeDays(b.leadTime); break;
      case 'discount': va = a.discount || 0; vb = b.discount || 0; break;
      case 'totalOrdered': va = getSupplierTotalOrdered(a.id, state); vb = getSupplierTotalOrdered(b.id, state); break;
      default: va = a.name.toLowerCase(); vb = b.name.toLowerCase();
    }
    if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    return sortDir === 'asc' ? va - vb : vb - va;
  });

  return suppliers;
}

// ── Star rendering ─────────────────────────────────────────────────────
function renderStars(rating, interactive = false, size = 16) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(rating)) {
      // Full star
      html += `<span class="star filled ${interactive ? 'star-interactive' : ''}" data-star="${i}">${icons.star}</span>`;
    } else if (i - 0.5 <= rating) {
      // Half star
      html += `<span class="star half ${interactive ? 'star-interactive' : ''}" data-star="${i}">
        <svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="none">
          <defs><clipPath id="half-clip-${i}"><rect x="0" y="0" width="8" height="16"/></clipPath></defs>
          <path d="M8 1l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z" fill="currentColor" clip-path="url(#half-clip-${i})"/>
          <path d="M8 1l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z" stroke="currentColor" stroke-width="1.2" fill="none"/>
        </svg>
      </span>`;
    } else {
      // Empty star
      html += `<span class="star empty ${interactive ? 'star-interactive' : ''}" data-star="${i}">${icons.starEmpty}</span>`;
    }
  }
  return `<div class="stars">${html}</div>`;
}

// ══════════════════════════════════════════════════════════════════════════
//  RENDER — main entry
// ══════════════════════════════════════════════════════════════════════════
export function render() {
  const state = getState();
  if (!state) return '<div class="empty-state"><h2>No data</h2></div>';

  // Check for detail page route
  const hash = window.location.hash;
  const detailMatch = hash.match(/#\/suppliers?\/(sup-[\w-]+)/);
  if (detailMatch) {
    detailSupplierId = detailMatch[1];
    return renderDetailPage(detailMatch[1]);
  }
  detailSupplierId = null;

  const suppliers = getFilteredSuppliers();
  const allSuppliers = state.suppliers;

  // Category counts
  const categoryCounts = {};
  allSuppliers.forEach(s => { categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1; });

  return `
    <div class="view-suppliers">
      <div class="view-header">
        <div>
          <h1>Supplier Database</h1>
          <div class="suppliers-subtitle">${allSuppliers.length} suppliers across ${CATEGORIES.length} categories</div>
        </div>
        <div class="header-actions">
          <button class="btn btn-outline btn-sm" id="import-csv-btn">${icons.upload} Import CSV</button>
          <button class="btn btn-outline btn-sm" id="export-csv-btn">${icons.printer} Export CSV</button>
          <button class="btn btn-primary btn-sm" id="add-supplier-btn">${icons.plus} Add Supplier</button>
        </div>
      </div>

      <!-- Search & Filters -->
      <div class="supplier-controls">
        <div class="supplier-search-row">
          <div class="search-box search-box-lg">
            <span class="search-icon">${icons.search}</span>
            <input type="text" id="supplier-search" placeholder="Search suppliers by name, category, notes..." value="${sanitizeHtml(searchQuery)}" />
            ${searchQuery ? '<button class="search-clear" id="search-clear">&times;</button>' : ''}
          </div>

          <div class="supplier-view-toggle">
            <button class="view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}" data-mode="grid" title="Grid view">${icons.grid}</button>
            <button class="view-toggle-btn ${viewMode === 'list' ? 'active' : ''}" data-mode="list" title="List view">${icons.procurement}</button>
          </div>
        </div>

        <!-- Category chips -->
        <div class="filter-section">
          <div class="category-chips">
            <button class="chip ${filterCategories.size === 0 ? 'chip-active' : ''}" data-cat="all">All <span class="chip-count">${allSuppliers.length}</span></button>
            ${CATEGORIES.map(c => {
              const count = categoryCounts[c.key] || 0;
              const isActive = filterCategories.has(c.key);
              return `<button class="chip ${isActive ? 'chip-active' : ''}" data-cat="${c.key}" style="${isActive ? `background:${c.color}20;border-color:${c.color};color:${c.color}` : ''}">
                <span class="cat-chip-dot" style="background:${c.color}"></span>${c.key} <span class="chip-count">${count}</span>
              </button>`;
            }).join('')}
          </div>
        </div>

        <!-- Advanced filters -->
        <div class="filter-row">
          <div class="filter-item">
            <label>Min Rating:</label>
            <div class="rating-filter" id="rating-filter">
              ${[0,1,2,3,4,5].map(r => `<button class="rating-filter-btn ${filterRatingMin === r ? 'active' : ''}" data-rating="${r}">${r === 0 ? 'Any' : r + '+'}</button>`).join('')}
            </div>
          </div>
          <div class="filter-item">
            <label class="checkbox-label">
              <input type="checkbox" id="trade-filter" ${filterTradeOnly ? 'checked' : ''} /> Trade Account Only
            </label>
          </div>
          <div class="filter-item">
            <label>Lead Time:</label>
            <select id="lead-time-filter">
              <option value="all" ${filterLeadTime === 'all' ? 'selected' : ''}>All</option>
              <option value="short" ${filterLeadTime === 'short' ? 'selected' : ''}>Short (&lt; 2 weeks)</option>
              <option value="medium" ${filterLeadTime === 'medium' ? 'selected' : ''}>Medium (2-6 weeks)</option>
              <option value="long" ${filterLeadTime === 'long' ? 'selected' : ''}>Long (&gt; 6 weeks)</option>
            </select>
          </div>
          <div class="filter-item">
            <label>Sort By:</label>
            <select id="sort-select">
              ${SORT_OPTIONS.map(o => `<option value="${o.key}" ${sortBy === o.key ? 'selected' : ''}>${o.label}</option>`).join('')}
            </select>
            <button class="sort-dir-btn" id="sort-dir-btn" title="Toggle sort direction">${sortDir === 'asc' ? '&uarr;' : '&darr;'}</button>
          </div>
        </div>
      </div>

      <!-- Results count -->
      <div class="supplier-results-count">${suppliers.length} supplier${suppliers.length !== 1 ? 's' : ''} found</div>

      <!-- Supplier grid/list -->
      ${viewMode === 'grid' ? renderGrid(suppliers) : renderListView(suppliers)}

      <!-- Hidden file input for CSV import -->
      <input type="file" id="csv-file-input" accept=".csv" style="display:none" />
    </div>
  `;
}

// ══════════════════════════════════════════════════════════════════════════
//  GRID VIEW
// ══════════════════════════════════════════════════════════════════════════
function renderGrid(suppliers) {
  if (suppliers.length === 0) return '<div class="empty-state"><h3>No suppliers found</h3><p>Try adjusting your filters or add a new supplier.</p></div>';

  const state = getState();
  const cards = suppliers.map(s => {
    const isExpanded = expandedCards.has(s.id);
    const catColor = getCategoryColor(s.category);
    const ltColor = leadTimeColor(s.leadTime);
    const ltCat = leadTimeCategory(s.leadTime);
    const items = getSupplierItems(s.id, state);
    const totalOrdered = items.reduce((sum, i) => sum + (i.trade || 0), 0);
    const projects = getSupplierProjects(s.id, state);

    return `
      <div class="supplier-card ${isExpanded ? 'expanded' : ''}" data-id="${s.id}">
        <div class="supplier-card-main">
          <!-- Logo / Initials -->
          <div class="supplier-logo" style="background:${catColor}20;color:${catColor}">
            ${getSupplierInitials(s.name)}
          </div>
          <div class="supplier-card-content">
            <div class="supplier-card-top">
              <h3 class="supplier-name">
                <a href="#/suppliers/${s.id}" class="supplier-name-link">${sanitizeHtml(s.name)}</a>
              </h3>
              <div class="supplier-badges">
                ${s.tradeAccount ? `<span class="trade-badge">${icons.check} Trade Account</span>` : ''}
              </div>
            </div>
            <div class="supplier-card-meta-row">
              <span class="category-badge" style="background:${catColor}15;color:${catColor};border:1px solid ${catColor}30">${sanitizeHtml(s.category)}</span>
              ${renderStars(s.rating)}
              <span class="lead-time-indicator" style="color:${ltColor}">
                <span class="lead-dot" style="background:${ltColor}"></span>
                ${sanitizeHtml(s.leadTime)} (${leadTimeLabel(ltCat)})
              </span>
            </div>
            <div class="supplier-card-stats">
              ${s.discount > 0 ? `<span class="stat-chip"><strong>${s.discount}%</strong> discount</span>` : ''}
              ${items.length > 0 ? `<span class="stat-chip"><strong>${items.length}</strong> item${items.length !== 1 ? 's' : ''} ordered</span>` : ''}
              ${totalOrdered > 0 ? `<span class="stat-chip"><strong>&pound;${totalOrdered.toLocaleString()}</strong> total</span>` : ''}
            </div>
          </div>
          <button class="supplier-expand-btn" data-id="${s.id}" title="${isExpanded ? 'Collapse' : 'Expand'}">
            ${isExpanded ? icons.chevronDown : icons.chevronRight}
          </button>
        </div>

        <!-- Expanded details -->
        <div class="supplier-card-details" style="max-height:${isExpanded ? '500px' : '0'};overflow:hidden;transition:max-height 0.3s ease">
          <div class="supplier-detail-grid">
            <div class="detail-section">
              <h4>Contact</h4>
              <div class="supplier-detail-row">${icons.link} <a href="https://${sanitizeHtml(s.website || '')}" target="_blank" rel="noopener">${sanitizeHtml(s.website || '-')}</a></div>
              <div class="supplier-detail-row phone-row">Phone: ${sanitizeHtml(s.phone || '-')}</div>
              <div class="supplier-detail-row email-row" data-email="${sanitizeHtml(s.email || '')}">
                Email: <span class="email-link">${sanitizeHtml(s.email || '-')}</span>
                ${s.email ? '<button class="btn-icon copy-email-btn" title="Copy email">Copy</button>' : ''}
              </div>
              <div class="supplier-detail-row">${sanitizeHtml(s.address || '-')}</div>
            </div>
            <div class="detail-section">
              <h4>Projects</h4>
              ${projects.length > 0 ? projects.map(p => `<div class="project-chip">${sanitizeHtml(p.name)}</div>`).join('') : '<span class="text-muted">No projects linked</span>'}
            </div>
            ${s.notes ? `<div class="detail-section full-width"><h4>Notes</h4><p class="supplier-notes">${sanitizeHtml(s.notes)}</p></div>` : ''}
          </div>
          <div class="supplier-card-actions">
            <button class="btn btn-sm btn-outline view-detail-btn" data-id="${s.id}">${icons.eye} View Full Profile</button>
            <button class="btn btn-sm btn-outline edit-supplier-btn" data-id="${s.id}">${icons.edit} Edit</button>
            <button class="btn btn-sm btn-outline order-from-btn" data-name="${sanitizeHtml(s.name)}">Order from Supplier</button>
            <button class="btn btn-sm btn-outline btn-danger delete-supplier-btn" data-id="${s.id}">${icons.trash} Delete</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `<div class="supplier-grid">${cards}</div>`;
}

// ══════════════════════════════════════════════════════════════════════════
//  LIST VIEW
// ══════════════════════════════════════════════════════════════════════════
function renderListView(suppliers) {
  if (suppliers.length === 0) return '<div class="empty-state"><h3>No suppliers found</h3></div>';

  const state = getState();
  const rows = suppliers.map(s => {
    const catColor = getCategoryColor(s.category);
    const ltColor = leadTimeColor(s.leadTime);
    const items = getSupplierItems(s.id, state);
    const totalOrdered = items.reduce((sum, i) => sum + (i.trade || 0), 0);

    return `<tr class="supplier-list-row" data-id="${s.id}">
      <td>
        <div class="supplier-list-name">
          <div class="supplier-logo-sm" style="background:${catColor}20;color:${catColor}">${getSupplierInitials(s.name)}</div>
          <a href="#/suppliers/${s.id}" class="supplier-name-link">${sanitizeHtml(s.name)}</a>
        </div>
      </td>
      <td><span class="category-badge-sm" style="background:${catColor}15;color:${catColor}">${sanitizeHtml(s.category)}</span></td>
      <td>${renderStars(s.rating)}</td>
      <td>${s.tradeAccount ? '<span class="trade-badge-sm">Yes</span>' : '-'}</td>
      <td><span style="color:${ltColor}">${sanitizeHtml(s.leadTime)}</span></td>
      <td>${s.discount > 0 ? s.discount + '%' : '-'}</td>
      <td>${items.length}</td>
      <td>&pound;${totalOrdered.toLocaleString()}</td>
      <td>
        <button class="btn-icon edit-supplier-btn" data-id="${s.id}" title="Edit">${icons.edit}</button>
        <button class="btn-icon delete-supplier-btn" data-id="${s.id}" title="Delete">${icons.trash}</button>
      </td>
    </tr>`;
  }).join('');

  return `
    <div class="supplier-list-wrapper">
      <table class="supplier-list-table">
        <thead>
          <tr>
            <th>Supplier</th>
            <th>Category</th>
            <th>Rating</th>
            <th>Trade</th>
            <th>Lead Time</th>
            <th>Discount</th>
            <th>Items</th>
            <th>Total</th>
            <th style="width:80px">Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// ══════════════════════════════════════════════════════════════════════════
//  DETAIL PAGE
// ══════════════════════════════════════════════════════════════════════════
function renderDetailPage(supplierId) {
  const state = getState();
  const s = state.suppliers.find(sup => sup.id === supplierId);
  if (!s) return `<div class="empty-state"><h2>Supplier not found</h2><p><a href="#/suppliers">Back to suppliers</a></p></div>`;

  const catColor = getCategoryColor(s.category);
  const ltColor = leadTimeColor(s.leadTime);
  const ltCat = leadTimeCategory(s.leadTime);
  const items = getSupplierItems(s.id, state);
  const totalOrdered = items.reduce((sum, i) => sum + (i.trade || 0), 0);
  const projects = getSupplierProjects(s.id, state);

  // Performance metrics
  const deliveredItems = items.filter(i => i.status === 'delivered' || i.status === 'installed');
  const orderedItems = items.filter(i => ['ordered', 'shipped', 'delivered', 'installed'].includes(i.status));
  const onTimeRate = orderedItems.length > 0 ? Math.round(deliveredItems.length / orderedItems.length * 100) : 0;

  // Items grouped by status
  const statusGroups = {};
  items.forEach(i => {
    if (!statusGroups[i.status]) statusGroups[i.status] = [];
    statusGroups[i.status].push(i);
  });

  const statusColors = { spec: '#94a3b8', quoted: '#6366f1', ordered: '#f59e0b', shipped: '#3b82f6', delivered: '#10b981', installed: '#8b5cf6' };

  return `
    <div class="view-suppliers">
      <div class="supplier-detail-page">
        <!-- Breadcrumb -->
        <div class="breadcrumb">
          <a href="#/suppliers">Suppliers</a> <span class="breadcrumb-sep">/</span> <span>${sanitizeHtml(s.name)}</span>
        </div>

        <!-- Header -->
        <div class="supplier-detail-header">
          <div class="supplier-logo-lg" style="background:${catColor}20;color:${catColor}">
            ${getSupplierInitials(s.name)}
          </div>
          <div class="supplier-detail-title">
            <h1>${sanitizeHtml(s.name)}</h1>
            <div class="supplier-detail-meta">
              <span class="category-badge" style="background:${catColor}15;color:${catColor}">${sanitizeHtml(s.category)}</span>
              ${renderStars(s.rating)}
              ${s.tradeAccount ? `<span class="trade-badge">${icons.check} Trade Account</span>` : ''}
            </div>
          </div>
          <div class="supplier-detail-actions">
            <button class="btn btn-outline btn-sm edit-detail-btn" id="edit-detail-btn">${icons.edit} Edit</button>
            <button class="btn btn-outline btn-sm" id="order-from-detail-btn">Order from Supplier</button>
            ${s.email ? `<button class="btn btn-outline btn-sm copy-email-detail" data-email="${sanitizeHtml(s.email)}">Copy Email</button>` : ''}
            ${s.website ? `<a href="https://${sanitizeHtml(s.website)}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">${icons.link} Website</a>` : ''}
          </div>
        </div>

        <!-- Metrics cards -->
        <div class="supplier-metrics">
          <div class="metric-card">
            <div class="metric-value">&pound;${totalOrdered.toLocaleString()}</div>
            <div class="metric-label">Total Ordered</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${items.length}</div>
            <div class="metric-label">Items</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${onTimeRate}%</div>
            <div class="metric-label">Delivery Rate</div>
          </div>
          <div class="metric-card">
            <div class="metric-value" style="color:${ltColor}">${sanitizeHtml(s.leadTime)}</div>
            <div class="metric-label">Avg Lead Time</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${s.discount > 0 ? s.discount + '%' : '-'}</div>
            <div class="metric-label">Trade Discount</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${projects.length}</div>
            <div class="metric-label">Projects</div>
          </div>
        </div>

        <!-- Two columns -->
        <div class="supplier-detail-body">
          <!-- Left: Contact + Notes -->
          <div class="supplier-detail-left">
            <div class="detail-card">
              <h3>Contact Information</h3>
              <div class="contact-grid">
                <div class="contact-row"><span class="contact-label">Phone</span><span>${sanitizeHtml(s.phone || '-')}</span></div>
                <div class="contact-row"><span class="contact-label">Email</span><span class="email-link">${sanitizeHtml(s.email || '-')}</span></div>
                <div class="contact-row"><span class="contact-label">Website</span>${s.website ? `<a href="https://${sanitizeHtml(s.website)}" target="_blank" rel="noopener">${sanitizeHtml(s.website)}</a>` : '-'}</div>
                <div class="contact-row"><span class="contact-label">Address</span><span>${sanitizeHtml(s.address || '-')}</span></div>
              </div>
            </div>

            <div class="detail-card">
              <h3>Notes</h3>
              <textarea class="supplier-notes-edit" id="supplier-notes-textarea" rows="4" placeholder="Add notes about this supplier...">${sanitizeHtml(s.notes || '')}</textarea>
              <button class="btn btn-sm btn-outline" id="save-notes-btn" style="margin-top:8px">Save Notes</button>
            </div>

            <div class="detail-card">
              <h3>Associated Projects</h3>
              ${projects.length > 0 ? projects.map(p => `
                <div class="project-link-row">
                  <span class="project-dot"></span>
                  <span>${sanitizeHtml(p.name)}</span>
                  <span class="text-muted">${sanitizeHtml(p.client || '')}</span>
                </div>
              `).join('') : '<p class="text-muted">No projects use this supplier yet.</p>'}
            </div>

            ${s.termsDataUrl ? `
            <div class="detail-card">
              <h3>Supplier Terms</h3>
              <a href="${s.termsDataUrl}" download="${sanitizeHtml(s.name)}_terms.pdf" class="btn btn-sm btn-outline">Download Terms PDF</a>
            </div>
            ` : ''}
          </div>

          <!-- Right: Order History -->
          <div class="supplier-detail-right">
            <div class="detail-card">
              <h3>Order History (${items.length} items)</h3>
              ${items.length > 0 ? `
                <div class="order-history-list">
                  ${items.map(item => {
                    const stColor = statusColors[item.status] || '#94a3b8';
                    const isOverdue = item.status === 'ordered' && item.dueDate && new Date(item.dueDate) < new Date();
                    return `<div class="order-history-item ${isOverdue ? 'overdue' : ''}">
                      <div class="order-item-main">
                        <span class="order-item-name">${sanitizeHtml(item.name)}</span>
                        <span class="status-badge" style="background:${stColor}20;color:${stColor}">${sanitizeHtml(item.status)}</span>
                      </div>
                      <div class="order-item-meta">
                        <span>${sanitizeHtml(item.room || '-')}</span>
                        <span>&pound;${(item.trade || 0).toLocaleString()}</span>
                        <span>${sanitizeHtml((state.projects.find(p => p.id === item.projectId))?.name || '-')}</span>
                      </div>
                      ${isOverdue ? '<div class="overdue-flag">Overdue from this supplier</div>' : ''}
                    </div>`;
                  }).join('')}
                </div>
              ` : '<p class="text-muted">No items ordered from this supplier yet.</p>'}
            </div>

            <!-- Status breakdown -->
            ${items.length > 0 ? `
            <div class="detail-card">
              <h3>Status Breakdown</h3>
              <div class="status-breakdown">
                ${Object.entries(statusGroups).map(([status, group]) => {
                  const stColor = statusColors[status] || '#94a3b8';
                  const pct = Math.round(group.length / items.length * 100);
                  return `<div class="status-row">
                    <span class="status-label" style="color:${stColor}">${capitalize(status)}</span>
                    <div class="status-bar-track"><div class="status-bar-fill" style="width:${pct}%;background:${stColor}"></div></div>
                    <span class="status-count">${group.length}</span>
                  </div>`;
                }).join('')}
              </div>
            </div>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

// ══════════════════════════════════════════════════════════════════════════
//  ADD / EDIT SUPPLIER FORM
// ══════════════════════════════════════════════════════════════════════════
function showSupplierForm(existing = null) {
  const isEdit = !!existing;

  const body = `
    <form id="supplier-form" class="form-grid">
      <div class="form-group full">
        <label>Supplier Name <span class="required">*</span></label>
        <input type="text" name="name" value="${sanitizeHtml(existing?.name || '')}" required maxlength="100" placeholder="e.g. Farrow & Ball" />
      </div>
      <div class="form-group">
        <label>Category <span class="required">*</span></label>
        <select name="category" required>
          <option value="">Select category...</option>
          ${CATEGORIES.map(c => `<option value="${c.key}" ${existing?.category === c.key ? 'selected' : ''} style="color:${c.color}">${c.key}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Rating</label>
        <div class="rating-selector" id="rating-selector">
          ${[1,2,3,4,5].map(r => `<button type="button" class="rating-star-btn ${(existing?.rating || 0) >= r ? 'active' : ''}" data-star="${r}">${icons.star}</button>`).join('')}
          <input type="hidden" name="rating" value="${existing?.rating || 0}" />
        </div>
      </div>
      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" name="tradeAccount" ${existing?.tradeAccount ? 'checked' : ''} />
          Trade Account
        </label>
      </div>
      <div class="form-group">
        <label>Lead Time</label>
        <input type="text" name="leadTime" value="${sanitizeHtml(existing?.leadTime || '')}" placeholder="e.g. 3-4 weeks" />
      </div>
      <div class="form-group">
        <label>Trade Discount (%)</label>
        <input type="number" name="discount" min="0" max="100" step="1" value="${existing?.discount || 0}" />
      </div>
      <div class="form-group">
        <label>Phone</label>
        <input type="tel" name="phone" value="${sanitizeHtml(existing?.phone || '')}" placeholder="020 1234 5678" />
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" name="email" value="${sanitizeHtml(existing?.email || '')}" placeholder="trade@supplier.com" />
      </div>
      <div class="form-group full">
        <label>Website</label>
        <input type="text" name="website" value="${sanitizeHtml(existing?.website || '')}" placeholder="supplier.com" />
      </div>
      <div class="form-group full">
        <label>Address</label>
        <input type="text" name="address" value="${sanitizeHtml(existing?.address || '')}" placeholder="Street, City" />
      </div>
      <div class="form-group full">
        <label>Notes</label>
        <textarea name="notes" rows="3" placeholder="Notes about quality, service, specialities...">${sanitizeHtml(existing?.notes || '')}</textarea>
      </div>
      <div class="form-group full">
        <label>Upload Terms PDF (optional)</label>
        <input type="file" name="termsFile" accept=".pdf" id="terms-file-input" />
        ${existing?.termsDataUrl ? '<span class="text-muted">Existing file uploaded. Upload new to replace.</span>' : ''}
      </div>
    </form>
  `;

  showModal(isEdit ? 'Edit Supplier' : 'Add Supplier', body, [
    { id: 'cancel', label: 'Cancel', onClick: () => {} },
    ...(isEdit ? [{ id: 'delete', label: 'Delete', onClick: () => deleteSupplier(existing.id) }] : []),
    { id: 'save', label: isEdit ? 'Save Changes' : 'Add Supplier', primary: true, onClick: () => saveSupplier(existing?.id) },
  ]);

  // Wire up star rating selector
  setTimeout(() => {
    const selector = document.getElementById('rating-selector');
    if (selector) {
      selector.querySelectorAll('.rating-star-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const star = parseInt(btn.dataset.star);
          selector.querySelector('[name="rating"]').value = star;
          selector.querySelectorAll('.rating-star-btn').forEach((b, i) => {
            b.classList.toggle('active', i < star);
          });
        });
      });
    }
  }, 120);
}

function saveSupplier(existingId) {
  const form = document.getElementById('supplier-form');
  if (!form) return;
  const fd = new FormData(form);
  const state = getState();

  const data = {
    name: fd.get('name')?.trim(),
    category: fd.get('category'),
    rating: parseInt(fd.get('rating')) || 0,
    tradeAccount: !!fd.get('tradeAccount'),
    leadTime: fd.get('leadTime')?.trim() || '',
    discount: parseInt(fd.get('discount')) || 0,
    phone: fd.get('phone')?.trim() || '',
    email: fd.get('email')?.trim() || '',
    website: fd.get('website')?.trim() || '',
    address: fd.get('address')?.trim() || '',
    notes: fd.get('notes')?.trim() || '',
  };

  if (!data.name) { showToast('Supplier name is required', 'error'); return; }
  if (!data.category) { showToast('Category is required', 'error'); return; }

  // Handle terms PDF upload
  const fileInput = document.getElementById('terms-file-input');
  if (fileInput && fileInput.files.length > 0) {
    const reader = new FileReader();
    reader.onload = (e) => {
      data.termsDataUrl = e.target.result;
      finalizeSave(data, existingId, state);
    };
    reader.readAsDataURL(fileInput.files[0]);
  } else {
    // Preserve existing terms if editing
    if (existingId) {
      const existing = state.suppliers.find(s => s.id === existingId);
      if (existing?.termsDataUrl) data.termsDataUrl = existing.termsDataUrl;
    }
    finalizeSave(data, existingId, state);
  }
}

function finalizeSave(data, existingId, state) {
  if (existingId) {
    const idx = state.suppliers.findIndex(s => s.id === existingId);
    if (idx >= 0) state.suppliers[idx] = { ...state.suppliers[idx], ...data };
    addActivity('Supplier updated', `${data.name} details updated`, 'edit');
  } else {
    data.id = 'sup-' + generateId();
    state.suppliers.push(data);
    addActivity('Supplier added', `${data.name} (${data.category}) added to database`, 'plus');
  }

  setState(state);
  showToast(existingId ? 'Supplier updated' : 'Supplier added');
  closeModal();
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

function deleteSupplier(id) {
  const state = getState();
  const supplier = state.suppliers.find(s => s.id === id);
  if (!supplier) return;
  state.suppliers = state.suppliers.filter(s => s.id !== id);
  addActivity('Supplier deleted', `${supplier.name} removed from database`, 'trash');
  setState(state);
  showToast('Supplier deleted');
  closeModal();
  // Navigate back to list if on detail page
  if (detailSupplierId === id) {
    window.location.hash = '#/suppliers';
  }
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

// ══════════════════════════════════════════════════════════════════════════
//  CSV IMPORT / EXPORT
// ══════════════════════════════════════════════════════════════════════════
function exportSuppliersCsv() {
  const state = getState();
  const rows = state.suppliers.map(s => ({
    Name: s.name,
    Category: s.category,
    Rating: s.rating,
    TradeAccount: s.tradeAccount ? 'Yes' : 'No',
    LeadTime: s.leadTime,
    Discount: s.discount,
    Phone: s.phone,
    Email: s.email,
    Website: s.website,
    Address: s.address,
    Notes: s.notes || '',
  }));
  downloadAsCsv(rows, 'suppliers_export.csv');
  showToast('Suppliers exported as CSV');
}

function importSuppliersCsv(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text = e.target.result;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { showToast('CSV file appears empty', 'error'); return; }

      const headers = parseCSVLine(lines[0]);
      const nameIdx = headers.findIndex(h => h.toLowerCase().includes('name'));
      const catIdx = headers.findIndex(h => h.toLowerCase().includes('category') || h.toLowerCase().includes('cat'));
      if (nameIdx < 0) { showToast('CSV must have a "Name" column', 'error'); return; }

      const state = getState();
      let imported = 0;
      let skipped = 0;

      for (let i = 1; i < lines.length; i++) {
        const vals = parseCSVLine(lines[i]);
        if (!vals[nameIdx]?.trim()) { skipped++; continue; }

        // Check for duplicate name
        const name = vals[nameIdx].trim();
        if (state.suppliers.some(s => s.name.toLowerCase() === name.toLowerCase())) {
          skipped++;
          continue;
        }

        const ratingIdx = headers.findIndex(h => h.toLowerCase().includes('rating'));
        const tradeIdx = headers.findIndex(h => h.toLowerCase().includes('trade'));
        const leadIdx = headers.findIndex(h => h.toLowerCase().includes('lead'));
        const discountIdx = headers.findIndex(h => h.toLowerCase().includes('discount'));
        const phoneIdx = headers.findIndex(h => h.toLowerCase().includes('phone'));
        const emailIdx = headers.findIndex(h => h.toLowerCase().includes('email'));
        const websiteIdx = headers.findIndex(h => h.toLowerCase().includes('website') || h.toLowerCase().includes('web'));
        const addressIdx = headers.findIndex(h => h.toLowerCase().includes('address'));
        const notesIdx = headers.findIndex(h => h.toLowerCase().includes('notes'));

        const supplier = {
          id: 'sup-' + generateId(),
          name,
          category: (catIdx >= 0 ? vals[catIdx]?.trim() : '') || 'Furniture',
          rating: ratingIdx >= 0 ? clamp(parseInt(vals[ratingIdx]) || 0, 0, 5) : 3,
          tradeAccount: tradeIdx >= 0 ? (vals[tradeIdx]?.toLowerCase().includes('yes') || vals[tradeIdx]?.toLowerCase() === 'true') : false,
          leadTime: leadIdx >= 0 ? vals[leadIdx]?.trim() || '' : '',
          discount: discountIdx >= 0 ? parseInt(vals[discountIdx]) || 0 : 0,
          phone: phoneIdx >= 0 ? vals[phoneIdx]?.trim() || '' : '',
          email: emailIdx >= 0 ? vals[emailIdx]?.trim() || '' : '',
          website: websiteIdx >= 0 ? vals[websiteIdx]?.trim() || '' : '',
          address: addressIdx >= 0 ? vals[addressIdx]?.trim() || '' : '',
          notes: notesIdx >= 0 ? vals[notesIdx]?.trim() || '' : '',
        };

        // Validate category
        if (!CATEGORIES.some(c => c.key === supplier.category)) {
          supplier.category = CATEGORIES[0].key;
        }

        state.suppliers.push(supplier);
        imported++;
      }

      setState(state);
      addActivity('Suppliers imported', `${imported} suppliers imported from CSV`, 'upload');
      showToast(`Imported ${imported} suppliers${skipped > 0 ? ` (${skipped} skipped)` : ''}`);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (err) {
      showToast('Failed to parse CSV: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// ══════════════════════════════════════════════════════════════════════════
//  MOUNT
// ══════════════════════════════════════════════════════════════════════════
export function mount(el) {
  // Check if on detail page
  if (detailSupplierId) {
    mountDetailPage(el);
    return;
  }

  // Header buttons
  el.querySelector('#add-supplier-btn')?.addEventListener('click', () => showSupplierForm());
  el.querySelector('#export-csv-btn')?.addEventListener('click', exportSuppliersCsv);
  el.querySelector('#import-csv-btn')?.addEventListener('click', () => {
    document.getElementById('csv-file-input')?.click();
  });
  el.querySelector('#csv-file-input')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) importSuppliersCsv(file);
  });

  // Search
  const searchInput = el.querySelector('#supplier-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      refreshView(el);
    });
    searchInput.focus();
  }
  el.querySelector('#search-clear')?.addEventListener('click', () => {
    searchQuery = '';
    refreshView(el);
  });

  // View mode toggle
  el.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      viewMode = btn.dataset.mode;
      refreshView(el);
    });
  });

  // Category chips
  el.querySelectorAll('.chip[data-cat]').forEach(chip => {
    chip.addEventListener('click', () => {
      const cat = chip.dataset.cat;
      if (cat === 'all') {
        filterCategories.clear();
      } else {
        if (filterCategories.has(cat)) filterCategories.delete(cat);
        else filterCategories.add(cat);
      }
      refreshView(el);
    });
  });

  // Rating filter
  el.querySelectorAll('.rating-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      filterRatingMin = parseInt(btn.dataset.rating);
      refreshView(el);
    });
  });

  // Trade account filter
  el.querySelector('#trade-filter')?.addEventListener('change', (e) => {
    filterTradeOnly = e.target.checked;
    refreshView(el);
  });

  // Lead time filter
  el.querySelector('#lead-time-filter')?.addEventListener('change', (e) => {
    filterLeadTime = e.target.value;
    refreshView(el);
  });

  // Sort
  el.querySelector('#sort-select')?.addEventListener('change', (e) => {
    sortBy = e.target.value;
    refreshView(el);
  });
  el.querySelector('#sort-dir-btn')?.addEventListener('click', () => {
    sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    refreshView(el);
  });

  // Card expand
  el.querySelectorAll('.supplier-expand-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (expandedCards.has(id)) expandedCards.delete(id);
      else expandedCards.add(id);
      refreshView(el);
    });
  });

  // Card click to toggle (not on links/buttons)
  el.querySelectorAll('.supplier-card-main').forEach(main => {
    main.addEventListener('click', (e) => {
      if (e.target.closest('a') || e.target.closest('button') || e.target.closest('input')) return;
      const card = main.closest('.supplier-card');
      const id = card.dataset.id;
      if (expandedCards.has(id)) expandedCards.delete(id);
      else expandedCards.add(id);
      refreshView(el);
    });
  });

  // Edit buttons
  el.querySelectorAll('.edit-supplier-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const state = getState();
      const supplier = state.suppliers.find(s => s.id === btn.dataset.id);
      if (supplier) showSupplierForm(supplier);
    });
  });

  // Delete buttons
  el.querySelectorAll('.delete-supplier-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteSupplier(btn.dataset.id);
    });
  });

  // View full profile buttons
  el.querySelectorAll('.view-detail-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.location.hash = '#/suppliers/' + btn.dataset.id;
    });
  });

  // Order from supplier button
  el.querySelectorAll('.order-from-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const supplierName = btn.dataset.name;
      addActivity('Supplier order', `Quick order initiated from ${supplierName}`, 'plus');
      showToast(`Navigate to Procurement to add items from ${supplierName}`, 'info');
    });
  });

  // Copy email buttons
  el.querySelectorAll('.copy-email-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const email = btn.closest('.email-row')?.dataset.email;
      if (email) {
        navigator.clipboard.writeText(email).then(() => showToast('Email copied!')).catch(() => showToast('Failed to copy', 'error'));
      }
    });
  });

  // List row double-click to open detail
  el.querySelectorAll('.supplier-list-row').forEach(row => {
    row.addEventListener('dblclick', () => {
      window.location.hash = '#/suppliers/' + row.dataset.id;
    });
  });
}

function mountDetailPage(el) {
  const state = getState();
  const supplier = state.suppliers.find(s => s.id === detailSupplierId);
  if (!supplier) return;

  // Edit button
  el.querySelector('#edit-detail-btn')?.addEventListener('click', () => {
    showSupplierForm(supplier);
  });

  // Order from supplier
  el.querySelector('#order-from-detail-btn')?.addEventListener('click', () => {
    addActivity('Supplier order', `Quick order initiated from ${supplier.name}`, 'plus');
    showToast(`Navigate to Procurement to add items from ${supplier.name}`, 'info');
  });

  // Copy email
  el.querySelector('.copy-email-detail')?.addEventListener('click', (e) => {
    const email = e.target.dataset.email;
    if (email) {
      navigator.clipboard.writeText(email).then(() => showToast('Email copied!')).catch(() => showToast('Failed to copy', 'error'));
    }
  });

  // Save notes
  el.querySelector('#save-notes-btn')?.addEventListener('click', () => {
    const textarea = el.querySelector('#supplier-notes-textarea');
    if (!textarea) return;
    const st = getState();
    const s = st.suppliers.find(sup => sup.id === detailSupplierId);
    if (s) {
      s.notes = textarea.value.trim();
      setState(st);
      showToast('Notes saved');
    }
  });
}

function refreshView(el) {
  el.innerHTML = render();
  mount(el);
}

export function destroy() {
  searchQuery = '';
  filterCategories.clear();
  filterRatingMin = 0;
  filterTradeOnly = false;
  filterLeadTime = 'all';
  sortBy = 'name';
  sortDir = 'asc';
  expandedCards.clear();
  detailSupplierId = null;
}
