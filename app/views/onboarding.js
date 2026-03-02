// Onboarding wizard — first-run setup flow for new DesignDesk users

import { getState, updateState, addActivity } from '../store.js';
import { navigate } from '../router.js';
import { icons } from '../core/icons.js';
import { generateId, sanitizeHtml } from '../core/utils.js';
import { showToast } from '../components/toast.js';

const ONBOARDING_KEY = 'designdesk_onboarding_complete';
const LOGO_KEY = 'designdesk_logo';
const TOTAL_STEPS = 4;

let currentStep = 1;
let wizardData = {
  companyName: '',
  email: '',
  phone: '',
  address: '',
  vatNumber: '',
  markup: 30,
  currency: 'GBP',
  projectName: '',
  clientName: '',
  clientAddress: '',
  budget: '',
  startDate: new Date().toISOString().split('T')[0],
  logoDataUrl: ''
};
let animDirection = 'right';
let cleanupFns = [];

// ── Public: check if onboarding needed ──────────────────────────────────

export function isOnboardingComplete() {
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}

export function markOnboardingComplete() {
  localStorage.setItem(ONBOARDING_KEY, 'true');
}

// ── View API ────────────────────────────────────────────────────────────

export function render() {
  return `
    <div class="onboarding-container">
      <div class="onboarding-wrapper">
        ${renderHeader()}
        ${renderProgressBar()}
        ${renderStepIndicator()}
        <div class="onboarding-step-viewport">
          <div class="onboarding-step onboarding-step-enter-${animDirection}" id="onboarding-step-content">
            ${renderStepContent(currentStep)}
          </div>
        </div>
        ${renderFooter()}
      </div>
      <div class="onboarding-bg-decor"></div>
    </div>
  `;
}

export function mount(el) {
  cleanupFns = [];
  bindFooter(el);
  bindStepContent(el, currentStep);
}

export function destroy() {
  cleanupFns.forEach(fn => fn());
  cleanupFns = [];
}

// ── Header ──────────────────────────────────────────────────────────────

function renderHeader() {
  return `
    <div class="onboarding-header">
      <div class="onboarding-logo">
        <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="url(#ob-grad)"/>
          <path d="M8 12h16M8 16h12M8 20h8" stroke="white" stroke-width="2" stroke-linecap="round"/>
          <circle cx="24" cy="20" r="4" fill="white" fill-opacity="0.3"/>
          <defs><linearGradient id="ob-grad" x1="0" y1="0" x2="32" y2="32"><stop stop-color="#6366f1"/><stop offset="1" stop-color="#a855f7"/></linearGradient></defs>
        </svg>
        <span class="onboarding-logo-text">DesignDesk</span>
      </div>
    </div>
  `;
}

// ── Progress bar ────────────────────────────────────────────────────────

function renderProgressBar() {
  const pct = ((currentStep - 1) / (TOTAL_STEPS - 1)) * 100;
  return `
    <div class="onboarding-progress">
      <div class="onboarding-progress-bar" style="width:${pct}%;"></div>
    </div>
  `;
}

// ── Step indicator ──────────────────────────────────────────────────────

function renderStepIndicator() {
  const labels = ['Welcome', 'Studio', 'Project', 'Ready'];
  return `
    <div class="onboarding-steps">
      ${labels.map((label, i) => {
        const num = i + 1;
        const state = num < currentStep ? 'done' : num === currentStep ? 'active' : 'pending';
        return `
          <div class="onboarding-step-dot ${state}">
            <div class="onboarding-dot-circle">
              ${state === 'done'
                ? '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
                : `<span>${num}</span>`
              }
            </div>
            <span class="onboarding-dot-label">${label}</span>
          </div>
          ${num < TOTAL_STEPS ? '<div class="onboarding-step-line ' + (num < currentStep ? 'done' : '') + '"></div>' : ''}
        `;
      }).join('')}
    </div>
  `;
}

// ── Step content ────────────────────────────────────────────────────────

function renderStepContent(step) {
  switch (step) {
    case 1: return renderWelcome();
    case 2: return renderStudioDetails();
    case 3: return renderFirstProject();
    case 4: return renderReady();
    default: return '';
  }
}

