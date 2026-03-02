// Payment service — Stripe integration, plan management, feature gating, usage tracking

const STORAGE_KEY = 'designdesk_subscription';

// ── Stripe Configuration ────────────────────────────────────────────────

const STRIPE_CONFIG = {
  publishableKey: 'pk_test_REPLACE_WITH_YOUR_KEY',
  prices: {
    starter_monthly: 'price_starter_monthly',
    starter_annual: 'price_starter_annual',
    studio_monthly: 'price_studio_monthly',
    studio_annual: 'price_studio_annual',
    enterprise_monthly: 'price_enterprise_monthly',
    enterprise_annual: 'price_enterprise_annual'
  },
  successUrl: window.location.origin + '/app.html#/checkout/success',
  cancelUrl: window.location.origin + '/app.html#/checkout/cancel'
};

// ── Plan Definitions ────────────────────────────────────────────────────

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free Trial',
    price: 0,
    priceAnnual: 0,
    projects: 1,
    users: 1,
    features: [
      'dashboard',
      'basic_procurement'
    ],
    featureLabels: {
      dashboard: 'Dashboard Overview',
      basic_procurement: 'Procurement (view only)'
    },
    color: '#94a3b8',
    description: 'Get started with the basics'
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 29,
    priceAnnual: 23,
    projects: 3,
    users: 1,
    priceId: {
      monthly: STRIPE_CONFIG.prices.starter_monthly,
      annual: STRIPE_CONFIG.prices.starter_annual
    },
    features: [
      'dashboard',
      'procurement',
      'schedule',
      'invoicing',
      'suppliers',
      'basic_reports',
      'email_support'
    ],
    featureLabels: {
      dashboard: 'Dashboard Overview',
      procurement: 'Full Procurement Tracking',
      schedule: 'Project Scheduling',
      invoicing: 'Invoicing & Billing',
      suppliers: 'Supplier Management',
      basic_reports: 'Basic Reports',
      email_support: 'Email Support'
    },
    color: '#6366f1',
    description: 'Perfect for solo designers'
  },
  studio: {
    id: 'studio',
    name: 'Studio',
    price: 79,
    priceAnnual: 63,
    projects: 10,
    users: 3,
    priceId: {
      monthly: STRIPE_CONFIG.prices.studio_monthly,
      annual: STRIPE_CONFIG.prices.studio_annual
    },
    features: [
      'dashboard',
      'procurement',
      'schedule',
      'invoicing',
      'suppliers',
      'moodboard',
      'floorplan',
      'ai_assistant',
      'presentations',
      'client_portal',
      'advanced_reports',
      'team_collaboration',
      'priority_support'
    ],
    featureLabels: {
      dashboard: 'Dashboard Overview',
      procurement: 'Full Procurement Tracking',
      schedule: 'Project Scheduling',
      invoicing: 'Invoicing & Billing',
      suppliers: 'Supplier Management',
      moodboard: 'Mood Board Editor',
      floorplan: 'Floor Plan Editor',
      ai_assistant: 'AI Design Assistant',
      presentations: 'Client Presentations',
      client_portal: 'Client Portal',
      advanced_reports: 'Advanced Reports & Analytics',
      team_collaboration: 'Team Collaboration (3 users)',
      priority_support: 'Priority Email Support'
    },
    color: '#a855f7',
    popular: true,
    description: 'Everything for growing studios'
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 149,
    priceAnnual: 119,
    projects: -1, // unlimited
    users: -1, // unlimited
    priceId: {
      monthly: STRIPE_CONFIG.prices.enterprise_monthly,
      annual: STRIPE_CONFIG.prices.enterprise_annual
    },
    features: [
      'dashboard',
      'procurement',
      'schedule',
      'invoicing',
      'suppliers',
      'moodboard',
      'floorplan',
      'ai_assistant',
      'presentations',
      'client_portal',
      'advanced_reports',
      'team_collaboration',
      'api_access',
      'custom_branding',
      'dedicated_support',
      'sso',
      'audit_log'
    ],
    featureLabels: {
      dashboard: 'Dashboard Overview',
      procurement: 'Full Procurement Tracking',
      schedule: 'Project Scheduling',
      invoicing: 'Invoicing & Billing',
      suppliers: 'Supplier Management',
      moodboard: 'Mood Board Editor',
      floorplan: 'Floor Plan Editor',
      ai_assistant: 'AI Design Assistant',
      presentations: 'Client Presentations',
      client_portal: 'Client Portal',
      advanced_reports: 'Advanced Reports & Analytics',
      team_collaboration: 'Unlimited Team Members',
      api_access: 'REST API Access',
      custom_branding: 'Custom Branding & White-label',
      dedicated_support: 'Dedicated Account Manager',
      sso: 'SSO / SAML Integration',
      audit_log: 'Audit Log & Compliance'
    },
    color: '#f59e0b',
    description: 'For agencies and large firms'
  }
};

