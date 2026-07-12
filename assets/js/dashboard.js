/* ========================================
   SKILLS DZ — Dashboard Logic
   ======================================== */

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function closeLevelUpModal() { document.getElementById('levelUpModal')?.classList.remove('open'); }

let _pandaSpeechInterval = null;
let _notifTimeout = null;

document.addEventListener('DOMContentLoaded', () => {
  // Auth guard — redirect to login if not authenticated
  if (typeof Auth !== 'undefined' && !Auth.isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }

  // Auto-migrate localStorage data if needed
  if (typeof Migration !== 'undefined' && !Migration.isMigrated()) {
    Migration.migrate().then(result => {
      if (result.success) {
        console.log('Migration effectuée:', result.data);
      }
    }).catch(err => {
      console.error('Migration failed:', err);
    });
  }

  if (typeof lucide !== 'undefined') lucide.createIcons();

  // === INIT ===
  Gamification.checkStreak();
  Gamification.updateDashboardUI();
  loadUserData();
  initNavigation();
  initMobileMenu();
  initQuickActions();
  initNotifications();
  loadFormations();
  loadVideos();
  renderRewards();
  generateReferralCode();

  // Panda speech rotation on header
  const speeches = ["Prêt à apprendre ? 🐼", "On y va ! 🚀", "Chaque point compte ! ⚡", "Tu progresses bien ! 💪", "Continue comme ça ! 🎯"];
  let speechIdx = 0;
  const sub = document.getElementById('welcomeSub');
  if (sub) {
    if (_pandaSpeechInterval) clearInterval(_pandaSpeechInterval);
    _pandaSpeechInterval = setInterval(() => {
      sub.style.opacity = '0';
      setTimeout(() => {
        speechIdx = (speechIdx + 1) % speeches.length;
        sub.innerHTML = speeches[speechIdx];
        sub.style.opacity = '1';
      }, 200);
    }, 5000);
  }
});

/* ========================================
   USER DATA
   ======================================== */
function loadUserData() {
  try {
    const user = JSON.parse(localStorage.getItem('skillsdz_user'));
    if (!user) return;
    const name = user.firstName || user.name || 'Apprenant';
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    setText('welcomeName', name);
    setText('userName', name);

    const avatar = document.getElementById('userAvatar');
    const profileAvatar = document.getElementById('profileAvatar');
    if (avatar) avatar.textContent = initials;
    if (profileAvatar) profileAvatar.textContent = initials;

    setText('profileName', name);
    setText('profileEmail', user.email || '');

    const lvlData = Gamification.getLevelData();
    setText('profileLevel', `Niveau ${lvlData.level} — ${lvlData.name}`);
    setText('profileXP', lvlData.currentXP);
    setText('profileStreak', Gamification.getState().streak);
    setText('profileBadges', Gamification.getState().badges.length);
    setText('profileCourses', Gamification.getState().coursesCompleted.length);

    // Animated KPI counters
    const kpiEls = {
      coursesCompleted: Gamification.getState().coursesCompleted.length,
      videosWatched: Gamification.getState().videosWatched || 0,
      gamesPlayed: Gamification.getState().gamesPlayed || 0,
      badgesCount: Gamification.getState().badges.length,
    };
    Object.entries(kpiEls).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) animateValue(el, 0, val, 800);
    });

  // Greeting based on time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const welcomeEl = document.getElementById('welcomeName');
  if (welcomeEl) welcomeEl.parentElement.innerHTML = `${greeting}, <span id="welcomeName">${esc(name)}</span> !`;

  const continueCard = document.getElementById('continueCard');
  const continueDesc = document.getElementById('continueDesc');
  const continueBtn = document.getElementById('continueBtn');
  if (continueCard && continueDesc && continueBtn) {
    api.getMyFormations().then(data => {
      const course = (data.courses || [])[0];
      if (!course) return;
      const total = Math.max(1, (course.duration_weeks || 0) * (course.days_per_week || 2));
      const completed = Math.round(((course.progress || 0) / 100) * total);
      const remaining = total - completed;
      if (remaining > 0) {
        continueCard.style.display = 'flex';
        continueDesc.textContent = `${course.title} — ${remaining} séances restantes`;
        continueBtn.onclick = () => navigateTo('cours');
      }
    }).catch(() => {});
  }

  // Sync profile from server
  api.get('/profile').then(result => {
    if (result?.user) {
      const srv = result.user;
      const local = JSON.parse(localStorage.getItem('skillsdz_user') || '{}');
      const merged = { ...local, ...srv, referralCode: srv.referralCode || local.referralCode };
      localStorage.setItem('skillsdz_user', JSON.stringify(merged));

      setText('profileLevel', `Niveau ${srv.level || lvlData.level} — ${lvlData.name}`);
      setText('profileXP', srv.xp || lvlData.currentXP);
      setText('profileStreak', srv.streak || Gamification.getState().streak);
      setText('profileBadges', (srv.badges || []).length);
    }
  }).catch(() => {});

  } catch {}
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function animateValue(el, start, end, duration) {
  if (!el || start === end) return;
  const range = end - start;
  const startTime = performance.now();
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + range * eased);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function showSkeleton(container, count = 3) {
  if (!container) return;
  container.innerHTML = Array(count).fill('').map(() => `
    <div class="skeleton-card">
      <div class="skeleton skeleton--circle"></div>
      <div class="skeleton skeleton--line" style="width:60%"></div>
      <div class="skeleton skeleton--line" style="width:80%"></div>
    </div>
  `).join('');
}

