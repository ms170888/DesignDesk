// Billing management — current plan, payment method, invoice history, cancel subscription

import { icons } from '../core/icons.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';
import { confirmModal } from '../components/modal.js';
import {
  PLANS, getCurrentPlan, getCurrentPlanId, getSubscription,
  getInvoiceHistory, getPaymentMethod, getUsageStats,
  cancelSubscription, reactivateSubscription, formatPlanPrice
} from '../core/payments.js';

// ── Render ──────────────────────────────────────────────────────────────

export function render() {
  const plan = getCurrentPlan();
  const planId = getCurrentPlanId();
  const sub = getSubscription();
  const invoices = getInvoiceHistory();
  const paymentMethod = getPaymentMethod();
  const usage = getUsageStats();

  return `
    <div class="view-billing">
      <div class="view-header">
        <h1>Billing & Subscription</h1>
        <p style="color:var(--text-secondary);margin-top:0.25rem;">Manage your plan, payment method, and invoices.</p>
      </div>

      <div class="billing-grid">
        ${renderCurrentPlan(plan, planId, sub)}
        ${renderPaymentMethod(paymentMethod, planId)}
        ${renderUsageStats(usage)}
      </div>

      ${renderInvoiceHistory(invoices)}

      ${planId !== 'free' ? renderDangerZone(sub) : ''}
    </div>
  `;
}

// ── Current Plan Card ───────────────────────────────────────────────────

function renderCurrentPlan(plan, planId, sub) {
  const billingCycle = sub?.billingCycle || 'monthly';
  const price = billingCycle === 'annual' ? plan.priceAnnual : plan.price;
  const nextBilling = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'N/A';
  const isCancelling = sub?.cancelAtPeriodEnd;

  return `
    <div class="billing-card billing-plan-card">
      <div class="billing-card-header">
        <h3>Current Plan</h3>
        <span class="plan-badge" style="background:${plan.color}20;color:${plan.color};">${plan.name}</span>
      </div>
      <div class="billing-card-body">
        <div class="billing-plan-price">
          ${plan.price === 0
            ? '<span class="billing-price-amount">Free</span>'
            : `<span class="billing-price-amount">&pound;${price}</span>
               <span class="billing-price-period">/ ${billingCycle === 'annual' ? 'month (billed annually)' : 'month'}</span>`
          }
        </div>

        ${isCancelling ? `
          <div class="billing-cancel-notice">
            ${icons.warning}
            <span>Your subscription will end on ${nextBilling}. You'll be downgraded to the Free plan.</span>
          </div>
        ` : ''}

        ${planId !== 'free' && !isCancelling ? `
          <div class="billing-next-billing">
            <span class="billing-label">Next billing date</span>
            <span class="billing-value">${nextBilling}</span>
          </div>
        ` : ''}

        <div class="billing-plan-status">
          <span class="billing-label">Status</span>
          <span class="billing-status-badge billing-status-${sub?.status || 'active'}">
            ${isCancelling ? 'Cancelling' : (sub?.status === 'active' ? 'Active' : planId === 'free' ? 'Free Trial' : 'Inactive')}
          </span>
        </div>
      </div>
      <div class="billing-card-footer">
        ${isCancelling
          ? `<button class="btn btn-primary btn-sm" id="reactivate-btn">Reactivate Subscription</button>`
          : `<button class="btn btn-primary btn-sm" id="change-plan-btn">
               ${planId === 'free' ? 'Upgrade Plan' : 'Change Plan'}
             </button>`
        }
      </div>
    </div>
  `;
}

// ── Payment Method Card ─────────────────────────────────────────────────

function renderPaymentMethod(pm, planId) {
  if (planId === 'free' || !pm) {
    return `
      <div class="billing-card billing-payment-card">
        <div class="billing-card-header">
          <h3>Payment Method</h3>
        </div>
        <div class="billing-card-body">
          <div class="billing-empty-payment">
            ${icons.payment}
            <p>No payment method on file</p>
            <span style="color:var(--text-muted);font-size:0.85rem;">Add a payment method when you upgrade to a paid plan.</span>
          </div>
        </div>
      </div>
    `;
  }

  const brandIcon = getCardBrandSvg(pm.brand);

  return `
    <div class="billing-card billing-payment-card">
      <div class="billing-card-header">
        <h3>Payment Method</h3>
      </div>
      <div class="billing-card-body">
        <div class="billing-payment-display">
          <div class="billing-card-visual">
            <div class="billing-card-chip"></div>
            <div class="billing-card-number">&bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; ${pm.last4}</div>
            <div class="billing-card-meta">
              <div>
                <span class="billing-card-meta-label">Name</span>
                <span>${pm.name}</span>
              </div>
              <div>
                <span class="billing-card-meta-label">Expires</span>
                <span>${String(pm.expMonth).padStart(2, '0')}/${pm.expYear}</span>
              </div>
            </div>
            <div class="billing-card-brand">${brandIcon}</div>
          </div>
        </div>
      </div>
      <div class="billing-card-footer">
        <button class="btn btn-outline btn-sm" id="update-payment-btn">Update Payment Method</button>
      </div>
    </div>
  `;
}

function getCardBrandSvg(brand) {
  // Simple VISA text mark
  return `<svg width="48" height="16" viewBox="0 0 48 16" fill="none">
    <text x="0" y="13" fill="white" font-family="Inter, sans-serif" font-weight="700" font-size="14" letter-spacing="2">${brand.toUpperCase()}</text>
  </svg>`;
}

