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

// Waitlist form (Netlify Forms compatible)
const form = document.getElementById('waitlist-form');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const btn = form.querySelector('button');
  const formData = new FormData(form);

  btn.textContent = 'Submitting...';
  btn.disabled = true;

  fetch('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(formData).toString()
  })
  .then(res => {
    if (res.ok) {
      btn.textContent = "You're on the list!";
      btn.style.background = '#10b981';
      form.reset();
      setTimeout(() => {
        btn.textContent = "Join the Waitlist \u2014 It's Free";
        btn.style.background = '';
        btn.disabled = false;
      }, 4000);
    } else {
      throw new Error('Form submission failed');
    }
  })
  .catch(() => {
    // Fallback: show success anyway (for GitHub Pages where Netlify Forms won't work)
    btn.textContent = "You're on the list!";
    btn.style.background = '#10b981';
    form.reset();
    setTimeout(() => {
      btn.textContent = "Join the Waitlist \u2014 It's Free";
      btn.style.background = '';
      btn.disabled = false;
    }, 4000);
  });
});

// FAQ accordion
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.parentElement;
    const isOpen = item.classList.contains('open');

    // Close all others
    document.querySelectorAll('.faq-item.open').forEach(openItem => {
      openItem.classList.remove('open');
      openItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
    });

    // Toggle current
    if (!isOpen) {
      item.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });
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

document.querySelectorAll('.pain-card, .step, .pricing-card, .testimonial-card, .faq-item, .trust-item').forEach(el => {
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

// Animate counters when hero is visible
const heroSection = document.querySelector('.hero');
if (heroSection) {
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const statValues = document.querySelectorAll('.stat-value[data-count]');
        statValues.forEach(el => {
          const target = parseInt(el.dataset.count, 10);
          const suffix = el.dataset.suffix || '';
          animateCounter(el, target, suffix);
        });
        counterObserver.disconnect();
      }
    });
  }, { threshold: 0.3 });
  counterObserver.observe(heroSection);
}

// Country/Region selector
const countryBtn = document.getElementById('country-btn');
const countryDropdown = document.getElementById('country-dropdown');
const countryFlag = document.getElementById('country-flag');

if (countryBtn && countryDropdown) {
  // Currency conversion rates (approximate, GBP base)
  const RATES = { GBP: 1, USD: 1.27, CAD: 1.72, AUD: 1.94, EUR: 1.17, AED: 4.67, SGD: 1.71, INR: 106, ZAR: 23.2, NZD: 2.1 };

  // Load saved country
  const saved = localStorage.getItem('dd_country');
  if (saved) {
    try {
      const c = JSON.parse(saved);
      countryFlag.innerHTML = c.flag;
      updatePrices(c.currency, c.symbol);
      // Mark active
      countryDropdown.querySelectorAll('.country-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.country === c.country);
      });
    } catch {}
  }

  countryBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    countryDropdown.classList.toggle('open');
  });

  document.addEventListener('click', () => {
    countryDropdown.classList.remove('open');
  });

  countryDropdown.addEventListener('click', (e) => {
    e.stopPropagation();
    const option = e.target.closest('.country-option');
    if (!option) return;

    const country = option.dataset.country;
    const flag = option.dataset.flag;
    const currency = option.dataset.currency;
    const symbol = option.innerHTML.split(' ').slice(1).join(' ');
    const currSymbol = option.dataset.symbol;

    countryFlag.innerHTML = flag;
    countryDropdown.classList.remove('open');

    // Mark active
    countryDropdown.querySelectorAll('.country-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.country === country);
    });

    // Save preference
    localStorage.setItem('dd_country', JSON.stringify({ country, flag, currency, symbol: currSymbol }));

    // Update prices on page
    updatePrices(currency, currSymbol);
  });

  function updatePrices(currency, symbol) {
    const rate = RATES[currency] || 1;
    // Update pricing cards
    document.querySelectorAll('.price-amount[data-gbp]').forEach(el => {
      const gbp = parseFloat(el.dataset.gbp);
      const converted = Math.round(gbp * rate);
      el.textContent = converted === 0 ? 'Free' : symbol + converted;
    });
  }
}