// ── All features for comparison table ───────────────────────────────────

export const ALL_FEATURES = [
  { key: 'dashboard', label: 'Dashboard Overview', category: 'Core' },
  { key: 'procurement', label: 'Procurement Tracking', category: 'Core' },
  { key: 'basic_procurement', label: 'Procurement (View Only)', category: 'Core' },
  { key: 'schedule', label: 'Project Scheduling', category: 'Core' },
  { key: 'invoicing', label: 'Invoicing & Billing', category: 'Core' },
  { key: 'suppliers', label: 'Supplier Management', category: 'Core' },
  { key: 'moodboard', label: 'Mood Board Editor', category: 'Design' },
  { key: 'floorplan', label: 'Floor Plan Editor', category: 'Design' },
  { key: 'ai_assistant', label: 'AI Design Assistant', category: 'Design' },
  { key: 'presentations', label: 'Client Presentations', category: 'Collaboration' },
  { key: 'client_portal', label: 'Client Portal', category: 'Collaboration' },
  { key: 'team_collaboration', label: 'Team Collaboration', category: 'Collaboration' },
  { key: 'basic_reports', label: 'Basic Reports', category: 'Reporting' },
  { key: 'advanced_reports', label: 'Advanced Reports', category: 'Reporting' },
  { key: 'api_access', label: 'REST API Access', category: 'Enterprise' },
  { key: 'custom_branding', label: 'Custom Branding', category: 'Enterprise' },
  { key: 'sso', label: 'SSO / SAML', category: 'Enterprise' },
  { key: 'audit_log', label: 'Audit Log', category: 'Enterprise' },
  { key: 'email_support', label: 'Email Support', category: 'Support' },
  { key: 'priority_support', label: 'Priority Support', category: 'Support' },
  { key: 'dedicated_support', label: 'Dedicated Account Manager', category: 'Support' }
];

// ── Feature to route mapping (for gating) ───────────────────────────────

const ROUTE_FEATURE_MAP = {
  '/dashboard': 'dashboard',
  '/procurement': 'procurement',
  '/schedule': 'schedule',
  '/invoicing': 'invoicing',
  '/suppliers': 'suppliers',
  '/moodboard': 'moodboard',
  '/floorplan': 'floorplan',
  '/ai-assistant': 'ai_assistant',
  '/presentations': 'presentations',
  '/client-portal': 'client_portal'
};

// ── Stripe.js Loader ────────────────────────────────────────────────────

let stripeInstance = null;
let stripeLoading = false;
let stripeLoadPromise = null;