function renderWelcome() {
  const logoPreview = wizardData.logoDataUrl
    ? `<img src="${wizardData.logoDataUrl}" class="onboarding-logo-preview" alt="Logo preview" />`
    : `<div class="onboarding-logo-placeholder">
        ${icons.image}
        <span>Upload your logo</span>
        <span class="text-muted">PNG, JPG, or SVG</span>
      </div>`;

  return `
    <div class="onboarding-step-inner onboarding-welcome">
      <div class="onboarding-welcome-icon">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <rect width="64" height="64" rx="16" fill="url(#welcome-grad)"/>
          <path d="M16 24h32M16 32h24M16 40h16" stroke="white" stroke-width="3" stroke-linecap="round"/>
          <circle cx="48" cy="40" r="8" fill="white" fill-opacity="0.3"/>
          <defs><linearGradient id="welcome-grad" x1="0" y1="0" x2="64" y2="64"><stop stop-color="#6366f1"/><stop offset="1" stop-color="#a855f7"/></linearGradient></defs>
        </svg>
      </div>
      <h2 class="onboarding-title">Welcome to DesignDesk!</h2>
      <p class="onboarding-subtitle">Let's set up your studio in 2 minutes. You can always change these settings later.</p>

      <div class="onboarding-logo-upload" id="logo-upload-area">
        ${logoPreview}
        <input type="file" id="logo-file-input" accept="image/png,image/jpeg,image/svg+xml" style="display:none;" />
      </div>
      ${wizardData.logoDataUrl ? '<button class="btn btn-outline btn-xs" id="remove-logo-btn" type="button">Remove logo</button>' : ''}
    </div>
  `;
}

