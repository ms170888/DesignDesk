// Modal component — form validation, loading states, multi-step, focus trap, sizes

let modalEl = null;
let focusTrapCleanup = null;
let currentStepIndex = 0;
let stepData = {};

const SIZES = {
  sm: '420px',
  md: '560px',
  lg: '720px'
};

export function initModal() {
  modalEl = document.getElementById('modal-container');
  if (!modalEl) {
    modalEl = document.createElement('div');
    modalEl.id = 'modal-container';
    modalEl.className = 'modal-container';
    document.body.appendChild(modalEl);
  }
}

// ── Single-step modal ───────────────────────────────────────────────────

/**
 * @param {string} title
 * @param {string} bodyHtml
 * @param {Array} actions - [{ id, label, primary?, danger?, onClick?, validate? }]
 * @param {object} opts - { size: 'sm'|'md'|'lg', validation?: [{field, rules}] }
 */
export function showModal(title, bodyHtml, actions = [], opts = {}) {
  if (!modalEl) initModal();
  cleanupFocusTrap();

  const size = SIZES[opts.size] || SIZES.md;
  const actionsHtml = actions.map(a => {
    const cls = a.danger ? 'btn-danger' : a.primary ? 'btn-primary' : 'btn-outline';
    return `<button class="btn ${cls} btn-sm modal-action-btn" data-action="${a.id}" type="button">
      <span class="btn-label">${a.label}</span>
      <span class="btn-spinner" style="display:none;">
        <svg width="16" height="16" viewBox="0 0 16 16" class="spin-anim"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="28 10" stroke-linecap="round"/></svg>
      </span>
    </button>`;
  }).join('');

  modalEl.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal" style="max-width:${size};" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-header">
        <h3 id="modal-title">${title}</h3>
        <button class="modal-close" aria-label="Close" type="button">&times;</button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
      ${actionsHtml ? `<div class="modal-footer">${actionsHtml}</div>` : ''}
      <div class="modal-errors" style="display:none;"></div>
    </div>
  `;
  modalEl.classList.add('open');

  // Close handlers
  modalEl.querySelector('.modal-close').addEventListener('click', closeModal);
  modalEl.querySelector('.modal-backdrop').addEventListener('click', closeModal);

  // Action handlers
  actions.forEach(a => {
    const btn = modalEl.querySelector(`[data-action="${a.id}"]`);
    if (!btn) return;
    btn.addEventListener('click', async () => {
      // Validate if rules provided
      if (opts.validation) {
        const errors = runValidation(opts.validation);
        if (errors.length > 0) {
          showValidationErrors(errors);
          return;
        }
        clearValidationErrors();
      }

      if (a.validate) {
        const result = a.validate();
        if (result !== true) {
          showValidationErrors(Array.isArray(result) ? result : [result]);
          return;
        }
        clearValidationErrors();
      }

      if (a.onClick) {
        setButtonLoading(btn, true);
        try {
          await Promise.resolve(a.onClick());
        } catch (e) {
          console.error('[modal] Action error:', e);
          showValidationErrors([e.message || 'An error occurred']);
          setButtonLoading(btn, false);
          return;
        }
        setButtonLoading(btn, false);
        closeModal();
      } else {
        closeModal();
      }
    });
  });

  // Focus trap
  setupFocusTrap();

  // Focus first input
  const firstInput = modalEl.querySelector('input, select, textarea');
  if (firstInput) setTimeout(() => firstInput.focus(), 50);

  return modalEl;
}

// ── Multi-step modal ────────────────────────────────────────────────────

/**
 * @param {string} title
 * @param {Array} steps - [{ label, render: () => html, validate?: () => true|string[] }]
 * @param {function} onComplete - called with collected form data
 * @param {object} opts - { size }
 */
export function showStepModal(title, steps, onComplete, opts = {}) {
  if (!modalEl) initModal();
  cleanupFocusTrap();

  currentStepIndex = 0;
  stepData = {};

  const size = SIZES[opts.size] || SIZES.md;

  function renderCurrentStep() {
    const step = steps[currentStepIndex];
    const isFirst = currentStepIndex === 0;
    const isLast = currentStepIndex === steps.length - 1;

    const stepperHtml = steps.map((s, i) => {
      const state = i < currentStepIndex ? 'completed' : i === currentStepIndex ? 'active' : 'pending';
      return `<div class="stepper-step stepper-${state}">
        <div class="stepper-circle">${i < currentStepIndex ? '&#10003;' : i + 1}</div>
        <span class="stepper-label">${s.label}</span>
      </div>`;
    }).join('<div class="stepper-line"></div>');

    const bodyHtml = step.render(stepData);

    modalEl.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal" style="max-width:${size};" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-header">
          <h3 id="modal-title">${title}</h3>
          <button class="modal-close" aria-label="Close" type="button">&times;</button>
        </div>
        <div class="modal-stepper">${stepperHtml}</div>
        <div class="modal-body">${bodyHtml}</div>
        <div class="modal-errors" style="display:none;"></div>
        <div class="modal-footer">
          ${!isFirst ? '<button class="btn btn-outline btn-sm modal-step-prev" type="button">Back</button>' : '<span></span>'}
          <button class="btn btn-primary btn-sm modal-step-next" type="button">
            <span class="btn-label">${isLast ? 'Complete' : 'Next'}</span>
            <span class="btn-spinner" style="display:none;">
              <svg width="16" height="16" viewBox="0 0 16 16" class="spin-anim"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="28 10" stroke-linecap="round"/></svg>
            </span>
          </button>
        </div>
      </div>
    `;
    modalEl.classList.add('open');

    // Close
    modalEl.querySelector('.modal-close').addEventListener('click', closeModal);
    modalEl.querySelector('.modal-backdrop').addEventListener('click', closeModal);

    // Prev
    const prevBtn = modalEl.querySelector('.modal-step-prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        collectFormData();
        currentStepIndex--;
        renderCurrentStep();
      });
    }

    // Next / Complete
    const nextBtn = modalEl.querySelector('.modal-step-next');
    nextBtn.addEventListener('click', async () => {
      collectFormData();

      if (step.validate) {
        const result = step.validate(stepData);
        if (result !== true) {
          showValidationErrors(Array.isArray(result) ? result : [result]);
          return;
        }
        clearValidationErrors();
      }

      if (isLast) {
        setButtonLoading(nextBtn, true);
        try {
          await Promise.resolve(onComplete(stepData));
        } catch (e) {
          showValidationErrors([e.message || 'An error occurred']);
          setButtonLoading(nextBtn, false);
          return;
        }
        setButtonLoading(nextBtn, false);
        closeModal();
      } else {
        currentStepIndex++;
        renderCurrentStep();
      }
    });

    setupFocusTrap();
    const firstInput = modalEl.querySelector('input, select, textarea');
    if (firstInput) setTimeout(() => firstInput.focus(), 50);
  }

  renderCurrentStep();
}

function collectFormData() {
  if (!modalEl) return;
  const inputs = modalEl.querySelectorAll('[name]');
  inputs.forEach(input => {
    if (input.type === 'checkbox') {
      stepData[input.name] = input.checked;
    } else if (input.type === 'radio') {
      if (input.checked) stepData[input.name] = input.value;
    } else {
      stepData[input.name] = input.value;
    }
  });
}

// ── Confirm modal ───────────────────────────────────────────────────────

export function confirmModal(title, message, opts = {}) {
  return new Promise(resolve => {
    showModal(
      title,
      `<p style="margin:0;color:var(--color-text-muted,#475569);">${message}</p>`,
      [
        { id: 'cancel', label: opts.cancelLabel || 'Cancel', onClick: () => resolve(false) },
        {
          id: 'confirm',
          label: opts.confirmLabel || 'Confirm',
          primary: !opts.danger,
          danger: opts.danger || false,
          onClick: () => resolve(true)
        },
      ],
      { size: opts.size || 'sm' }
    );
    // If closed via backdrop/escape, resolve false
    const observer = new MutationObserver(() => {
      if (!modalEl.classList.contains('open')) {
        observer.disconnect();
        resolve(false);
      }
    });
    observer.observe(modalEl, { attributes: true, attributeFilter: ['class'] });
  });
}

