// Pricing page — subscription tiers, annual toggle, feature comparison, FAQ accordion

import { icons } from '../core/icons.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';
import { confirmModal } from '../components/modal.js';
import {
  PLANS, ALL_FEATURES, getCurrentPlanId, getCurrentPlan,
  createCheckoutSession, updatePlan, formatPlanPrice, getPlanSavings, getSubscription
} from '../core/payments.js';

let billingCycle = 'monthly';
let openFaqIndex = -1;

// ── FAQ Data ────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: 'Can I switch plans at any time?',
    a: 'Yes, you can upgrade or downgrade your plan at any time. When upgrading, you\'ll be charged the prorated difference immediately. When downgrading, the new rate applies at your next billing cycle.'
  },
  {
    q: 'What happens if I exceed my project limit?',
    a: 'You\'ll receive a notification when you\'re approaching your limit. To create additional projects, you\'ll need to upgrade to a higher tier or archive existing projects.'
  },
  {
    q: 'Is there a free trial?',
    a: 'Yes! All new accounts start with a free trial that includes 1 project and basic procurement viewing. No credit card required to get started.'
  },
  {
    q: 'Can I cancel my subscription?',
    a: 'Absolutely. You can cancel anytime from your billing settings. You\'ll retain access to your current plan until the end of your billing period. All your data is preserved.'
  },
  {
    q: 'Do you offer refunds?',
    a: 'We offer a 14-day money-back guarantee on all plans. If you\'re not satisfied within the first 14 days, contact us for a full refund.'
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit and debit cards (Visa, Mastercard, American Express) as well as direct debit via Stripe. Enterprise customers can pay via invoice.'
  },
  {
    q: 'Is my data secure?',
    a: 'Yes. We use industry-standard encryption (AES-256) for data at rest and TLS 1.3 for data in transit. We\'re GDPR compliant and never share your data with third parties.'
  }
];

// ── Feature comparison rows ─────────────────────────────────────────────

const COMPARISON_FEATURES = [
  { label: 'Projects', type: 'limit', get: (p) => p.projects === -1 ? 'Unlimited' : p.projects },
  { label: 'Team Members', type: 'limit', get: (p) => p.users === -1 ? 'Unlimited' : p.users },
  { label: 'Dashboard', key: 'dashboard' },
  { label: 'Procurement Tracking', key: 'procurement', freeAlt: 'basic_procurement', freeLabel: 'View Only' },
  { label: 'Project Scheduling', key: 'schedule' },
  { label: 'Invoicing & Billing', key: 'invoicing' },
  { label: 'Supplier Management', key: 'suppliers' },
  { label: 'Mood Board Editor', key: 'moodboard' },
  { label: 'Floor Plan Editor', key: 'floorplan' },
  { label: 'AI Design Assistant', key: 'ai_assistant' },
  { label: 'Client Presentations', key: 'presentations' },
  { label: 'Client Portal', key: 'client_portal' },
  { label: 'Advanced Reports', key: 'advanced_reports' },
  { label: 'REST API Access', key: 'api_access' },
  { label: 'Custom Branding', key: 'custom_branding' },
  { label: 'SSO / SAML', key: 'sso' },
  { label: 'Audit Log', key: 'audit_log' },
  { label: 'Email Support', key: 'email_support' },
  { label: 'Priority Support', key: 'priority_support' },
  { label: 'Dedicated Account Manager', key: 'dedicated_support' }
];

// ── Render ──────────────────────────────────────────────────────────────

export function render() {
  const currentPlanId = getCurrentPlanId();
  const sub = getSubscription();

  return `
    <div class="view-pricing">
      <div class="view-header" style="text-align:center;max-width:700px;margin:0 auto 2rem;">
        <h1 style="font-size:2rem;margin-bottom:0.5rem;">Simple, transparent pricing</h1>
        <p style="color:var(--text-secondary);font-size:1.05rem;line-height:1.6;">
          Choose the plan that fits your studio. All plans include a 14-day money-back guarantee.
        </p>
      </div>

      ${renderBillingToggle()}
      ${renderPricingCards(currentPlanId, sub)}
      ${renderGuaranteeBadge()}
      ${renderFeatureComparison(currentPlanId)}
      ${renderFaq()}
    </div>
  `;
}