/* ========================================
   NAVIGATION
   ======================================== */
function initNavigation() {
  if (window._navInit) return;
  window._navInit = true;
  document.querySelectorAll('[data-page]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      navigateTo(page);
      closeMobileMenu();
    });
  });
}

function navigateTo(page) {
  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  // Show/hide pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('page--active'));
  const target = document.getElementById('page-' + page);
  if (target) target.classList.add('page--active');

  // Init page content
  if (page === 'agents') {
    AIAgents.renderAgentCards('agentsContainer');
  } else if (page === 'jeux') {
    MiniGames.renderMenu('miniGamesContainer');
  } else if (page === 'formations') {
    loadFormations();
  } else if (page === 'cours') {
    loadCours();
  } else if (page === 'videos') {
    loadVideos();
  } else if (page === 'boutique') {
    loadShop();
  } else if (page === 'live') {
    loadLiveSessions();
  }

  // Scroll to top
  document.querySelector('.main').scrollTop = 0;
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

/* ========================================
   MOBILE MENU
   ======================================== */
function initMobileMenu() {
  if (window._menuInit) return;
  window._menuInit = true;
  const btn = document.getElementById('mobileMenuBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

  if (btn) btn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
  });
  if (overlay) overlay.addEventListener('click', closeMobileMenu);
}

function closeMobileMenu() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebarOverlay')?.classList.remove('open');
}

/* ========================================
   QUICK ACTIONS
   ======================================== */
function initQuickActions() {
  if (window._quickInit) return;
  window._quickInit = true;
  document.querySelectorAll('.quick-action').forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.action;
      const navMap = { course: 'cours', video: 'videos', game: 'jeux', ai: 'agents', referral: 'parrainage' };
      const serverXpMap = { game: 100, form: 20, ai: 15 };

      if (navMap[action]) navigateTo(navMap[action]);

      if (!serverXpMap[action]) {
        addActivity(action, 0);
      } else {
        btn.disabled = true;
        try {
          const data = await api.awardXpEvent(action, serverXpMap[action], quickActionReason(action));
          updateCachedUserProgress(data);
          addActivity(action, data.awarded || serverXpMap[action]);
          showNotification(`+${data.awarded || serverXpMap[action]} XP enregistrés`, 'success');
        } catch (err) {
          showNotification(err.message, 'error');
        } finally {
          btn.disabled = false;
        }
      }

      // Visual feedback
      btn.style.borderColor = '#00d68f';
      setTimeout(() => btn.style.borderColor = '#1c2035', 600);
    });
  });
}

function quickActionReason(action) {
  const reasons = { game: 'Jeu lancé depuis actions rapides', form: 'Formulaire rempli', ai: 'Agent IA consulté' };
  return reasons[action] || 'Action complétée';
}

