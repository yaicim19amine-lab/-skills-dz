/* ========================================
   SKILLS DZ — Effects Engine
   GPU-accelerated, 60fps, reduced-motion safe
   ======================================== */
(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  const isMobile = window.innerWidth < 768;

  /* ── Intersection Observer: Scroll Reveal ── */
  function initScrollReveal() {
    const elements = document.querySelectorAll('.reveal');
    if (!elements.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    elements.forEach(el => observer.observe(el));
  }

  /* ── 3D Tilt on Cards ── */
  function init3DTilt() {
    if (isMobile) return;
    const cards = document.querySelectorAll('.formation-card, .agent-card, .level-card, .point-card');
    if (!cards.length) return;

    cards.forEach(card => {
      card.classList.add('tilt-3d');
      const inner = document.createElement('div');
      inner.classList.add('tilt-3d__inner');

      // Move existing children into inner wrapper
      while (card.firstChild) inner.appendChild(card.firstChild);
      card.appendChild(inner);

      // Add shine overlay
      const shine = document.createElement('div');
      shine.classList.add('tilt-3d__shine');
      inner.appendChild(shine);

      inner.style.borderRadius = getComputedStyle(card).borderRadius;
      inner.style.transition = 'transform 0.12s ease-out, box-shadow 0.12s ease-out';

      let ticking = false;

      card.addEventListener('mousemove', (e) => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          const rotateX = ((y - centerY) / centerY) * -6;
          const rotateY = ((x - centerX) / centerX) * 6;

          inner.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;

          // Move shine
          shine.style.setProperty('--shine-x', ((x / rect.width) * 100) + '%');
          shine.style.setProperty('--shine-y', ((y / rect.height) * 100) + '%');

          ticking = false;
        });
      });

      card.addEventListener('mouseleave', () => {
        inner.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
      });
    });
  }

  /* ── Ripple on Buttons ── */
  function initRipple() {
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(btn => {
      btn.classList.add('ripple');
      btn.addEventListener('click', function (e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const size = Math.max(rect.width, rect.height) * 1.5;

        const wave = document.createElement('span');
        wave.classList.add('ripple-wave');
        wave.style.width = wave.style.height = size + 'px';
        wave.style.left = (x - size / 2) + 'px';
        wave.style.top = (y - size / 2) + 'px';

        this.appendChild(wave);
        wave.addEventListener('animationend', () => wave.remove());
      });
    });
  }

  /* ── Hero Floating Particles ── */
  function initParticles() {
    const container = document.getElementById('particles');
    if (!container || isMobile) return;

    const colors = ['rgba(0,196,255,0.35)', 'rgba(30,91,255,0.25)', 'rgba(255,255,255,0.15)'];

    for (let i = 0; i < 30; i++) {
      const p = document.createElement('div');
      p.classList.add('particle');
      const size = Math.random() * 4 + 2;
      p.style.width = p.style.height = size + 'px';
      p.style.left = Math.random() * 100 + '%';
      p.style.bottom = -(Math.random() * 100) + 'px';
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      p.style.animationDuration = (Math.random() * 10 + 8) + 's';
      p.style.animationDelay = (Math.random() * 8) + 's';
      container.appendChild(p);
    }
  }

  /* ── Hero Parallax on Mouse Move ── */
  function initParallax() {
    if (isMobile) return;
    const hero = document.querySelector('.hero');
    const cards = document.querySelectorAll('.hero__card');
    const panda = document.querySelector('.hero-panda');
    if (!hero || !cards.length) return;

    let ticking = false;
    hero.addEventListener('mousemove', (e) => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const rect = hero.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;

        cards.forEach((card, i) => {
          const depth = (i + 1) * 8;
          card.style.transform = `translate(${x * depth}px, ${y * depth}px)`;
        });

        if (panda) {
          panda.style.transform = `translate(calc(-50% + ${x * -12}px), calc(-50% + ${y * -12}px))`;
        }

        ticking = false;
      });
    });

    hero.addEventListener('mouseleave', () => {
      cards.forEach(card => { card.style.transform = ''; });
      if (panda) panda.style.transform = '';
    });
  }

  /* ── Animated Counter ── */
  function initCounters() {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.dataset.count, 10);
          animateCounter(el, target);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(c => observer.observe(c));
  }

  function animateCounter(el, target) {
    const duration = 1800;
    const start = performance.now();
    const suffix = el.dataset.suffix || '';

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const current = Math.round(eased * target);

      el.textContent = current.toLocaleString('fr-FR') + suffix;

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.textContent = target.toLocaleString('fr-FR') + suffix;
      }
    }
    requestAnimationFrame(update);
  }

  /* ── Navbar Scroll Effect ── */
  function initNavScroll() {
    const header = document.getElementById('header');
    if (!header) return;

    let lastScroll = 0;
    let ticking = false;

    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        header.classList.toggle('is-scrolled', scrollY > 40);
        header.classList.toggle('header--glass', scrollY > 80);
        lastScroll = scrollY;
        ticking = false;
      });
    }, { passive: true });
  }

  /* ── Smooth Scroll for Anchor Links ── */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (id === '#') return;
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Close mobile nav if open
          const nav = document.getElementById('nav');
          if (nav) nav.classList.remove('nav--mobile-open');
        }
      });
    });
  }

  /* ── Mobile Nav Toggle ── */
  function initMobileNav() {
    const hamburger = document.getElementById('hamburger');
    const nav = document.getElementById('nav');
    if (!hamburger || !nav) return;

    hamburger.addEventListener('click', () => {
      nav.classList.toggle('nav--mobile-open');
    });

    // Close on link click
    nav.querySelectorAll('.nav__link').forEach(link => {
      link.addEventListener('click', () => nav.classList.remove('nav--mobile-open'));
    });
  }

  /* ── Stagger Children Reveal ── */
  function initStaggerReveal() {
    const grids = document.querySelectorAll('.formations-grid, .agents-grid, .points-grid, .levels-showcase, .how-it-works__grid, .parrainage-grid');
    grids.forEach(grid => {
      const children = grid.children;
      Array.from(children).forEach((child, i) => {
        child.classList.add('reveal');
        child.classList.add('reveal--delay-' + Math.min(i + 1, 4));
      });
    });
  }

  /* ── Init All ── */
  function init() {
    initStaggerReveal();
    initScrollReveal();
    init3DTilt();
    initRipple();
    initParticles();
    initParallax();
    initCounters();
    initNavScroll();
    initSmoothScroll();
    initMobileNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