// ── Billing Toggle ──────────────────────────────────────────────────────

function renderBillingToggle() {
  return `
    <div class="pricing-toggle-wrap">
      <div class="pricing-toggle" id="pricing-toggle">
        <span class="pricing-toggle-label ${billingCycle === 'monthly' ? 'active' : ''}">Monthly</span>
        <button class="pricing-toggle-switch ${billingCycle === 'annual' ? 'on' : ''}"
                id="billing-toggle-btn" type="button" role="switch"
                aria-checked="${billingCycle === 'annual'}" aria-label="Toggle annual billing">
          <span class="pricing-toggle-thumb"></span>
        </button>
        <span class="pricing-toggle-label ${billingCycle === 'annual' ? 'active' : ''}">
          Annual
          <span class="pricing-toggle-badge">Save 20%</span>
        </span>
      </div>
    </div>
  `;
}

// ── Pricing Cards ───────────────────────────────────────────────────────

function renderPricingCards(currentPlanId, sub) {
  const planOrder = ['starter', 'studio', 'enterprise'];

  const cards = planOrder.map(planId => {
    const plan = PLANS[planId];
    const isCurrent = currentPlanId === planId;
    const isPopular = plan.popular;
    const price = billingCycle === 'annual' ? plan.priceAnnual : plan.price;
    const originalPrice = plan.price;
    const savings = getPlanSavings(plan);

    // Determine button state
    let btnLabel = 'Get Started';
    let btnClass = 'btn-primary';
    let btnDisabled = false;
    let btnAction = planId;

    if (isCurrent) {
      btnLabel = 'Current Plan';
      btnClass = 'btn-outline';
      btnDisabled = true;
    } else if (currentPlanId !== 'free') {
      const currentIdx = planOrder.indexOf(currentPlanId);
      const targetIdx = planOrder.indexOf(planId);
      if (targetIdx > currentIdx) {
        btnLabel = 'Upgrade';
      } else {
        btnLabel = 'Downgrade';
        btnClass = 'btn-outline';
      }
    }

    // Feature list for card
    const keyFeatures = getCardFeatures(planId);

    return `
      <div class="pricing-card ${isPopular ? 'pricing-card--popular' : ''} ${isCurrent ? 'pricing-card--current' : ''}">
        ${isPopular ? '<div class="pricing-popular-badge">Most Popular</div>' : ''}
        ${isCurrent ? '<div class="pricing-current-badge">Current Plan</div>' : ''}

        <div class="pricing-card-header">
          <h3 class="pricing-plan-name" style="color:${plan.color};">${plan.name}</h3>
          <p class="pricing-plan-desc">${plan.description}</p>
        </div>

        <div class="pricing-price-block">
          <div class="pricing-price-row">
            ${billingCycle === 'annual' && plan.price > 0 ? `<span class="pricing-price-original">&pound;${originalPrice}</span>` : ''}
            <span class="pricing-price">&pound;${price}</span>
            ${plan.price > 0 ? '<span class="pricing-price-period">/month</span>' : ''}
          </div>
          ${billingCycle === 'annual' && savings > 0 ? `<div class="pricing-savings">Save &pound;${savings}/year</div>` : ''}
          ${billingCycle === 'annual' && plan.price > 0 ? `<div class="pricing-billed-info">Billed &pound;${plan.priceAnnual * 12}/year</div>` : ''}
        </div>

        <div class="pricing-features-list">
          <div class="pricing-limits">
            <span class="pricing-limit-item">
              ${icons.procurement}
              <strong>${plan.projects === -1 ? 'Unlimited' : plan.projects}</strong> project${plan.projects !== 1 ? 's' : ''}
            </span>
            <span class="pricing-limit-item">
              ${icons.user}
              <strong>${plan.users === -1 ? 'Unlimited' : plan.users}</strong> user${plan.users !== 1 ? 's' : ''}
            </span>
          </div>
          <div class="pricing-feature-divider"></div>
          ${keyFeatures.map(f => `
            <div class="pricing-feature-item">
              <span class="pricing-feature-check">${icons.check}</span>
              <span>${f}</span>
            </div>
          `).join('')}
        </div>

        <div class="pricing-card-footer">
          <button class="btn ${btnClass} pricing-cta-btn"
                  data-plan="${planId}" data-cycle="${billingCycle}"
                  ${btnDisabled ? 'disabled' : ''}>
            ${btnLabel}
          </button>
        </div>
      </div>
    `;
  }).join('');

  return `<div class="pricing-cards">${cards}</div>`;
}