export function initStripe() {
  if (stripeInstance) return Promise.resolve(stripeInstance);
  if (stripeLoadPromise) return stripeLoadPromise;

  stripeLoadPromise = new Promise((resolve, reject) => {
    if (window.Stripe) {
      stripeInstance = window.Stripe(STRIPE_CONFIG.publishableKey);
      resolve(stripeInstance);
      return;
    }

    // Load Stripe.js dynamically
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    script.onload = () => {
      if (window.Stripe) {
        stripeInstance = window.Stripe(STRIPE_CONFIG.publishableKey);
        resolve(stripeInstance);
      } else {
        reject(new Error('Stripe.js failed to initialize'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load Stripe.js'));
    document.head.appendChild(script);
  });

  return stripeLoadPromise;
}

// ── Checkout Session ────────────────────────────────────────────────────

export async function createCheckoutSession(planId, billingCycle = 'monthly') {
  const plan = PLANS[planId];
  if (!plan || !plan.priceId) {
    throw new Error('Invalid plan selected');
  }

  const priceId = plan.priceId[billingCycle];
  if (!priceId) {
    throw new Error('Invalid billing cycle');
  }

  // In production, this would call your backend to create a Checkout Session
  // For demo purposes, we simulate the checkout by storing the plan directly
  const subscription = {
    planId: plan.id,
    planName: plan.name,
    billingCycle,
    price: billingCycle === 'annual' ? plan.priceAnnual : plan.price,
    status: 'active',
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: getNextBillingDate(billingCycle),
    stripeSubscriptionId: 'sub_demo_' + Date.now().toString(36),
    stripePriceId: priceId,
    cancelAtPeriodEnd: false,
    createdAt: new Date().toISOString()
  };

  saveSubscription(subscription);
  return subscription;
}

// ── Subscription Management ─────────────────────────────────────────────

export function getSubscription() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getCurrentPlan() {
  const sub = getSubscription();
  if (!sub || sub.status === 'cancelled') return PLANS.free;
  return PLANS[sub.planId] || PLANS.free;
}

export function getCurrentPlanId() {
  const sub = getSubscription();
  if (!sub || sub.status === 'cancelled') return 'free';
  return sub.planId || 'free';
}

function saveSubscription(sub) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sub));
  } catch (e) {
    console.error('[payments] Failed to save subscription:', e);
  }
}