function renderStudioDetails() {
  return `
    <div class="onboarding-step-inner">
      <h2 class="onboarding-title">Studio Details</h2>
      <p class="onboarding-subtitle">Tell us about your business. This info will appear on invoices and client documents.</p>

      <div class="onboarding-form">
        <div class="onboarding-form-grid">
          <div class="form-group">
            <label for="ob-company">Company Name <span class="required">*</span></label>
            <input type="text" id="ob-company" name="companyName" value="${sanitizeHtml(wizardData.companyName)}" placeholder="e.g. Studio Luxe Interiors" autocomplete="organization" />
          </div>
          <div class="form-group">
            <label for="ob-email">Email</label>
            <input type="email" id="ob-email" name="email" value="${sanitizeHtml(wizardData.email)}" placeholder="hello@yourstudio.com" autocomplete="email" />
          </div>
          <div class="form-group">
            <label for="ob-phone">Phone</label>
            <input type="tel" id="ob-phone" name="phone" value="${sanitizeHtml(wizardData.phone)}" placeholder="020 7946 0958" autocomplete="tel" />
          </div>
          <div class="form-group">
            <label for="ob-address">Address</label>
            <input type="text" id="ob-address" name="address" value="${sanitizeHtml(wizardData.address)}" placeholder="123 Design St, London SW1" autocomplete="street-address" />
          </div>
          <div class="form-group">
            <label for="ob-vat">VAT Number <span class="text-muted" style="font-weight:400;">(optional)</span></label>
            <input type="text" id="ob-vat" name="vatNumber" value="${sanitizeHtml(wizardData.vatNumber)}" placeholder="GB 123 4567 89" />
          </div>
          <div class="form-group">
            <label for="ob-currency">Currency</label>
            <select id="ob-currency" name="currency">
              <option value="GBP" ${wizardData.currency === 'GBP' ? 'selected' : ''}>GBP (£)</option>
              <option value="USD" ${wizardData.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
              <option value="EUR" ${wizardData.currency === 'EUR' ? 'selected' : ''}>EUR (&euro;)</option>
            </select>
          </div>
        </div>

        <div class="onboarding-markup-group">
          <label for="ob-markup">Default Markup: <strong id="markup-value">${wizardData.markup}%</strong></label>
          <input type="range" id="ob-markup" name="markup" min="15" max="50" value="${wizardData.markup}" />
          <div class="onboarding-markup-labels">
            <span>15%</span>
            <span>50%</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderFirstProject() {
  return `
    <div class="onboarding-step-inner">
      <h2 class="onboarding-title">Create Your First Project</h2>
      <p class="onboarding-subtitle">Get started right away, or skip and create a project later.</p>

      <div class="onboarding-form">
        <div class="onboarding-form-grid">
          <div class="form-group">
            <label for="ob-project-name">Project Name <span class="required">*</span></label>
            <input type="text" id="ob-project-name" name="projectName" value="${sanitizeHtml(wizardData.projectName)}" placeholder="e.g. Chelsea Townhouse" />
          </div>
          <div class="form-group">
            <label for="ob-client-name">Client Name</label>
            <input type="text" id="ob-client-name" name="clientName" value="${sanitizeHtml(wizardData.clientName)}" placeholder="e.g. James & Sarah Thompson" />
          </div>
          <div class="form-group">
            <label for="ob-client-address">Client Address</label>
            <input type="text" id="ob-client-address" name="clientAddress" value="${sanitizeHtml(wizardData.clientAddress)}" placeholder="45 Cheyne Walk, Chelsea SW3" />
          </div>
          <div class="form-group">
            <label for="ob-budget">Budget Estimate</label>
            <input type="number" id="ob-budget" name="budget" value="${wizardData.budget}" placeholder="e.g. 50000" min="0" step="100" />
          </div>
          <div class="form-group">
            <label for="ob-start-date">Start Date</label>
            <input type="date" id="ob-start-date" name="startDate" value="${wizardData.startDate}" />
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderReady() {
  const items = [];
  if (wizardData.companyName) items.push({ icon: icons.suppliers, label: 'Studio', value: wizardData.companyName });
  if (wizardData.currency) items.push({ icon: icons.pound, label: 'Currency', value: wizardData.currency });
  if (wizardData.markup) items.push({ icon: icons.invoicing, label: 'Default markup', value: wizardData.markup + '%' });
  if (wizardData.projectName) items.push({ icon: icons.dashboard, label: 'First project', value: wizardData.projectName });
  if (wizardData.logoDataUrl) items.push({ icon: icons.image, label: 'Logo', value: 'Uploaded' });

  return `
    <div class="onboarding-step-inner onboarding-ready">
      <div class="onboarding-ready-icon">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="30" fill="url(#ready-grad)" />
          <path d="M20 32l8 8 16-16" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
          <defs><linearGradient id="ready-grad" x1="0" y1="0" x2="64" y2="64"><stop stop-color="#10b981"/><stop offset="1" stop-color="#059669"/></linearGradient></defs>
        </svg>
      </div>
      <h2 class="onboarding-title">You're all set!</h2>
      <p class="onboarding-subtitle">Your studio is ready. Here's a summary of what we configured:</p>

      <div class="onboarding-summary">
        ${items.length > 0 ? items.map(item => `
          <div class="onboarding-summary-item">
            <span class="onboarding-summary-icon">${item.icon}</span>
            <span class="onboarding-summary-label">${item.label}</span>
            <span class="onboarding-summary-value">${sanitizeHtml(item.value)}</span>
          </div>
        `).join('') : '<p class="text-muted">No settings configured — you can set everything up in Settings.</p>'}
      </div>

      <div class="onboarding-quick-links">
        <h3>Quick actions to get started:</h3>
        <div class="onboarding-links-grid">
          <a href="#/procurement" class="onboarding-link-card">
            ${icons.procurement}
            <span>Add Items</span>
          </a>
          <a href="#/settings" class="onboarding-link-card">
            ${icons.settings}
            <span>Import Data</span>
          </a>
          <a href="#/client-portal" class="onboarding-link-card">
            ${icons.clientPortal}
            <span>Client Portal</span>
          </a>
        </div>
      </div>
    </div>
  `;
}

// ── Footer navigation ───────────────────────────────────────────────────

function renderFooter() {
  const isFirst = currentStep === 1;
  const isLast = currentStep === TOTAL_STEPS;
  const isProjectStep = currentStep === 3;

  return `
    <div class="onboarding-footer">
      <div class="onboarding-footer-left">
        ${!isFirst && !isLast ? `<button class="btn btn-outline btn-sm" id="ob-back-btn" type="button">
          ${icons.chevronLeft} Back
        </button>` : '<span></span>'}
      </div>
      <div class="onboarding-footer-right">
        ${isProjectStep ? `<button class="btn btn-outline btn-sm" id="ob-skip-btn" type="button">Skip for now</button>` : ''}
        ${isLast
          ? `<button class="btn btn-primary btn-sm" id="ob-finish-btn" type="button">Go to Dashboard ${icons.arrowRight}</button>`
          : `<button class="btn btn-primary btn-sm" id="ob-next-btn" type="button">Continue ${icons.chevronRight}</button>`
        }
      </div>
    </div>
  `;
}

// ── Interactivity binding ───────────────────────────────────────────────

function bindFooter(el) {
  const nextBtn = el.querySelector('#ob-next-btn');
  const backBtn = el.querySelector('#ob-back-btn');
  const skipBtn = el.querySelector('#ob-skip-btn');
  const finishBtn = el.querySelector('#ob-finish-btn');

  if (nextBtn) {
    const handler = () => {
      collectStepData();
      if (!validateCurrentStep()) return;
      animDirection = 'right';
      currentStep++;
      rerender(el);
    };
    nextBtn.addEventListener('click', handler);
    cleanupFns.push(() => nextBtn.removeEventListener('click', handler));
  }

  if (backBtn) {
    const handler = () => {
      collectStepData();
      animDirection = 'left';
      currentStep--;
      rerender(el);
    };
    backBtn.addEventListener('click', handler);
    cleanupFns.push(() => backBtn.removeEventListener('click', handler));
  }

  if (skipBtn) {
    const handler = () => {
      wizardData.projectName = '';
      wizardData.clientName = '';
      wizardData.clientAddress = '';
      wizardData.budget = '';
      animDirection = 'right';
      currentStep++;
      rerender(el);
    };
    skipBtn.addEventListener('click', handler);
    cleanupFns.push(() => skipBtn.removeEventListener('click', handler));
  }

  if (finishBtn) {
    const handler = () => {
      applyOnboardingData();
      markOnboardingComplete();
      showToast('Studio setup complete!', 'success', 3000);
      currentStep = 1;
      wizardData = { companyName: '', email: '', phone: '', address: '', vatNumber: '', markup: 30, currency: 'GBP', projectName: '', clientName: '', clientAddress: '', budget: '', startDate: new Date().toISOString().split('T')[0], logoDataUrl: '' };
      navigate('/dashboard');
    };
    finishBtn.addEventListener('click', handler);
    cleanupFns.push(() => finishBtn.removeEventListener('click', handler));
  }
}

function bindStepContent(el, step) {
  if (step === 1) {
    // Logo upload
    const uploadArea = el.querySelector('#logo-upload-area');
    const fileInput = el.querySelector('#logo-file-input');
    const removeBtn = el.querySelector('#remove-logo-btn');

    if (uploadArea && fileInput) {
      const clickHandler = () => fileInput.click();
      uploadArea.addEventListener('click', clickHandler);
      cleanupFns.push(() => uploadArea.removeEventListener('click', clickHandler));

      const changeHandler = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
          showToast('Logo must be under 2MB', 'warning');
          return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
          wizardData.logoDataUrl = ev.target.result;
          rerender(el);
        };
        reader.readAsDataURL(file);
      };
      fileInput.addEventListener('change', changeHandler);
      cleanupFns.push(() => fileInput.removeEventListener('change', changeHandler));

      // Drag and drop
      const dragOver = (e) => { e.preventDefault(); uploadArea.classList.add('drag-over'); };
      const dragLeave = () => uploadArea.classList.remove('drag-over');
      const drop = (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            wizardData.logoDataUrl = ev.target.result;
            rerender(el);
          };
          reader.readAsDataURL(file);
        }
      };
      uploadArea.addEventListener('dragover', dragOver);
      uploadArea.addEventListener('dragleave', dragLeave);
      uploadArea.addEventListener('drop', drop);
      cleanupFns.push(() => {
        uploadArea.removeEventListener('dragover', dragOver);
        uploadArea.removeEventListener('dragleave', dragLeave);
        uploadArea.removeEventListener('drop', drop);
      });
    }

    if (removeBtn) {
      const handler = () => {
        wizardData.logoDataUrl = '';
        rerender(el);
      };
      removeBtn.addEventListener('click', handler);
      cleanupFns.push(() => removeBtn.removeEventListener('click', handler));
    }
  }

  if (step === 2) {
    // Markup slider live update
    const slider = el.querySelector('#ob-markup');
    const valueLabel = el.querySelector('#markup-value');
    if (slider && valueLabel) {
      const handler = () => { valueLabel.textContent = slider.value + '%'; };
      slider.addEventListener('input', handler);
      cleanupFns.push(() => slider.removeEventListener('input', handler));
    }
  }

  // Keyboard: Enter to continue
  const keyHandler = (e) => {
    if (e.key === 'Enter' && !e.target.matches('textarea')) {
      const nextBtn = el.querySelector('#ob-next-btn') || el.querySelector('#ob-finish-btn');
      if (nextBtn) nextBtn.click();
    }
  };
  document.addEventListener('keydown', keyHandler);
  cleanupFns.push(() => document.removeEventListener('keydown', keyHandler));
}

