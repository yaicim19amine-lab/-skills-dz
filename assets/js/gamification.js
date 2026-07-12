/* ========================================
   SKILLS DZ — Gamification System v2
   ======================================== */

const Gamification = (() => {
  const LEVELS = [
    { name: 'Débutant', icon: '🌱', min: 0 },
    { name: 'Apprenti', icon: '📘', min: 100 },
    { name: 'Explorateur', icon: '🧭', min: 250 },
    { name: 'Praticien', icon: '⚙️', min: 500 },
    { name: 'Confirmé', icon: '🎓', min: 1000 },
    { name: 'Expert', icon: '💎', min: 2000 },
    { name: 'Spécialiste', icon: '🏆', min: 3500 },
    { name: 'Maître', icon: '👑', min: 5000 },
  ];

  const BADGES = [
    { id: 'newcomer', name: 'Nouveau', icon: '🌟', desc: 'Bienvenue sur Skills DZ !' },
    { id: 'streak-3', name: '3 jours', icon: '🔥', desc: 'Série de 3 jours consécutifs' },
    { id: 'streak-7', name: '7 jours', icon: '⚡', desc: 'Série de 7 jours consécutifs' },
    { id: 'streak-30', name: '30 jours', icon: '🏅', desc: 'Série de 30 jours consécutifs' },
    { id: 'streak-100', name: 'Centurion', icon: '💎', desc: 'Série de 100 jours consécutifs' },
    { id: 'first-course', name: '1er cours', icon: '📚', desc: 'Terminer votre premier cours' },
    { id: 'course-5', name: '5 cours', icon: '🎓', desc: 'Terminer 5 cours' },
    { id: 'course-all', name: 'Polyvalent', icon: '🌈', desc: 'Terminer tous les cours' },
    { id: 'first-video', name: '1ère vidéo', icon: '🎬', desc: 'Regarder votre première vidéo' },
    { id: 'video-25', name: 'Cinéphile', icon: '🍿', desc: 'Regarder 25 vidéos' },
    { id: 'first-game', name: '1er jeu', icon: '🎮', desc: 'Jouer à votre premier jeu' },
    { id: 'game-10', name: 'Gamer', icon: '🕹️', desc: 'Jouer à 10 jeux' },
    { id: 'quiz-master', name: 'Quiz Master', icon: '🧠', desc: 'Obtenir 100% à un quiz' },
    { id: 'ai-friend', name: 'Ami IA', icon: '🤖', desc: 'Interagir avec un agent IA' },
    { id: 'ai-50', name: 'IA Expert', icon: '🧠', desc: '50 interactions IA' },
    { id: 'referral', name: 'Parrain', icon: '🤝', desc: 'Parrainer un ami' },
    { id: 'referral-5', name: 'Super Parrain', icon: '🏆', desc: 'Parrainer 5 amis' },
    { id: 'level-5', name: 'Nv. 5', icon: '⭐', desc: 'Atteindre le niveau 5' },
    { id: 'level-10', name: 'Nv. 10', icon: '👑', desc: 'Atteindre le niveau 10' },
    { id: 'level-15', name: 'Nv. 15', icon: '🌟', desc: 'Atteindre le niveau 15' },
    { id: 'first-purchase', name: '1er achat', icon: '🛒', desc: ' Premier achat en boutique' },
    { id: 'big-spender', name: 'Gros dépensier', icon: '💰', desc: 'Dépenser 5000 XP' },
    { id: 'live-viewer', name: 'Live', icon: '📺', desc: 'Regarder un live' },
    { id: 'early-bird', name: 'Matinal', icon: '🌅', desc: 'Connexion avant 8h' },
    { id: 'night-owl', name: 'Noctambule', icon: '🦉', desc: 'Connexion après 23h' },
  ];

  const XP_VALUES = {
    course: 50,
    video: 30,
    game: 100,
    form: 20,
    ai: 15,
    referral: 200,
    quiz_correct: 25,
    quiz_bonus: 50,
    match: 30,
    word: 40,
  };

  let state = loadState();

  function loadState() {
    try {
      const d = JSON.parse(localStorage.getItem('skillsdz_game'));
      if (d) {
        // Ensure arrays exist
        d.coursesCompleted = d.coursesCompleted || [];
        d.videosWatched = d.videosWatched || [];
        d.gamesPlayed = d.gamesPlayed || [];
        d.formsCompleted = d.formsCompleted || [];
        d.badges = d.badges || [];
        d.aiInteractions = d.aiInteractions || 0;
        d.referrals = d.referrals || 0;
        d.totalXP = d.totalXP || d.xp || 0;
        return d;
      }
      return defaultState();
    } catch {
      return defaultState();
    }
  }

  function defaultState() {
    return {
      xp: 0,
      level: 1,
      streak: 0,
      lastPlay: null,
      badges: [],
      coursesCompleted: [],
      videosWatched: [],
      gamesPlayed: [],
      formsCompleted: [],
      aiInteractions: 0,
      referrals: 0,
      totalXP: 0,
      totalPurchasesXP: 0,
    };
  }

  function save() {
    localStorage.setItem('skillsdz_game', JSON.stringify(state));
    syncWithUser();
  }

  function syncWithUser() {
    try {
      const user = JSON.parse(localStorage.getItem('skillsdz_user'));
      if (user) {
        user.xp = state.xp;
        user.level = state.level;
        user.streak = state.streak;
        localStorage.setItem('skillsdz_user', JSON.stringify(user));
      }
    } catch {}
  }

  function getLevel() {
    let lvl = 1;
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (state.xp >= LEVELS[i].min) {
        lvl = i + 1;
        break;
      }
    }
    return lvl;
  }

  function getLevelData() {
    const lvl = getLevel();
    const idx = Math.min(lvl - 1, LEVELS.length - 1);
    return {
      level: lvl,
      name: LEVELS[idx].name,
      icon: LEVELS[idx].icon,
      currentXP: state.xp,
      nextLevelXP: idx < LEVELS.length - 1 ? LEVELS[idx + 1].min : LEVELS[idx].min,
      progress: idx < LEVELS.length - 1
        ? Math.round(((state.xp - LEVELS[idx].min) / (LEVELS[idx + 1].min - LEVELS[idx].min)) * 100)
        : 100,
    };
  }

  function checkStreak() {
    const today = new Date().toDateString();
    if (state.lastPlay === today) return state.streak;

    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (state.lastPlay === yesterday) {
      state.streak++;
    } else if (state.lastPlay !== today) {
      state.streak = 1;
    }
    state.lastPlay = today;

    if (state.streak === 3) unlockBadge('streak-3');
    if (state.streak === 7) unlockBadge('streak-7');
    if (state.streak === 30) unlockBadge('streak-30');
    if (state.streak === 100) unlockBadge('streak-100');
    if (state.streak % 7 === 0 && state.streak > 0) {
      addXP(100, 'Bonus série 7 jours');
    }

    save();
    return state.streak;
  }

  function addXP(amount, reason) {
    if (amount <= 0) return { xp: state.xp, level: getLevel(), leveledUp: false };
    const oldLevel = getLevel();
    state.xp += amount;
    state.totalXP += amount;
    const newLevel = getLevel();
    state.level = newLevel;
    save();

    showXPToast(amount, reason);

    if (newLevel > oldLevel) {
      showLevelUp(newLevel);
      if (newLevel >= 5) unlockBadge('level-5');
      if (newLevel >= 10) unlockBadge('level-10');
      if (newLevel >= 15) unlockBadge('level-15');
    }

    updateDashboardUI();
    return { xp: state.xp, level: newLevel, leveledUp: newLevel > oldLevel };
  }

  function deductXP(amount, reason) {
    if (amount <= 0) return { xp: state.xp, level: getLevel() };
    state.xp = Math.max(0, state.xp - amount);
    state.totalPurchasesXP = (state.totalPurchasesXP || 0) + amount;
    const newLevel = getLevel();
    state.level = newLevel;
    save();
    showXPToast(-amount, reason);
    updateDashboardUI();
    return { xp: state.xp, level: newLevel };
  }

  function unlockBadge(badgeId) {
    if (state.badges.includes(badgeId)) return false;
    state.badges.push(badgeId);
    save();
    updateDashboardUI();
    showBadgeUnlock(badgeId);
    return true;
  }

  function showBadgeUnlock(badgeId) {
    const badge = BADGES.find(b => b.id === badgeId);
    if (!badge) return;
    const toast = document.getElementById('xpToast');
    const text = document.getElementById('xpToastText');
    if (toast && text) {
      text.textContent = `${badge.icon} Badge débloqué : ${badge.name} !`;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3000);
    }
  }

  function earnXP(type, customAmount) {
    const amount = customAmount || XP_VALUES[type] || 0;
    const reasons = {
      course: 'Cours suivi',
      video: 'Vidéo regardée',
      game: 'Jeu terminé',
      form: 'Formulaire rempli',
      ai: 'Agent IA consulté',
      referral: 'Ami parrainé',
    };
    const result = addXP(amount, reasons[type] || 'Action complétée');

    // Track completions and unlock badges
    if (type === 'course') {
      state.coursesCompleted.push({ date: Date.now() });
      if (state.coursesCompleted.length === 1) unlockBadge('first-course');
      if (state.coursesCompleted.length >= 5) unlockBadge('course-5');
    }
    if (type === 'video') {
      state.videosWatched.push({ date: Date.now() });
      if (state.videosWatched.length === 1) unlockBadge('first-video');
      if (state.videosWatched.length >= 25) unlockBadge('video-25');
    }
    if (type === 'game') {
      state.gamesPlayed.push({ date: Date.now() });
      if (state.gamesPlayed.length === 1) unlockBadge('first-game');
      if (state.gamesPlayed.length >= 10) unlockBadge('game-10');
    }
    if (type === 'form') {
      state.formsCompleted.push({ date: Date.now() });
    }
    if (type === 'ai') {
      state.aiInteractions++;
      if (state.aiInteractions >= 1) unlockBadge('ai-friend');
      if (state.aiInteractions >= 50) unlockBadge('ai-50');
    }
    if (type === 'referral') {
      state.referrals++;
      if (state.referrals >= 1) unlockBadge('referral');
      if (state.referrals >= 5) unlockBadge('referral-5');
    }
    save();
    return result;
  }

  function showXPToast(amount, reason) {
    const toast = document.getElementById('xpToast');
    const text = document.getElementById('xpToastText');
    if (toast && text) {
      text.textContent = `+${amount} XP — ${reason}`;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2500);
    }
  }

  function showLevelUp(level) {
    const overlay = document.getElementById('levelUpModal');
    if (!overlay) return;
    const lvlData = getLevelData();
    const title = overlay.querySelector('.modal__title');
    const text = overlay.querySelector('.modal__text');
    const newLvl = overlay.querySelector('#newLevel');
    if (title) title.textContent = `Niveau ${level} !`;
    if (text) text.innerHTML = `Félicitations ! Vous êtes maintenant <strong>${lvlData.name}</strong>.`;
    if (newLvl) newLvl.textContent = lvlData.name;
    overlay.classList.add('open');
    overlay.onclick = (e) => { if (e.target === overlay) overlay.classList.remove('open'); };
    setTimeout(() => overlay.classList.remove('open'), 5000);
  }

  function checkTimeBadges() {
    const hour = new Date().getHours();
    if (hour < 8) unlockBadge('early-bird');
    if (hour >= 23) unlockBadge('night-owl');
  }

  function updateDashboardUI() {
    const lvlData = getLevelData();

    const levelNum = document.getElementById('levelNum');
    const levelTitle = document.getElementById('levelTitle');
    const currentXp = document.getElementById('currentXp');
    const nextLevelXp = document.getElementById('nextLevelXp');
    const xpBar = document.getElementById('xpBar');
    const streakCount = document.getElementById('streakCount');
    const userName = document.getElementById('userName');
    const welcomeName = document.getElementById('welcomeName');
    const userLevelBadge = document.getElementById('userLevelBadge');
    const userXp = document.getElementById('userXp');
    const userAvatar = document.getElementById('userAvatar');

    if (levelNum) levelNum.textContent = lvlData.level;
    if (levelTitle) levelTitle.textContent = lvlData.name;
    if (currentXp) currentXp.textContent = state.xp;
    if (nextLevelXp) nextLevelXp.textContent = lvlData.nextLevelXP;
    if (xpBar) xpBar.style.width = lvlData.progress + '%';
    if (streakCount) streakCount.textContent = state.streak;
    if (userLevelBadge) userLevelBadge.textContent = `Nv. ${lvlData.level}`;
    if (userXp) userXp.textContent = `${state.xp} XP`;

    try {
      const user = JSON.parse(localStorage.getItem('skillsdz_user'));
      if (user) {
        const name = user.firstName || user.name || 'Apprenant';
        if (userName) userName.textContent = name;
        if (welcomeName) welcomeName.textContent = name;
        if (userAvatar) {
          const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
          userAvatar.textContent = initials;
        }
      }
    } catch {}

    const coursesEl = document.getElementById('coursesCompleted');
    const videosEl = document.getElementById('videosWatched');
    const gamesEl = document.getElementById('gamesPlayed');
    const badgesEl = document.getElementById('badgesCount');

    if (coursesEl) coursesEl.textContent = state.coursesCompleted.length;
    if (videosEl) videosEl.textContent = state.videosWatched.length;
    if (gamesEl) gamesEl.textContent = state.gamesPlayed.length;
    if (badgesEl) badgesEl.textContent = state.badges.length;

    const badgesProgress = document.getElementById('badgesProgress');
    if (badgesProgress) badgesProgress.textContent = `${state.badges.length} / ${BADGES.length}`;

    BADGES.forEach(badge => {
      const el = document.querySelector(`[data-badge="${badge.id}"]`);
      if (el) {
        if (state.badges.includes(badge.id)) {
          el.classList.remove('badge-item--locked');
          el.classList.add('badge-item--unlocked');
        } else {
          el.classList.add('badge-item--locked');
          el.classList.remove('badge-item--unlocked');
        }
      }
    });
  }

  return {
    getLevel,
    getLevelData,
    addXP,
    deductXP,
    earnXP,
    checkStreak,
    checkTimeBadges,
    unlockBadge,
    updateDashboardUI,
    getState: () => state,
    XP_VALUES,
    BADGES,
    LEVELS,
  };
})();

function earnXP(type, amount) {
  return Gamification.earnXP(type, amount);
}

document.addEventListener('DOMContentLoaded', () => {
  // Auto-unlock newcomer badge
  if (!Gamification.getState().badges.includes('newcomer')) {
    Gamification.unlockBadge('newcomer');
  }
  Gamification.checkStreak();
  Gamification.checkTimeBadges();
  Gamification.updateDashboardUI();
});