export async function updatePlan(newPlanId, billingCycle = 'monthly') {
  const plan = PLANS[newPlanId];
  if (!plan) throw new Error('Invalid plan');

  if (newPlanId === 'free') {
    return cancelSubscription();
  }

  const existing = getSubscription();
  const subscription = {
    planId: plan.id,
    planName: plan.name,
    billingCycle,
    price: billingCycle === 'annual' ? plan.priceAnnual : plan.price,
    status: 'active',
    currentPeriodStart: existing?.currentPeriodStart || new Date().toISOString(),
    currentPeriodEnd: getNextBillingDate(billingCycle),
    stripeSubscriptionId: existing?.stripeSubscriptionId || 'sub_demo_' + Date.now().toString(36),
    stripePriceId: plan.priceId?.[billingCycle] || null,
    cancelAtPeriodEnd: false,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  saveSubscription(subscription);
  return subscription;
}

export function cancelSubscription() {
  const existing = getSubscription();
  if (!existing) return null;

  const cancelled = {
    ...existing,
    status: 'cancelled',
    cancelAtPeriodEnd: true,
    cancelledAt: new Date().toISOString()
  };
  saveSubscription(cancelled);
  return cancelled;
}

export function reactivateSubscription() {
  const existing = getSubscription();
  if (!existing) return null;

  const reactivated = {
    ...existing,
    status: 'active',
    cancelAtPeriodEnd: false,
    cancelledAt: null,
    updatedAt: new Date().toISOString()
  };
  saveSubscription(reactivated);
  return reactivated;
}

// ── Feature Gating ──────────────────────────────────────────────────────

export function hasFeature(featureName) {
  const plan = getCurrentPlan();
  // Free plan: check for basic_procurement override for procurement route
  if (featureName === 'basic_procurement' && plan.features.includes('procurement')) {
    return true;
  }
  return plan.features.includes(featureName);
}

export function isRouteAllowed(route) {
  const featureKey = ROUTE_FEATURE_MAP[route];
  if (!featureKey) return true; // Unknown routes are allowed (pricing, billing, etc.)

  const plan = getCurrentPlan();

  // Special: free users can view procurement (read only)
  if (route === '/procurement' && plan.id === 'free') {
    return true; // They get basic_procurement (view only)
  }

  return plan.features.includes(featureKey);
}

export function getRequiredPlanForFeature(featureName) {
  const planOrder = ['starter', 'studio', 'enterprise'];
  for (const planId of planOrder) {
    if (PLANS[planId].features.includes(featureName)) {
      return PLANS[planId];
    }
  }
  return PLANS.enterprise;
}

export function getRequiredPlanForRoute(route) {
  const featureKey = ROUTE_FEATURE_MAP[route];
  if (!featureKey) return null;
  return getRequiredPlanForFeature(featureKey);
}

// ── Usage Tracking ──────────────────────────────────────────────────────

export function checkProjectLimit() {
  const plan = getCurrentPlan();
  if (plan.projects === -1) return { allowed: true, current: 0, limit: Infinity };

  // Count projects from store
  try {
    const raw = localStorage.getItem('designdesk_data');
    if (!raw) return { allowed: true, current: 0, limit: plan.projects };
    const data = JSON.parse(raw);
    const count = data.projects ? data.projects.length : 0;
    return {
      allowed: count < plan.projects,
      current: count,
      limit: plan.projects
    };
  } catch {
    return { allowed: true, current: 0, limit: plan.projects };
  }
}

export function checkUserLimit() {
  const plan = getCurrentPlan();
  if (plan.users === -1) return { allowed: true, current: 1, limit: Infinity };

  // For demo, we simulate 1 user
  return {
    allowed: 1 <= plan.users,
    current: 1,
    limit: plan.users
  };
}

export function getUsageStats() {
  const plan = getCurrentPlan();
  const projectCheck = checkProjectLimit();
  const userCheck = checkUserLimit();

  return {
    plan,
    projects: {
      current: projectCheck.current,
      limit: plan.projects === -1 ? 'Unlimited' : plan.projects,
      percentUsed: plan.projects === -1 ? 0 : Math.round((projectCheck.current / plan.projects) * 100)
    },
    users: {
      current: userCheck.current,
      limit: plan.users === -1 ? 'Unlimited' : plan.users,
      percentUsed: plan.users === -1 ? 0 : Math.round((userCheck.current / plan.users) * 100)
    }
  };
}

// ── Invoice History (simulated) ─────────────────────────────────────────

export function getInvoiceHistory() {
  const sub = getSubscription();
  if (!sub || sub.planId === 'free') return [];

  // Generate simulated invoice history
  const invoices = [];
  const startDate = new Date(sub.createdAt);
  const now = new Date();
  let current = new Date(startDate);
  let idx = 1;

  while (current <= now && idx <= 12) {
    invoices.push({
      id: `inv-${idx}`,
      number: `DD-${String(idx).padStart(4, '0')}`,
      date: current.toISOString(),
      amount: sub.price,
      status: 'paid',
      plan: sub.planName,
      billingCycle: sub.billingCycle,
      pdfUrl: '#'
    });

    if (sub.billingCycle === 'annual') {
      current = new Date(current.setFullYear(current.getFullYear() + 1));
    } else {
      current = new Date(current.setMonth(current.getMonth() + 1));
    }
    idx++;
  }

  return invoices.reverse(); // Most recent first
}

// ── Payment Method (simulated) ──────────────────────────────────────────

export function getPaymentMethod() {
  const sub = getSubscription();
  if (!sub || sub.planId === 'free') return null;

  return {
    brand: 'visa',
    last4: '4242',
    expMonth: 12,
    expYear: 2027,
    name: 'Design Studio Ltd'
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────

function getNextBillingDate(billingCycle) {
  const now = new Date();
  if (billingCycle === 'annual') {
    now.setFullYear(now.getFullYear() + 1);
  } else {
    now.setMonth(now.getMonth() + 1);
  }
  return now.toISOString();
}

export function formatPlanPrice(plan, billingCycle = 'monthly') {
  if (plan.price === 0) return 'Free';
  const price = billingCycle === 'annual' ? plan.priceAnnual : plan.price;
  return `\u00A3${price}`;
}

export function getPlanSavings(plan) {
  if (plan.price === 0) return 0;
  return (plan.price - plan.priceAnnual) * 12;
}

export { STRIPE_CONFIG };