// ── Collect form data from DOM ──────────────────────────────────────────

function collectStepData() {
  const fields = document.querySelectorAll('.onboarding-form input, .onboarding-form select');
  fields.forEach(field => {
    const name = field.name || field.id?.replace('ob-', '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (name && name in wizardData) {
      wizardData[name] = field.value;
    }
  });
}

// ── Validation ──────────────────────────────────────────────────────────

function validateCurrentStep() {
  if (currentStep === 2) {
    if (!wizardData.companyName.trim()) {
      showToast('Please enter your company name', 'warning');
      const field = document.getElementById('ob-company');
      if (field) { field.classList.add('field-invalid'); field.focus(); }
      return false;
    }
  }
  if (currentStep === 3) {
    // Project name is required only if they're not skipping
    if (!wizardData.projectName.trim()) {
      showToast('Please enter a project name, or click "Skip for now"', 'warning');
      const field = document.getElementById('ob-project-name');
      if (field) { field.classList.add('field-invalid'); field.focus(); }
      return false;
    }
  }
  return true;
}

// ── Apply collected data to store ───────────────────────────────────────

function applyOnboardingData() {
  const state = getState();
  if (!state) return;

  // Update settings
  const settings = state.settings || {};
  if (wizardData.companyName) settings.companyName = wizardData.companyName;
  if (wizardData.email) settings.email = wizardData.email;
  if (wizardData.phone) settings.phone = wizardData.phone;
  if (wizardData.address) settings.address = wizardData.address;
  if (wizardData.vatNumber) settings.vatNumber = wizardData.vatNumber;
  if (wizardData.markup) settings.defaultMarkup = Number(wizardData.markup);
  if (wizardData.currency) settings.currency = wizardData.currency;
  updateState('settings', settings);

  // Save logo
  if (wizardData.logoDataUrl) {
    try {
      localStorage.setItem(LOGO_KEY, wizardData.logoDataUrl);
    } catch (e) {
      console.warn('[onboarding] Could not save logo:', e);
    }
  }

  // Create first project if provided
  if (wizardData.projectName.trim()) {
    const newProject = {
      id: generateId(),
      name: wizardData.projectName.trim(),
      client: wizardData.clientName.trim() || '',
      address: wizardData.clientAddress.trim() || '',
      budget: wizardData.budget ? Number(wizardData.budget) : 0,
      startDate: wizardData.startDate || new Date().toISOString().split('T')[0],
      status: 'active',
      createdAt: new Date().toISOString()
    };
    const projects = state.projects || [];
    projects.push(newProject);
    updateState('projects', projects);
    updateState('activeProjectId', newProject.id);
    addActivity('Project created', `Created "${newProject.name}" during onboarding`, 'check');
  }
}

// ── Rerender ────────────────────────────────────────────────────────────

function rerender(el) {
  // Clean up old listeners
  cleanupFns.forEach(fn => fn());
  cleanupFns = [];

  const mainEl = el.closest('#app-main') || el;
  mainEl.innerHTML = render();
  mount(mainEl);
}
