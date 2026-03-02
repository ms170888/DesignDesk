// Settings — production settings page with all sections

import { getState, setState, resetStore, exportData, importData, checkStorageQuota } from '../store.js';
import { seedData } from '../seed-data.js';
import { showToast } from '../components/toast.js';
import { icons } from '../core/icons.js';
import { formatCurrency, downloadAsJson, downloadAsCsv, sanitizeHtml } from '../core/utils.js';

const LOGO_KEY = 'designdesk_logo';
let activeSection = 'studio';
let compactMode = localStorage.getItem('designdesk_compact') === 'true';

const SECTIONS = [
  { key: 'studio', label: 'Studio Information', icon: icons.suppliers },
  { key: 'defaults', label: 'Project Defaults', icon: icons.settings },
  { key: 'data', label: 'Data Management', icon: icons.dashboard },
  { key: 'appearance', label: 'Appearance', icon: icons.palette },
  { key: 'shortcuts', label: 'Keyboard Shortcuts', icon: icons.grid },
  { key: 'about', label: 'About', icon: icons.ai },
];

export function render() {
  const state = getState();
  const settings = state ? state.settings : {};
  const quota = checkStorageQuota();

  return `
    <div class="view-settings">
      <div class="view-header">
        <h1>Settings</h1>
      </div>

      <div class="settings-layout">
        <nav class="settings-nav">
          ${SECTIONS.map(s => `
            <button class="settings-nav-btn ${activeSection === s.key ? 'active' : ''}" data-section="${s.key}">
              ${s.icon}
              <span>${s.label}</span>
            </button>
          `).join('')}
        </nav>

        <div class="settings-panel">
          ${activeSection === 'studio' ? renderStudio(settings) : ''}
          ${activeSection === 'defaults' ? renderDefaults(settings) : ''}
          ${activeSection === 'data' ? renderData(quota) : ''}
          ${activeSection === 'appearance' ? renderAppearance() : ''}
          ${activeSection === 'shortcuts' ? renderShortcuts() : ''}
          ${activeSection === 'about' ? renderAbout() : ''}
        </div>
      </div>
    </div>
  `;
}

// ── Studio Information ──────────────────────────────────────────────────

