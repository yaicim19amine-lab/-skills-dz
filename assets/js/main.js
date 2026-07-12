/* ========================================
   SKILLS DZ — Main JavaScript
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // ========================================
  // STICKY HEADER
  // ========================================
  const header = document.getElementById('header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('is-scrolled', window.scrollY > 50);
    });
  }

  // ========================================
  // HAMBURGER MENU
  // ========================================
  const hamburger = document.getElementById('hamburger');
  const nav = document.getElementById('nav');
  if (hamburger && nav) {
    hamburger.addEventListener('click', () => {
      nav.classList.toggle('is-open');
      hamburger.classList.toggle('is-active');
    });
  }

  // ========================================
  // SMOOTH SCROLL
  // ========================================
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        const headerHeight = header ? header.offsetHeight : 0;
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
        // Close mobile menu if open
        if (nav) nav.classList.remove('is-open');
        if (hamburger) hamburger.classList.remove('is-active');
      }
    });
  });

  // ========================================
  // ANIMATED COUNTERS
  // ========================================
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length > 0) {
    const animateCounter = (el) => {
      const target = parseInt(el.getAttribute('data-count'));
      const duration = 2000;
      const start = 0;
      const startTime = performance.now();

      const update = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(start + (target - start) * easeOut);
        el.textContent = current.toLocaleString('fr-DZ') + (target >= 100 ? '+' : '');
        if (progress < 1) {
          requestAnimationFrame(update);
        }
      };
      requestAnimationFrame(update);
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(counter => observer.observe(counter));
  }

  function showStatus(el, message, type) {
    if (!el) return;
    el.textContent = message;
    el.className = `form-status form-status--${type} is-visible`;
    setTimeout(() => {
      el.classList.remove('is-visible');
    }, 5000);
  }

  // ========================================
  // WHATSAPP CLICK TRACKING
  // ========================================
  document.querySelectorAll('[href*="wa.me"]').forEach(link => {
    link.addEventListener('click', () => {
      if (typeof gtag !== 'undefined') {
        gtag('event', 'whatsapp_click', {
          button_location: 'floating_button'
        });
      }
      if (typeof fbq !== 'undefined') {
        fbq('track', 'Contact', {
          content_name: 'WhatsApp'
        });
      }
    });
  });

  // ========================================
  // CTA CLICK TRACKING
  // ========================================
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.textContent.trim();
      if (typeof gtag !== 'undefined') {
        gtag('event', 'cta_click', {
          cta_text: text
        });
      }
    });
  });

  // ========================================
  // SCROLL DEPTH TRACKING
  // ========================================
  let scrollTracked = { 25: false, 50: false, 75: false, 100: false };
  window.addEventListener('scroll', () => {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = Math.round((window.scrollY / scrollHeight) * 100);

    [25, 50, 75, 100].forEach(threshold => {
      if (scrollPercent >= threshold && !scrollTracked[threshold]) {
        scrollTracked[threshold] = true;
        if (typeof gtag !== 'undefined') {
          gtag('event', 'scroll_depth', {
            percent_scrolled: threshold.toString()
          });
        }
      }
    });
  });

  // ========================================
  // LAZY LOADING IMAGES
  // ========================================
  if ('loading' in HTMLImageElement.prototype) {
    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
      img.src = img.src;
    });
  }

  // ========================================
  // FORM FIELD FOCUS TRACKING
  // ========================================
  let formStarted = false;
  document.querySelectorAll('#inscription-form input, #inscription-form select').forEach(field => {
    field.addEventListener('focus', () => {
      if (!formStarted) {
        formStarted = true;
        if (typeof gtag !== 'undefined') {
          gtag('event', 'form_start', {
            form_name: 'inscription_form'
          });
        }
      }
    });
  });

  // ========================================
  // FOCUS VISIBLE (Accessibility)
  // ========================================
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      document.body.classList.add('keyboard-nav');
    }
  });
  document.addEventListener('mousedown', () => {
    document.body.classList.remove('keyboard-nav');
  });
});

// ========================================
// KEYBOARD NAVIGATION STYLES
// ========================================
const style = document.createElement('style');
style.textContent = `
  .keyboard-nav *:focus {
    outline: 2px solid #e94560 !important;
    outline-offset: 2px !important;
  }
`;
document.head.appendChild(style);