function getCardFeatures(planId) {
  switch (planId) {
    case 'starter':
      return [
        'Full Procurement Tracking',
        'Project Scheduling',
        'Invoicing & Billing',
        'Supplier Management',
        'Basic Reports',
        'Email Support'
      ];
    case 'studio':
      return [
        'Everything in Starter, plus:',
        'Mood Board Editor',
        'Floor Plan Editor',
        'AI Design Assistant',
        'Client Presentations',
        'Client Portal',
        'Advanced Reports',
        'Team Collaboration (3 users)',
        'Priority Support'
      ];
    case 'enterprise':
      return [
        'Everything in Studio, plus:',
        'Unlimited Projects & Users',
        'REST API Access',
        'Custom Branding & White-label',
        'SSO / SAML Integration',
        'Audit Log & Compliance',
        'Dedicated Account Manager'
      ];
    default:
      return [];
  }
}

// ── Guarantee Badge ─────────────────────────────────────────────────────

function renderGuaranteeBadge() {
  return `
    <div class="pricing-guarantee">
      <div class="pricing-guarantee-inner">
        <div class="pricing-guarantee-icon">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="var(--success)" stroke-width="2"/>
            <path d="M10 16l4 4 8-8" stroke="var(--success)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div>
          <strong>14-Day Money-Back Guarantee</strong>
          <p style="margin:0;color:var(--text-secondary);font-size:0.85rem;">Not satisfied? Get a full refund within 14 days. No questions asked.</p>
        </div>
      </div>
    </div>
  `;
}

// ── Feature Comparison Table ────────────────────────────────────────────