function renderStudio(settings) {
  const rawLogo = localStorage.getItem(LOGO_KEY) || '';
  // Only allow data: URIs for logo to prevent javascript: or other injection
  const logo = rawLogo && /^data:image\/(png|jpeg|gif|svg\+xml|webp);base64,/.test(rawLogo) ? rawLogo : '';

  return `
    <div class="settings-section">
      <h2>Studio Information</h2>
      <p class="settings-desc">Your business details shown on invoices, presentations, and the client portal.</p>

      <div class="settings-form">
        <div class="settings-form-grid">
          <div class="form-group">
            <label for="s-company-name">Company Name</label>
            <input type="text" id="s-company-name" value="${sanitizeHtml(settings.companyName || '')}" placeholder="DesignDesk Studio" />
          </div>
          <div class="form-group">
            <label for="s-address">Address</label>
            <input type="text" id="s-address" value="${sanitizeHtml(settings.address || '')}" placeholder="123 Design Street, London SW1" />
          </div>
          <div class="form-group">
            <label for="s-phone">Phone</label>
            <input type="tel" id="s-phone" value="${sanitizeHtml(settings.phone || '')}" placeholder="020 7946 0958" />
          </div>
          <div class="form-group">
            <label for="s-email">Email</label>
            <input type="email" id="s-email" value="${sanitizeHtml(settings.email || '')}" placeholder="hello@designdeskstudio.co.uk" />
          </div>
          <div class="form-group">
            <label for="s-website">Website</label>
            <input type="text" id="s-website" value="${sanitizeHtml(settings.website || '')}" placeholder="designdeskstudio.co.uk" />
          </div>
          <div class="form-group">
            <label for="s-company-reg">Company Registration</label>
            <input type="text" id="s-company-reg" value="${sanitizeHtml(settings.companyReg || '')}" placeholder="12345678" />
          </div>
          <div class="form-group">
            <label for="s-vat-number">VAT Number</label>
            <input type="text" id="s-vat-number" value="${sanitizeHtml(settings.vatNumber || '')}" placeholder="GB 123 4567 89" />
          </div>
          <div class="form-group">
            <label for="s-payment-terms">Default Payment Terms</label>
            <input type="text" id="s-payment-terms" value="${sanitizeHtml(settings.paymentTerms || '')}" placeholder="Payment due within 30 days" />
          </div>
        </div>

        <div class="form-group settings-bank-details">
          <label for="s-bank-details">Bank Details (for invoice footers)</label>
          <textarea id="s-bank-details" rows="3" placeholder="Sort Code: 00-00-00&#10;Account Number: 12345678&#10;Account Name: DesignDesk Studio Ltd">${sanitizeHtml(settings.bankDetails || '')}</textarea>
        </div>

        <div class="form-group settings-logo-group">
          <label>Studio Logo</label>
          <div class="settings-logo-row">
            <div class="settings-logo-preview" id="logo-preview">
              ${logo ? `<img src="${logo}" alt="Logo" />` : '<span class="settings-logo-placeholder">No logo uploaded</span>'}
            </div>
            <div class="settings-logo-actions">
              <button class="btn btn-outline btn-sm" id="upload-logo">${icons.upload} Upload Logo</button>
              ${logo ? `<button class="btn btn-outline btn-sm settings-danger" id="remove-logo">${icons.trash} Remove</button>` : ''}
              <input type="file" id="logo-file-input" accept="image/*" style="display:none" />
            </div>
          </div>
        </div>

        <button class="btn btn-primary" id="save-studio">Save Studio Information</button>
      </div>
    </div>
  `;
}

// ── Project Defaults ────────────────────────────────────────────────────

