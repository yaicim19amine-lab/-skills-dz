/* ========================================
   SKILLS DZ — Admin Panel (Full CRUD)
   ======================================== */

let adminData = { users: [], formations: [], payments: [], liveSessions: [], tasks: [], auditLogs: [], stats: {} };
let _adminPage = 'dashboard';
let _searchTerm = '';

document.addEventListener('DOMContentLoaded', () => {
  if (typeof Auth !== 'undefined' && !Auth.isLoggedIn()) { window.location.href = 'login.html'; return; }

  api.getAdminData().then(() => {
    initAdminPage();
  }).catch(err => {
    if (err.message && err.message.includes('403')) {
      alert('Accès réservé aux administrateurs.');
      window.location.href = 'dashboard.html';
    } else {
      alert('Erreur de connexion. Veuillez vous reconnecter.');
      window.location.href = 'login.html';
    }
  });
});

function initAdminPage() {
  const user = JSON.parse(localStorage.getItem('skillsdz_user'));
  if (typeof lucide !== 'undefined') lucide.createIcons();

  initNavigation();
  initMobileMenu();
  initEventListeners();
  loadAdminProfile(user);
  loadAdminData();
  initJournal();
  loadSettings();
}

/* ========================================
   UTILS
   ======================================== */
function setText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function userLabel(userId) {
  const u = adminData.users.find(u => u.id === userId);
  if (!u) return userId ? `${userId.slice(0, 8)}...` : '—';
  return `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || `${userId.slice(0, 8)}...`;
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
  document.getElementById('addTaskBtn')?.addEventListener('click', () => openTaskModal());
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
      saveSettings();
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
    api.getAdminData().catch(err => { console.error('Admin data error:', err); return { users: [], formations: [], payments: [], tasks: [], auditLogs: [], stats: {} }; }),
    api.getLiveSessions().catch(err => { console.error('Live sessions error:', err); return { schedule: [] }; })
  ]).then(([adminResult, liveResult]) => {
    adminData.users = adminResult.users || [];
    adminData.formations = adminResult.formations || [];
    adminData.payments = adminResult.payments || [];
    adminData.tasks = adminResult.tasks || [];
    adminData.auditLogs = adminResult.auditLogs || [];
    adminData.stats = adminResult.stats || {};
    adminData.liveSessions = liveResult.schedule || [];
    renderDashboard();
    renderUsers();
    renderFormations();
    renderLiveSessions();
    renderFinances();
    renderTasks();
    renderAuditLogs();
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
  window.open('register.html', '_blank');
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
        <span>⏱ ${f.duration_weeks || '?'} semaines · ${f.days_per_week || 5}j/sem · ${f.hours_per_day || 3}h/j</span>
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
        <div class="form-group"><label>Jours / semaine</label><select id="fDaysPerWeek" class="filter-select" style="width:100%"><option value="1">1 jour</option><option value="2">2 jours</option><option value="3">3 jours</option><option value="4">4 jours</option><option value="5" selected>5 jours</option><option value="6">6 jours</option><option value="7">7 jours</option></select></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="form-group"><label>Heures / jour</label><select id="fHoursPerDay" class="filter-select" style="width:100%"><option value="1">1h</option><option value="2">2h</option><option value="3" selected>3h</option><option value="4">4h</option><option value="5">5h</option><option value="6">6h</option></select></div>
        <div class="form-group"><label>Prix (DA)</label><input type="number" id="fPrice" class="form-input" value="0" min="0"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="form-group"><label>XP récompense</label><input type="number" id="fXP" class="form-input" value="100" min="0"></div>
        <div class="form-group"><label>Places max</label><input type="number" id="fSlots" class="form-input" value="20" min="1"></div>
      </div>
      <div class="form-group"><label>Photo de couverture (URL)</label><input type="url" id="fCoverUrl" class="form-input" placeholder="https://..."></div>
      <div class="form-group"><label>Vidéo de présentation (URL)</label><input type="url" id="fVideoUrl" class="form-input" placeholder="https://youtube.com/watch?v=..."></div>
      <div class="form-group"><label>Avis clients (un par ligne)</label><textarea id="fTestimonials" class="form-input" rows="3" placeholder="Ali B. — Formation top !&#10;Sara K. — Très pratique"></textarea></div>
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
    days_per_week: parseInt(document.getElementById('fDaysPerWeek')?.value) || 5,
    hours_per_day: parseInt(document.getElementById('fHoursPerDay')?.value) || 3,
    price_dzd: parseInt(document.getElementById('fPrice')?.value) || 0,
    xp_reward: parseInt(document.getElementById('fXP')?.value) || 100,
    max_slots: parseInt(document.getElementById('fSlots')?.value) || 20,
    cover_url: document.getElementById('fCoverUrl')?.value?.trim() || '',
    video_url: document.getElementById('fVideoUrl')?.value?.trim() || '',
    testimonials: document.getElementById('fTestimonials')?.value?.trim() || '',
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
  const daysOptions = [1,2,3,4,5,6,7].map(d => `<option value="${d}" ${(f.days_per_week||5)===d?'selected':''}>${d} jour${d>1?'s':''}</option>`).join('');
  const hoursOptions = [1,2,3,4,5,6].map(h => `<option value="${h}" ${(f.hours_per_day||3)===h?'selected':''}>${h}h</option>`).join('');
  openModal('Modifier la formation', `
    <form id="editFormationForm" style="display:flex;flex-direction:column;gap:12px">
      <div class="form-group"><label>Emoji</label><input type="text" id="eEmoji" class="form-input" value="${esc(f.emoji || '📘')}" maxlength="4"></div>
      <div class="form-group"><label>Titre *</label><input type="text" id="eTitle" class="form-input" value="${esc(f.title)}" required></div>
      <div class="form-group"><label>Description</label><input type="text" id="eDesc" class="form-input" value="${esc(f.description || '')}"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="form-group"><label>Durée (semaines)</label><input type="number" id="eDuration" class="form-input" value="${f.duration_weeks || 8}" min="1"></div>
        <div class="form-group"><label>Jours / semaine</label><select id="eDaysPerWeek" class="filter-select" style="width:100%">${daysOptions}</select></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="form-group"><label>Heures / jour</label><select id="eHoursPerDay" class="filter-select" style="width:100%">${hoursOptions}</select></div>
        <div class="form-group"><label>Prix (DA)</label><input type="number" id="ePrice" class="form-input" value="${f.price_dzd || 0}" min="0"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="form-group"><label>XP récompense</label><input type="number" id="eXP" class="form-input" value="${f.xp_reward || 100}" min="0"></div>
        <div class="form-group"><label>Places max</label><input type="number" id="eSlots" class="form-input" value="${f.max_slots || 20}" min="1"></div>
      </div>
      <div class="form-group"><label>Photo de couverture (URL)</label><input type="url" id="eCoverUrl" class="form-input" value="${esc(f.cover_url || '')}" placeholder="https://..."></div>
      <div class="form-group"><label>Vidéo de présentation (URL)</label><input type="url" id="eVideoUrl" class="form-input" value="${esc(f.video_url || '')}" placeholder="https://youtube.com/watch?v=..."></div>
      <div class="form-group"><label>Avis clients (un par ligne)</label><textarea id="eTestimonials" class="form-input" rows="3" placeholder="Ali B. — Formation top !&#10;Sara K. — Très pratique">${esc(f.testimonials || '')}</textarea></div>
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
      days_per_week: parseInt(document.getElementById('eDaysPerWeek')?.value),
      hours_per_day: parseInt(document.getElementById('eHoursPerDay')?.value),
      price_dzd: parseInt(document.getElementById('ePrice')?.value),
      xp_reward: parseInt(document.getElementById('eXP')?.value),
      max_slots: parseInt(document.getElementById('eSlots')?.value),
      cover_url: document.getElementById('eCoverUrl')?.value?.trim(),
      video_url: document.getElementById('eVideoUrl')?.value?.trim(),
      testimonials: document.getElementById('eTestimonials')?.value?.trim(),
      status: document.getElementById('eStatus')?.value,
    };
    if (!updates.title) return showToast('Le titre est requis', 'error');
    api.updateAdminAction(updates).then(() => { closeModal(); loadAdminData(); showToast('Formation mise à jour', 'success'); })
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
      <div class="form-group"><label>Plateforme</label><select id="sPlatform" class="filter-select" style="width:100%"><option value="youtube">YouTube</option><option value="zoom">Zoom</option><option value="meet">Google Meet</option><option value="whatsapp">WhatsApp</option></select></div>
      <div class="form-group"><label>Lien de la session</label><input type="url" id="sSessionUrl" class="form-input" placeholder="https://..."></div>
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
    platform: document.getElementById('sPlatform')?.value || 'youtube',
    session_url: document.getElementById('sSessionUrl')?.value?.trim() || '',
    youtube_url: document.getElementById('sSessionUrl')?.value?.trim() || '',
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
  const currentUrl = s.session_url || s.youtube_url || s.youtubeUrl || '';
  const platformOptions = ['youtube','zoom','meet','whatsapp'].map(p => `<option value="${p}" ${(s.platform||'youtube')===p?'selected':''}>${p.charAt(0).toUpperCase()+p.slice(1)}</option>`).join('');
  openModal('Modifier la session', `
    <form id="editLiveForm" style="display:flex;flex-direction:column;gap:12px">
      <div class="form-group"><label>Titre *</label><input type="text" id="esTitle" class="form-input" value="${esc(s.title)}" required></div>
      <div class="form-group"><label>Date</label><input type="date" id="esDate" class="form-input" value="${dateStr}"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="form-group"><label>Heure</label><input type="time" id="esTime" class="form-input" value="${timeStr}"></div>
        <div class="form-group"><label>Statut</label><select id="esStatus" class="filter-select" style="width:100%"><option value="scheduled" ${s.status==='scheduled'?'selected':''}>Programmée</option><option value="live" ${s.status==='live'?'selected':''}>En direct</option><option value="ended" ${s.status==='ended'?'selected':''}>Terminée</option></select></div>
      </div>
      <div class="form-group"><label>Plateforme</label><select id="esPlatform" class="filter-select" style="width:100%">${platformOptions}</select></div>
      <div class="form-group"><label>Lien de la session</label><input type="url" id="esSessionUrl" class="form-input" value="${esc(currentUrl)}"></div>
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
      platform: document.getElementById('esPlatform')?.value,
      session_url: document.getElementById('esSessionUrl')?.value?.trim(),
      youtube_url: document.getElementById('esSessionUrl')?.value?.trim(),
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
  if (payments.length === 0) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#8892b0">Aucun paiement enregistré</td></tr>'; return; }

  tbody.innerHTML = payments.slice(0, 20).map(p => {
    const d = new Date(p.created_at).toLocaleDateString('fr-FR');
    const uid = p.user_id?.slice(0, 8) || 'N/A';
    const statusClass = p.status === 'paid' ? 'green' : p.status === 'pending' ? 'yellow' : 'red';
    const statusLabel = p.status === 'paid' ? 'Payé' : p.status === 'pending' ? 'En attente' : 'Échoué';
    const actions = p.status === 'pending' ? `
      <div class="action-btns">
        <button class="icon-btn icon-btn--success" title="Valider" onclick="updatePaymentStatus('${p.id}','approvePayment')"><i data-lucide="check-circle"></i></button>
        <button class="icon-btn icon-btn--danger" title="Rejeter" onclick="updatePaymentStatus('${p.id}','rejectPayment')"><i data-lucide="x-circle"></i></button>
      </div>` : `<span style="color:#64748b;font-size:12px">${p.confirmed_by ? 'Traité' : '—'}</span>`;
    return `<tr>
      <td>${d}</td>
      <td><div class="user-cell"><div class="avatar-sm" style="background:#1E5BFF">${esc(userLabel(p.user_id)[0] || '?')}</div><span>${esc(userLabel(p.user_id))}</span></div></td>
      <td style="font-weight:600;color:${p.status === 'paid' ? '#00d68f' : '#ffb547'}">${(p.amount_dzd || 0).toLocaleString()} DA</td>
      <td><span class="method-badge">${esc(p.method || 'N/A')}</span></td>
      <td><span class="badge badge--${statusClass}">${statusLabel}</span></td>
      <td>${esc(p.type || 'N/A')}</td>
      <td>${actions}</td>
    </tr>`;
  }).join('');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function updatePaymentStatus(paymentId, action) {
  const approved = action === 'approvePayment';
  const note = prompt(approved ? 'Note admin (optionnelle)' : 'Motif du rejet (optionnel)', '') || '';
  api.updateAdminAction({ action, paymentId, adminNote: note })
    .then(data => { loadAdminData(); showToast(data.message || 'Paiement mis à jour', approved ? 'success' : 'info'); })
    .catch(err => showToast('Erreur: ' + err.message, 'error'));
}

/* ========================================
   TASKS
   ======================================== */
function renderTasks() {
  const board = document.getElementById('adminTasksBoard');
  if (!board) return;
  const tasks = adminData.tasks || [];
  const statuses = [
    ['todo', 'À faire'],
    ['doing', 'En cours'],
    ['done', 'Terminé'],
    ['cancelled', 'Annulé'],
  ];
  board.innerHTML = statuses.map(([status, label]) => {
    const items = tasks.filter(t => t.status === status);
    return `<div class="task-column">
      <div class="task-column__header"><span>${label}</span><strong>${items.length}</strong></div>
      <div class="task-column__items">
        ${items.length ? items.map(renderTaskCard).join('') : '<div class="task-empty">Aucune tâche</div>'}
      </div>
    </div>`;
  }).join('');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderTaskCard(t) {
  const priorityLabel = { low: 'Basse', medium: 'Moyenne', high: 'Haute' }[t.priority] || 'Moyenne';
  const due = t.due_at ? new Date(t.due_at).toLocaleDateString('fr-FR') : 'Sans échéance';
  return `<article class="task-card task-card--${esc(t.priority || 'medium')}">
    <div class="task-card__top">
      <h4>${esc(t.title)}</h4>
      <span class="badge badge--${t.priority === 'high' ? 'red' : t.priority === 'low' ? 'green' : 'yellow'}">${priorityLabel}</span>
    </div>
    ${t.description ? `<p>${esc(t.description)}</p>` : ''}
    <div class="task-card__meta">
      <span><i data-lucide="clock"></i> ${esc(due)}</span>
      ${t.related_user_id ? `<span><i data-lucide="user"></i> ${esc(userLabel(t.related_user_id))}</span>` : ''}
    </div>
    <div class="task-card__actions">
      ${t.status !== 'doing' ? `<button class="btn btn--ghost btn--sm" onclick="setTaskStatus('${t.id}','doing')">En cours</button>` : ''}
      ${t.status !== 'done' ? `<button class="btn btn--ghost btn--sm" onclick="setTaskStatus('${t.id}','done')">Terminer</button>` : ''}
      <button class="btn btn--danger btn--sm" onclick="deleteTask('${t.id}')"><i data-lucide="trash-2"></i></button>
    </div>
  </article>`;
}

function openTaskModal() {
  const userOptions = adminData.users.map(u => `<option value="${u.id}">${esc(userLabel(u.id))}</option>`).join('');
  openModal('Nouvelle tâche', `
    <form id="taskForm" style="display:flex;flex-direction:column;gap:12px">
      <div class="form-group"><label>Titre *</label><input type="text" id="taskTitle" class="form-input" placeholder="Ex: Vérifier preuve paiement" required></div>
      <div class="form-group"><label>Description</label><textarea id="taskDescription" class="form-input" rows="3" placeholder="Détails de la tâche"></textarea></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="form-group"><label>Priorité</label><select id="taskPriority" class="filter-select" style="width:100%"><option value="low">Basse</option><option value="medium" selected>Moyenne</option><option value="high">Haute</option></select></div>
        <div class="form-group"><label>Échéance</label><input type="date" id="taskDue" class="form-input"></div>
      </div>
      <div class="form-group"><label>Utilisateur lié</label><select id="taskRelatedUser" class="filter-select" style="width:100%"><option value="">Aucun</option>${userOptions}</select></div>
      <div class="modal-footer"><button type="button" class="btn btn--ghost" onclick="closeModal()">Annuler</button><button type="submit" class="btn btn--primary">Créer</button></div>
    </form>`);
  document.getElementById('taskForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const due = document.getElementById('taskDue')?.value;
    api.createAdminAction({
      action: 'createTask',
      title: document.getElementById('taskTitle')?.value?.trim(),
      description: document.getElementById('taskDescription')?.value?.trim() || '',
      priority: document.getElementById('taskPriority')?.value || 'medium',
      dueAt: due ? `${due}T09:00:00` : null,
      relatedUserId: document.getElementById('taskRelatedUser')?.value || null,
    }).then(() => { closeModal(); loadAdminData(); showToast('Tâche créée', 'success'); })
      .catch(err => showToast('Erreur: ' + err.message, 'error'));
  });
}

function setTaskStatus(taskId, status) {
  api.updateAdminAction({ action: 'updateTask', id: taskId, status })
    .then(() => { loadAdminData(); showToast('Tâche mise à jour', 'success'); })
    .catch(err => showToast('Erreur: ' + err.message, 'error'));
}

function deleteTask(taskId) {
  if (!confirm('Supprimer cette tâche ?')) return;
  api.deleteAdminAction({ action: 'deleteTask', id: taskId })
    .then(() => { loadAdminData(); showToast('Tâche supprimée', 'success'); })
    .catch(err => showToast('Erreur: ' + err.message, 'error'));
}

/* ========================================
   AUDIT LOGS
   ======================================== */
function renderAuditLogs() {
  const tbody = document.getElementById('auditTableBody');
  if (!tbody) return;
  const logs = adminData.auditLogs || [];
  if (logs.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#8892b0;padding:2rem">Aucune action auditée</td></tr>'; return; }
  tbody.innerHTML = logs.map(log => {
    const date = new Date(log.created_at).toLocaleString('fr-FR');
    const details = log.metadata && Object.keys(log.metadata).length ? JSON.stringify(log.metadata).slice(0, 140) : '—';
    return `<tr>
      <td>${date}</td>
      <td>${esc(userLabel(log.actor_id))}</td>
      <td><span class="badge badge--blue">${esc(log.action)}</span></td>
      <td>${esc(log.entity_type)}${log.entity_id ? ` · ${esc(log.entity_id.slice(0, 8))}` : ''}</td>
      <td style="max-width:320px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(details)}</td>
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
   SETTINGS PERSISTENCE
   ======================================== */
const SETTINGS_KEY = 'skillsdz_admin_settings';

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    document.querySelectorAll('.toggle[data-key]').forEach(toggle => {
      const key = toggle.dataset.key;
      if (key in saved) {
        const isActive = saved[key];
        toggle.classList.toggle('active', isActive);
        toggle.setAttribute('aria-checked', isActive);
      }
    });
  } catch {}

  api.updateAdminAction({ action: 'getSettings' }).then(result => {
    if (result?.settings) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(result.settings));
      document.querySelectorAll('.toggle[data-key]').forEach(toggle => {
        const key = toggle.dataset.key;
        if (key in result.settings) {
          const isActive = result.settings[key];
          toggle.classList.toggle('active', isActive);
          toggle.setAttribute('aria-checked', isActive);
        }
      });
    }
  }).catch(() => {});
}