// ── Usage Stats ─────────────────────────────────────────────────────────

function renderUsageStats(usage) {
  const projectPercent = typeof usage.projects.limit === 'number'
    ? Math.min(100, usage.projects.percentUsed)
    : 0;
  const userPercent = typeof usage.users.limit === 'number'
    ? Math.min(100, usage.users.percentUsed)
    : 0;

  return `
    <div class="billing-card billing-usage-card">
      <div class="billing-card-header">
        <h3>Usage</h3>
      </div>
      <div class="billing-card-body">
        <div class="billing-usage-item">
          <div class="billing-usage-header">
            <span>Projects</span>
            <span class="billing-usage-count">${usage.projects.current} / ${usage.projects.limit}</span>
          </div>
          <div class="billing-usage-bar">
            <div class="billing-usage-fill" style="width:${projectPercent}%;background:${projectPercent > 80 ? 'var(--warning)' : 'var(--primary)'};"></div>
          </div>
        </div>
        <div class="billing-usage-item">
          <div class="billing-usage-header">
            <span>Team Members</span>
            <span class="billing-usage-count">${usage.users.current} / ${usage.users.limit}</span>
          </div>
          <div class="billing-usage-bar">
            <div class="billing-usage-fill" style="width:${userPercent}%;background:${userPercent > 80 ? 'var(--warning)' : 'var(--primary)'};"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ── Invoice History ─────────────────────────────────────────────────────

function renderInvoiceHistory(invoices) {
  if (!invoices || invoices.length === 0) {
    return `
      <div class="billing-section">
        <h2>Invoice History</h2>
        <div class="billing-empty-invoices">
          ${icons.receipt}
          <p>No invoices yet</p>
          <span style="color:var(--text-muted);font-size:0.85rem;">Invoices will appear here once you subscribe to a paid plan.</span>
        </div>
      </div>
    `;
  }

  const rows = invoices.map(inv => {
    const date = new Date(inv.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return `
      <tr class="invoice-row">
        <td>${inv.number}</td>
        <td>${date}</td>
        <td>${inv.plan} (${inv.billingCycle})</td>
        <td>&pound;${inv.amount.toFixed(2)}</td>
        <td>
          <span class="billing-status-badge billing-status-${inv.status}">${inv.status}</span>
        </td>
        <td>
          <button class="btn btn-ghost btn-xs invoice-download-btn" data-invoice="${inv.id}" title="Download PDF">
            ${icons.download}
          </button>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="billing-section">
      <h2>Invoice History</h2>
      <div class="billing-table-wrap">
        <table class="billing-invoice-table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Date</th>
              <th>Plan</th>
              <th>Amount</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

// ── Danger Zone ─────────────────────────────────────────────────────────

function renderDangerZone(sub) {
  if (sub?.cancelAtPeriodEnd) return '';

  return `
    <div class="billing-section billing-danger-zone">
      <h2>Danger Zone</h2>
      <div class="billing-danger-card">
        <div>
          <strong>Cancel Subscription</strong>
          <p style="margin:0.25rem 0 0;color:var(--text-secondary);font-size:0.85rem;">
            Cancel your subscription. You'll keep access until the end of your current billing period.
          </p>
        </div>
        <button class="btn btn-danger btn-sm" id="cancel-sub-btn">Cancel Subscription</button>
      </div>
    </div>
  `;
}

// ── Mount ───────────────────────────────────────────────────────────────

export function mount(el) {
  // Change plan
  const changePlanBtn = el.querySelector('#change-plan-btn');
  if (changePlanBtn) {
    changePlanBtn.addEventListener('click', () => navigate('/pricing'));
  }

  // Reactivate
  const reactivateBtn = el.querySelector('#reactivate-btn');
  if (reactivateBtn) {
    reactivateBtn.addEventListener('click', async () => {
      const confirmed = await confirmModal(
        'Reactivate Subscription',
        'Your subscription will be reactivated and you\'ll continue to be billed at the current rate.',
        { confirmLabel: 'Reactivate' }
      );
      if (confirmed) {
        reactivateSubscription();
        showToast('Subscription reactivated!', 'success');
        el.innerHTML = render();
        mount(el);
      }
    });
  }

  // Update payment method
  const updatePaymentBtn = el.querySelector('#update-payment-btn');
  if (updatePaymentBtn) {
    updatePaymentBtn.addEventListener('click', () => {
      showToast('Redirecting to Stripe Customer Portal...', 'info');
      // In production: redirect to Stripe Customer Portal
      // window.location.href = await createPortalSession();
    });
  }

  // Cancel subscription
  const cancelBtn = el.querySelector('#cancel-sub-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', async () => {
      const confirmed = await confirmModal(
        'Cancel Subscription',
        'Are you sure you want to cancel? You\'ll retain access until the end of your billing period, then be moved to the Free plan.',
        { confirmLabel: 'Yes, Cancel', danger: true }
      );
      if (confirmed) {
        cancelSubscription();
        showToast('Subscription cancelled. Access continues until end of billing period.', 'info');
        el.innerHTML = render();
        mount(el);
      }
    });
  }

  // Invoice download buttons
  el.querySelectorAll('.invoice-download-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showToast('Invoice PDF download started', 'success');
      // In production: fetch PDF from Stripe API
    });
  });
}

export function destroy() {}
