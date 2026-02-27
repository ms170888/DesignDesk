// DesignDesk — Interactive Script

// Nav scroll effect
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 20);
});

// Mobile menu
const mobileMenu = document.getElementById('mobile-menu');
const navLinks = document.getElementById('nav-links');
mobileMenu.addEventListener('click', () => {
  navLinks.classList.toggle('open');
  mobileMenu.classList.toggle('active');
});

// Feature tabs
const tabs = document.querySelectorAll('.feature-tab');
const panels = document.querySelectorAll('.feature-panel');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;

    tabs.forEach(t => t.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));

    tab.classList.add('active');
    document.querySelector(`[data-panel="${target}"]`).classList.add('active');
  });
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      navLinks.classList.remove('open');
    }
  });
});

// Waitlist form
const form = document.getElementById('waitlist-form');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const btn = form.querySelector('button');
  btn.textContent = 'You\'re on the list!';
  btn.style.background = '#10b981';
  btn.disabled = true;

  setTimeout(() => {
    btn.textContent = 'Join the Waitlist — It\'s Free';
    btn.style.background = '';
    btn.disabled = false;
    form.reset();
  }, 3000);
});

// Animate elements on scroll
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -40px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

document.querySelectorAll('.pain-card, .step, .pricing-card, .testimonial-card').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  observer.observe(el);
});

// Typing animation for hero
const heroTitle = document.querySelector('.hero-title');
if (heroTitle) {
  heroTitle.style.opacity = '0';
  heroTitle.style.transform = 'translateY(20px)';
  heroTitle.style.transition = 'opacity 0.6s ease, transform 0.6s ease';

  setTimeout(() => {
    heroTitle.style.opacity = '1';
    heroTitle.style.transform = 'translateY(0)';
  }, 200);
}

// Counter animation for stats
function animateCounter(element, target, suffix = '') {
  let current = 0;
  const increment = target / 40;
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    element.textContent = Math.round(current) + suffix;
  }, 30);
}
