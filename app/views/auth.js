// Auth view — Login, Signup, Forgot Password with animated transitions
// Routes: #/login, #/signup, #/forgot-password

import { login, signup, forgotPassword, isAuthenticated } from '../core/auth.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';
import { icons } from '../core/icons.js';
import { sanitizeHtml } from '../core/utils.js';

let currentMode = 'login'; // 'login' | 'signup' | 'forgot'
let isSubmitting = false;
let fieldErrors = {};
let cleanupFns = [];

// ── SVG icons for the auth form ──────────────────────────────────────────

const authIcons = {
  mail: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="4" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M2 6l7 4 7-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  lock: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="4" y="8" width="10" height="8" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M6 8V6a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="9" cy="12" r="1" fill="currentColor"/></svg>`,
  user: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="6" r="3" stroke="currentColor" stroke-width="1.4"/><path d="M3 16c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  building: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="3" y="2" width="12" height="14" rx="1" stroke="currentColor" stroke-width="1.4"/><path d="M7 16v-3h4v3" stroke="currentColor" stroke-width="1.4"/><rect x="6" y="5" width="2" height="2" rx="0.5" fill="currentColor" opacity="0.5"/><rect x="10" y="5" width="2" height="2" rx="0.5" fill="currentColor" opacity="0.5"/><rect x="6" y="9" width="2" height="2" rx="0.5" fill="currentColor" opacity="0.5"/><rect x="10" y="9" width="2" height="2" rx="0.5" fill="currentColor" opacity="0.5"/></svg>`,
  eye: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M1 9s3.5-5 8-5 8 5 8 5-3.5 5-8 5-8-5-8-5z" stroke="currentColor" stroke-width="1.4"/><circle cx="9" cy="9" r="2.5" stroke="currentColor" stroke-width="1.4"/></svg>`,
  eyeOff: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 2l14 14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M5.6 5.6C3.9 6.9 2 9 2 9s3.5 5 7 5c1.4 0 2.7-.5 3.8-1.3" stroke="currentColor" stroke-width="1.4"/><path d="M9 4c4.5 0 8 5 8 5s-1 1.7-2.7 3" stroke="currentColor" stroke-width="1.4"/></svg>`,
  google: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M16.5 9.2c0-.6-.05-1.2-.16-1.7H9v3.3h4.2a3.6 3.6 0 0 1-1.56 2.36v1.96h2.52c1.48-1.36 2.33-3.36 2.33-5.85z" fill="#4285F4"/><path d="M9 17c2.1 0 3.87-.7 5.16-1.89l-2.52-1.96c-.7.47-1.59.74-2.64.74-2.03 0-3.75-1.37-4.36-3.21H2.04v2.02A7.99 7.99 0 0 0 9 17z" fill="#34A853"/><path d="M4.64 10.68A4.81 4.81 0 0 1 4.39 9c0-.58.1-1.15.25-1.68V5.3H2.04A7.99 7.99 0 0 0 1 9c0 1.29.31 2.51.86 3.59l2.78-1.91z" fill="#FBBC05"/><path d="M9 4.11c1.14 0 2.17.39 2.98 1.17l2.24-2.24A7.97 7.97 0 0 0 9 1 7.99 7.99 0 0 0 2.04 5.3L4.64 7.32c.61-1.84 2.33-3.21 4.36-3.21z" fill="#EA4335"/></svg>`,
  microsoft: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="1" width="7.5" height="7.5" fill="#F25022"/><rect x="9.5" y="1" width="7.5" height="7.5" fill="#7FBA00"/><rect x="1" y="9.5" width="7.5" height="7.5" fill="#00A4EF"/><rect x="9.5" y="9.5" width="7.5" height="7.5" fill="#FFB900"/></svg>`,
  arrowLeft: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  check: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

// ── Logo SVG ─────────────────────────────────────────────────────────────

const logoSvg = `
  <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
    <rect width="32" height="32" rx="8" fill="url(#auth-logo-grad)"/>
    <path d="M8 12h16M8 16h12M8 20h8" stroke="white" stroke-width="2" stroke-linecap="round"/>
    <circle cx="24" cy="20" r="4" fill="white" fill-opacity="0.3"/>
    <defs><linearGradient id="auth-logo-grad" x1="0" y1="0" x2="32" y2="32"><stop stop-color="#6366f1"/><stop offset="1" stop-color="#a855f7"/></linearGradient></defs>
  </svg>
`;

// ── Password strength checker ────────────────────────────────────────────

function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: 'Weak', color: 'var(--error)' };
  if (score <= 2) return { score: 2, label: 'Fair', color: 'var(--warning)' };
  if (score <= 3) return { score: 3, label: 'Good', color: 'var(--info)' };
  return { score: 4, label: 'Strong', color: 'var(--success)' };
}

// ── Render helpers ───────────────────────────────────────────────────────

function renderField(opts) {
  const { id, label, type = 'text', icon, placeholder, required = true, autocomplete, error } = opts;
  const errorHtml = error
    ? `<div class="auth-field-error">${error}</div>`
    : '';
  const errorClass = error ? ' auth-field-has-error' : '';
  const isPassword = type === 'password';

  return `
    <div class="auth-field${errorClass}" data-field="${id}">
      <label class="auth-label" for="auth-${id}">${label}${required ? '' : ' <span class="auth-optional">(optional)</span>'}</label>
      <div class="auth-input-wrap">
        ${icon ? `<span class="auth-input-icon">${icon}</span>` : ''}
        <input
          class="auth-input"
          id="auth-${id}"
          name="${id}"
          type="${type}"
          placeholder="${placeholder || ''}"
          ${required ? 'required' : ''}
          ${autocomplete ? `autocomplete="${autocomplete}"` : ''}
          spellcheck="false"
        />
        ${isPassword ? `<button class="auth-toggle-pw" type="button" data-toggle-pw="${id}" aria-label="Toggle password visibility">${authIcons.eye}</button>` : ''}
      </div>
      ${errorHtml}
    </div>
  `;
}

function renderLoginForm() {
  return `
    <form class="auth-form" id="auth-form" novalidate>
      ${renderField({ id: 'email', label: 'Email', type: 'email', icon: authIcons.mail, placeholder: 'you@company.com', autocomplete: 'email', error: fieldErrors.email })}
      ${renderField({ id: 'password', label: 'Password', type: 'password', icon: authIcons.lock, placeholder: 'Enter your password', autocomplete: 'current-password', error: fieldErrors.password })}

      <div class="auth-row auth-row-between">
        <label class="auth-checkbox">
          <input type="checkbox" id="auth-remember" />
          <span class="auth-checkbox-mark"></span>
          <span>Remember me</span>
        </label>
        <a href="#/forgot-password" class="auth-link" data-auth-mode="forgot">Forgot password?</a>
      </div>

      ${fieldErrors._form ? `<div class="auth-form-error">${fieldErrors._form}</div>` : ''}

      <button class="auth-submit" type="submit" id="auth-submit" ${isSubmitting ? 'disabled' : ''}>
        ${isSubmitting ? '<span class="auth-spinner"></span>' : ''}
        <span>Sign In</span>
      </button>
    </form>

    <div class="auth-divider"><span>or continue with</span></div>

    <div class="auth-social-row">
      <button class="auth-social-btn" type="button" data-provider="google">
        ${authIcons.google}
        <span>Google</span>
      </button>
      <button class="auth-social-btn" type="button" data-provider="microsoft">
        ${authIcons.microsoft}
        <span>Microsoft</span>
      </button>
    </div>

    <div class="auth-footer-text">
      Don't have an account? <a href="#/signup" class="auth-link" data-auth-mode="signup">Create one</a>
    </div>
  `;
}

function renderSignupForm() {
  return `
    <form class="auth-form" id="auth-form" novalidate>
      ${renderField({ id: 'name', label: 'Full Name', type: 'text', icon: authIcons.user, placeholder: 'Jane Smith', autocomplete: 'name', error: fieldErrors.name })}
      ${renderField({ id: 'email', label: 'Email', type: 'email', icon: authIcons.mail, placeholder: 'you@company.com', autocomplete: 'email', error: fieldErrors.email })}
      ${renderField({ id: 'company', label: 'Company', type: 'text', icon: authIcons.building, placeholder: 'Your studio or firm', required: false, autocomplete: 'organization', error: fieldErrors.company })}
      ${renderField({ id: 'password', label: 'Password', type: 'password', icon: authIcons.lock, placeholder: 'Min. 8 characters', autocomplete: 'new-password', error: fieldErrors.password })}

      <div class="auth-pw-strength" id="auth-pw-strength" style="display:none;">
        <div class="auth-pw-strength-bar">
          <div class="auth-pw-strength-fill" id="auth-pw-strength-fill"></div>
        </div>
        <span class="auth-pw-strength-label" id="auth-pw-strength-label"></span>
      </div>

      ${renderField({ id: 'confirmPassword', label: 'Confirm Password', type: 'password', icon: authIcons.lock, placeholder: 'Re-enter your password', autocomplete: 'new-password', error: fieldErrors.confirmPassword })}

      <label class="auth-checkbox auth-terms-checkbox ${fieldErrors.agreeTerms ? 'auth-checkbox-error' : ''}">
        <input type="checkbox" id="auth-agree-terms" />
        <span class="auth-checkbox-mark"></span>
        <span>I agree to the <a href="#" class="auth-link" onclick="event.preventDefault()">Terms of Service</a> and <a href="#" class="auth-link" onclick="event.preventDefault()">Privacy Policy</a></span>
      </label>
      ${fieldErrors.agreeTerms ? `<div class="auth-field-error" style="margin-top:-8px">${fieldErrors.agreeTerms}</div>` : ''}

      ${fieldErrors._form ? `<div class="auth-form-error">${fieldErrors._form}</div>` : ''}

      <button class="auth-submit" type="submit" id="auth-submit" ${isSubmitting ? 'disabled' : ''}>
        ${isSubmitting ? '<span class="auth-spinner"></span>' : ''}
        <span>Create Account</span>
      </button>
    </form>

    <div class="auth-divider"><span>or sign up with</span></div>

    <div class="auth-social-row">
      <button class="auth-social-btn" type="button" data-provider="google">
        ${authIcons.google}
        <span>Google</span>
      </button>
      <button class="auth-social-btn" type="button" data-provider="microsoft">
        ${authIcons.microsoft}
        <span>Microsoft</span>
      </button>
    </div>

    <div class="auth-footer-text">
      Already have an account? <a href="#/login" class="auth-link" data-auth-mode="login">Sign in</a>
    </div>
  `;
}

function renderForgotForm() {
  return `
    <form class="auth-form" id="auth-form" novalidate>
      <p class="auth-description">Enter the email address associated with your account and we'll send you a link to reset your password.</p>

      ${renderField({ id: 'email', label: 'Email', type: 'email', icon: authIcons.mail, placeholder: 'you@company.com', autocomplete: 'email', error: fieldErrors.email })}

      ${fieldErrors._form ? `<div class="auth-form-error">${fieldErrors._form}</div>` : ''}

      <button class="auth-submit" type="submit" id="auth-submit" ${isSubmitting ? 'disabled' : ''}>
        ${isSubmitting ? '<span class="auth-spinner"></span>' : ''}
        <span>Send Reset Link</span>
      </button>

      <div class="auth-footer-text" style="margin-top:16px;">
        <a href="#/login" class="auth-link auth-back-link" data-auth-mode="login">${authIcons.arrowLeft} Back to sign in</a>
      </div>
    </form>
  `;
}

function renderResetSent(email) {
  return `
    <div class="auth-success-state">
      <div class="auth-success-icon">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="22" stroke="var(--success)" stroke-width="2.5"/>
          <path d="M14 24l7 7 13-14" stroke="var(--success)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <h3 class="auth-success-title">Check your email</h3>
      <p class="auth-success-text">We've sent a password reset link to <strong>${sanitizeHtml(email)}</strong>. Please check your inbox and follow the instructions.</p>
      <p class="auth-success-hint">Didn't receive it? Check your spam folder or <a href="#/forgot-password" class="auth-link" data-auth-mode="forgot">try again</a>.</p>
      <div class="auth-footer-text" style="margin-top:20px;">
        <a href="#/login" class="auth-link auth-back-link" data-auth-mode="login">${authIcons.arrowLeft} Back to sign in</a>
      </div>
    </div>
  `;
}

// ── Mode titles & subtitles ──────────────────────────────────────────────

const modeConfig = {
  login: { title: 'Welcome back', subtitle: 'Sign in to your DesignDesk account' },
  signup: { title: 'Create your account', subtitle: 'Start managing projects in minutes' },
  forgot: { title: 'Reset your password', subtitle: 'We\'ll help you get back in' },
  'reset-sent': { title: '', subtitle: '' }
};

// ── Main render ──────────────────────────────────────────────────────────

export function render(params) {
  // Determine mode from route
  const hash = window.location.hash.slice(1) || '/login';
  if (hash.startsWith('/signup')) currentMode = 'signup';
  else if (hash.startsWith('/forgot-password')) currentMode = 'forgot';
  else currentMode = 'login';

  const config = modeConfig[currentMode];
  let formContent;
  switch (currentMode) {
    case 'signup': formContent = renderSignupForm(); break;
    case 'forgot': formContent = renderForgotForm(); break;
    default: formContent = renderLoginForm(); break;
  }

  return `
    <div class="auth-container">
      <div class="auth-bg-pattern"></div>
      <div class="auth-card" data-mode="${currentMode}">
        <div class="auth-card-gradient"></div>
        <div class="auth-card-body">
          <div class="auth-header">
            <div class="auth-logo">${logoSvg}</div>
            <h1 class="auth-title">${config.title}</h1>
            <p class="auth-subtitle">${config.subtitle}</p>
          </div>

          ${currentMode === 'login' ? `
            <div class="auth-demo-banner">
              <span class="auth-demo-icon">${authIcons.check}</span>
              <span>Demo: <strong>demo@designdesk.app</strong> / <strong>demo1234</strong></span>
            </div>
          ` : ''}

          <div class="auth-content" id="auth-content">
            ${formContent}
          </div>
        </div>

        <div class="auth-card-footer">
          <a href="index.html" class="auth-back-site">${authIcons.arrowLeft} Back to site</a>
        </div>
      </div>
    </div>
  `;
}

// ── Mount ────────────────────────────────────────────────────────────────

export function mount(el, params) {
  cleanup();

  // Mode switch links
  setupModeLinks(el);

  // Form submission
  setupForm(el);

  // Password visibility toggle
  setupPasswordToggles(el);

  // Password strength (signup only)
  if (currentMode === 'signup') {
    setupPasswordStrength(el);
  }

  // Social login buttons
  setupSocialButtons(el);

  // Auto-focus first input
  const firstInput = el.querySelector('.auth-input');
  if (firstInput) setTimeout(() => firstInput.focus(), 100);
}

export function destroy() {
  cleanup();
}

function cleanup() {
  cleanupFns.forEach(fn => fn());
  cleanupFns = [];
  fieldErrors = {};
  isSubmitting = false;
}

// ── Mode switching ───────────────────────────────────────────────────────

function setupModeLinks(el) {
  const handler = (e) => {
    const link = e.target.closest('[data-auth-mode]');
    if (!link) return;
    // Let the router handle it via href
  };
  el.addEventListener('click', handler);
  cleanupFns.push(() => el.removeEventListener('click', handler));
}

// ── Form handling ────────────────────────────────────────────────────────

function setupForm(el) {
  const form = el.querySelector('#auth-form');
  if (!form) return;

  const handler = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    fieldErrors = {};
    clearFieldErrors(el);

    switch (currentMode) {
      case 'login': await handleLogin(el); break;
      case 'signup': await handleSignup(el); break;
      case 'forgot': await handleForgot(el); break;
    }
  };

  form.addEventListener('submit', handler);
  cleanupFns.push(() => form.removeEventListener('submit', handler));

  // Live validation on blur
  const blurHandler = (e) => {
    if (e.target.classList.contains('auth-input')) {
      validateFieldLive(el, e.target);
    }
  };
  form.addEventListener('focusout', blurHandler);
  cleanupFns.push(() => form.removeEventListener('focusout', blurHandler));
}

function setSubmitting(el, loading) {
  isSubmitting = loading;
  const btn = el.querySelector('#auth-submit');
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    btn.querySelector('span:last-child').textContent = '';
    const spinner = document.createElement('span');
    spinner.className = 'auth-spinner';
    btn.insertBefore(spinner, btn.firstChild);
  } else {
    const spinner = btn.querySelector('.auth-spinner');
    if (spinner) spinner.remove();
    const labelSpan = btn.querySelector('span:last-child');
    if (currentMode === 'login') labelSpan.textContent = 'Sign In';
    else if (currentMode === 'signup') labelSpan.textContent = 'Create Account';
    else if (currentMode === 'forgot') labelSpan.textContent = 'Send Reset Link';
  }
}

async function handleLogin(el) {
  const email = el.querySelector('#auth-email')?.value.trim();
  const password = el.querySelector('#auth-password')?.value;
  const rememberMe = el.querySelector('#auth-remember')?.checked || false;

  // Client-side validation
  if (!email) {
    showFieldError(el, 'email', 'Email is required');
    return;
  }
  if (!password) {
    showFieldError(el, 'password', 'Password is required');
    return;
  }

  setSubmitting(el, true);

  // Simulate network delay
  await delay(600);

  const result = login(email, password, rememberMe);

  if (result.success) {
    showToast(`Welcome back, ${result.user.name}!`, 'success', 2000);
    // Small delay for toast visibility
    await delay(300);
    // Redirect to saved URL or dashboard
    let returnUrl = sessionStorage.getItem('designdesk_return_url') || '/dashboard';
    sessionStorage.removeItem('designdesk_return_url');
    // Validate return URL is a safe internal path (starts with /) and not a protocol handler
    if (!returnUrl || !returnUrl.startsWith('/') || returnUrl.startsWith('//') || returnUrl.includes(':')) {
      returnUrl = '/dashboard';
    }
    window.location.hash = returnUrl;
    // Force full page reload to re-init the app shell
    window.location.reload();
  } else {
    setSubmitting(el, false);
    showFormError(el, result.error);
  }
}

async function handleSignup(el) {
  const data = {
    name: el.querySelector('#auth-name')?.value.trim(),
    email: el.querySelector('#auth-email')?.value.trim(),
    company: el.querySelector('#auth-company')?.value.trim(),
    password: el.querySelector('#auth-password')?.value,
    confirmPassword: el.querySelector('#auth-confirmPassword')?.value,
    agreeTerms: el.querySelector('#auth-agree-terms')?.checked || false
  };

  setSubmitting(el, true);
  await delay(800);

  const result = signup(data);

  if (result.success) {
    showToast('Account created! Welcome to DesignDesk.', 'success', 3000);
    await delay(300);
    window.location.hash = '/dashboard';
    window.location.reload();
  } else if (result.errors) {
    setSubmitting(el, false);
    Object.entries(result.errors).forEach(([field, msg]) => {
      showFieldError(el, field, msg);
    });
  }
}

async function handleForgot(el) {
  const email = el.querySelector('#auth-email')?.value.trim();

  if (!email) {
    showFieldError(el, 'email', 'Email is required');
    return;
  }

  setSubmitting(el, true);
  await delay(1000);

  const result = forgotPassword(email);

  if (result.success) {
    // Replace form with success state
    const contentEl = el.querySelector('#auth-content');
    if (contentEl) {
      contentEl.innerHTML = renderResetSent(email);
      // Update header
      const titleEl = el.querySelector('.auth-title');
      const subtitleEl = el.querySelector('.auth-subtitle');
      if (titleEl) titleEl.style.display = 'none';
      if (subtitleEl) subtitleEl.style.display = 'none';
    }
  } else {
    setSubmitting(el, false);
    showFieldError(el, 'email', result.error);
  }
}

// ── Field validation ─────────────────────────────────────────────────────

function validateFieldLive(el, input) {
  const name = input.name;
  const value = input.value.trim();
  const fieldWrap = input.closest('.auth-field');

  // Clear previous error on this field
  if (fieldWrap) {
    fieldWrap.classList.remove('auth-field-has-error');
    const existing = fieldWrap.querySelector('.auth-field-error');
    if (existing) existing.remove();
  }

  // Validate specific fields
  if (name === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    showFieldError(el, 'email', 'Please enter a valid email');
  }
  if (name === 'password' && value && value.length < 8) {
    showFieldError(el, 'password', 'Must be at least 8 characters');
  }
  if (name === 'confirmPassword' && value) {
    const pw = el.querySelector('#auth-password')?.value;
    if (pw && value !== pw) {
      showFieldError(el, 'confirmPassword', 'Passwords do not match');
    }
  }
  if (name === 'name' && value && value.length < 2) {
    showFieldError(el, 'name', 'Name must be at least 2 characters');
  }
}

function showFieldError(el, fieldName, message) {
  fieldErrors[fieldName] = message;
  const field = el.querySelector(`[data-field="${fieldName}"]`);
  if (!field) return;
  field.classList.add('auth-field-has-error');
  // Remove existing error
  const existing = field.querySelector('.auth-field-error');
  if (existing) existing.remove();
  // Add error
  const errorDiv = document.createElement('div');
  errorDiv.className = 'auth-field-error';
  errorDiv.textContent = message;
  field.appendChild(errorDiv);
}

function showFormError(el, message) {
  fieldErrors._form = message;
  const form = el.querySelector('#auth-form');
  if (!form) return;
  // Remove existing
  const existing = form.querySelector('.auth-form-error');
  if (existing) existing.remove();
  // Add before submit button
  const submitBtn = form.querySelector('.auth-submit');
  const errorDiv = document.createElement('div');
  errorDiv.className = 'auth-form-error';
  errorDiv.textContent = message;
  form.insertBefore(errorDiv, submitBtn);
}

function clearFieldErrors(el) {
  el.querySelectorAll('.auth-field-has-error').forEach(f => f.classList.remove('auth-field-has-error'));
  el.querySelectorAll('.auth-field-error').forEach(e => e.remove());
  el.querySelectorAll('.auth-form-error').forEach(e => e.remove());
}

// ── Password visibility toggle ───────────────────────────────────────────

function setupPasswordToggles(el) {
  const handler = (e) => {
    const btn = e.target.closest('[data-toggle-pw]');
    if (!btn) return;
    const fieldId = btn.dataset.togglePw;
    const input = el.querySelector(`#auth-${fieldId}`);
    if (!input) return;

    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    btn.innerHTML = isHidden ? authIcons.eyeOff : authIcons.eye;
  };
  el.addEventListener('click', handler);
  cleanupFns.push(() => el.removeEventListener('click', handler));
}