// ── Close ───────────────────────────────────────────────────────────────

export function closeModal() {
  if (!modalEl) return;
  cleanupFocusTrap();
  modalEl.classList.remove('open');
  setTimeout(() => {
    if (modalEl) modalEl.innerHTML = '';
  }, 200);
}

// ── Validation helpers ──────────────────────────────────────────────────

function runValidation(rules) {
  const errors = [];
  for (const rule of rules) {
    const el = modalEl.querySelector(`[name="${rule.field}"]`);
    const value = el ? el.value.trim() : '';

    if (rule.required && !value) {
      errors.push(`${rule.label || rule.field} is required`);
      markFieldInvalid(el);
      continue;
    }
    if (rule.minLength && value.length < rule.minLength) {
      errors.push(`${rule.label || rule.field} must be at least ${rule.minLength} characters`);
      markFieldInvalid(el);
      continue;
    }
    if (rule.maxLength && value.length > rule.maxLength) {
      errors.push(`${rule.label || rule.field} must be under ${rule.maxLength} characters`);
      markFieldInvalid(el);
      continue;
    }
    if (rule.pattern && !rule.pattern.test(value)) {
      errors.push(rule.message || `${rule.label || rule.field} is invalid`);
      markFieldInvalid(el);
      continue;
    }
    if (rule.custom) {
      const msg = rule.custom(value);
      if (msg) {
        errors.push(msg);
        markFieldInvalid(el);
        continue;
      }
    }
    if (el) el.classList.remove('field-invalid');
  }
  return errors;
}

function markFieldInvalid(el) {
  if (el) el.classList.add('field-invalid');
}

function showValidationErrors(errors) {
  const errEl = modalEl.querySelector('.modal-errors');
  if (!errEl) return;
  errEl.style.display = 'block';
  errEl.innerHTML = errors.map(e =>
    `<div class="modal-error-item">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.2"/><path d="M5 5l4 4M9 5l-4 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
      ${e}
    </div>`
  ).join('');
}

function clearValidationErrors() {
  const errEl = modalEl?.querySelector('.modal-errors');
  if (errEl) {
    errEl.style.display = 'none';
    errEl.innerHTML = '';
  }
  modalEl?.querySelectorAll('.field-invalid').forEach(el => el.classList.remove('field-invalid'));
}

// ── Button loading state ────────────────────────────────────────────────

function setButtonLoading(btn, loading) {
  if (!btn) return;
  const label = btn.querySelector('.btn-label');
  const spinner = btn.querySelector('.btn-spinner');
  if (label) label.style.display = loading ? 'none' : '';
  if (spinner) spinner.style.display = loading ? 'inline-flex' : 'none';
  btn.disabled = loading;
}

// ── Focus trap ──────────────────────────────────────────────────────────

function setupFocusTrap() {
  cleanupFocusTrap();
  const modal = modalEl?.querySelector('.modal');
  if (!modal) return;

  const handler = (e) => {
    if (e.key !== 'Tab') return;
    const focusable = modal.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first || !modal.contains(document.activeElement)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last || !modal.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  document.addEventListener('keydown', handler);
  focusTrapCleanup = () => document.removeEventListener('keydown', handler);
}

function cleanupFocusTrap() {
  if (focusTrapCleanup) {
    focusTrapCleanup();
    focusTrapCleanup = null;
  }
}
