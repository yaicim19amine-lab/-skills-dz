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
  loadAdminData();
  initEventListeners();
  loadAdminProfile(user);
  loadNotifications();
});

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

  document.getElementById('addUserBtn')?.addEventListener('click', () => openUserModal());
  document.getElementById('exportUsersBtn')?.addEventListener('click', exportUsersCSV);
  document.getElementById('addFormationBtn')?.addEventListener('click', () => openFormationModal());
  document.getElementById('addSessionBtn')?.addEventListener('click', () => openLiveModal());
  document.getElementById('exportFinanceBtn')?.addEventListener('click', exportFinanceCSV);

  document.getElementById('adminProfileForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('adminName')?.value?.trim();
    const email = document.getElementById('adminEmail')?.value?.trim();
    if (!name || !email) return showToast('Remplissez tous les champs', 'error');
    api.updateProfile({ first_name: name }).then(() => {
      const u = JSON.parse(localStorage.getItem('skillsdz_user'));
      if (u) { u.firstName = name; u.name = name; localStorage.setItem('skillsdz_user', JSON.stringify(u)); }
      loadAdminProfile(u);
      showToast('Profil mis à jour', 'success');
    }).catch(err => showToast('Erreur: ' + err.message, 'error'));
  });

  document.querySelectorAll('.toggle-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT') return;
      const input = row.querySelector('input[type="checkbox"]');
      if (input) input.checked = !input.checked;
    });
  });

  document.getElementById('notificationBtn')?.addEventListener('click', () => {
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

  document.getElementById('userSearch')?.addEventListener('input', (e) => { _searchTerm = e.target.value.toLowerCase(); renderUsers(); });
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
   LOAD ALL DATA
   ======================================== */
function loadAdminData() {
  api.getAdminData().then(data => {
    adminData.users = data.users || [];
    adminData.formations = data.formations || [];
    adminData.payments = data.payments || [];
    adminData.stats = data.stats || {};
    renderDashboard();
    renderUsers();
    renderFormations();
    renderFinances();
  }).catch(err => console.error('Admin data error:', err));

  api.getLiveSessions().then(data => {
    adminData.liveSessions = data.schedule || [];
    renderLiveSessions();
  }).catch(err => console.error('Live sessions error:', err));
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
    const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;
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
    const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const levelName = (u.level || 1) <= 3 ? 'Débutant' : (u.level || 1) <= 7 ? 'Intermédiaire' : 'Avancé';
    const levelColor = (u.level || 1) <= 3 ? 'yellow' : (u.level || 1) <= 7 ? 'blue' : 'cyan';
    const isBanned = u.is_banned;
    const isMe = u.id === myId;
    return `<tr>
      <td><div class="user-cell"><div class="avatar-sm" style="background:#1E5BFF">${initials}</div><span>${name}</span></div></td>
      <td>${u.email}</td>
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
  const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const levelName = (u.level || 1) <= 3 ? 'Débutant' : (u.level || 1) <= 7 ? 'Intermédiaire' : 'Avancé';
  const created = new Date(u.created_at).toLocaleDateString('fr-FR');
  const badges = u.badges ? (Array.isArray(u.badges) ? u.badges : JSON.parse(u.badges || '[]')) : [];

  openModal('Profil Utilisateur', `
    <div style="text-align:center;margin-bottom:16px">
      <div class="avatar-sm" style="background:#1E5BFF;width:56px;height:56px;font-size:22px;margin:0 auto 8px">${initials}</div>
      <h4 style="color:white;font-size:16px">${name}</h4>
      <p style="color:#8892b0;font-size:13px">${u.email}</p>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
      <div style="background:#0f1117;padding:12px;border-radius:8px;text-align:center"><span style="color:#8892b0;font-size:11px;display:block">Niveau</span><span style="color:white;font-size:18px;font-weight:700">${u.level || 1}</span><span style="color:#8892b0;font-size:11px;display:block">${levelName}</span></div>
      <div style="background:#0f1117;padding:12px;border-radius:8px;text-align:center"><span style="color:#8892b0;font-size:11px;display:block">XP</span><span style="color:white;font-size:18px;font-weight:700">${(u.xp || 0).toLocaleString()}</span></div>
    </div>
    <div style="margin-bottom:16px"><span style="color:#8892b0;font-size:12px">Badges: </span>${badges.length > 0 ? badges.map(b => `<span class="badge badge--blue" style="margin:2px">${b}</span>`).join('') : '<span style="color:#555;font-size:12px">Aucun</span>'}</div>
    <div style="font-size:12px;color:#8892b0">
      <p>Inscrit le: ${created}</p>
      <p>Admin: ${u.is_admin ? '<span style="color:#1E5BFF">Oui</span>' : 'Non'}</p>
    </div>
  `);
}

function openUserModal(userId) {
  const u = userId ? adminData.users.find(u => u.id === userId) : null;
  openModal(u ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur', `
    <form id="userForm" style="display:flex;flex-direction:column;gap:12px">
      <div class="form-group"><label>Prénom</label><input type="text" id="modalFirstName" value="${u?.first_name || ''}" class="form-input" placeholder="Prénom"></div>
      <div class="form-group"><label>Nom</label><input type="text" id="modalLastName" value="${u?.last_name || ''}" class="form-input" placeholder="Nom"></div>
      <div class="form-group"><label>Email</label><input type="email" id="modalEmail" value="${u?.email || ''}" class="form-input" placeholder="email@domaine.com" ${u ? 'disabled' : ''}></div>
      ${!u ? '<div class="form-group"><label>Mot de passe</label><input type="password" id="modalPassword" class="form-input" placeholder="••••••••"></div>' : ''}
      <div class="modal-footer"><button type="button" class="btn btn--ghost" onclick="closeModal()">Annuler</button><button type="submit" class="btn btn--primary">${u ? 'Sauvegarder' : 'Créer'}</button></div>
    </form>
  `);
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

  const emojis = ['📘', '📗', '📕', '📙', '📓', '📒', '🎨', '💻', '🔬', '📱'];
  const gradients = ['#1E5BFF,#00C4FF', '#00d68f,#00C4FF', '#ff4d6d,#ff8a65', '#8b5cf6,#c084fc', '#f59e0b,#ef4444'];

  grid.innerHTML = formations.map((f, i) => {
    const emoji = f.emoji || emojis[i % emojis.length];
    const grad = gradients[i % gradients.length];
    return `<div class="admin-formation-card">
      <div class="admin-formation-header"><span class="admin-formation-emoji">${emoji}</span><span class="status-badge status-badge--${f.status === 'active' ? 'active' : f.status === 'upcoming' ? 'pending' : 'completed'}">${f.status === 'active' ? 'Active' : f.status === 'upcoming' ? 'À venir' : 'Complet'}</span></div>
      <h4>${f.title}</h4>
      <div class="admin-formation-meta">
        <span>⏱ ${f.duration_weeks || '?'} semaines</span>
        <span>💰 ${(f.price_dzd || 0).toLocaleString()} DA</span>
        <span>⭐ +${f.xp_reward || 0} XP</span>
      </div>
      <div class="admin-formation-slots">${f.max_slots || 0} places max</div>
      <div class="admin-formation-actions">
        <button class="btn btn--ghost btn--sm" onclick="openEditFormationModal('${f.id}')"><i data-lucide="edit"></i> Modifier</button>
        <button class="btn btn--danger btn--sm" onclick="confirmDeleteFormation('${f.id}','${f.title.replace(/'/g,"\\'")}')"><i data-lucide="trash-2"></i></button>
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
      <div class="form-group"><label>Emoji</label><input type="text" id="eEmoji" class="form-input" value="${f.emoji || '📘'}" maxlength="4"></div>
      <div class="form-group"><label>Titre *</label><input type="text" id="eTitle" class="form-input" value="${f.title}" required></div>
      <div class="form-group"><label>Description</label><input type="text" id="eDesc" class="form-input" value="${f.description || ''}"></div>
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
    const statusClass = s.status === 'live' ? 'live' : s.status === 'scheduled' ? 'scheduled' : 'ended';
    const statusLabel = s.status === 'live' ? '🔴 EN DIRECT' : s.status === 'scheduled' ? '🟢 Programmée' : '⚫ Terminée';
    return `<div class="admin-live-item">
      <div class="admin-live-status admin-live-status--${statusClass}">${statusLabel}</div>
      <div class="admin-live-info"><h4>${s.title}</h4><p>${dateStr} à ${timeStr} — ${(s.youtube_url || s.youtubeUrl) ? '<a href="' + (s.youtube_url || s.youtubeUrl) + '" target="_blank" style="color:#1E5BFF">YouTube</a>' : 'Pas de lien'}</p></div>
      <div class="admin-live-actions">
        <button class="btn btn--ghost btn--sm" onclick="openEditLiveModal('${s.id}')"><i data-lucide="edit"></i></button>
        <button class="btn btn--danger btn--sm" onclick="confirmDeleteLive('${s.id}','${s.title.replace(/'/g,"\\'")}')"><i data-lucide="trash-2"></i></button>
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
      <div class="form-group"><label>Titre *</label><input type="text" id="esTitle" class="form-input" value="${s.title}" required></div>
      <div class="form-group"><label>Date</label><input type="date" id="esDate" class="form-input" value="${dateStr}"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="form-group"><label>Heure</label><input type="time" id="esTime" class="form-input" value="${timeStr}"></div>
        <div class="form-group"><label>Statut</label><select id="esStatus" class="filter-select" style="width:100%"><option value="scheduled" ${s.status==='scheduled'?'selected':''}>Programmée</option><option value="live" ${s.status==='live'?'selected':''}>En direct</option><option value="ended" ${s.status==='ended'?'selected':''}>Terminée</option></select></div>
      </div>
      <div class="form-group"><label>Lien YouTube</label><input type="url" id="esYoutube" class="form-input" value="${s.youtube_url || s.youtubeUrl || ''}"></div>
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
      <td><div class="user-cell"><div class="avatar-sm" style="background:#1E5BFF">${uid[0]}</div><span>${uid}...</span></div></td>
      <td style="font-weight:600;color:${p.status === 'paid' ? '#00d68f' : '#ffb547'}">${(p.amount_dzd || 0).toLocaleString()} DA</td>
      <td><span class="method-badge">${p.method || 'N/A'}</span></td>
      <td><span class="badge badge--${statusClass}">${statusLabel}</span></td>
      <td>${p.type || 'N/A'}</td>
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
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `skillsdz_${name}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
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
  toast.style.cssText = `position:fixed;top:24px;right:24px;padding:16px 24px;border-radius:12px;background:${colors[type]||colors.info};color:white;font-size:14px;font-weight:600;box-shadow:0 8px 32px rgba(0,0,0,0.3);z-index:1000;animation:fadeIn 0.3s ease;`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 3000);
}

/* ========================================
   NOTIFICATIONS
   ======================================== */
function loadNotifications() {
  const list = document.getElementById('notifList');
  if (!list) return;
  const count = adminData.users.length;
  list.innerHTML = `
    <li class="notif-item notif-item--unread"><div class="notif-icon notif-icon--green"><i data-lucide="users"></i></div><div class="notif-body"><p><strong>${count} utilisateurs</strong> inscrits sur la plateforme</p><time>maintenant</time></div></li>
    <li class="notif-item notif-item--unread"><div class="notif-icon notif-icon--blue"><i data-lucide="book-open"></i></div><div class="notif-body"><p><strong>${adminData.formations.length} formations</strong> disponibles</p><time>maintenant</time></div></li>
  `;
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

/* ========================================
   UTILS
   ======================================== */
function setText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }
