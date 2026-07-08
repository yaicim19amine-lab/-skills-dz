/* ========================================
   SKILLS DZ — Dashboard Logic
   ======================================== */

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
    setInterval(() => {
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
  } catch {}
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
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
  } else if (page === 'videos') {
    loadVideos();
  } else if (page === 'boutique') {
    loadShop();
  } else if (page === 'paiements') {
    loadPayments();
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
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      const xpMap = { course: 50, video: 30, game: 100, form: 20, ai: 15, referral: 200 };

      // earnXP internally calls addXP — do NOT call addXP separately (double XP bug fix)
      Gamification.earnXP(action);
      addActivity(action, xpMap[action] || 0);

      // Visual feedback
      btn.style.borderColor = '#00d68f';
      setTimeout(() => btn.style.borderColor = '#1c2035', 600);
    });
  });
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
      <p>${labelMap[type] || type} — <strong>+${xp} XP</strong></p>
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
  const notif = document.createElement('div');
  notif.className = 'notification';
  notif.style.cssText = `
    position:fixed;top:24px;right:24px;padding:16px 24px;border-radius:12px;
    background:${type==='success'?'#00d68f':type==='error'?'#ff4d6d':'#1E5BFF'};
    color:white;font-size:14px;font-weight:600;
    box-shadow:0 8px 32px rgba(0,0,0,0.3);z-index:1000;
    animation:fadeIn 0.3s ease;
  `;
  notif.textContent = message;
  document.body.appendChild(notif);
  setTimeout(() => { notif.style.opacity = '0'; notif.style.transition = 'opacity 0.3s'; setTimeout(() => notif.remove(), 300); }, 3000);
}

/* ========================================
   FORMATIONS DATA
   ======================================== */
function loadFormations() {
  const grid = document.getElementById('formationsGrid');
  if (!grid) return;

  api.getFormations().then(data => {
    const formations = data.formations || [];
    if (formations.length === 0) {
      grid.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:2rem">Aucune formation disponible pour le moment.</p>';
      return;
    }
    grid.innerHTML = formations.map(f => `
      <div class="formation-card">
        <div class="formation-card__header">
          <div class="formation-card__emoji">${f.emoji || '📚'}</div>
          <div class="formation-card__xp">+${f.xp_reward} XP</div>
          <h3 class="formation-card__title">${f.title}</h3>
          <p class="formation-card__meta">${f.duration_weeks} semaines · ${f.max_slots} places · ${f.price_dzd.toLocaleString()} DA</p>
        </div>
        <div class="formation-card__body">
          <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:1rem">${f.description || ''}</p>
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
function loadVideos() {
  const grid = document.getElementById('videosGrid');
  if (!grid) return;

  api.getVideos().then(data => {
    const videos = data.videos || [];
    if (videos.length === 0) {
      grid.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:2rem">Aucune vidéo disponible pour le moment.</p>';
      return;
    }
    grid.innerHTML = videos.map(v => {
      const mins = Math.floor((v.duration_seconds || 0) / 60);
      const secs = (v.duration_seconds || 0) % 60;
      const duration = `${mins}:${secs.toString().padStart(2, '0')}`;
      return `
        <div class="video-card">
          <div class="video-card__thumb">
            <div class="video-card__play"><i data-lucide="play"></i></div>
            <span class="video-card__duration">${duration}</span>
          </div>
          <div class="video-card__body">
            <h4 class="video-card__title">${v.title}</h4>
            <div class="video-card__meta">
              <span>${v.category || ''}</span>
              <span class="video-card__xp">+${v.xp_reward} XP</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }).catch(err => {
    grid.innerHTML = `<p style="color:var(--error);text-align:center;padding:2rem">Erreur de chargement: ${err.message}</p>`;
  });
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
  try {
    const user = JSON.parse(localStorage.getItem('skillsdz_user'));
    // Reuse existing code if present
    if (user?.referralCode) {
      codeEl.textContent = user.referralCode;
      return;
    }
    const base = (user?.firstName || 'USER').toUpperCase().slice(0, 4);
    const hash = Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = `SKDZ-${base}${hash}`;
    // Persist referral code in user object
    if (user) {
      user.referralCode = code;
      localStorage.setItem('skillsdz_user', JSON.stringify(user));
    }
    codeEl.textContent = code;
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

  const state = Gamification.getState();
  if (balanceEl) balanceEl.textContent = `${state.xp} XP`;

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

  const state = Gamification.getState();
  const allItems = window._shopItems || [];
  const items = category === 'all' ? allItems : allItems.filter(i => i.category === category);

  grid.innerHTML = items.map(item => {
    const canAfford = state.xp >= item.xp_cost;
    const inStock = item.stock === -1 || item.stock > 0;
    return `
      <div class="shop-card ${!canAfford || !inStock ? 'shop-card--disabled' : ''}">
        <h4 class="shop-card__name">${item.name}</h4>
        <p class="shop-card__desc">${item.description || ''}</p>
        <div class="shop-card__footer">
          <span class="shop-card__cost">${item.xp_cost} XP</span>
          ${!inStock ? '<span class="shop-card__stock">Rupture</span>' : item.stock > 0 ? `<span class="shop-card__stock">${item.stock} restants</span>` : '<span class="shop-card__stock">Illimité</span>'}
        </div>
        <button class="btn btn--accent btn--block shop-buy-btn" ${!canAfford || !inStock ? 'disabled' : ''} data-item-id="${item.id}">
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

  const state = Gamification.getState();
  if (state.xp < item.xp_cost) {
    showNotification('XP insuffisants !', 'error');
    return;
  }

  api.purchaseItem(itemId).then(() => {
    Gamification.deductXP(item.xp_cost, `Achat: ${item.name}`);
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
          <div class="live-session-card__status live-session-card__status--${s.status}">${s.status === 'live' ? '🔴 En direct' : s.status === 'scheduled' ? '🟢 Programmé' : '⚫ Terminé'}</div>
          <div class="live-session-card__info">
            <h4>${s.title}</h4>
            <p>${s.speaker || ''} · ${new Date(s.date || s.scheduled_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à ${new Date(s.date || s.scheduled_at).getHours()}h${String(new Date(s.date || s.scheduled_at).getMinutes()).padStart(2, '0')}</p>
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
   PAIEMENTS
   ======================================== */
let selectedPaymentMethod = 'cib';

function loadPayments() {
  if (!window._paymentInit) {
    window._paymentInit = true;
    // Method selection
    document.querySelectorAll('.payment-method-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.payment-method-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedPaymentMethod = btn.dataset.method;
      });
    });

    // Preset amounts
    document.querySelectorAll('.payment-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('paymentAmount').value = btn.dataset.amount;
      });
    });

    // Create payment button
    document.getElementById('createPaymentBtn')?.addEventListener('click', createPayment);
  }

  // Load history
  loadPaymentHistory();
}

async function createPayment() {
  const amount = parseInt(document.getElementById('paymentAmount').value);
  if (!amount || amount < 500) {
    showNotification('Montant minimum: 500 DA', 'error');
    return;
  }

  const btn = document.getElementById('createPaymentBtn');
  btn.innerHTML = '<span>Création en cours...</span>';
  btn.disabled = true;

  try {
    const data = await api.createPayment({ amount, method: selectedPaymentMethod });
    showPaymentInstructions(data.instructions, amount);
    showNotification('Paiement créé !', 'success');
  } catch (err) {
    showNotification('Erreur: ' + err.message, 'error');
  } finally {
    btn.innerHTML = 'Créer le paiement';
    btn.disabled = false;
  }
}

function showPaymentInstructions(instructions, amount) {
  const container = document.getElementById('paymentInstructions');
  const title = document.getElementById('paymentInstructionsTitle');
  const content = document.getElementById('paymentInstructionsContent');

  if (!container || !content) return;

  title.textContent = instructions.title;
  container.style.display = 'block';

  let html = '';

  if (instructions.qrData) {
    html += `
      <div class="payment-qr">
        <img src="${instructions.qrData}" alt="QR Code" width="200" height="200" style="border-radius:12px;background:white;padding:8px;"/>
        <p style="font-size:12px;color:#8892b0;margin-top:8px;">Scannez le QR code avec BaridiMob</p>
      </div>
    `;
  }

  if (instructions.walletAddress) {
    html += `
      <div class="payment-wallet">
        <p style="font-size:12px;color:#8892b0;">Adresse wallet (${instructions.network})</p>
        <div style="display:flex;gap:8px;align-items:center;margin:8px 0;">
          <code style="flex:1;padding:8px 12px;background:#0B1331;border:1px solid #1c2035;border-radius:8px;font-size:12px;color:#00C4FF;word-break:break-all;">${instructions.walletAddress}</code>
          <button class="btn btn--ghost btn--sm" onclick="navigator.clipboard.writeText('${instructions.walletAddress}');showNotification('Copié !','success')">📋</button>
        </div>
        <p style="font-size:14px;font-weight:700;color:#ffb547;">${instructions.amountUSDT} USDT ≈ ${amount} DA</p>
      </div>
    `;
  }

  if (instructions.steps) {
    html += `
      <div class="payment-steps">
        <h4 style="font-size:14px;font-weight:700;color:white;margin:16px 0 8px;">📋 Étapes :</h4>
        <ol style="padding-left:20px;">
          ${instructions.steps.map(s => `<li style="font-size:13px;color:#8892b0;margin-bottom:8px;line-height:1.5;">${s}</li>`).join('')}
        </ol>
      </div>
    `;
  }

  html += `
    <div style="margin-top:16px;padding:12px;background:#ffb54722;border:1px solid #ffb54744;border-radius:10px;">
      <p style="font-size:13px;color:#ffb547;"><strong>⚡ Confirmation :</strong> Envoyez la preuve de paiement par WhatsApp au <strong>06 56 47 15 47</strong></p>
    </div>
  `;

  content.innerHTML = html;
  container.scrollIntoView({ behavior: 'smooth' });
}

function loadPaymentHistory() {
  const el = document.getElementById('paymentHistory');
  if (!el) return;

  api.getPayments().then(data => {
    const payments = data.payments || [];
    if (payments.length === 0) {
      el.innerHTML = '<p style="padding:20px;text-align:center;color:#555;">Aucun paiement</p>';
      return;
    }
    el.innerHTML = payments.map(p => `
      <div class="payment-history-item">
        <div class="payment-history-method payment-history-method--${(p.method || 'cib').toLowerCase()}">${p.method || 'N/A'}</div>
        <div class="payment-history-info">
          <strong>${(p.amount_dzd || 0).toLocaleString()} DA</strong>
          <span>${new Date(p.created_at).toLocaleDateString('fr-FR')} · ${p.reference || 'N/A'}</span>
        </div>
        <span class="status-badge status-badge--${p.status}">${p.status === 'paid' ? '✅ Payé' : '⏳ En attente'}</span>
      </div>
    `).join('');
  }).catch(() => {
    el.innerHTML = '<p style="padding:20px;text-align:center;color:#555;">Erreur de chargement</p>';
  });
}