function updateCachedUserProgress(data) {
  if (!data || typeof data.xp !== 'number') return;
  try {
    const user = JSON.parse(localStorage.getItem('skillsdz_user') || '{}');
    user.xp = data.xp;
    if (typeof data.level === 'number') user.level = data.level;
    localStorage.setItem('skillsdz_user', JSON.stringify(user));
  } catch {}
  const userXp = document.getElementById('userXp');
  const userLevelBadge = document.getElementById('userLevelBadge');
  if (userXp) userXp.textContent = `${data.xp} XP`;
  if (userLevelBadge && typeof data.level === 'number') userLevelBadge.textContent = `Nv. ${data.level}`;
}

/* ========================================
   ACTIVITY FEED
   ======================================== */
function addActivity(type, xp) {
  const feed = document.getElementById('activityFeed');
  if (!feed) return;
  const iconMap = {
    course: 'book-open', video: 'video', game: 'gamepad-2',
    form: 'file-text', ai: 'bot', referral: 'users'
  };
  const labelMap = {
    course: 'Cours suivi', video: 'Vidéo regardée', game: 'Jeu joué',
    form: 'Formulaire rempli', ai: 'Agent IA consulté', referral: 'Ami parrainé'
  };
  const item = document.createElement('div');
  item.className = 'activity-item';
  item.style.animation = 'fadeIn 0.3s ease';
  item.innerHTML = `
    <div class="activity-item__icon" style="background:rgba(30,91,255,.15)"><i data-lucide="${iconMap[type] || 'zap'}"></i></div>
    <div class="activity-item__content">
      <p>${labelMap[type] || type}${xp > 0 ? ` — <strong>+${xp} XP</strong>` : ''}</p>
      <span class="activity-item__time">À l'instant</span>
    </div>
  `;
  feed.insertBefore(item, feed.firstChild);
  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Keep max 8 items
  while (feed.children.length > 8) feed.removeChild(feed.lastChild);
}

/* ========================================
   NOTIFICATIONS
   ======================================== */
function initNotifications() {
  if (window._notifInit) return;
  window._notifInit = true;
  const btns = [document.getElementById('notifBtn'), document.getElementById('notifBtn2')];
  btns.forEach(btn => {
    if (btn) btn.addEventListener('click', () => showNotification('Vous avez de nouvelles notifications !', 'info'));
  });
}

function showNotification(message, type = 'info') {
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();
  if (_notifTimeout) clearTimeout(_notifTimeout);
  const notif = document.createElement('div');
  notif.className = 'notification';
  notif.style.cssText = `
    position:fixed;top:24px;right:24px;padding:16px 24px;border-radius:12px;
    background:${type==='success'?'#00d68f':type==='error'?'#ff4d6d':'#1E5BFF'};
    color:white;font-size:14px;font-weight:600;z-index:1000;
    animation:fadeIn 0.3s ease;max-width:360px;
    box-shadow:0 8px 32px rgba(0,0,0,0.3);
  `;
  notif.textContent = message;
  document.body.appendChild(notif);
  _notifTimeout = setTimeout(() => { notif.style.opacity = '0'; notif.style.transition = 'opacity 0.3s'; setTimeout(() => notif.remove(), 300); }, 3000);
}

/* ========================================
   FORMATIONS DATA
   ======================================== */
function loadFormations() {
  const grid = document.getElementById('formationsGrid');
  if (!grid) return;

  showSkeleton(grid, 3);

  api.getFormations().then(data => {
    const formations = data.formations || [];
    if (formations.length === 0) {
      grid.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:2rem">Aucune formation disponible pour le moment.</p>';
      return;
    }
    grid.innerHTML = formations.map(f => `
      <div class="formation-card">
        <div class="formation-card__header">
          <div class="formation-card__emoji">${esc(f.emoji || '📚')}</div>
          <div class="formation-card__xp">+${f.xp_reward} XP</div>
          <h3 class="formation-card__title">${esc(f.title)}</h3>
          <p class="formation-card__meta">${f.duration_weeks} semaines · ${f.max_slots} places · ${f.price_dzd.toLocaleString()} DA</p>
        </div>
        <div class="formation-card__body">
          <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:1rem">${esc(f.description || '')}</p>
          <div class="formation-card__footer">
            <span class="formation-card__status formation-card__status--active">Disponible</span>
          </div>
        </div>
      </div>
    `).join('');
  }).catch(err => {
    grid.innerHTML = `<p style="color:var(--error);text-align:center;padding:2rem">Erreur de chargement: ${err.message}</p>`;
  });
}

/* ========================================
   VIDEOS DATA
   ======================================== */
let _videoCat = 'all';

function loadVideos() {
  const grid = document.getElementById('videosGrid');
  if (!grid) return;

  showSkeleton(grid, 6);

  // Init filter buttons
  if (!window._videoFilterInit) {
    window._videoFilterInit = true;
    document.querySelectorAll('.video-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.video-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _videoCat = btn.dataset.cat;
        renderVideosFromData(grid);
      });
    });
  }

  api.getVideos().then(data => {
    window._videoData = data.videos || [];
    renderVideosFromData(grid);
  }).catch(err => {
    grid.innerHTML = `<p style="color:var(--error);text-align:center;padding:2rem">Erreur de chargement: ${err.message}</p>`;
  });
}

function renderVideosFromData(grid) {
  const allVideos = window._videoData || [];
  const filtered = _videoCat === 'all' ? allVideos : allVideos.filter(v => (v.category || '').toLowerCase() === _videoCat);

  if (filtered.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:2rem">Aucune vidéo dans cette catégorie</p>';
    return;
  }

  const catColors = { introduction: '#94a3b8', debutant: '#00d68f', intermediaire: '#1E5BFF', avance: '#7c3aed', pro: '#ffb547' };
  const catLabels = { introduction: 'Introduction', debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé', pro: 'Pro' };

  grid.innerHTML = filtered.map(v => {
    const mins = Math.floor((v.duration_seconds || 0) / 60);
    const secs = (v.duration_seconds || 0) % 60;
    const duration = `${mins}:${secs.toString().padStart(2, '0')}`;
    const cat = (v.category || 'debutant').toLowerCase();
    return `
      <div class="video-card">
        <div class="video-card__thumb">
          <div class="video-card__play"><i data-lucide="play"></i></div>
          <span class="video-card__duration">${esc(duration)}</span>
          <span class="video-card__cat" style="background:${catColors[cat] || '#1E5BFF'}">${esc(catLabels[cat] || cat)}</span>
        </div>
        <div class="video-card__body">
          <h4 class="video-card__title">${esc(v.title)}</h4>
          <div class="video-card__meta">
            <span>${esc(v.category || '')}</span>
            <span class="video-card__xp">+${v.xp_reward} XP</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

/* ========================================
   REWARDS
   ======================================== */
function renderRewards() {
  const grid = document.getElementById('rewardsGrid');
  if (!grid) return;

  const badges = Gamification.BADGES;
  const state = Gamification.getState();

  grid.innerHTML = badges.map(b => {
    const unlocked = state.badges.includes(b.id);
    return `
      <div class="reward-card ${unlocked ? '' : 'reward-card--locked'}">
        <div class="reward-card__icon">${b.icon}</div>
        <div class="reward-card__name">${b.name}</div>
        <div class="reward-card__desc">${b.desc}</div>
      </div>
    `;
  }).join('');
}

/* ========================================
   PARRAINAGE
   ======================================== */
function generateReferralCode() {
  const codeEl = document.getElementById('referralCodeDisplay');
  if (!codeEl) return;
  if (typeof PlatformSettings !== 'undefined' && !PlatformSettings.get('platform_referral_system')) {
    codeEl.closest('.card, section')?.querySelectorAll('button, input').forEach(el => el.disabled = true);
    codeEl.textContent = 'Système désactivé';
    return;
  }
  try {
    const user = JSON.parse(localStorage.getItem('skillsdz_user'));
    if (user?.referralCode) {
      codeEl.textContent = user.referralCode;
      return;
    }
    api.get('/profile').then(result => {
      if (result?.user?.referralCode) {
        codeEl.textContent = result.user.referralCode;
        if (user) {
          user.referralCode = result.user.referralCode;
          localStorage.setItem('skillsdz_user', JSON.stringify(user));
        }
      } else {
        const base = (user?.firstName || 'USER').toUpperCase().slice(0, 4);
        const hash = Math.random().toString(36).substring(2, 6).toUpperCase();
        const code = `SKDZ-${base}${hash}`;
        if (user) {
          user.referralCode = code;
          localStorage.setItem('skillsdz_user', JSON.stringify(user));
        }
        codeEl.textContent = code;
      }
    }).catch(() => {
      const base = (user?.firstName || 'USER').toUpperCase().slice(0, 4);
      const hash = Math.random().toString(36).substring(2, 6).toUpperCase();
      codeEl.textContent = `SKDZ-${base}${hash}`;
    });
  } catch {
    codeEl.textContent = `SKDZ-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }
}

function copyReferralCode() {
  const code = document.getElementById('referralCodeDisplay')?.textContent;
  if (code) {
    navigator.clipboard?.writeText(code).then(() => showNotification('Code copié !', 'success'));
  }
}

/* ========================================
   BOUTIQUE XP
   ======================================== */
function loadShop() {
  const grid = document.getElementById('shopGrid');
  const balanceEl = document.getElementById('shopXpBalance');
  if (!grid) return;
  if (typeof PlatformSettings !== 'undefined' && !PlatformSettings.get('platform_xp_shop')) {
    grid.innerHTML = '<p style="color:#8892b0;text-align:center;padding:2rem;grid-column:1/-1">La boutique XP est temporairement désactivée.</p>';
    return;
  }

  window._serverXp = null;
  if (balanceEl) balanceEl.textContent = 'Chargement...';

  api.getMe().then(data => {
    if (typeof data.user?.xp === 'number') {
      window._serverXp = data.user.xp;
      if (balanceEl) balanceEl.textContent = `${window._serverXp} XP`;
      if (window._shopItems) renderShopItems(document.querySelector('.shop-filter.active')?.dataset.category || 'all');
    }
  }).catch(() => {});

  api.getShopItems().then(data => {
    const items = data.items || [];
    if (items.length === 0) {
      grid.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:2rem">Aucun article disponible.</p>';
      return;
    }
    window._shopItems = items;
    renderShopItems('all');
  }).catch(err => {
    grid.innerHTML = `<p style="color:var(--error);text-align:center;padding:2rem">Erreur: ${err.message}</p>`;
  });

  if (!window._shopFilterInit) {
    window._shopFilterInit = true;
    document.querySelectorAll('.shop-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.shop-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderShopItems(btn.dataset.category);
      });
    });
  }
}

function renderShopItems(category) {
  const grid = document.getElementById('shopGrid');
  if (!grid) return;

  const availableXp = typeof window._serverXp === 'number' ? window._serverXp : -1;
  const allItems = window._shopItems || [];
  const items = category === 'all' ? allItems : allItems.filter(i => i.category === category);

  grid.innerHTML = items.map(item => {
    const canAfford = availableXp >= item.xp_cost;
    const inStock = item.stock === -1 || item.stock > 0;
    return `
      <div class="shop-card ${!canAfford || !inStock ? 'shop-card--disabled' : ''}">
        <h4 class="shop-card__name">${esc(item.name)}</h4>
        <p class="shop-card__desc">${esc(item.description || '')}</p>
        <div class="shop-card__footer">
          <span class="shop-card__cost">${item.xp_cost} XP</span>
          ${!inStock ? '<span class="shop-card__stock">Rupture</span>' : item.stock > 0 ? `<span class="shop-card__stock">${esc(item.stock)} restants</span>` : '<span class="shop-card__stock">Illimité</span>'}
        </div>
        <button class="btn btn--accent btn--block shop-buy-btn" ${!canAfford || !inStock ? 'disabled' : ''} data-item-id="${esc(item.id)}">
          ${canAfford && inStock ? 'Échanger' : 'XP insuffisants'}
        </button>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.shop-buy-btn').forEach(btn => {
    btn.addEventListener('click', () => purchaseShopItem(btn.dataset.itemId));
  });
}

function purchaseShopItem(itemId) {
  const item = (window._shopItems || []).find(i => i.id === itemId);
  if (!item) return;

  const availableXp = typeof window._serverXp === 'number' ? window._serverXp : -1;
  if (availableXp < item.xp_cost) {
    showNotification('XP insuffisants !', 'error');
    return;
  }

  api.purchaseItem(itemId).then(data => {
    if (typeof data.remainingXp === 'number') {
      window._serverXp = data.remainingXp;
      const balanceEl = document.getElementById('shopXpBalance');
      if (balanceEl) balanceEl.textContent = `${window._serverXp} XP`;
    }
    showNotification(`${item.name} échangé ! -${item.xp_cost} XP`, 'success');
    loadShop();
  }).catch(err => {
    showNotification(`Erreur: ${err.message}`, 'error');
  });
}

/* ========================================
   LIVE SESSIONS
   ======================================== */
function loadLiveSessions() {
  const scheduleEl = document.getElementById('liveSchedule');
  if (!scheduleEl) return;

  api.getLiveSessions().then(data => {
    const sessions = data.schedule || [];
    if (sessions.length === 0) {
      scheduleEl.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:2rem">Aucune session live prévue.</p>';
      return;
    }
    scheduleEl.innerHTML = `
      <h3 style="font-size:18px;font-weight:700;color:white;margin-bottom:16px;">📅 Prochaines sessions</h3>
      ${sessions.map(s => `
        <div class="live-session-card">
          <div class="live-session-card__status live-session-card__status--${esc(s.status)}">${s.status === 'live' ? '🔴 En direct' : s.status === 'scheduled' ? '🟢 Programmé' : '⚫ Terminé'}</div>
          <div class="live-session-card__info">
            <h4>${esc(s.title)}</h4>
            <p>${esc(s.speaker || '')} · ${new Date(s.date || s.scheduled_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à ${new Date(s.date || s.scheduled_at).getHours()}h${String(new Date(s.date || s.scheduled_at).getMinutes()).padStart(2, '0')}</p>
          </div>
          <button class="btn btn--ghost btn--sm" ${s.youtubeUrl ? '' : 'disabled'}>Regarder</button>
        </div>
      `).join('')}
    `;
  }).catch(err => {
    scheduleEl.innerHTML = `<p style="color:var(--error);text-align:center;padding:2rem">Erreur: ${err.message}</p>`;
  });
}

/* ========================================
   MES COURS — Présence, Sessions, En ligne
   ======================================== */
let _coursFilter = 'all';
let _coursData = [];

function loadCours() {
  const list = document.getElementById('coursList');
  if (!list) return;

  api.getMyFormations().then(data => {
    const courses = (data.courses || []).map(f => ({
      id: f.id,
      title: f.title,
      emoji: f.emoji || '📚',
      description: f.description || '',
      totalSessions: Math.max(1, (f.duration_weeks || 0) * (f.days_per_week || 2)),
      completedSessions: Math.round(((f.progress || 0) / 100) * Math.max(1, (f.duration_weeks || 0) * (f.days_per_week || 2))),
      attendedSessions: Math.round(((f.progress || 0) / 100) * Math.max(1, (f.duration_weeks || 0) * (f.days_per_week || 2))),
      priceTotal: f.price_dzd || 0,
      pricePaid: 0,
      isOnline: f.duration_weeks <= 4,
      status: f.status || 'active',
      nextSession: null,
    }));

    _coursData = courses;
    renderCoursList(_coursData);
    renderCoursStats(_coursData);
    initCoursFilters();
  }).catch(() => {
    list.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:2rem">Erreur de chargement</p>';
  });
}

function markCoursPresence(coursId) {
  api.put('/profile', { action: 'markCoursPresence', coursId }).then(data => {
    showNotification(`Présence enregistrée ! +${data.awarded || 20} XP`, 'success');
    if (typeof data.xp === 'number') {
      updateCachedUserProgress(data);
    }
    loadCours();
  }).catch(err => {
    showNotification(err.message || 'Erreur lors de l\'enregistrement', 'error');
  });
}

function openCoursOnline(coursId) {
  const course = _coursData.find(c => c.id === coursId);
  if (course) {
    navigateTo('videos');
    showNotification(`Cours en ligne : ${course.title}`, 'info');
    return;
  }

  api.watchVideo(coursId).then(data => {
    showNotification(`Progression vidéo enregistrée : +${data.awarded || 30} XP`, 'success');
    if (typeof data.xp === 'number') {
      updateCachedUserProgress(data);
    }
    loadCours();
  }).catch(err => {
    showNotification(err.message || 'Erreur vidéo', 'error');
  });
}

function payCoursRemaining(coursId) {
  const course = _coursData.find(c => c.id === coursId);
  if (!course) return;

  navigateTo('paiements');
  showNotification(`Paiement pour "${course.title}" — ${course.priceTotal - course.pricePaid} DA restants`, 'info');
}

function renderCoursStats(courses) {
  const total = courses.length;
  const remaining = courses.reduce((s, c) => s + (c.totalSessions - c.completedSessions), 0);

  setText('coursTotal', total);
  setText('coursRemaining', remaining);
}

function renderCoursList(courses) {
  const list = document.getElementById('coursList');
  if (!list) return;

  const filtered = _coursFilter === 'all' ? courses
    : _coursFilter === 'present' ? courses.filter(c => c.attendedSessions > 0)
    : _coursFilter === 'absent' ? courses.filter(c => c.attendedSessions === 0 && c.completedSessions > 0)
    : _coursFilter === 'en-ligne' ? courses.filter(c => c.isOnline)
    : courses;

  if (filtered.length === 0) {
    list.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:2rem">Aucun cours dans cette catégorie</p>';
    return;
  }

  list.innerHTML = filtered.map(c => {
    const presencePercent = c.totalSessions > 0 ? Math.round((c.attendedSessions / c.totalSessions) * 100) : 0;
    const remainingSessions = c.totalSessions - c.completedSessions;
    const presenceColor = presencePercent >= 70 ? '#00d68f' : presencePercent >= 40 ? '#ffb547' : '#ff4d6d';

    return `
      <div class="cours-card" data-filter="${c.isOnline ? 'en-ligne' : ''} ${c.attendedSessions > 0 ? 'present' : c.completedSessions > 0 ? 'absent' : ''}">
        <div class="cours-card__header">
          <div class="cours-card__emoji">${c.emoji}</div>
          <div class="cours-card__title-group">
            <h3 class="cours-card__title">${esc(c.title)}</h3>
            <span class="cours-card__badge ${c.isOnline ? 'cours-card__badge--online' : 'cours-card__badge--onsite'}">
              <i data-lucide="${c.isOnline ? 'wifi' : 'map-pin'}"></i>
              ${c.isOnline ? 'En ligne' : 'Présentiel'}
            </span>
          </div>
        </div>

        <div class="cours-card__body">
          <!-- Présence -->
          <div class="cours-card__section">
            <div class="cours-card__section-header">
              <span class="cours-card__section-title"><i data-lucide="check-circle"></i> Présence</span>
              <span class="cours-card__section-value" style="color:${presenceColor}">${presencePercent}%</span>
            </div>
            <div class="cours-card__progress">
              <div class="cours-card__progress-bar" style="width:${presencePercent}%;background:${presenceColor}"></div>
            </div>
            <p class="cours-card__detail">${c.attendedSessions} / ${c.totalSessions} séances suivies</p>
          </div>

          <!-- Sessions restantes -->
          <div class="cours-card__section">
            <div class="cours-card__section-header">
              <span class="cours-card__section-title"><i data-lucide="clock"></i> Sessions</span>
              <span class="cours-card__section-value">${remainingSessions}</span>
            </div>
            <div class="cours-card__progress">
              <div class="cours-card__progress-bar" style="width:${c.totalSessions > 0 ? (c.completedSessions / c.totalSessions * 100) : 0}%;background:#1E5BFF"></div>
            </div>
            <p class="cours-card__detail">${c.completedSessions} / ${c.totalSessions} séances terminées</p>
          </div>
        </div>

        <div class="cours-card__footer">
          <button class="cours-card__btn cours-card__btn--primary" onclick="markCoursPresence('${esc(c.id)}')">
            <i data-lucide="check"></i> Marquer présence
          </button>
          ${c.isOnline ? `<button class="cours-card__btn cours-card__btn--accent" onclick="openCoursOnline('${esc(c.id)}')"><i data-lucide="play-circle"></i> Cours en ligne</button>` : ''}
        </div>
      </div>
    `;
  }).join('');

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function initCoursFilters() {
  if (window._coursFilterInit) return;
  window._coursFilterInit = true;
  document.querySelectorAll('.cours-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cours-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _coursFilter = btn.dataset.filter;
      renderCoursList(_coursData);
    });
  });
}