// ── Password strength indicator ──────────────────────────────────────────

function setupPasswordStrength(el) {
  const input = el.querySelector('#auth-password');
  const strengthEl = el.querySelector('#auth-pw-strength');
  const fillEl = el.querySelector('#auth-pw-strength-fill');
  const labelEl = el.querySelector('#auth-pw-strength-label');
  if (!input || !strengthEl || !fillEl || !labelEl) return;

  const handler = () => {
    const val = input.value;
    if (!val) {
      strengthEl.style.display = 'none';
      return;
    }
    strengthEl.style.display = 'flex';
    const strength = getPasswordStrength(val);
    fillEl.style.width = `${(strength.score / 4) * 100}%`;
    fillEl.style.backgroundColor = strength.color;
    labelEl.textContent = strength.label;
    labelEl.style.color = strength.color;
  };
  input.addEventListener('input', handler);
  cleanupFns.push(() => input.removeEventListener('input', handler));
}

// ── Social login buttons ─────────────────────────────────────────────────

function setupSocialButtons(el) {
  const handler = (e) => {
    const btn = e.target.closest('[data-provider]');
    if (!btn) return;
    const provider = btn.dataset.provider;
    showToast(`${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-in coming soon`, 'info', 3000);
  };
  el.addEventListener('click', handler);
  cleanupFns.push(() => el.removeEventListener('click', handler));
}

// ── Utility ──────────────────────────────────────────────────────────────

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
