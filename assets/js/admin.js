/* ========================================
   SKILLS DZ — Admin Panel (Full CRUD)
   ======================================== */

let adminData = { users: [], formations: [], payments: [], liveSessions: [], stats: {} };
let _adminPage = 'dashboard';
let _searchTerm = '';

document.addEventListener('DOMContentLoaded', () => {
  if (typeof Auth !== 'undefined' && !Auth.isLoggedIn()) { window.location.href = 'login.html'; return; }
  const user = JSON.parse(localStorage.getItem('skillsdz_user'));
  if (user && !user.isAdmin) { alert('Accès réservé aux administrateurs.'); window.location.href = 'dashboard.html'; return; }
  if (typeof lucide !== 'undefined') lucide.createIcons();

  initNavigation();
  initMobileMenu();
  initEventListeners();
  loadAdminProfile(user);
  loadAdminData();
  initJournal();
});

/* ========================================
   UTILS
   ======================================== */
function setText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

/* ========================================
   NAVIGATION
   ======================================== */
function initNavigation() {
  document.querySelectorAll('.nav-item[data-page]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(link.dataset.page);
      closeMobileMenu();
    });
  });
}

function navigateTo(page) {
  _adminPage = page;
  document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.page === page));
  document.querySelectorAll('.admin-page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-admin-' + page);
  if (target) target.classList.add('active');
  document.querySelector('.admin-main').scrollTop = 0;
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function initMobileMenu() {
  document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    document.getElementById('adminSidebar')?.classList.add('open');
    document.getElementById('adminOverlay')?.classList.add('active');
  });
  document.getElementById('adminOverlay')?.addEventListener('click', closeMobileMenu);
  document.getElementById('sidebarClose')?.addEventListener('click', closeMobileMenu);
}

function closeMobileMenu() {
  document.getElementById('adminSidebar')?.classList.remove('open');
  document.getElementById('adminOverlay')?.classList.remove('active');
}

/* ========================================
   EVENT LISTENERS
   ======================================== */
function initEventListeners() {
  document.getElementById('modalClose')?.addEventListener('click', closeModal);
  document.getElementById('modalOverlay')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  document.getElementById('addUserBtn')?.addEventListener('click', () => openUserModal());
  document.getElementById('exportUsersBtn')?.addEventListener('click', exportUsersCSV);
  document.getElementById('addFormationBtn')?.addEventListener('click', () => openFormationModal());
  document.getElementById('addSessionBtn')?.addEventListener('click', () => openLiveModal());
  document.getElementById('exportFinanceBtn')?.addEventListener('click', exportFinanceCSV);

  document.getElementById('adminProfileForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('adminName')?.value?.trim();
    if (!name) return showToast('Le nom est requis', 'error');
    api.updateProfile({ first_name: name }).then(() => {
      const u = JSON.parse(localStorage.getItem('skillsdz_user'));
      if (u) { u.firstName = name; u.name = name; localStorage.setItem('skillsdz_user', JSON.stringify(u)); }
      loadAdminProfile(u);
      showToast('Profil mis à jour', 'success');
    }).catch(err => showToast('Erreur: ' + err.message, 'error'));
  });

  document.querySelectorAll('.toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const active = toggle.classList.toggle('active');
      toggle.setAttribute('aria-checked', active);
    });
    toggle.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle.click(); }
    });
  });

  document.getElementById('notificationBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('notificationPanel')?.classList.toggle('active');
  });
  document.addEventListener('click', (e) => {
    const panel = document.getElementById('notificationPanel');
    const btn = document.getElementById('notificationBtn');
    if (panel && !panel.contains(e.target) && !btn?.contains(e.target)) panel.classList.remove('active');
  });
  document.getElementById('notifClear')?.addEventListener('click', () => {
    document.querySelectorAll('.notif-item--unread').forEach(i => i.classList.remove('notif-item--unread'));
    const badge = document.getElementById('notifBadge');
    if (badge) badge.style.display = 'none';
  });

  let searchTimer;
  document.getElementById('userSearch')?.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { _searchTerm = e.target.value.toLowerCase(); renderUsers(); }, 200);
  });
  document.getElementById('filterLevel')?.addEventListener('change', renderUsers);
  document.getElementById('filterStatus')?.addEventListener('change', renderUsers);
}

/* ========================================
   ADMIN PROFILE
   ======================================== */
function loadAdminProfile(user) {
  if (!user) return;
  const name = user.firstName || user.name || 'Admin';
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  document.querySelector('.avatar-circle').textContent = initials;
  document.querySelector('.avatar-name').textContent = name;
  document.getElementById('greetingTitle').textContent = `Bonjour, ${name}`;
  const an = document.getElementById('adminName');
  const ae = document.getElementById('adminEmail');
  if (an) an.value = name;
  if (ae) ae.value = user.email || '';
}

/* ========================================
   LOAD ALL DATA (parallel)
   ======================================== */
function loadAdminData() {
  document.querySelectorAll('[id^="stat"]').forEach(el => el.textContent = '...');

  Promise.all([
    api.getAdminData().catch(err => { console.error('Admin data error:', err); return { users: [], formations: [], payments: [], stats: {} }; }),
    api.getLiveSessions().catch(err => { console.error('Live sessions error:', err); return { schedule: [] }; })
  ]).then(([adminResult, liveResult]) => {
    adminData.users = adminResult.users || [];
    adminData.formations = adminResult.formations || [];
    adminData.payments = adminResult.payments || [];
    adminData.stats = adminResult.stats || {};
    adminData.liveSessions = liveResult.schedule || [];
    renderDashboard();
    renderUsers();
    renderFormations();
    renderLiveSessions();
    renderFinances();
    updateNotifBadge();
  });
}

/* ========================================
   DASHBOARD
   ======================================== */