function renderFeatureComparison(currentPlanId) {
  const planOrder = ['starter', 'studio', 'enterprise'];

  const headerCells = planOrder.map(pid => {
    const plan = PLANS[pid];
    return `<th class="${pid === currentPlanId ? 'comparison-current' : ''}">
      <span style="color:${plan.color};font-weight:600;">${plan.name}</span>
    </th>`;
  }).join('');

  const rows = COMPARISON_FEATURES.map(feat => {
    const cells = planOrder.map(pid => {
      const plan = PLANS[pid];

      if (feat.type === 'limit') {
        return `<td class="${pid === currentPlanId ? 'comparison-current' : ''}">
          <strong>${feat.get(plan)}</strong>
        </td>`;
      }

      const has = plan.features.includes(feat.key);
      const hasFreeAlt = feat.freeAlt && plan.features.includes(feat.freeAlt);

      if (has) {
        return `<td class="${pid === currentPlanId ? 'comparison-current' : ''}">
          <span class="comparison-check">${icons.check}</span>
        </td>`;
      } else if (hasFreeAlt) {
        return `<td class="${pid === currentPlanId ? 'comparison-current' : ''}">
          <span class="comparison-partial">${feat.freeLabel || 'Limited'}</span>
        </td>`;
      } else {
        return `<td class="${pid === currentPlanId ? 'comparison-current' : ''}">
          <span class="comparison-x">&mdash;</span>
        </td>`;
      }
    }).join('');

    return `<tr><td class="comparison-feature-label">${feat.label}</td>${cells}</tr>`;
  }).join('');

  return `
    <div class="pricing-comparison">
      <h2 style="text-align:center;margin-bottom:1.5rem;">Compare All Features</h2>
      <div class="pricing-comparison-table-wrap">
        <table class="pricing-comparison-table">
          <thead>
            <tr>
              <th></th>
              ${headerCells}
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ── FAQ Accordion ───────────────────────────────────────────────────────

function renderFaq() {
  const items = FAQ_ITEMS.map((item, idx) => {
    const isOpen = openFaqIndex === idx;
    return `
      <div class="pricing-faq-item ${isOpen ? 'open' : ''}">
        <button class="pricing-faq-question" data-faq-index="${idx}" type="button">
          <span>${item.q}</span>
          <span class="pricing-faq-chevron">${isOpen ? icons.chevronUp : icons.chevronDown}</span>
        </button>
        <div class="pricing-faq-answer" ${isOpen ? 'style="max-height:200px;padding:0 1.25rem 1rem;"' : ''}>
          <p>${item.a}</p>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="pricing-faq">
      <h2 style="text-align:center;margin-bottom:1.5rem;">Frequently Asked Questions</h2>
      <div class="pricing-faq-list">${items}</div>
    </div>
  `;
}

// ── Mount ───────────────────────────────────────────────────────────────

export function mount(el) {
  // Billing toggle
  const toggleBtn = el.querySelector('#billing-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      billingCycle = billingCycle === 'monthly' ? 'annual' : 'monthly';
      el.innerHTML = render();
      mount(el);
    });
  }

  // CTA buttons
  el.querySelectorAll('.pricing-cta-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const planId = btn.dataset.plan;
      const cycle = billingCycle;
      const currentId = getCurrentPlanId();

      if (planId === currentId) return;

      // If on free plan, start checkout
      if (currentId === 'free') {
        try {
          await createCheckoutSession(planId, cycle);
          navigate('/checkout/success');
        } catch (e) {
          showToast(e.message, 'error');
        }
        return;
      }

      // Upgrade or downgrade
      const planOrder = ['starter', 'studio', 'enterprise'];
      const currentIdx = planOrder.indexOf(currentId);
      const targetIdx = planOrder.indexOf(planId);
      const isUpgrade = targetIdx > currentIdx;
      const plan = PLANS[planId];

      const confirmed = await confirmModal(
        isUpgrade ? 'Upgrade Plan' : 'Downgrade Plan',
        isUpgrade
          ? `Upgrade to <strong>${plan.name}</strong> at <strong>&pound;${cycle === 'annual' ? plan.priceAnnual : plan.price}/month</strong>? The prorated difference will be charged immediately.`
          : `Downgrade to <strong>${plan.name}</strong>? Your current features will be available until the end of your billing period.`,
        { confirmLabel: isUpgrade ? 'Upgrade Now' : 'Downgrade', danger: !isUpgrade }
      );

      if (!confirmed) return;

      try {
        await updatePlan(planId, cycle);
        showToast(`Successfully ${isUpgrade ? 'upgraded' : 'changed'} to ${plan.name}!`, 'success');
        el.innerHTML = render();
        mount(el);
      } catch (e) {
        showToast(e.message, 'error');
      }
    });
  });

  // FAQ accordion
  el.querySelectorAll('.pricing-faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.faqIndex, 10);
      openFaqIndex = openFaqIndex === idx ? -1 : idx;
      // Re-render just the FAQ section
      const faqContainer = el.querySelector('.pricing-faq');
      if (faqContainer) {
        faqContainer.outerHTML = renderFaq();
        // Re-bind FAQ listeners
        el.querySelectorAll('.pricing-faq-question').forEach(b => {
          b.addEventListener('click', () => {
            const i = parseInt(b.dataset.faqIndex, 10);
            openFaqIndex = openFaqIndex === i ? -1 : i;
            const fc = el.querySelector('.pricing-faq');
            if (fc) {
              fc.outerHTML = renderFaq();
              mount(el); // Rebind all
            }
          });
        });
      }
    });
  });
}

export function destroy() {
  openFaqIndex = -1;
}
