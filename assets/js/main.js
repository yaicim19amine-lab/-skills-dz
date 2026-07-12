/* ========================================
   SKILLS DZ — Main JavaScript
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
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
  let scrollTick = false;
  window.addEventListener('scroll', () => {
    if (scrollTick) return;
    scrollTick = true;
    requestAnimationFrame(() => {
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
      scrollTick = false;
    });
  }, { passive: true });

  // ========================================
  // LAZY LOADING IMAGES
  // ========================================
  if ('loading' in HTMLImageElement.prototype) {
    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
      img.src = img.src;
    });
  }

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
