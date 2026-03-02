// Checkout success page — confetti, plan welcome, auto-redirect

import { icons } from '../core/icons.js';
import { navigate } from '../router.js';
import { getCurrentPlan } from '../core/payments.js';

let redirectTimer = null;
let confettiInterval = null;

export function render() {
  const plan = getCurrentPlan();

  const features = Object.values(plan.featureLabels || {}).slice(0, 6);

  return `
    <div class="checkout-success">
      <div class="confetti-container" id="confetti-container"></div>

      <div class="checkout-success-card">
        <div class="checkout-success-icon">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="30" stroke="var(--success)" stroke-width="3" fill="var(--success)" fill-opacity="0.1"/>
            <path d="M20 32l8 8 16-16" stroke="var(--success)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>

        <h1 class="checkout-success-title">Welcome to ${plan.name}!</h1>
        <p class="checkout-success-subtitle">Your subscription is now active. Here's what you've unlocked:</p>

        <div class="checkout-success-features">
          ${features.map(f => `
            <div class="checkout-success-feature">
              <span class="checkout-feature-check">${icons.check}</span>
              <span>${f}</span>
            </div>
          `).join('')}
        </div>

        <div class="checkout-success-actions">
          <button class="btn btn-primary" id="go-dashboard-btn">Go to Dashboard</button>
          <button class="btn btn-outline" id="go-billing-btn">View Billing</button>
        </div>

        <p class="checkout-success-redirect" id="redirect-msg">
          Redirecting to dashboard in <span id="countdown">5</span> seconds...
        </p>
      </div>
    </div>
  `;
}

export function mount(el) {
  // Start confetti
  startConfetti(el.querySelector('#confetti-container'));

  // Auto-redirect countdown
  let seconds = 5;
  const countdownEl = el.querySelector('#countdown');

  redirectTimer = setInterval(() => {
    seconds--;
    if (countdownEl) countdownEl.textContent = seconds;
    if (seconds <= 0) {
      clearInterval(redirectTimer);
      navigate('/dashboard');
    }
  }, 1000);

  // Buttons
  const dashBtn = el.querySelector('#go-dashboard-btn');
  if (dashBtn) dashBtn.addEventListener('click', () => navigate('/dashboard'));

  const billingBtn = el.querySelector('#go-billing-btn');
  if (billingBtn) billingBtn.addEventListener('click', () => navigate('/billing'));
}

export function destroy() {
  if (redirectTimer) {
    clearInterval(redirectTimer);
    redirectTimer = null;
  }
  if (confettiInterval) {
    clearInterval(confettiInterval);
    confettiInterval = null;
  }
}

// ── Confetti Animation ──────────────────────────────────────────────────

function startConfetti(container) {
  if (!container) return;

  const colors = ['#6366f1', '#a855f7', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#f43f5e'];
  let particleCount = 0;
  const maxParticles = 60;

  function createParticle() {
    if (particleCount >= maxParticles) return;
    particleCount++;

    const particle = document.createElement('div');
    particle.className = 'confetti-particle';

    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.random() * 8 + 4;
    const left = Math.random() * 100;
    const duration = Math.random() * 2 + 2;
    const delay = Math.random() * 0.5;
    const rotation = Math.random() * 360;
    const shape = Math.random() > 0.5 ? '50%' : '0';

    particle.style.cssText = `
      position:absolute;
      width:${size}px;
      height:${size}px;
      background:${color};
      border-radius:${shape};
      left:${left}%;
      top:-10px;
      opacity:0.9;
      transform:rotate(${rotation}deg);
      animation:confetti-fall ${duration}s ease-in ${delay}s forwards;
      pointer-events:none;
    `;

    container.appendChild(particle);

    setTimeout(() => {
      particle.remove();
      particleCount--;
    }, (duration + delay) * 1000);
  }

  // Burst
  for (let i = 0; i < 30; i++) {
    setTimeout(() => createParticle(), i * 50);
  }

  // Continued gentle confetti
  confettiInterval = setInterval(() => {
    createParticle();
  }, 200);

  // Stop after 4 seconds
  setTimeout(() => {
    if (confettiInterval) {
      clearInterval(confettiInterval);
      confettiInterval = null;
    }
  }, 4000);
}