function saveSettings() {
  const settings = {};
  document.querySelectorAll('.toggle[data-key]').forEach(toggle => {
    settings[toggle.dataset.key] = toggle.classList.contains('active');
  });
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  api.updateAdminAction({ action: 'saveSettings', settings }).catch(() => {});
}

/* ========================================
   JOURNAL D'IDÉES — Insights automatisés (APIs gratuites)
   ======================================== */

const JOURNAL_SOURCES = [
  { cat: 'marketing', icon: 'trending-up', color: '#1E5BFF', api: 'https://api.rss2json.com/v1/api.json?rss_url=https://feeds.feedburner.com/MarketingLand', label: 'Marketing Land' },
  { cat: 'marketing', icon: 'target', color: '#1E5BFF', api: 'https://api.rss2json.com/v1/api.json?rss_url=https://searchengineland.com/feed', label: 'Search Engine Land' },
  { cat: 'dev', icon: 'code-2', color: '#00C4FF', api: 'https://api.rss2json.com/v1/api.json?rss_url=https://dev.to/feed', label: 'Dev.to' },
  { cat: 'dev', icon: 'server', color: '#00C4FF', api: 'https://api.rss2json.com/v1/api.json?rss_url=https://hacks.mozilla.org/feed/', label: 'Mozilla Hacks' },
  { cat: 'ai', icon: 'brain', color: '#7c3aed', api: 'https://api.rss2json.com/v1/api.json?rss_url=https://techcrunch.com/category/artificial-intelligence/feed/', label: 'TechCrunch AI' },
  { cat: 'ai', icon: 'sparkles', color: '#7c3aed', api: 'https://api.rss2json.com/v1/api.json?rss_url=https://the-decoder.com/feed/', label: 'The Decoder' },
  { cat: 'business', icon: 'briefcase', color: '#ffb547', api: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.journaldunet.com/rss/media/', label: 'Journal du Net' },
  { cat: 'business', icon: 'trending-up', color: '#ffb547', api: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.silicon.fr/feed/', label: 'Silicon.fr' },
];

let _fetchedInsights = [];
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
  fetchAllInsights();
  startJournalTimer();
}

async function fetchAllInsights() {
  _fetchedInsights = [];
  const promises = JOURNAL_SOURCES.map(async (src) => {
    try {
      const resp = await fetch(src.api);
      const data = await resp.json();
      if (data.items && data.items.length > 0) {
        const item = data.items[Math.floor(Math.random() * Math.min(5, data.items.length))];
        _fetchedInsights.push({
          cat: src.cat, icon: src.icon, color: src.color,
          title: (item.title || '').slice(0, 80),
          body: (item.description || item.content || '').replace(/<[^>]*>/g, '').slice(0, 200),
          source: src.label, link: item.link || '#', pubDate: item.pubDate || new Date().toISOString(),
        });
      }
    } catch (e) { console.warn('Failed to fetch', src.label, e); }
  });
  await Promise.allSettled(promises);
  if (_fetchedInsights.length < 4) {
    _fetchedInsights = [
      { cat: 'marketing', icon: 'trending-up', color: '#1E5BFF', title: 'Reels vs TikTok en Algérie', body: 'Les Reels Instagram génèrent 2.3x plus d\'engagement que TikTok chez les 18-25 ans en Algérie.', source: 'Étude DZ 2026' },
      { cat: 'dev', icon: 'code-2', color: '#00C4FF', title: 'React domine le marché DZ', body: '65% des offres d\'emploi dev web en Algérie demandent React. Vue.js monte avec 25%.', source: 'Job Market DZ' },
      { cat: 'ai', icon: 'brain', color: '#7c3aed', title: 'ChatGPT adoption massive', body: '45% des étudiants algériens utilisent ChatGPT. L\'IA générative est devenue un outil de base.', source: 'AI Survey DZ' },
      { cat: 'business', icon: 'briefcase', color: '#ffb547', title: 'Économie numérique DZ +18%', body: 'Le secteur numérique algérien croît de 18% par an. Le timing est idéal pour investir.', source: 'Ministère du Numérique' },
    ];
  }
  renderJournal();
}

function getHourlyInsights() {
  return _fetchedInsights.length > 0 ? _fetchedInsights.slice(0, 8) : [
    { cat: 'marketing', icon: 'trending-up', color: '#1E5BFF', title: 'Chargement...', body: 'Récupération des insights...', source: 'API' },
    { cat: 'dev', icon: 'code-2', color: '#00C4FF', title: 'Chargement...', body: 'Récupération des insights...', source: 'API' },
    { cat: 'ai', icon: 'brain', color: '#7c3aed', title: 'Chargement...', body: 'Récupération des insights...', source: 'API' },
    { cat: 'business', icon: 'briefcase', color: '#ffb547', title: 'Chargement...', body: 'Récupération des insights...', source: 'API' },
  ];
}

function renderJournal() {
  const grid = document.getElementById('journalGrid');
  if (!grid) return;
  const hourly = getHourlyInsights();
  const customs = _journalCustomIdeas.filter(i => _journalFilter === 'all' || i.cat === _journalFilter);
  const filtered = hourly.filter(i => _journalFilter === 'all' || i.cat === _journalFilter);
  const allIdeas = [...customs.map(i => ({ ...i, isCustom: true })), ...filtered.map(i => ({ ...i, isCustom: false }))];
  if (allIdeas.length === 0) { grid.innerHTML = '<p style="color:#8892b0;text-align:center;padding:2rem;grid-column:1/-1">Aucun insight</p>'; return; }
  const catLabels = { marketing: 'Marketing Digital', dev: 'Dev Web', ai: 'Intelligence Artificielle', business: 'Business' };
  const catColors = { marketing: '#1E5BFF', dev: '#00C4FF', ai: '#7c3aed', business: '#ffb547' };
  grid.innerHTML = allIdeas.map(idea => `
    <div class="journal-card" style="--card-accent:${idea.color || catColors[idea.cat] || '#1E5BFF'}">
      <div class="journal-card__header">
        <div class="journal-card__icon" style="background:${idea.color || catColors[idea.cat]}20;color:${idea.color || catColors[idea.cat]}"><i data-lucide="${idea.icon || 'lightbulb'}"></i></div>
        <div class="journal-card__meta">
          <span class="journal-card__cat" style="color:${idea.color || catColors[idea.cat]}">${catLabels[idea.cat] || idea.cat}</span>
          <span class="journal-card__time">${idea.isCustom ? 'Personnalisé' : idea.source || ''}</span>
        </div>
        ${idea.isCustom ? `<button class="journal-card__delete" onclick="deleteJournalIdea('${idea.id}')" title="Supprimer"><i data-lucide="trash-2"></i></button>` : ''}
      </div>
      <h4 class="journal-card__title">${esc(idea.title)}</h4>
      <p class="journal-card__body">${esc(idea.body)}</p>
      ${idea.link && !idea.isCustom ? `<a class="journal-card__source" href="${esc(idea.link)}" target="_blank" rel="noopener"><i data-lucide="external-link"></i> ${esc(idea.source)} — Lire</a>` : idea.source ? `<div class="journal-card__source"><i data-lucide="external-link"></i> ${esc(idea.source)}</div>` : ''}
    </div>
  `).join('');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function startJournalTimer() {
  updateCountdown();
  _journalCountdownInterval = setInterval(updateCountdown, 1000);
  _journalTimer = setInterval(() => { fetchAllInsights(); showToast('Insights mis à jour', 'info'); }, 3600000);
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
      <div class="form-group"><label>Catégorie</label><select class="form-input" id="ideaCat" required>
        <option value="marketing">Marketing Digital</option><option value="dev">Dev Web</option>
        <option value="ai">Intelligence Artificielle</option><option value="business">Business</option>
      </select></div>
      <div class="form-group"><label>Titre</label><input type="text" class="form-input" id="ideaTitle" placeholder="Ex: Tendance 2026" required></div>
      <div class="form-group"><label>Description</label><textarea class="form-input" id="ideaBody" rows="4" placeholder="Votre insight..." required></textarea></div>
      <div class="form-group"><label>Source (optionnel)</label><input type="text" class="form-input" id="ideaSource" placeholder="Ex: Étude Google"></div>
      <button type="submit" class="btn btn--primary" style="width:100%">Ajouter</button>
    </form>`;
  openModal('Nouvelle idée', bodyHTML);
  document.getElementById('ideaForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const idea = { id: Date.now().toString(36), cat: document.getElementById('ideaCat').value,
      title: document.getElementById('ideaTitle').value.trim(), body: document.getElementById('ideaBody').value.trim(),
      source: document.getElementById('ideaSource').value.trim() || null, icon: 'lightbulb',
      color: { marketing: '#1E5BFF', dev: '#00C4FF', ai: '#7c3aed', business: '#ffb547' }[document.getElementById('ideaCat').value],
      createdAt: new Date().toISOString() };
    _journalCustomIdeas.unshift(idea);
    localStorage.setItem('skillsdz_journal_ideas', JSON.stringify(_journalCustomIdeas));
    closeModal(); renderJournal(); showToast('Idée ajoutée', 'success');
  });
}

function deleteJournalIdea(id) {
  _journalCustomIdeas = _journalCustomIdeas.filter(i => i.id !== id);
  localStorage.setItem('skillsdz_journal_ideas', JSON.stringify(_journalCustomIdeas));
  renderJournal(); showToast('Idée supprimée', 'info');
}
