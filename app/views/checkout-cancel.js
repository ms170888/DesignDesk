// Checkout cancellation page — reassurance, links back to pricing and support

import { icons } from '../core/icons.js';
import { navigate } from '../router.js';

export function render() {
  return `
    <div class="checkout-cancel">
      <div class="checkout-cancel-card">
        <div class="checkout-cancel-icon">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="30" stroke="var(--text-muted)" stroke-width="2.5" fill="var(--bg)" />
            <path d="M32 20v16" stroke="var(--text-secondary)" stroke-width="3" stroke-linecap="round"/>
            <circle cx="32" cy="44" r="2.5" fill="var(--text-secondary)"/>
          </svg>
        </div>

        <h1 class="checkout-cancel-title">No worries!</h1>
        <p class="checkout-cancel-subtitle">
          Your checkout was cancelled and you haven't been charged.
          You can always come back when you're ready.
        </p>

        <div class="checkout-cancel-actions">
          <button class="btn btn-primary" id="back-pricing-btn">Back to Pricing</button>
          <button class="btn btn-outline" id="back-dashboard-btn">Go to Dashboard</button>
        </div>

        <div class="checkout-cancel-help">
          <p>Have questions? We're here to help.</p>
          <a href="mailto:support@designdesk.app" class="checkout-cancel-link">
            ${icons.send}
            <span>Contact Support</span>
          </a>
        </div>
      </div>
    </div>
  `;
}

export function mount(el) {
  const pricingBtn = el.querySelector('#back-pricing-btn');
  if (pricingBtn) pricingBtn.addEventListener('click', () => navigate('/pricing'));

  const dashBtn = el.querySelector('#back-dashboard-btn');
  if (dashBtn) dashBtn.addEventListener('click', () => navigate('/dashboard'));
}

export function destroy() {}