function renderDefaults(settings) {
  const vatRate = settings.vatRate ?? 20;
  const markup = settings.defaultMarkup ?? 30;
  const currency = settings.currency || 'GBP';

  const vatPresets = [0, 5, 20];
  const currencies = [
    { code: 'GBP', symbol: '\u00A3', label: 'British Pound (\u00A3)' },
    { code: 'EUR', symbol: '\u20AC', label: 'Euro (\u20AC)' },
    { code: 'USD', symbol: '$', label: 'US Dollar ($)' },
  ];

  // Preview calculation
  const sampleTrade = 1000;
  const sampleClient = sampleTrade * (1 + markup / 100);
  const sampleVat = sampleClient * (vatRate / 100);
  const sampleTotal = sampleClient + sampleVat;

  return `
    <div class="settings-section">
      <h2>Project Defaults</h2>
      <p class="settings-desc">Default values applied to new items and invoices. Can be overridden per item.</p>

      <div class="settings-form">
        <div class="form-group">
          <label for="s-vat-rate">Default VAT Rate</label>
          <div class="settings-slider-row">
            <input type="range" id="s-vat-rate" min="0" max="25" step="1" value="${vatRate}" class="settings-slider" />
            <span class="settings-slider-value" id="vat-display">${vatRate}%</span>
          </div>
          <div class="settings-presets">
            ${vatPresets.map(v => `<button class="settings-preset-btn ${v === vatRate ? 'active' : ''}" data-vat="${v}">${v}%</button>`).join('')}
          </div>
        </div>

        <div class="form-group">
          <label for="s-markup">Default Markup Percentage</label>
          <div class="settings-slider-row">
            <input type="range" id="s-markup" min="0" max="100" step="5" value="${markup}" class="settings-slider" />
            <span class="settings-slider-value" id="markup-display">${markup}%</span>
          </div>
        </div>

        <div class="form-group">
          <label for="s-currency">Default Currency</label>
          <select id="s-currency" class="settings-select">
            ${currencies.map(c => `<option value="${c.code}" ${c.code === currency ? 'selected' : ''}>${c.label}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label for="s-invoice-terms">Default Invoice Payment Terms</label>
          <select id="s-invoice-terms" class="settings-select">
            <option value="14" ${(settings.invoiceTermsDays || 30) === 14 ? 'selected' : ''}>14 days</option>
            <option value="30" ${(settings.invoiceTermsDays || 30) === 30 ? 'selected' : ''}>30 days</option>
            <option value="60" ${(settings.invoiceTermsDays || 30) === 60 ? 'selected' : ''}>60 days</option>
            <option value="0" ${(settings.invoiceTermsDays || 30) === 0 ? 'selected' : ''}>Due on receipt</option>
          </select>
        </div>

        <div class="settings-preview-card">
          <h4>Preview Calculation</h4>
          <p class="text-muted">Based on a ${formatCurrency(sampleTrade)} trade cost item:</p>
          <div class="settings-preview-grid">
            <span>Trade Cost:</span><strong>${formatCurrency(sampleTrade)}</strong>
            <span>+ Markup (${markup}%):</span><strong>${formatCurrency(sampleClient - sampleTrade)}</strong>
            <span>Client Price:</span><strong>${formatCurrency(sampleClient)}</strong>
            <span>+ VAT (${vatRate}%):</span><strong>${formatCurrency(sampleVat)}</strong>
            <span class="settings-preview-total">Total:</span><strong class="settings-preview-total">${formatCurrency(sampleTotal)}</strong>
          </div>
        </div>

        <button class="btn btn-primary" id="save-defaults">Save Defaults</button>
      </div>
    </div>
  `;
}

// ── Data Management ─────────────────────────────────────────────────────

function renderData(quota) {
  const pct = quota.percentUsed;
  const barColor = pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#10b981';

  return `
    <div class="settings-section">
      <h2>Data Management</h2>
      <p class="settings-desc">Export, import, and manage your project data. All data is stored locally in your browser.</p>

      <div class="settings-storage">
        <h4>Storage Usage</h4>
        <div class="settings-storage-bar">
          <div class="settings-storage-fill" style="width:${Math.min(pct, 100)}%;background:${barColor}"></div>
        </div>
        <span class="settings-storage-label">${quota.usedMB} MB / ${quota.estimatedLimitMB} MB (${pct}%)</span>
      </div>

      <div class="settings-data-group">
        <h4>Export Data</h4>
        <div class="settings-data-actions">
          <button class="btn btn-outline btn-sm" id="export-json">${icons.upload} Export All Data (JSON)</button>
          <button class="btn btn-outline btn-sm" id="export-procurement-csv">${icons.upload} Procurement (CSV)</button>
          <button class="btn btn-outline btn-sm" id="export-suppliers-csv">${icons.upload} Suppliers (CSV)</button>
          <button class="btn btn-outline btn-sm" id="export-invoices-csv">${icons.upload} Invoices (CSV)</button>
          <button class="btn btn-outline btn-sm" id="export-schedule-csv">${icons.upload} Schedule (CSV)</button>
        </div>
      </div>

      <div class="settings-data-group">
        <h4>Import Data</h4>
        <p class="text-muted">Import a previously exported JSON file. This will replace all current data.</p>
        <button class="btn btn-outline btn-sm" id="import-json">${icons.upload} Import Data (JSON)</button>
        <input type="file" id="import-file-input" accept=".json,application/json" style="display:none" />
      </div>

      <div class="settings-data-group settings-danger-zone">
        <h4>Danger Zone</h4>
        <div class="settings-data-actions">
          <div class="settings-danger-item">
            <div>
              <strong>Reset Demo Data</strong>
              <p class="text-muted">Restore all data to original demo state. Your changes will be lost.</p>
            </div>
            <button class="btn btn-outline btn-sm settings-danger-btn" id="reset-demo">${icons.reset} Reset Demo</button>
          </div>
          <div class="settings-danger-item">
            <div>
              <strong>Clear All Data</strong>
              <p class="text-muted">Permanently delete all data including settings and customizations.</p>
            </div>
            <button class="btn btn-outline btn-sm settings-danger-btn" id="clear-all">${icons.trash} Clear Everything</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ── Appearance ──────────────────────────────────────────────────────────

function renderAppearance() {
  const themes = [
    { key: 'light', label: 'Light', active: true },
    { key: 'dark', label: 'Dark', active: false },
    { key: 'system', label: 'System', active: false },
  ];

  return `
    <div class="settings-section">
      <h2>Appearance</h2>
      <p class="settings-desc">Customise the look and feel of your DesignDesk workspace.</p>

      <div class="settings-form">
        <div class="form-group">
          <label>Theme</label>
          <div class="settings-theme-grid">
            ${themes.map(t => `
              <button class="settings-theme-btn ${t.active ? 'active' : ''}" data-theme="${t.key}">
                <div class="settings-theme-preview settings-theme-${t.key}">
                  <div class="theme-preview-sidebar"></div>
                  <div class="theme-preview-content">
                    <div class="theme-preview-bar"></div>
                    <div class="theme-preview-body"></div>
                  </div>
                </div>
                <span>${t.label}</span>
                ${!t.active && t.key !== 'light' ? '<span class="settings-coming-soon">Coming soon</span>' : ''}
              </button>
            `).join('')}
          </div>
        </div>

        <div class="form-group">
          <label>Compact Mode</label>
          <div class="settings-toggle-row">
            <span>Reduce padding and spacing throughout the app</span>
            <label class="settings-toggle">
              <input type="checkbox" id="s-compact-mode" ${compactMode ? 'checked' : ''} />
              <span class="settings-toggle-slider"></span>
            </label>
          </div>
        </div>

        <div class="form-group">
          <label>Currency Format Preview</label>
          <div class="settings-currency-preview">
            <div class="settings-currency-sample">
              <span>Standard:</span><strong>${formatCurrency(12500)}</strong>
            </div>
            <div class="settings-currency-sample">
              <span>Decimal:</span><strong>${formatCurrency(1234.56)}</strong>
            </div>
            <div class="settings-currency-sample">
              <span>Large:</span><strong>${formatCurrency(185000)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ── Keyboard Shortcuts ──────────────────────────────────────────────────

function renderShortcuts() {
  const groups = [
    {
      name: 'Global',
      shortcuts: [
        { keys: ['Ctrl', 'K'], desc: 'Open quick search' },
        { keys: ['Ctrl', 'Z'], desc: 'Undo last action' },
        { keys: ['Ctrl', 'Shift', 'Z'], desc: 'Redo last action' },
        { keys: ['Esc'], desc: 'Close modals and dialogs' },
      ]
    },
    {
      name: 'Navigation',
      shortcuts: [
        { keys: ['1'], desc: 'Go to Dashboard' },
        { keys: ['2'], desc: 'Go to Procurement' },
        { keys: ['3'], desc: 'Go to Schedule' },
        { keys: ['4'], desc: 'Go to Invoicing' },
        { keys: ['5'], desc: 'Go to Suppliers' },
      ]
    },
    {
      name: 'Procurement',
      shortcuts: [
        { keys: ['N'], desc: 'New item' },
        { keys: ['Enter'], desc: 'Edit selected item' },
        { keys: ['Delete'], desc: 'Remove selected item' },
        { keys: ['Ctrl', 'F'], desc: 'Focus search field' },
      ]
    },
    {
      name: 'Schedule',
      shortcuts: [
        { keys: ['\u2190', '\u2192'], desc: 'Pan timeline left / right' },
        { keys: ['+', '-'], desc: 'Zoom in / out' },
        { keys: ['T'], desc: 'Jump to today' },
      ]
    },
    {
      name: 'Presentations',
      shortcuts: [
        { keys: ['\u2190'], desc: 'Previous slide' },
        { keys: ['\u2192', 'Space'], desc: 'Next slide' },
        { keys: ['Esc'], desc: 'Exit presentation mode' },
        { keys: ['F'], desc: 'Enter fullscreen' },
      ]
    },
    {
      name: 'Floor Plan',
      shortcuts: [
        { keys: ['Delete'], desc: 'Remove selected element' },
        { keys: ['Ctrl', 'D'], desc: 'Duplicate element' },
        { keys: ['G'], desc: 'Toggle grid snap' },
        { keys: ['R'], desc: 'Rotate element' },
      ]
    },
  ];

  return `
    <div class="settings-section">
      <h2>Keyboard Shortcuts</h2>
      <p class="settings-desc">Quick reference for all keyboard shortcuts available throughout the app.</p>

      <div class="settings-shortcuts">
        ${groups.map(g => `
          <div class="settings-shortcut-group">
            <h4>${g.name}</h4>
            <div class="settings-shortcut-list">
              ${g.shortcuts.map(s => `
                <div class="settings-shortcut-row">
                  <div class="settings-shortcut-keys">
                    ${s.keys.map(k => `<kbd>${k}</kbd>`).join(' <span class="settings-kbd-plus">+</span> ')}
                  </div>
                  <span class="settings-shortcut-desc">${s.desc}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ── About ───────────────────────────────────────────────────────────────

function renderAbout() {
  return `
    <div class="settings-section">
      <h2>About DesignDesk</h2>

      <div class="settings-about">
        <div class="settings-about-logo">
          <svg width="48" height="48" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="url(#abg)"/><path d="M8 12h16M8 16h12M8 20h8" stroke="white" stroke-width="2" stroke-linecap="round"/><defs><linearGradient id="abg" x1="0" y1="0" x2="32" y2="32"><stop stop-color="#6366f1"/><stop offset="1" stop-color="#a855f7"/></linearGradient></defs></svg>
          <div>
            <h3>DesignDesk Studio</h3>
            <p class="text-muted">Interior Design Project Management</p>
          </div>
        </div>

        <div class="settings-about-info">
          <div class="settings-about-row"><span>Version</span><strong>1.0.0</strong></div>
          <div class="settings-about-row"><span>Build</span><strong>2026.02.27</strong></div>
          <div class="settings-about-row"><span>Architecture</span><strong>Vanilla JS, zero dependencies</strong></div>
          <div class="settings-about-row"><span>Data Storage</span><strong>Browser localStorage</strong></div>
          <div class="settings-about-row"><span>Bundle Size</span><strong>~45 KB (uncompressed)</strong></div>
        </div>

        <div class="settings-about-features">
          <h4>Features</h4>
          <ul>
            <li>Procurement tracking with trade/client pricing</li>
            <li>Interactive Gantt schedule with dependencies</li>
            <li>Professional invoicing with PDF export</li>
            <li>Supplier database with ratings and trade accounts</li>
            <li>Visual mood board builder</li>
            <li>Interactive floor plan editor</li>
            <li>Client portal with approvals and messaging</li>
            <li>AI assistant with natural language queries</li>
            <li>Presentation builder with 8 slide templates</li>
            <li>Full undo/redo with keyboard shortcuts</li>
          </ul>
        </div>

        <div class="settings-about-credits">
          <p class="text-muted">Built with care for interior designers who need powerful tools without the complexity. All data stays in your browser &mdash; no server, no accounts, no subscriptions.</p>
          <a href="#/" class="settings-about-link">&larr; Back to Landing Page</a>
        </div>
      </div>
    </div>
  `;
}

// ── Mount ───────────────────────────────────────────────────────────────

export function mount(el) {
  // Section navigation
  el.querySelectorAll('.settings-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeSection = btn.dataset.section;
      el.innerHTML = render();
      mount(el);
    });
  });

  // ── Studio Information
  el.querySelector('#save-studio')?.addEventListener('click', () => {
    const state = getState();
    if (!state) return;
    state.settings.companyName = el.querySelector('#s-company-name')?.value || '';
    state.settings.address = el.querySelector('#s-address')?.value || '';
    state.settings.phone = el.querySelector('#s-phone')?.value || '';
    state.settings.email = el.querySelector('#s-email')?.value || '';
    state.settings.website = el.querySelector('#s-website')?.value || '';
    state.settings.companyReg = el.querySelector('#s-company-reg')?.value || '';
    state.settings.vatNumber = el.querySelector('#s-vat-number')?.value || '';
    state.settings.paymentTerms = el.querySelector('#s-payment-terms')?.value || '';
    state.settings.bankDetails = el.querySelector('#s-bank-details')?.value || '';
    setState(state);
    showToast('Studio information saved');
  });

  // Logo upload
  el.querySelector('#upload-logo')?.addEventListener('click', () => {
    el.querySelector('#logo-file-input')?.click();
  });
  el.querySelector('#logo-file-input')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error');
      return;
    }
    if (file.size > 500 * 1024) {
      showToast('Image must be under 500KB', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        localStorage.setItem(LOGO_KEY, ev.target.result);
        showToast('Logo uploaded');
        el.innerHTML = render();
        mount(el);
      } catch {
        showToast('Failed to save logo — file may be too large', 'error');
      }
    };
    reader.readAsDataURL(file);
  });
  el.querySelector('#remove-logo')?.addEventListener('click', () => {
    localStorage.removeItem(LOGO_KEY);
    showToast('Logo removed');
    el.innerHTML = render();
    mount(el);
  });

  // ── Project Defaults
  const vatSlider = el.querySelector('#s-vat-rate');
  const vatDisplay = el.querySelector('#vat-display');
  if (vatSlider && vatDisplay) {
    vatSlider.addEventListener('input', () => {
      vatDisplay.textContent = `${vatSlider.value}%`;
    });
  }

  const markupSlider = el.querySelector('#s-markup');
  const markupDisplay = el.querySelector('#markup-display');
  if (markupSlider && markupDisplay) {
    markupSlider.addEventListener('input', () => {
      markupDisplay.textContent = `${markupSlider.value}%`;
    });
  }

  // VAT presets
  el.querySelectorAll('.settings-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = parseInt(btn.dataset.vat);
      if (vatSlider) { vatSlider.value = val; vatSlider.dispatchEvent(new Event('input')); }
      el.querySelectorAll('.settings-preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  el.querySelector('#save-defaults')?.addEventListener('click', () => {
    const state = getState();
    if (!state) return;
    state.settings.vatRate = parseFloat(el.querySelector('#s-vat-rate')?.value) || 20;
    state.settings.defaultMarkup = parseFloat(el.querySelector('#s-markup')?.value) || 30;
    state.settings.currency = el.querySelector('#s-currency')?.value || 'GBP';
    state.settings.invoiceTermsDays = parseInt(el.querySelector('#s-invoice-terms')?.value) || 30;
    setState(state);
    showToast('Defaults saved');
    // Re-render to update preview
    el.innerHTML = render();
    mount(el);
  });

  // ── Data Management: Exports
  el.querySelector('#export-json')?.addEventListener('click', () => {
    const data = exportData();
    if (data) {
      downloadAsJson(data, 'designdesk-export.json');
      showToast('Data exported as JSON');
    }
  });

  el.querySelector('#export-procurement-csv')?.addEventListener('click', () => {
    const state = getState();
    if (!state) return;
    const rows = state.items.map(i => ({
      Name: i.name, Supplier: i.supplier, Room: i.room, Category: i.category,
      'Trade Price': i.trade, 'Markup %': i.markup,
      'Client Price': (i.trade * (1 + i.markup / 100)).toFixed(2),
      Status: i.status, Notes: i.notes || ''
    }));
    downloadAsCsv(rows, 'procurement-export.csv');
    showToast('Procurement data exported');
  });

  el.querySelector('#export-suppliers-csv')?.addEventListener('click', () => {
    const state = getState();
    if (!state) return;
    const rows = state.suppliers.map(s => ({
      Name: s.name, Category: s.category, Rating: s.rating,
      'Trade Account': s.tradeAccount ? 'Yes' : 'No',
      'Lead Time': s.leadTime, Discount: s.discount + '%',
      Phone: s.phone, Email: s.email, Website: s.website
    }));
    downloadAsCsv(rows, 'suppliers-export.csv');
    showToast('Supplier data exported');
  });

  el.querySelector('#export-invoices-csv')?.addEventListener('click', () => {
    const state = getState();
    if (!state) return;
    const rows = state.invoices.map(inv => {
      const invItems = inv.items.map(id => state.items.find(i => i.id === id)).filter(Boolean);
      const subtotal = invItems.reduce((s, i) => s + i.trade * (1 + i.markup / 100), 0);
      const total = subtotal * (1 + inv.vatRate / 100);
      return {
        Number: inv.number, Date: inv.date, 'Due Date': inv.dueDate || '',
        Status: inv.status, Subtotal: subtotal.toFixed(2), 'VAT Rate': inv.vatRate + '%',
        Total: total.toFixed(2), 'Paid Date': inv.paidDate || '', Notes: inv.notes || ''
      };
    });
    downloadAsCsv(rows, 'invoices-export.csv');
    showToast('Invoice data exported');
  });

  el.querySelector('#export-schedule-csv')?.addEventListener('click', () => {
    const state = getState();
    if (!state) return;
    const rows = state.tasks.map(t => ({
      Task: t.name, Contractor: t.contractor, Phase: t.phase,
      Start: t.start, End: t.end, 'Progress %': t.progress,
      Dependencies: (t.depends || []).join(', ')
    }));
    downloadAsCsv(rows, 'schedule-export.csv');
    showToast('Schedule data exported');
  });

  // Import
  el.querySelector('#import-json')?.addEventListener('click', () => {
    el.querySelector('#import-file-input')?.click();
  });
  el.querySelector('#import-file-input')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!confirm(`Import data from "${file.name}"? This will replace ALL current data. This cannot be undone.`)) return;
        const success = importData(data);
        if (success) {
          showToast('Data imported successfully');
          el.innerHTML = render();
          mount(el);
        } else {
          showToast('Import failed — invalid data format', 'error');
        }
      } catch {
        showToast('Import failed — could not parse JSON file', 'error');
      }
    };
    reader.readAsText(file);
  });

  // Reset demo
  el.querySelector('#reset-demo')?.addEventListener('click', () => {
    if (!confirm('Reset all data to demo state? You will lose:\n\n- All item changes\n- All invoice edits\n- All schedule modifications\n- All mood board customisations\n- All supplier edits\n- All settings changes\n\nThis cannot be undone.')) return;
    resetStore(seedData);
    localStorage.removeItem(LOGO_KEY);
    showToast('Demo data restored');
    window.location.hash = '/dashboard';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });

  // Clear all
  el.querySelector('#clear-all')?.addEventListener('click', () => {
    if (!confirm('DELETE ALL DATA? This is permanent and cannot be undone.')) return;
    if (!confirm('Are you absolutely sure? Type OK in the next prompt to confirm.')) return;
    localStorage.clear();
    showToast('All data cleared', 'warning');
    window.location.hash = '/';
    window.location.reload();
  });

  // ── Appearance
  el.querySelectorAll('.settings-theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      if (theme !== 'light') {
        showToast(`${theme.charAt(0).toUpperCase() + theme.slice(1)} theme coming soon!`, 'info');
        return;
      }
      el.querySelectorAll('.settings-theme-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  el.querySelector('#s-compact-mode')?.addEventListener('change', (e) => {
    compactMode = e.target.checked;
    localStorage.setItem('designdesk_compact', compactMode);
    document.body.classList.toggle('compact-mode', compactMode);
    showToast(compactMode ? 'Compact mode enabled' : 'Compact mode disabled');
  });
}

export function destroy() {
  activeSection = 'studio';
}