function renderDashboard() {
  const { users, stats } = adminData;
  const totalXP = users.reduce((sum, u) => sum + (u.xp || 0), 0);
  setText('statUsers', (stats.totalUsers || users.length || 0).toLocaleString('fr-FD'));
  setText('statRevenue', (stats.totalRevenue || 0).toLocaleString('fr-FD') + ' DA');
  setText('statXP', totalXP.toLocaleString('fr-FD'));
  setText('statFormations', stats.activeFormations || 0);

  const feed = document.getElementById('activityFeed');
  if (!feed) return;
  const recent = users.slice(0, 6);
  if (recent.length === 0) { feed.innerHTML = '<p style="color:#8892b0;text-align:center;padding:1rem">Aucune activité</p>'; return; }
  feed.innerHTML = recent.map(u => {
    const name = esc(`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email);
    const date = new Date(u.created_at).toLocaleDateString('fr-FR');
    return `<li class="activity-item"><div class="activity-dot activity-dot--green"></div><div class="activity-body"><p><strong>${name}</strong> — Nv.${u.level || 1} | ${(u.xp||0).toLocaleString()} XP</p><time class="activity-time">${date}</time></div></li>`;
  }).join('');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

/* ========================================
   USERS
   ======================================== */
function renderUsers() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;
  let users = [...adminData.users];

  if (_searchTerm) users = users.filter(u => {
    const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    return name.includes(_searchTerm) || (u.email || '').toLowerCase().includes(_searchTerm);
  });

  const levelFilter = document.getElementById('filterLevel')?.value;
  const statusFilter = document.getElementById('filterStatus')?.value;
  if (levelFilter) users = users.filter(u => {
    const l = u.level || 1;
    return levelFilter === 'beginner' ? l <= 3 : levelFilter === 'intermediate' ? l >= 4 && l <= 7 : l >= 8;
  });
  if (statusFilter === 'banned') users = users.filter(u => u.is_banned);

  if (users.length === 0) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#8892b0;padding:2rem">Aucun utilisateur trouvé</td></tr>'; return; }

  const myId = JSON.parse(localStorage.getItem('skillsdz_user'))?.id;
  tbody.innerHTML = users.map(u => {
    const name = esc(`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email);
    const initials = (u.first_name || u.last_name || u.email || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const levelName = (u.level || 1) <= 3 ? 'Débutant' : (u.level || 1) <= 7 ? 'Intermédiaire' : 'Avancé';
    const levelColor = (u.level || 1) <= 3 ? 'yellow' : (u.level || 1) <= 7 ? 'blue' : 'cyan';
    const isBanned = u.is_banned;
    const isMe = u.id === myId;
    return `<tr>
      <td><div class="user-cell"><div class="avatar-sm" style="background:#1E5BFF">${esc(initials)}</div><span>${name}</span></div></td>
      <td>${esc(u.email)}</td>
      <td><span class="badge badge--${levelColor}">${levelName} (${u.level || 1})</span></td>
      <td>${(u.xp || 0).toLocaleString()}</td>
      <td>${u.is_admin ? '<span class="badge badge--blue">Admin</span>' : isBanned ? '<span class="badge badge--red">Banni</span>' : '<span class="badge badge--green">Actif</span>'}</td>
      <td><div class="action-btns">
        <button class="icon-btn" title="Voir" onclick="viewUser('${u.id}')"><i data-lucide="eye"></i></button>
        ${isMe ? '' : u.is_admin
          ? `<button class="icon-btn" title="Retirer admin" onclick="toggleAdmin('${u.id}',false)"><i data-lucide="shield-off"></i></button>`
          : `<button class="icon-btn" title="Rendre admin" onclick="toggleAdmin('${u.id}',true)"><i data-lucide="shield-plus"></i></button>
             <button class="icon-btn ${isBanned ? 'icon-btn--success' : 'icon-btn--danger'}" title="${isBanned ? 'Débannir' : 'Bannir'}" onclick="toggleBanUser('${u.id}','${isBanned ? 'unban' : 'ban'}')"><i data-lucide="${isBanned ? 'check-circle' : 'ban'}"></i></button>`}
      </div></td></tr>`;
  }).join('');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function viewUser(userId) {
  const u = adminData.users.find(u => u.id === userId);
  if (!u) return;
  const name = esc(`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email);
  const initials = (u.first_name || u.last_name || u.email || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const levelName = (u.level || 1) <= 3 ? 'Débutant' : (u.level || 1) <= 7 ? 'Intermédiaire' : 'Avancé';
  const created = new Date(u.created_at).toLocaleDateString('fr-FR');
  let badges = [];
  try { badges = u.badges ? (Array.isArray(u.badges) ? u.badges : JSON.parse(u.badges || '[]')) : []; } catch { badges = []; }

  openModal('Profil Utilisateur', `
    <div style="text-align:center;margin-bottom:16px">
      <div class="avatar-sm" style="background:#1E5BFF;width:56px;height:56px;font-size:22px;margin:0 auto 8px">${esc(initials)}</div>
      <h4 style="color:white;font-size:16px">${name}</h4>
      <p style="color:#8892b0;font-size:13px">${esc(u.email)}</p>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
      <div style="background:#0f1117;padding:12px;border-radius:8px;text-align:center"><span style="color:#8892b0;font-size:11px;display:block">Niveau</span><span style="color:white;font-size:18px;font-weight:700">${u.level || 1}</span><span style="color:#8892b0;font-size:11px;display:block">${levelName}</span></div>
      <div style="background:#0f1117;padding:12px;border-radius:8px;text-align:center"><span style="color:#8892b0;font-size:11px;display:block">XP</span><span style="color:white;font-size:18px;font-weight:700">${(u.xp || 0).toLocaleString()}</span></div>
    </div>
    <div style="margin-bottom:16px"><span style="color:#8892b0;font-size:12px">Badges: </span>${badges.length > 0 ? badges.map(b => `<span class="badge badge--blue" style="margin:2px">${esc(b)}</span>`).join('') : '<span style="color:#555;font-size:12px">Aucun</span>'}</div>
    <div style="font-size:12px;color:#8892b0">
      <p>Inscrit le: ${created}</p>
      <p>Admin: ${u.is_admin ? '<span style="color:#1E5BFF">Oui</span>' : 'Non'}</p>
    </div>
  `);
}

function openUserModal() {
  openModal('Nouvel utilisateur', `
    <form id="userForm" style="display:flex;flex-direction:column;gap:12px">
      <div class="form-group"><label>Prénom</label><input type="text" id="modalFirstName" class="form-input" placeholder="Prénom"></div>
      <div class="form-group"><label>Nom</label><input type="text" id="modalLastName" class="form-input" placeholder="Nom"></div>
      <div class="form-group"><label>Email</label><input type="email" id="modalEmail" class="form-input" placeholder="email@domaine.com" required></div>
      <div class="form-group"><label>Mot de passe</label><input type="password" id="modalPassword" class="form-input" placeholder="••••••••" required></div>
      <div class="modal-footer"><button type="button" class="btn btn--ghost" onclick="closeModal()">Annuler</button><button type="submit" class="btn btn--primary">Créer</button></div>
    </form>
  `);
  document.getElementById('userForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('modalEmail')?.value?.trim();
    const password = document.getElementById('modalPassword')?.value;
    const first_name = document.getElementById('modalFirstName')?.value?.trim();
    const last_name = document.getElementById('modalLastName')?.value?.trim();
    if (!email || !password) return showToast('Email et mot de passe requis', 'error');
    showToast('Création non disponible — utilisez la page register', 'info');
    closeModal();
  });
}

function toggleBanUser(userId, action) {
  const msg = action === 'ban' ? 'Bannir cet utilisateur ?' : 'Débannir cet utilisateur ?';
  if (!confirm(msg)) return;
  api.updateUser({ userId, action }).then(data => {
    loadAdminData();
    showToast(data.message || (action === 'ban' ? 'Utilisateur banni.' : 'Utilisateur débanni.'), action === 'ban' ? 'error' : 'success');
  }).catch(err => showToast('Erreur: ' + err.message, 'error'));
}

function toggleAdmin(userId, isAdmin) {
  const msg = isAdmin ? 'Rendre cet utilisateur admin ?' : 'Retirer les droits admin ?';
  if (!confirm(msg)) return;
  api.updateUser({ userId, action: 'setAdmin', isAdmin }).then(data => {
    loadAdminData();
    showToast(data.message, 'success');
  }).catch(err => showToast('Erreur: ' + err.message, 'error'));
}

/* ========================================
   FORMATIONS
   ======================================== */
function renderFormations() {
  const grid = document.getElementById('adminFormationsGrid');
  if (!grid) return;
  const formations = adminData.formations;
  if (formations.length === 0) { grid.innerHTML = '<p style="color:#8892b0;text-align:center;padding:2rem;grid-column:1/-1">Aucune formation. Cliquez sur "Nouvelle formation" pour en créer une.</p>'; return; }

  grid.innerHTML = formations.map(f => {
    const emoji = esc(f.emoji || '📘');
    const title = esc(f.title);
    const statusMap = { active: ['active', 'Active'], upcoming: ['pending', 'À venir'], full: ['completed', 'Complet'] };
    const [statusCls, statusLbl] = statusMap[f.status] || ['completed', 'Complet'];
    return `<div class="admin-formation-card">
      <div class="admin-formation-header"><span class="admin-formation-emoji">${emoji}</span><span class="status-badge status-badge--${statusCls}">${statusLbl}</span></div>
      <h4>${title}</h4>
      <div class="admin-formation-meta">
        <span>⏱ ${f.duration_weeks || '?'} semaines</span>
        <span>💰 ${(f.price_dzd || 0).toLocaleString()} DA</span>
        <span>⭐ +${f.xp_reward || 0} XP</span>
      </div>
      <div class="admin-formation-slots">${f.max_slots || 0} places max</div>
      <div class="admin-formation-actions">
        <button class="btn btn--ghost btn--sm" onclick="openEditFormationModal('${f.id}')"><i data-lucide="edit"></i> Modifier</button>
        <button class="btn btn--danger btn--sm" onclick="confirmDeleteFormation('${f.id}','${esc(f.title).replace(/'/g,"\\'")}')"><i data-lucide="trash-2"></i></button>
      </div>
    </div>`;
  }).join('');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function openFormationModal() {
  openModal('Nouvelle formation', `
    <form id="formationForm" style="display:flex;flex-direction:column;gap:12px">
      <div class="form-group"><label>Emoji</label><input type="text" id="fEmoji" class="form-input" value="📘" maxlength="4"></div>
      <div class="form-group"><label>Titre *</label><input type="text" id="fTitle" class="form-input" placeholder="Ex: JavaScript Masterclass" required></div>
      <div class="form-group"><label>Description</label><input type="text" id="fDesc" class="form-input" placeholder="Description courte"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="form-group"><label>Durée (semaines)</label><input type="number" id="fDuration" class="form-input" value="8" min="1"></div>
        <div class="form-group"><label>Prix (DA)</label><input type="number" id="fPrice" class="form-input" value="0" min="0"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="form-group"><label>XP récompense</label><input type="number" id="fXP" class="form-input" value="100" min="0"></div>
        <div class="form-group"><label>Places max</label><input type="number" id="fSlots" class="form-input" value="20" min="1"></div>
      </div>
      <div class="form-group"><label>Statut</label><select id="fStatus" class="filter-select" style="width:100%"><option value="active">Active</option><option value="upcoming">À venir</option><option value="full">Complet</option></select></div>
      <div class="modal-footer"><button type="button" class="btn btn--ghost" onclick="closeModal()">Annuler</button><button type="submit" class="btn btn--primary">Créer</button></div>
    </form>
  `);
  document.getElementById('formationForm')?.addEventListener('submit', submitFormation);
}

function submitFormation(e) {
  e.preventDefault();
  const data = {
    title: document.getElementById('fTitle')?.value?.trim(),
    description: document.getElementById('fDesc')?.value?.trim() || '',
    emoji: document.getElementById('fEmoji')?.value?.trim() || '📘',
    duration_weeks: parseInt(document.getElementById('fDuration')?.value) || 8,
    price_dzd: parseInt(document.getElementById('fPrice')?.value) || 0,
    xp_reward: parseInt(document.getElementById('fXP')?.value) || 100,
    max_slots: parseInt(document.getElementById('fSlots')?.value) || 20,
    status: document.getElementById('fStatus')?.value || 'active',
  };
  if (!data.title) return showToast('Le titre est requis', 'error');
  api.request('/admin', { method: 'POST', body: JSON.stringify({ action: 'createFormation', ...data }) })
    .then(() => { closeModal(); loadAdminData(); showToast('Formation créée', 'success'); })
    .catch(err => showToast('Erreur: ' + err.message, 'error'));
}

function openEditFormationModal(formationId) {
  const f = adminData.formations.find(f => f.id === formationId);
  if (!f) return;
  openModal('Modifier la formation', `
    <form id="editFormationForm" style="display:flex;flex-direction:column;gap:12px">
      <div class="form-group"><label>Emoji</label><input type="text" id="eEmoji" class="form-input" value="${esc(f.emoji || '📘')}" maxlength="4"></div>
      <div class="form-group"><label>Titre *</label><input type="text" id="eTitle" class="form-input" value="${esc(f.title)}" required></div>
      <div class="form-group"><label>Description</label><input type="text" id="eDesc" class="form-input" value="${esc(f.description || '')}"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="form-group"><label>Durée (semaines)</label><input type="number" id="eDuration" class="form-input" value="${f.duration_weeks || 8}" min="1"></div>
        <div class="form-group"><label>Prix (DA)</label><input type="number" id="ePrice" class="form-input" value="${f.price_dzd || 0}" min="0"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="form-group"><label>XP récompense</label><input type="number" id="eXP" class="form-input" value="${f.xp_reward || 100}" min="0"></div>
        <div class="form-group"><label>Places max</label><input type="number" id="eSlots" class="form-input" value="${f.max_slots || 20}" min="1"></div>
      </div>
      <div class="form-group"><label>Statut</label><select id="eStatus" class="filter-select" style="width:100%"><option value="active" ${f.status==='active'?'selected':''}>Active</option><option value="upcoming" ${f.status==='upcoming'?'selected':''}>À venir</option><option value="full" ${f.status==='full'?'selected':''}>Complet</option></select></div>
      <div class="modal-footer"><button type="button" class="btn btn--ghost" onclick="closeModal()">Annuler</button><button type="submit" class="btn btn--primary">Sauvegarder</button></div>
    </form>
  `);
  document.getElementById('editFormationForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const updates = {
      id: formationId,
      title: document.getElementById('eTitle')?.value?.trim(),
      description: document.getElementById('eDesc')?.value?.trim(),
      emoji: document.getElementById('eEmoji')?.value?.trim(),
      duration_weeks: parseInt(document.getElementById('eDuration')?.value),
      price_dzd: parseInt(document.getElementById('ePrice')?.value),
      xp_reward: parseInt(document.getElementById('eXP')?.value),
      max_slots: parseInt(document.getElementById('eSlots')?.value),
      status: document.getElementById('eStatus')?.value,
    };
    if (!updates.title) return showToast('Le titre est requis', 'error');
    api.updateUser(updates).then(() => { closeModal(); loadAdminData(); showToast('Formation mise à jour', 'success'); })
      .catch(err => showToast('Erreur: ' + err.message, 'error'));
  });
}

function confirmDeleteFormation(formationId, title) {
  openModal('Supprimer la formation', `
    <p>Supprimer <strong>${title}</strong> ? Cette action est irréversible.</p>
    <div class="modal-footer" style="margin-top:16px"><button class="btn btn--ghost" onclick="closeModal()">Annuler</button><button class="btn btn--danger" onclick="deleteFormation('${formationId}')">Supprimer</button></div>
  `);
}

function deleteFormation(formationId) {
  api.request('/admin', { method: 'DELETE', body: JSON.stringify({ action: 'deleteFormation', id: formationId }) })
    .then(() => { closeModal(); loadAdminData(); showToast('Formation supprimée', 'success'); })
    .catch(err => showToast('Erreur: ' + err.message, 'error'));
}

/* ========================================
   LIVE SESSIONS
   ======================================== */
function renderLiveSessions() {
  const list = document.getElementById('adminLiveList');
  if (!list) return;
  const sessions = adminData.liveSessions;
  if (sessions.length === 0) { list.innerHTML = '<p style="color:#8892b0;text-align:center;padding:2rem">Aucune session. Cliquez sur "Nouvelle session" pour en créer une.</p>'; return; }

  list.innerHTML = sessions.map(s => {
    const d = new Date(s.date);
    const dateStr = d.toLocaleDateString('fr-FR');
    const timeStr = `${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}`;
    const statusMap = { live: ['live', '🔴 EN DIRECT'], scheduled: ['scheduled', '🟢 Programmée'], ended: ['ended', '⚫ Terminée'] };
    const [statusCls, statusLbl] = statusMap[s.status] || ['ended', '⚫ Terminée'];
    const ytUrl = s.youtube_url || s.youtubeUrl;
    return `<div class="admin-live-item">
      <div class="admin-live-status admin-live-status--${statusCls}">${statusLbl}</div>
      <div class="admin-live-info"><h4>${esc(s.title)}</h4><p>${dateStr} à ${timeStr} — ${ytUrl ? '<a href="' + esc(ytUrl) + '" target="_blank" rel="noopener" style="color:#1E5BFF">YouTube</a>' : 'Pas de lien'}</p></div>
      <div class="admin-live-actions">
        <button class="btn btn--ghost btn--sm" onclick="openEditLiveModal('${s.id}')"><i data-lucide="edit"></i></button>
        <button class="btn btn--danger btn--sm" onclick="confirmDeleteLive('${s.id}','${esc(s.title).replace(/'/g,"\\'")}')"><i data-lucide="trash-2"></i></button>
      </div>
    </div>`;
  }).join('');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function openLiveModal() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  openModal('Nouvelle session live', `
    <form id="liveForm" style="display:flex;flex-direction:column;gap:12px">
      <div class="form-group"><label>Titre *</label><input type="text" id="sTitle" class="form-input" placeholder="Ex: Cours JavaScript — Événements DOM" required></div>
      <div class="form-group"><label>Date</label><input type="date" id="sDate" class="form-input" value="${dateStr}"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="form-group"><label>Heure</label><input type="time" id="sTime" class="form-input" value="20:00"></div>
        <div class="form-group"><label>Statut</label><select id="sStatus" class="filter-select" style="width:100%"><option value="scheduled">Programmée</option><option value="live">En direct</option><option value="ended">Terminée</option></select></div>
      </div>
      <div class="form-group"><label>Lien YouTube</label><input type="url" id="sYoutube" class="form-input" placeholder="https://youtube.com/watch?v=..."></div>
      <div class="modal-footer"><button type="button" class="btn btn--ghost" onclick="closeModal()">Annuler</button><button type="submit" class="btn btn--primary">Créer</button></div>
    </form>
  `);
  document.getElementById('liveForm')?.addEventListener('submit', submitLive);
}

function submitLive(e) {
  e.preventDefault();
  const dateVal = document.getElementById('sDate')?.value;
  const timeVal = document.getElementById('sTime')?.value;
  if (!dateVal || !timeVal) return showToast('Date et heure requises', 'error');
  const datetime = new Date(`${dateVal}T${timeVal}:00`);
  const data = {
    title: document.getElementById('sTitle')?.value?.trim(),
    date: datetime.toISOString(),
    status: document.getElementById('sStatus')?.value || 'scheduled',
    youtube_url: document.getElementById('sYoutube')?.value?.trim() || '',
  };
  if (!data.title) return showToast('Le titre est requis', 'error');
  api.request('/admin', { method: 'POST', body: JSON.stringify({ action: 'createLive', ...data }) })
    .then(() => { closeModal(); loadAdminData(); showToast('Session créée', 'success'); })
    .catch(err => showToast('Erreur: ' + err.message, 'error'));
}

function openEditLiveModal(sessionId) {
  const s = adminData.liveSessions.find(s => s.id === sessionId);
  if (!s) return;
  const d = new Date(s.date);
  const dateStr = d.toISOString().split('T')[0];
  const timeStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  openModal('Modifier la session', `
    <form id="editLiveForm" style="display:flex;flex-direction:column;gap:12px">
      <div class="form-group"><label>Titre *</label><input type="text" id="esTitle" class="form-input" value="${esc(s.title)}" required></div>
      <div class="form-group"><label>Date</label><input type="date" id="esDate" class="form-input" value="${dateStr}"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="form-group"><label>Heure</label><input type="time" id="esTime" class="form-input" value="${timeStr}"></div>
        <div class="form-group"><label>Statut</label><select id="esStatus" class="filter-select" style="width:100%"><option value="scheduled" ${s.status==='scheduled'?'selected':''}>Programmée</option><option value="live" ${s.status==='live'?'selected':''}>En direct</option><option value="ended" ${s.status==='ended'?'selected':''}>Terminée</option></select></div>
      </div>
      <div class="form-group"><label>Lien YouTube</label><input type="url" id="esYoutube" class="form-input" value="${esc(s.youtube_url || s.youtubeUrl || '')}"></div>
      <div class="modal-footer"><button type="button" class="btn btn--ghost" onclick="closeModal()">Annuler</button><button type="submit" class="btn btn--primary">Sauvegarder</button></div>
    </form>
  `);
  document.getElementById('editLiveForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const dateVal = document.getElementById('esDate')?.value;
    const timeVal = document.getElementById('esTime')?.value;
    const datetime = new Date(`${dateVal}T${timeVal}:00`);
    const updates = {
      id: sessionId,
      title: document.getElementById('esTitle')?.value?.trim(),
      date: datetime.toISOString(),
      status: document.getElementById('esStatus')?.value,
      youtube_url: document.getElementById('esYoutube')?.value?.trim(),
    };
    api.request('/admin', { method: 'PUT', body: JSON.stringify({ action: 'updateLive', ...updates }) })
      .then(() => { closeModal(); loadAdminData(); showToast('Session mise à jour', 'success'); })
      .catch(err => showToast('Erreur: ' + err.message, 'error'));
  });
}

function confirmDeleteLive(sessionId, title) {
  openModal('Supprimer la session', `
    <p>Supprimer <strong>${title}</strong> ? Cette action est irréversible.</p>
    <div class="modal-footer" style="margin-top:16px"><button class="btn btn--ghost" onclick="closeModal()">Annuler</button><button class="btn btn--danger" onclick="deleteLive('${sessionId}')">Supprimer</button></div>
  `);
}

function deleteLive(sessionId) {
  api.request('/admin', { method: 'DELETE', body: JSON.stringify({ action: 'deleteLive', id: sessionId }) })
    .then(() => { closeModal(); loadAdminData(); showToast('Session supprimée', 'success'); })
    .catch(err => showToast('Erreur: ' + err.message, 'error'));
}

/* ========================================
   FINANCES
   ======================================== */
function renderFinances() {
  const payments = adminData.payments;
  const total = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount_dzd || 0), 0);
  const pending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + (p.amount_dzd || 0), 0);
  setText('totalRevenue', total.toLocaleString('fr-FD') + ' DA');
  setText('totalReferrals', '0 DA');
  setText('totalShopPurchases', '0 DA');

  const tbody = document.getElementById('financeTableBody');
  if (!tbody) return;
  if (payments.length === 0) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#8892b0">Aucun paiement enregistré</td></tr>'; return; }

  tbody.innerHTML = payments.slice(0, 20).map(p => {
    const d = new Date(p.created_at).toLocaleDateString('fr-FR');
    const uid = p.user_id?.slice(0, 8) || 'N/A';
    const statusClass = p.status === 'paid' ? 'green' : p.status === 'pending' ? 'yellow' : 'red';
    const statusLabel = p.status === 'paid' ? 'Payé' : p.status === 'pending' ? 'En attente' : 'Échoué';
    return `<tr>
      <td>${d}</td>
      <td><div class="user-cell"><div class="avatar-sm" style="background:#1E5BFF">${esc(uid[0])}</div><span>${esc(uid)}...</span></div></td>
      <td style="font-weight:600;color:${p.status === 'paid' ? '#00d68f' : '#ffb547'}">${(p.amount_dzd || 0).toLocaleString()} DA</td>
      <td><span class="method-badge">${esc(p.method || 'N/A')}</span></td>
      <td><span class="badge badge--${statusClass}">${statusLabel}</span></td>
      <td>${esc(p.type || 'N/A')}</td>
    </tr>`;
  }).join('');
}

/* ========================================
   EXPORT CSV
   ======================================== */
function exportUsersCSV() {
  const headers = ['Nom', 'Email', 'Niveau', 'XP', 'Admin', 'Inscrit le'];
  const rows = adminData.users.map(u => [
    `${u.first_name || ''} ${u.last_name || ''}`.trim(),
    u.email, u.level || 1, u.xp || 0, u.is_admin ? 'Oui' : 'Non',
    new Date(u.created_at).toLocaleDateString('fr-FR')
  ]);
  downloadCSV('utilisateurs', headers, rows);
}

function exportFinanceCSV() {
  const headers = ['Date', 'User ID', 'Montant (DA)', 'Méthode', 'Statut', 'Type'];
  const rows = adminData.payments.map(p => [
    new Date(p.created_at).toLocaleDateString('fr-FR'),
    p.user_id, p.amount_dzd || 0, p.method || '', p.status, p.type || ''
  ]);
  downloadCSV('paiements', headers, rows);
}

function downloadCSV(name, headers, rows) {
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `skillsdz_${name}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('Export téléchargé', 'success');
}

/* ========================================
   MODAL
   ======================================== */
function openModal(title, bodyHTML) {
  const overlay = document.getElementById('modalOverlay');
  const titleEl = document.getElementById('modalTitle');
  const bodyEl = document.getElementById('modalBody');
  if (titleEl) titleEl.textContent = title;
  if (bodyEl) bodyEl.innerHTML = bodyHTML;
  if (overlay) { overlay.classList.add('active'); overlay.setAttribute('aria-hidden', 'false'); }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  if (overlay) { overlay.classList.remove('active'); overlay.setAttribute('aria-hidden', 'true'); }
}

/* ========================================
   TOAST
   ======================================== */
function showToast(message, type = 'info') {
  const existing = document.querySelector('.admin-notification');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'admin-notification';
  const colors = { success: '#00d68f', error: '#ff4d6d', info: '#1E5BFF' };
  toast.style.cssText = `position:fixed;top:24px;right:24px;padding:16px 24px;border-radius:12px;background:${colors[type]||colors.info};color:white;font-size:14px;font-weight:600;box-shadow:0 8px 32px rgba(0,0,0,0.3);z-index:1000;animation:fadeIn 0.3s ease;max-width:400px;`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 3000);
}

/* ========================================
   NOTIFICATIONS
   ======================================== */
function updateNotifBadge() {
  const count = adminData.users.length;
  const badge = document.getElementById('notifBadge');
  if (badge) { badge.textContent = count; badge.style.display = count > 0 ? 'flex' : 'none'; }
  loadNotifications(count);
}

function loadNotifications(count) {
  const list = document.getElementById('notifList');
  if (!list) return;
  list.innerHTML = `
    <li class="notif-item notif-item--unread"><div class="notif-icon notif-icon--green"><i data-lucide="users"></i></div><div class="notif-body"><p><strong>${count} utilisateurs</strong> inscrits sur la plateforme</p><time>maintenant</time></div></li>
    <li class="notif-item notif-item--unread"><div class="notif-icon notif-icon--blue"><i data-lucide="book-open"></i></div><div class="notif-body"><p><strong>${adminData.formations.length} formations</strong> disponibles</p><time>maintenant</time></div></li>
    <li class="notif-item notif-item--unread"><div class="notif-icon notif-icon--cyan"><i data-lucide="radio"></i></div><div class="notif-body"><p><strong>${adminData.liveSessions.length} sessions live</strong> programmées</p><time>maintenant</time></div></li>
  `;
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

/* ========================================
   JOURNAL D'IDÉES — Insights par domaine
   ======================================== */
const JOURNAL_INSIGHTS = [
  // ─── MARKETING DIGITAL ───
  { cat: 'marketing', icon: 'trending-up', color: '#1E5BFF', title: 'Reels vs TikTok en Algérie', body: 'Les Reels Instagram génèrent 2.3x plus d\'engagement que TikTok chez les 18-25 ans en Algérie. Le format court reste roi, mais la confiance vient d\'Instagram.', source: 'Étude Algérie Digitale 2026' },
  { cat: 'marketing', icon: 'target', color: '#1E5BFF', title: 'Ciblage géo : le vrai pouvoir', body: 'Les campagnes Meta Ads ciblant Alger Centre ont un CPA 40% plus bas que le ciblage national. Le micro-ciblage géo est sous-exploité en Algérie.', source: 'Analytics Platform' },
  { cat: 'marketing', icon: 'message-circle', color: '#1E5BFF', title: 'WhatsApp Business : le CRM algérien', body: '87% des acheteurs algériens préfèrent WhatsApp pour poser leurs questions avant achat. Intégrer un bot WhatsApp = réduire le temps de réponse de 80%.', source: 'Tendances E-commerce DZ' },
  { cat: 'marketing', icon: 'bar-chart-2', color: '#1E5BFF', title: 'Contenu éducatif = confiance', body: 'Les centres de formation qui publient du contenu éducatif gratuit voient leurs inscriptions augmenter de 35%. Le marketing de valeur fonctionne mieux que la pub directe.', source: 'Inbound Marketing DZ' },
  { cat: 'marketing', icon: 'eye', color: '#1E5BFF', title: 'SEO local : Google My Business', body: '60% des recherches "formation à Alger" passent par Google Maps. Un profil GMB complet avec avis = trafic organique gratuit.', source: 'Google Algérie Data' },
  { cat: 'marketing', icon: 'share-2', color: '#1E5BFF', title: 'Les stories = engagement x3', body: 'Publier 5+ stories par jour sur Instagram maintient la visibilité. Les sondages et quiz dans les stories génèrent 4x plus d\'interactions qu\'un post classique.', source: 'Social Media Report DZ' },
  { cat: 'marketing', icon: 'zap', color: '#1E5BFF', title: 'Email marketing : le dormant', body: 'Pour 1 Dirham investi en email marketing, le ROI moyen est de 36 DA. Pourtant, 80% des centres de formation algériens n\'ont pas de liste email.', source: 'Email Marketing Stats' },
  { cat: 'marketing', icon: 'users', color: '#1E5BFF', title: 'Programme de parrainage viral', body: 'Un programme de parrainage avec double récompense (donneur + reçu) augmente les inscriptions de 25%. Le bouche-à-oreille digital est le levier #1 en Algérie.', source: 'Growth Hacking DZ' },

  // ─── DEV WEB ───
  { cat: 'dev', icon: 'code-2', color: '#00C4FF', title: 'React vs Vue : le choix DZ', body: 'En Algérie, React domine avec 65% des offres d\'emploi dev web. Mais Vue.js monte vite grâce à sa courbe d\'apprentissage plus douce pour les débutants.', source: 'Job Market Tech DZ' },
  { cat: 'dev', icon: 'smartphone', color: '#00C4FF', title: 'Mobile-first obligatoire', body: '78% du trafic web algérien vient du mobile. Tout site web doit être conçu mobile-first. Le responsive n\'est plus une option, c\'est la base.', source: 'StatCounter Algérie' },
  { cat: 'dev', icon: 'git-branch', color: '#00C4FF', title: 'Git : compétence n°1', body: '92% des entreprises tech exigent Git. Pourtant, seulement 30% des formations couvrent le versioning. Un atelier Git = avantage concurrentiel.', source: 'Dev Survey DZ' },
  { cat: 'dev', icon: 'server', color: '#00C4FF', title: 'Node.js pour les APIs', body: 'Node.js est le framework backend le plus demandé en Algérie (40% des offres). Son écosystème npm et sa vitesse de développement le rendent idéal pour les startups.', source: 'Tech Jobs Report' },
  { cat: 'dev', icon: 'layout', color: '#00C4FF', title: 'Tailwind CSS : productivité x2', body: 'Les développeurs utilisant Tailwind CSS livrent 2x plus vite que ceux en CSS classique. La tendance est claire : utility-first est le futur du styling web.', source: 'State of CSS 2026' },
  { cat: 'dev', icon: 'database', color: '#00C4FF', title: 'PostgreSQL > MySQL', body: 'PostgreSQL dépasse MySQL dans les nouvelles projets algériens grâce à ses fonctionnalités avancées (JSON, arrays, full-text search). Supabase accélère cette migration.', source: 'DB Trends Report' },
  { cat: 'dev', icon: 'shield', color: '#00C4FF', title: 'Sécurité : les bases oubliées', body: '60% des sites web algériens n\'ont pas de certificat SSL valide. HTTPS est devenu un minimum. Les formations dev devraient intégraler la sécurité dès le jour 1.', source: 'Cybersecurity DZ' },
  { cat: 'dev', icon: 'package', color: '#00C4FF', title: 'Next.js : le framework tout-en-un', body: 'Next.js combine SSR, API routes et SSG. Pour les projets algériens qui veulent du SEO + performance, c\'est le choix optimal. La courbe d\'adoption est forte.', source: 'Framework Trends' },

  // ─── INTELLIGENCE ARTIFICIELLE ───
  { cat: 'ai', icon: 'brain', color: '#7c3aed', title: 'ChatGPT : adoption massive', body: '45% des étudiants algériens utilisent ChatGPT pour leurs études. L\'IA générative n\'est plus un luxe, c\'un outil de base. L\'enseigner = rester pertinent.', source: 'AI Usage Survey DZ' },
  { cat: 'ai', icon: 'sparkles', color: '#7c3aed', title: 'Prompt Engineering : nouveau métier', body: 'Les offres d\'emploi "Prompt Engineer" ont augmenté de 300% en 2025. Maîtriser l\'art du prompt est devenu une compétence professionnelle à part entière.', source: 'Job Market AI 2026' },
  { cat: 'ai', icon: 'bot', color: '#7c3aed', title: 'Agents IA : l\'avenir de l\'éducation', body: 'Les agents IA personnalisés améliorent les résultats d\'apprentissage de 40%. Un tuteur IA qui s\'adapte au niveau de l\'élève = révolution pédagogique.', source: 'EdTech Research' },
  { cat: 'ai', icon: 'image', color: '#7c3aed', title: 'IA et création visuelle', body: 'Midjourney et DALL-E changent la game pour les créatifs. Un graphic designer qui maîtrise l\'IA génère 5x plus de propositions en moins de temps.', source: 'Creative AI Report' },
  { cat: 'ai', icon: 'file-text', color: '#7c3aed', title: 'Automatisation : gagner du temps', body: 'L\'automatisation des tâches répétitives avec l\'IA peut libérer 10h/semaine. Les entreprises qui automatisent leurs processus ont 30% de productivité en plus.', source: 'Productivity AI Study' },
  { cat: 'ai', icon: 'mic', color: '#7c3aed', title: 'Voice AI en arabe', body: 'La reconnaissance vocale en arabe s\'améliore rapidement. Les assistants vocaux arabes ouvrent un marché de 400M de locuteurs. Opportunité massive pour les devs DZ.', source: 'Voice Tech Report' },
  { cat: 'ai', icon: 'code', color: '#7c3aed', title: 'Copilot : dev assisté par IA', body: 'GitHub Copilot augmente la productivité de dev de 55%. Les développeurs qui intègrent l\'IA dans leur workflow sont plus compétitifs. former sur ces outils = valeur.', source: 'Dev Productivity Study' },
  { cat: 'ai', icon: 'graduation-cap', color: '#7c3aed', title: 'IA éthique : former les consciences', body: 'Biais algorithmiques, vie privée, deepfakes... L\'IA éthique devient un sujet de cours obligatoire. Les formations qui l\'intègrent auront un avantage moral et commercial.', source: 'AI Ethics Report' },

  // ─── BUSINESS ───
  { cat: 'business', icon: 'dollar-sign', color: '#ffb547', title: 'Économie numérique DZ : +18%', body: 'Le secteur numérique algérien croît de 18% par an. Les formations tech captent une part croissante de ce marché. Le timing est idéal pour investir.', source: 'Ministère du Numérique' },
  { cat: 'business', icon: 'pie-chart', color: '#ffb547', title: 'Prix : le psychologique', body: 'Un formation à 25,000 DA se vend mieux qu\'à 24,000 DA. Les prix ronds avec un zéro suscitent plus de confiance. Le pricing est un art, pas juste un calcul.', source: 'Pricing Strategy DZ' },
  { cat: 'business', icon: 'repeat', color: '#ffb547', title: 'Récurrence = stabilité', body: 'Les abonnements mensuels génèrent 3x plus de valeur client sur 12 mois qu\'un paiement unique. Le modèle SaaS s\'adapte parfaitement aux formations en ligne.', source: 'SaaS Metrics' },
  { cat: 'business', icon: 'award', color: '#ffb547', title: 'Certification = confiance', body: 'Un certificat reconnu par l\'État augmente la valeur perçue d\'une formation de 60%. La labellisation officielle est un avantage concurrentiel majeur.', source: 'Education Business DZ' },
  { cat: 'business', icon: 'heart', color: '#ffb547', title: 'Communauté avant produit', body: 'Construire une communauté engagée avant de lancer un produit réduit les coûts d\'acquisition de 50%. Discord, Telegram, WhatsApp : les outils sont gratuits.', source: 'Community-Led Growth' },
  { cat: 'business', icon: 'trending-up', color: '#ffb547', title: 'L\'Algérie : marché émergent', body: 'Avec 45M d\'habitants et un taux de pénétration internet de 70%, l\'Algérie est le plus grand marché francophone d\'Afrique. Le digital est le futur.', source: 'Market Research DZ' },
  { cat: 'business', icon: 'lightbulb', color: '#ffb547', title: 'Lean Startup : tester vite', body: 'Lancer un MVP en 2 semaines plutôt qu\'un produit parfait en 6 mois. Les startups algériennes qui testent vite pivotent plus efficacement et échouent moins.', source: 'Startup Algeria' },
  { cat: 'business', icon: 'briefcase', color: '#ffb547', title: 'Freelancing : le tremplin', body: 'Le freelance tech en Algérie gagne en moyenne 80,000 DA/mois. Former au freelancing = donner des outils concrets pour l\'emploi indépendant.', source: 'Freelance Market DZ' },
];

let _journalFilter = 'all';
let _journalCustomIdeas = JSON.parse(localStorage.getItem('skillsdz_journal_ideas') || '[]');
let _journalTimer = null;
let _journalCountdownInterval = null;

function initJournal() {
  document.querySelectorAll('.journal-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.journal-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _journalFilter = btn.dataset.cat;
      renderJournal();
    });
  });

  document.getElementById('addIdeaBtn')?.addEventListener('click', openIdeaModal);
  renderJournal();
  startJournalTimer();
}

function getHourlyInsights() {
  const hour = new Date().getHours();
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const filtered = JOURNAL_INSIGHTS;
  const count = Math.min(6, filtered.length);
  const startIdx = ((dayOfYear * 3 + hour) % filtered.length);
  const selected = [];
  for (let i = 0; i < count; i++) {
    selected.push(filtered[(startIdx + i) % filtered.length]);
  }
  return selected;
}

function renderJournal() {
  const grid = document.getElementById('journalGrid');
  if (!grid) return;

  const hourly = getHourlyInsights();
  const customs = _journalCustomIdeas.filter(i => _journalFilter === 'all' || i.cat === _journalFilter);
  const filtered = hourly.filter(i => _journalFilter === 'all' || i.cat === _journalFilter);

  const allIdeas = [
    ...customs.map(i => ({ ...i, isCustom: true })),
    ...filtered.map(i => ({ ...i, isCustom: false })),
  ];

  if (allIdeas.length === 0) {
    grid.innerHTML = '<p style="color:#8892b0;text-align:center;padding:2rem;grid-column:1/-1">Aucun insight pour cette catégorie</p>';
    return;
  }

  const catLabels = { marketing: 'Marketing Digital', dev: 'Dev Web', ai: 'Intelligence Artificielle', business: 'Business' };
  const catColors = { marketing: '#1E5BFF', dev: '#00C4FF', ai: '#7c3aed', business: '#ffb547' };

  grid.innerHTML = allIdeas.map(idea => `
    <div class="journal-card" style="--card-accent:${idea.color || catColors[idea.cat] || '#1E5BFF'}">
      <div class="journal-card__header">
        <div class="journal-card__icon" style="background:${idea.color || catColors[idea.cat]}20;color:${idea.color || catColors[idea.cat]}">
          <i data-lucide="${idea.icon || 'lightbulb'}"></i>
        </div>
        <div class="journal-card__meta">
          <span class="journal-card__cat" style="color:${idea.color || catColors[idea.cat]}">${catLabels[idea.cat] || idea.cat}</span>
          <span class="journal-card__time">${idea.isCustom ? 'Personnalisé' : 'Heure ' + new Date().getHours() + 'h'}</span>
        </div>
        ${idea.isCustom ? `<button class="journal-card__delete" onclick="deleteJournalIdea('${idea.id}')" title="Supprimer"><i data-lucide="trash-2"></i></button>` : ''}
      </div>
      <h4 class="journal-card__title">${esc(idea.title)}</h4>
      <p class="journal-card__body">${esc(idea.body)}</p>
      ${idea.source ? `<div class="journal-card__source"><i data-lucide="external-link"></i> ${esc(idea.source)}</div>` : ''}
    </div>
  `).join('');

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function startJournalTimer() {
  updateCountdown();
  _journalCountdownInterval = setInterval(updateCountdown, 1000);
  _journalTimer = setInterval(() => {
    renderJournal();
    showToast('Insights mis à jour', 'info');
  }, 3600000);
}

function updateCountdown() {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
  const diff = nextHour - now;
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  const el = document.getElementById('journalCountdown');
  if (el) el.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function openIdeaModal() {
  const bodyHTML = `
    <form id="ideaForm" class="settings-form">
      <div class="form-group">
        <label>Catégorie</label>
        <select class="form-input" id="ideaCat" required>
          <option value="marketing">Marketing Digital</option>
          <option value="dev">Dev Web</option>
          <option value="ai">Intelligence Artificielle</option>
          <option value="business">Business</option>
        </select>
      </div>
      <div class="form-group">
        <label>Titre de l'idée</label>
        <input type="text" class="form-input" id="ideaTitle" placeholder="Ex: Tendance Instagram 2026" required>
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea class="form-input" id="ideaBody" rows="4" placeholder="Votre insight ou analyse..." required></textarea>
      </div>
      <div class="form-group">
        <label>Source (optionnel)</label>
        <input type="text" class="form-input" id="ideaSource" placeholder="Ex: Étude Google Algérie">
      </div>
      <button type="submit" class="btn btn--primary" style="width:100%">Ajouter au journal</button>
    </form>
  `;
  openModal('Nouvelle idée', bodyHTML);

  document.getElementById('ideaForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const idea = {
      id: Date.now().toString(36),
      cat: document.getElementById('ideaCat').value,
      title: document.getElementById('ideaTitle').value.trim(),
      body: document.getElementById('ideaBody').value.trim(),
      source: document.getElementById('ideaSource').value.trim() || null,
      icon: 'lightbulb',
      color: { marketing: '#1E5BFF', dev: '#00C4FF', ai: '#7c3aed', business: '#ffb547' }[document.getElementById('ideaCat').value],
      createdAt: new Date().toISOString(),
    };
    _journalCustomIdeas.unshift(idea);
    localStorage.setItem('skillsdz_journal_ideas', JSON.stringify(_journalCustomIdeas));
    closeModal();
    renderJournal();
    showToast('Idée ajoutée au journal', 'success');
  });
}

function deleteJournalIdea(id) {
  _journalCustomIdeas = _journalCustomIdeas.filter(i => i.id !== id);
  localStorage.setItem('skillsdz_journal_ideas', JSON.stringify(_journalCustomIdeas));
  renderJournal();
  showToast('Idée supprimée', 'info');
}
