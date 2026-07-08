/* ========================================
   SKILLS DZ — Mini-Games System
   ======================================== */

const MiniGames = (() => {
  const XP = { quiz_correct: 25, quiz_bonus: 50, match: 30, word: 40, streak_bonus: 100 };
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

  let state = loadState();

  function loadState() {
    try {
      const d = JSON.parse(localStorage.getItem('skillsdz_minigames'));
      return d || defaultState();
    } catch { return defaultState(); }
  }
  function defaultState() {
    return { xp: 0, level: 0, streak: 0, lastPlay: null, quizzesCompleted: 0, matchesWon: 0, wordsCleared: 0, totalXP: 0 };
  }
  function save() { localStorage.setItem('skillsdz_minigames', JSON.stringify(state)); }
  function getXP() { return state.xp; }
  function getLevel() {
    let lvl = 0;
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (state.xp >= LEVELS[i].min) { lvl = i; break; }
    }
    return lvl;
  }
  function getLevelName() { return LEVELS[getLevel()].name; }
  function getLevelIcon() { return LEVELS[getLevel()].icon; }
  function getXPToNext() {
    const lvl = getLevel();
    if (lvl >= LEVELS.length - 1) return 0;
    return LEVELS[lvl + 1].min - state.xp;
  }
  function getXPProgress() {
    const lvl = getLevel();
    if (lvl >= LEVELS.length - 1) return 100;
    const current = state.xp - LEVELS[lvl].min;
    const needed = LEVELS[lvl + 1].min - LEVELS[lvl].min;
    return Math.round((current / needed) * 100);
  }

  function addXP(amount, reason) {
    const oldLevel = getLevel();
    state.xp += amount;
    state.totalXP += amount;
    const newLevel = getLevel();
    state.level = newLevel;
    save();
    updateUI(amount, reason);
    if (newLevel > oldLevel) showLevelUp(newLevel);
    return { xp: state.xp, level: newLevel, leveledUp: newLevel > oldLevel };
  }

  function checkStreak() {
    const today = new Date().toDateString();
    if (state.lastPlay === today) return;
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (state.lastPlay === yesterday) {
      state.streak++;
    } else if (state.lastPlay !== today) {
      state.streak = 1;
    }
    state.lastPlay = today;
    save();
    if (state.streak % 7 === 0) addXP(XP.streak_bonus, 'Bonus série 7 jours');
  }

  function updateUI(amount, reason) {
    const toast = document.getElementById('xpToast');
    if (toast) {
      toast.innerHTML = `⚡ +${amount} XP — ${reason}`;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2500);
    }
    document.querySelectorAll('[data-xp]').forEach(el => el.textContent = state.xp);
    document.querySelectorAll('[data-level]').forEach(el => el.textContent = getLevelName());
    document.querySelectorAll('[data-level-icon]').forEach(el => el.textContent = getLevelIcon());
    const bar = document.querySelector('.level-progress__fill');
    if (bar) bar.style.width = getXPProgress() + '%';
    const lvlNum = document.querySelector('.level-progress__num');
    if (lvlNum) lvlNum.textContent = getLevel();
  }

  function showLevelUp(level) {
    const overlay = document.getElementById('levelUpModal');
    if (!overlay) return;
    overlay.querySelector('.modal__icon').textContent = LEVELS[level].icon;
    overlay.querySelector('.modal__title').textContent = `Niveau ${level} — ${LEVELS[level].name}`;
    overlay.querySelector('.modal__text strong').textContent = LEVELS[level].name;
    overlay.classList.add('open');
    overlay.onclick = (e) => { if (e.target === overlay) overlay.classList.remove('open'); };
    setTimeout(() => overlay.classList.remove('open'), 4000);
  }

  /* ===== QUIZ GAME ===== */
  const QUIZZES = [
    { title: 'Fondamentaux du Marketing Digital', icon: '📱', questions: [
      { q: 'Qu\'est-ce que le SEO ?', options: ['Pay per click', 'Optimisation pour les moteurs de recherche', 'Social media marketing', 'Email marketing'], correct: 1 },
      { q: 'Quel est le canal ROI le plus élevé ?', options: ['Télévision', 'Facebook Ads', 'Email marketing', 'Presse écrite'], correct: 2 },
      { q: 'Qu\'est-ce qu\'un funnel de conversion ?', options: ['Un entonnoir de cuisine', 'Le parcours client vers l\'achat', 'Un type de pub', 'Un outil analytics'], correct: 1 },
      { q: 'Le CTR signifie ?', options: ['Coût Total Réel', 'Click-Through Rate', 'Customer Total Revenue', 'Channel Target Ratio'], correct: 1 },
      { q: 'Quel est l\'objectif principal du content marketing ?', options: ['Vendre directement', 'Éduquer et attirer', 'Spammer', 'Imiter les concurrents'], correct: 1 },
      { q: 'Qu\'est-ce qu\'un pixel Meta ?', options: ['Un code de tracking', 'Une image en basse résolution', 'Un type de pub', 'Un outil de design'], correct: 0 },
      { q: 'Le taux de conversion moyen est d\'environ ?', options: ['0.1%', '1-3%', '10-20%', '50%'], correct: 1 },
    ]},
    { title: 'Réseaux Sociaux & Community Management', icon: '💬', questions: [
      { q: 'Quelle est la meilleure heure pour poster sur Instagram en Algérie ?', options: ['3h du matin', '12h-14h ou 19h-21h', '5h du matin', '23h'], correct: 1 },
      { q: 'Qu\'est-ce qu\'un hashtag ?', options: ['Un mot-clé cliquable', 'Un type de pub', 'Un profil', 'Un story'], correct: 0 },
      { q: 'Quel format est le plus engageant en 2025 ?', options: ['Photo statique', 'Reels / Vidéos courtes', 'Story texte', 'Lien externe'], correct: 1 },
      { q: 'Le community manager fait quoi ?', options: ['Il vend des produits', 'Il gère la communauté et le contenu', 'Il code des sites', 'Il fait de la comptabilité'], correct: 1 },
      { q: 'Qu\'est-ce qu\'un influenceur micro ? Moins de ?', options: ['1M d\'abonnés', '100K d\'abonnés', '10K d\'abonnés', '1K d\'abonnés'], correct: 2 },
      { q: 'Quel réseau social est le plus utilisé en Algérie ?', options: ['Twitter', 'Instagram', 'Facebook', 'LinkedIn'], correct: 2 },
    ]},
    { title: 'Développement Web — HTML & CSS', icon: '🌐', questions: [
      { q: 'HTML signifie ?', options: ['Hyper Text Markup Language', 'Home Tool Markup Language', 'Hyperlinks Text Management Language', 'Home Text Made Language'], correct: 0 },
      { q: 'Quelle balise pour un lien ?', options: ['<link>', '<a href="">', '<url>', '<href>'], correct: 1 },
      { q: 'CSS signifie ?', options: ['Computer Style Sheets', 'Creative Style System', 'Cascading Style Sheets', 'Colorful Style Sheets'], correct: 2 },
      { q: 'Comment centrer un élément avec Flexbox ?', options: ['text-align: center', 'display: flex; justify-content: center', 'float: center', 'margin: auto auto'], correct: 1 },
      { q: 'Qu\'est-ce qu\'un sélecteur CSS ?', options: ['Un bouton', 'Un moyen de cibler un élément HTML', 'Un type d\'image', 'Une variable JS'], correct: 1 },
      { q: 'Quelle propriété change la couleur de fond ?', options: ['color', 'background-color', 'bgcolor', 'back-color'], correct: 1 },
    ]},
    { title: 'Réseaux Sociaux — Instagram & Facebook', icon: '📸', questions: [
      { q: 'Instagram appartient à quelle entreprise ?', options: ['Google', 'Meta (Facebook)', 'Apple', 'Twitter'], correct: 1 },
      { q: 'Qu\'est-ce qu\'un story Instagram ?', options: ['Un post permanent', 'Un contenu 24h éphémère', 'Un type de pub', 'Un reel'], correct: 1 },
      { q: 'Quel est le format Reels ?', options: ['Photo carrée', 'Vidéo courte verticale', 'Post texte', 'Carrousel'], correct: 1 },
      { q: 'Facebook Ads permet de ?', options: ['Jouer en ligne', 'Cibler précisément une audience payante', 'Envoyer des emails', 'Créer un site web'], correct: 1 },
      { q: 'Qu\'est-ce qu\'un boost post ?', options: ['Un post supprimé', 'Un post sponsorisé', 'Un post viral', 'Un post privé'], correct: 1 },
      { q: 'Quel est le meilleur CTA pour une formation ?', options: ['Cliquez ici', 'Inscrivez-vous maintenant', 'Bon courage', 'Au revoir'], correct: 1 },
    ]},
    { title: 'Algorithmie & Logique', icon: '🧮', questions: [
      { q: 'Un algorithme est ?', options: ['Un ordinateur', 'Une suite d\'étapes pour résoudre un problème', 'Un logiciel', 'Une base de données'], correct: 1 },
      { q: 'Qu\'est-ce qu\'une boucle ?', options: ['Un lien', 'Une répétition d\'instructions', 'Une condition', 'Un tableau'], correct: 1 },
      { q: 'Si (x > 5) alors... Sinon... C\'est ?', options: ['Une boucle', 'Une condition', 'Une variable', 'Un tableau'], correct: 1 },
      { q: 'Complexité O(n) signifie ?', options: ['Constante', 'Linéaire', 'Quadratique', 'Exponentielle'], correct: 1 },
      { q: 'Qu\'est-ce qu\'un tableau ?', options: ['Une image', 'Une collection d\'éléments indexés', 'Un texte', 'Une boucle'], correct: 1 },
      { q: 'La récursivité est ?', options: ['Une boucle infinie', 'Une fonction qui s\'appelle elle-même', 'Un type de variable', 'Un algorithme de tri'], correct: 1 },
    ]},
    { title: 'Gestion de Projet & Soft Skills', icon: '🤝', questions: [
      { q: 'Scrum est un framework pour ?', options: ['Cuisine', 'Gestion de projet agile', 'Programmation graphique', 'Marketing'], correct: 1 },
      { q: 'Un sprint dure généralement ?', options: ['1 jour', '1 semaine', '2-4 semaines', '3 mois'], correct: 2 },
      { q: 'La communication non violente (CNV) insiste sur ?', options: ['Les ordres', 'L\'observation sans jugement', 'La compétition', 'Le silence'], correct: 1 },
      { q: 'Qu\'est-ce qu\'un stakeholder ?', options: ['Un employé', 'Une partie prenante du projet', 'Un client final', 'Un fournisseur'], correct: 1 },
      { q: 'Le timeboxing consiste à ?', options: ['Supprimer du temps', 'Allouer un temps fixe à une tâche', 'Travailler sans pause', 'Retarder les projets'], correct: 1 },
      { q: 'Un bon leadership commence par ?', options: ['Donner des ordres', 'Écouter et comprendre', 'Punir', 'Ignorer'], correct: 1 },
    ]},
  ];

  let quizState = {};

  function renderQuizSelector(containerId) {
    const c = document.getElementById(containerId);
    if (!c) return;
    c.innerHTML = QUIZZES.map((quiz, i) => `
      <div class="quiz-card" data-quiz="${i}" style="background:#13151e;border:1px solid #1c2035;border-radius:14px;padding:20px;cursor:pointer;transition:all .2s ease;">
        <div style="font-size:32px;margin-bottom:12px;">${quiz.icon}</div>
        <h4 style="font-size:15px;font-weight:700;color:white;margin-bottom:6px;">${quiz.title}</h4>
        <p style="font-size:12px;color:#8892b0;">${quiz.questions.length} questions • +${quiz.questions.length * XP.quiz_correct} XP max</p>
      </div>
    `).join('');
    c.querySelectorAll('.quiz-card').forEach(card => {
      card.addEventListener('click', () => startQuiz(parseInt(card.dataset.quiz), containerId));
      card.addEventListener('mouseenter', () => { card.style.borderColor = '#232840'; card.style.transform = 'translateY(-2px)'; });
      card.addEventListener('mouseleave', () => { card.style.borderColor = '#1c2035'; card.style.transform = 'none'; });
    });
  }

  function startQuiz(index, containerId) {
    const quiz = QUIZZES[index];
    quizState = { quizIndex: index, qIndex: 0, score: 0, answers: [], startTime: Date.now() };
    const c = document.getElementById(containerId);
    c.innerHTML = `
      <div style="text-align:center;margin-bottom:24px;">
        <h3 style="font-family:'Poppins',sans-serif;font-size:20px;color:white;">${quiz.icon} ${quiz.title}</h3>
        <p style="font-size:13px;color:#8892b0;" id="quizProgress">Question 1/${quiz.questions.length}</p>
      </div>
      <div id="quizBody"></div>
    `;
    renderQuizQuestion(containerId);
  }

  function renderQuizQuestion(containerId) {
    const quiz = QUIZZES[quizState.quizIndex];
    const q = quiz.questions[quizState.qIndex];
    document.getElementById('quizProgress').textContent = `Question ${quizState.qIndex + 1}/${quiz.questions.length}`;
    document.getElementById('quizBody').innerHTML = `
      <div style="background:#13151e;border:1px solid #1c2035;border-radius:14px;padding:24px;margin-bottom:16px;">
        <p style="font-size:16px;font-weight:600;color:white;margin-bottom:20px;line-height:1.5;">${q.q}</p>
        <div style="display:flex;flex-direction:column;gap:10px;" id="quizOptions">
          ${q.options.map((opt, i) => `
            <button class="quiz-opt" data-idx="${i}" style="display:flex;align-items:center;gap:12px;padding:14px 18px;background:#0B1331;border:1px solid #232840;border-radius:10px;cursor:pointer;font-size:14px;color:#e8eaf6;text-align:left;transition:all .15s ease;width:100%;text-align:left;">
              <span style="width:28px;height:28px;border-radius:8px;background:#1c2035;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#8892b0;flex-shrink:0;">${String.fromCharCode(65 + i)}</span>
              ${opt}
            </button>
          `).join('')}
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:13px;color:#8892b0;">Score: <strong style="color:#00d68f;">${quizState.score}</strong></span>
        <span style="font-size:13px;color:#8892b0;">+${quizState.score * XP.quiz_correct} XP gagnés</span>
      </div>
    `;
    document.querySelectorAll('.quiz-opt').forEach(btn => {
      btn.addEventListener('click', () => answerQuiz(parseInt(btn.dataset.idx), containerId));
      btn.addEventListener('mouseenter', () => { btn.style.borderColor = '#1E5BFF'; btn.style.background = '#161a26'; });
      btn.addEventListener('mouseleave', () => { btn.style.borderColor = '#232840'; btn.style.background = '#0B1331'; });
    });
  }

  function answerQuiz(selected, containerId) {
    const quiz = QUIZZES[quizState.quizIndex];
    const q = quiz.questions[quizState.qIndex];
    const isCorrect = selected === q.correct;
    if (isCorrect) quizState.score++;

    const opts = document.querySelectorAll('.quiz-opt');
    opts.forEach((opt, i) => {
      opt.style.pointerEvents = 'none';
      if (i === q.correct) { opt.style.borderColor = '#00d68f'; opt.style.background = 'rgba(0,214,143,0.1)'; }
      else if (i === selected && !isCorrect) { opt.style.borderColor = '#ff4d6d'; opt.style.background = 'rgba(255,77,109,0.1)'; }
    });

    quizState.answers.push({ question: q.q, selected, correct: q.correct, isCorrect });

    setTimeout(() => {
      quizState.qIndex++;
      if (quizState.qIndex < quiz.questions.length) {
        renderQuizQuestion(containerId);
      } else {
        endQuiz(containerId);
      }
    }, 1000);
  }

  function endQuiz(containerId) {
    const quiz = QUIZZES[quizState.quizIndex];
    const total = quiz.questions.length;
    const pct = Math.round((quizState.score / total) * 100);
    const xp = quizState.score * XP.quiz_correct;
    const bonus = pct === 100 ? XP.quiz_bonus : 0;
    const totalXP = xp + bonus;

    addXP(totalXP, `Quiz "${quiz.title}" — ${quizState.score}/${total}`);
    state.quizzesCompleted++;
    checkStreak();
    save();

    const grade = pct >= 90 ? '🏆 Excellent !' : pct >= 70 ? '💪 Très bien !' : pct >= 50 ? '👍 Pas mal !' : '📚 Continue !';

    document.getElementById(containerId).innerHTML = `
      <div style="text-align:center;padding:40px 20px;">
        <div style="font-size:64px;margin-bottom:16px;">${pct >= 90 ? '🎉' : pct >= 50 ? '✨' : '📖'}</div>
        <h3 style="font-family:'Poppins',sans-serif;font-size:28px;font-weight:800;color:white;margin-bottom:8px;">Quiz Terminé !</h3>
        <p style="font-size:16px;color:#8892b0;margin-bottom:24px;">${grade}</p>
        <div style="display:flex;justify-content:center;gap:32px;margin-bottom:32px;">
          <div style="text-align:center;">
            <div style="font-family:'Poppins',sans-serif;font-size:36px;font-weight:800;color:white;">${quizState.score}/${total}</div>
            <div style="font-size:12px;color:#8892b0;">Bonnes réponses</div>
          </div>
          <div style="text-align:center;">
            <div style="font-family:'Poppins',sans-serif;font-size:36px;font-weight:800;color:#00d68f;">+${totalXP}</div>
            <div style="font-size:12px;color:#8892b0;">XP gagnés</div>
          </div>
          <div style="text-align:center;">
            <div style="font-family:'Poppins',sans-serif;font-size:36px;font-weight:800;color:#ffb547;">${pct}%</div>
            <div style="font-size:12px;color:#8892b0;">Score</div>
          </div>
        </div>
        ${bonus > 0 ? `<p style="font-size:14px;color:#ffb547;margin-bottom:24px;">🎯 Bonus parfait : +${bonus} XP</p>` : ''}
        <div style="display:flex;justify-content:center;gap:12px;">
          <button onclick="MiniGames.renderQuizSelector('${containerId}')" style="padding:12px 24px;background:linear-gradient(135deg,#1E5BFF,#00C4FF);color:white;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;">Rejouer</button>
          <button onclick="MiniGames.renderMenu('${containerId}')" style="padding:12px 24px;background:#13151e;border:1px solid #1c2035;color:#8892b0;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;">Retour</button>
        </div>
      </div>
    `;
  }

  /* ===== MATCHING GAME ===== */
  const MATCH_PAIRS = [
    { pairs: [
      { term: 'SEO', def: 'Optimisation moteur recherche' },
      { term: 'CTR', def: 'Taux de clic' },
      { term: 'ROI', def: 'Retour sur investissement' },
      { term: 'B2B', def: 'Business to Business' },
      { term: 'UX', def: 'Expérience utilisateur' },
    ]},
    { pairs: [
      { term: 'HTML', def: 'Balises de structure' },
      { term: 'CSS', def: 'Styles et mise en page' },
      { term: 'JavaScript', def: 'Interactivité et logique' },
      { term: 'API', def: 'Interface de communication' },
      { term: 'SQL', def: 'Langage de requêtes' },
    ]},
  ];

  let matchState = {};

  function renderMatchSelector(containerId) {
    const c = document.getElementById(containerId);
    if (!c) return;
    c.innerHTML = MATCH_PAIRS.map((m, i) => `
      <div class="match-card" data-match="${i}" style="background:#13151e;border:1px solid #1c2035;border-radius:14px;padding:20px;cursor:pointer;transition:all .2s ease;">
        <div style="font-size:32px;margin-bottom:12px;">🔗</div>
        <h4 style="font-size:15px;font-weight:700;color:white;margin-bottom:6px;">Association ${i + 1}</h4>
        <p style="font-size:12px;color:#8892b0;">${m.pairs.length} paires • +${m.pairs.length * XP.match} XP max</p>
      </div>
    `).join('');
    c.querySelectorAll('.match-card').forEach(card => {
      card.addEventListener('click', () => startMatch(parseInt(card.dataset.match), containerId));
      card.addEventListener('mouseenter', () => { card.style.borderColor = '#232840'; card.style.transform = 'translateY(-2px)'; });
      card.addEventListener('mouseleave', () => { card.style.borderColor = '#1c2035'; card.style.transform = 'none'; });
    });
  }

  function startMatch(index, containerId) {
    const data = MATCH_PAIRS[index];
    const terms = data.pairs.map(p => ({ text: p.term, pairId: p.term, type: 'term' }));
    const defs = data.pairs.map(p => ({ text: p.def, pairId: p.term, type: 'def' }));
    const allCards = [...shuffle(terms), ...shuffle(defs)];

    matchState = { cards: allCards, selected: null, matched: [], startTime: Date.now(), attempts: 0, matchIndex: index, totalPairs: data.pairs.length };

    const c = document.getElementById(containerId);
    c.innerHTML = `
      <div style="text-align:center;margin-bottom:24px;">
        <h3 style="font-family:'Poppins',sans-serif;font-size:20px;color:white;">🔗 Associez les termes</h3>
        <p style="font-size:13px;color:#8892b0;" id="matchInfo">Cliquez sur un terme puis sa définition</p>
      </div>
      <div id="matchGrid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;"></div>
    `;
    renderMatchCards(containerId);
  }

  function renderMatchCards(containerId) {
    const grid = document.getElementById('matchGrid');
    grid.innerHTML = matchState.cards.map((card, i) => {
      const isMatched = matchState.matched.includes(card.pairId);
      const isSelected = matchState.selected === i;
      let bg = '#0B1331', border = '#232840', color = '#e8eaf6';
      if (isMatched) { bg = 'rgba(0,214,143,0.1)'; border = '#00d68f'; color = '#00d68f'; }
      else if (isSelected) { bg = 'rgba(30,91,255,0.1)'; border = '#1E5BFF'; color = '#00C4FF'; }
      return `<div class="match-card-item" data-idx="${i}" style="background:${bg};border:1px solid ${border};border-radius:10px;padding:16px 12px;text-align:center;cursor:${isMatched ? 'default' : 'pointer'};transition:all .15s ease;opacity:${isMatched ? 0.5 : 1};">
        <span style="font-size:13px;font-weight:600;color:${color};line-height:1.4;">${card.text}</span>
      </div>`;
    }).join('');

    grid.querySelectorAll('.match-card-item').forEach(item => {
      item.addEventListener('click', () => selectMatchCard(parseInt(item.dataset.idx), containerId));
      item.addEventListener('mouseenter', () => { if (!matchState.matched.includes(matchState.cards[parseInt(item.dataset.idx)]?.pairId)) item.style.borderColor = '#1E5BFF'; });
      item.addEventListener('mouseleave', () => { if (matchState.selected !== parseInt(item.dataset.idx)) item.style.borderColor = '#232840'; });
    });
  }

  function selectMatchCard(index, containerId) {
    const card = matchState.cards[index];
    if (matchState.matched.includes(card.pairId)) return;
    if (matchState.selected === null) {
      matchState.selected = index;
    } else {
      const first = matchState.cards[matchState.selected];
      matchState.attempts++;
      if (first.pairId === card.pairId && first.type !== card.type) {
        matchState.matched.push(card.pairId);
        matchState.selected = null;
        addXP(XP.match, 'Paire trouvée');

        if (matchState.matched.length === matchState.totalPairs) {
          setTimeout(() => endMatch(containerId), 600);
        }
      } else {
        matchState.selected = null;
      }
    }
    renderMatchCards(containerId);
    document.getElementById('matchInfo').textContent = `${matchState.matched.length}/${matchState.totalPairs} paires • ${matchState.attempts} tentatives`;
  }

  function endMatch(containerId) {
    const total = matchState.totalPairs;
    const perfect = matchState.attempts === total;
    if (perfect) addXP(50, 'Parfait sans erreur');

    document.getElementById(containerId).innerHTML = `
      <div style="text-align:center;padding:40px 20px;">
        <div style="font-size:64px;margin-bottom:16px;">${perfect ? '🏆' : '✨'}</div>
        <h3 style="font-family:'Poppins',sans-serif;font-size:28px;font-weight:800;color:white;margin-bottom:8px;">Terminé !</h3>
        <p style="font-size:16px;color:#8892b0;margin-bottom:24px;">${perfect ? 'Parfait ! Aucune erreur !' : `${matchState.attempts} tentatives pour ${total} paires`}</p>
        <div style="display:flex;justify-content:center;gap:32px;margin-bottom:32px;">
          <div style="text-align:center;">
            <div style="font-family:'Poppins',sans-serif;font-size:36px;font-weight:800;color:white;">${total}</div>
            <div style="font-size:12px;color:#8892b0;">Paires</div>
          </div>
          <div style="text-align:center;">
            <div style="font-family:'Poppins',sans-serif;font-size:36px;font-weight:800;color:#00d68f;">+${total * XP.match + (perfect ? 50 : 0)}</div>
            <div style="font-size:12px;color:#8892b0;">XP gagnés</div>
          </div>
        </div>
        <div style="display:flex;justify-content:center;gap:12px;">
          <button onclick="MiniGames.renderMatchSelector('${containerId}')" style="padding:12px 24px;background:linear-gradient(135deg,#1E5BFF,#00C4FF);color:white;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;">Rejouer</button>
          <button onclick="MiniGames.renderMenu('${containerId}')" style="padding:12px 24px;background:#13151e;border:1px solid #1c2035;color:#8892b0;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;">Retour</button>
        </div>
      </div>
    `;
  }

  /* ===== WORD GAME (Guess the word) ===== */
  const WORDS = [
    { word: 'ALGORITHME', hint: 'Suite d\'étapes pour résoudre un problème', category: 'Informatique' },
    { word: 'FONNEL', hint: 'Parcours client vers la conversion', category: 'Marketing' },
    { word: 'DATABASE', hint: 'Stockage structuré de données', category: 'Informatique' },
    { word: 'REFERENCEMENT', hint: 'Visibilité sur les moteurs de recherche', category: 'Marketing' },
    { word: 'JAVASCRIPT', hint: 'Langage de programmation web', category: 'Informatique' },
    { word: 'COMMUNITY', hint: 'Gestion de la communauté en ligne', category: 'Marketing' },
    { word: 'HOSTING', hint: 'Hébergement de site web', category: 'Informatique' },
    { word: 'CONVERSION', hint: 'Transformer un visiteur en client', category: 'Marketing' },
    { word: 'PYTHON', hint: 'Langage polyvalent et populaire', category: 'Informatique' },
    { word: 'ANALYTICS', hint: 'Mesure et analyse des données', category: 'Marketing' },
  ];

  let wordState = {};

  function startWordGame(containerId) {
    const w = WORDS[Math.floor(Math.random() * WORDS.length)];
    const revealed = Array(w.word.length).fill(false);
    const letters = w.word.split('');
    const usedLetters = [];

    wordState = { word: w.word, hint: w.hint, category: w.category, letters, revealed, usedLetters, mistakes: 0, maxMistakes: 6, startTime: Date.now() };

    const c = document.getElementById(containerId);
    c.innerHTML = `
      <div style="text-align:center;margin-bottom:24px;">
        <h3 style="font-family:'Poppins',sans-serif;font-size:20px;color:white;">🔤 Devinez le mot</h3>
        <p style="font-size:13px;color:#8892b0;">Catégorie: <strong style="color:#00C4FF;">${w.category}</strong></p>
      </div>
      <div style="text-align:center;margin-bottom:24px;">
        <p style="font-size:14px;color:#ffb547;margin-bottom:12px;">💡 ${w.hint}</p>
        <div id="wordDisplay" style="display:flex;justify-content:center;gap:8px;margin-bottom:16px;"></div>
        <p style="font-size:12px;color:#8892b0;" id="wordInfo">Erreurs: 0/${wordState.maxMistakes}</p>
      </div>
      <div id="letterGrid" style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-bottom:24px;"></div>
      <div id="wordActions" style="text-align:center;"></div>
    `;
    renderWordState(containerId);
  }

  function renderWordState(containerId) {
    const display = document.getElementById('wordDisplay');
    display.innerHTML = wordState.letters.map((l, i) => {
      const show = wordState.revealed[i];
      return `<div style="width:40px;height:48px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:'Poppins',sans-serif;font-size:20px;font-weight:800;${show ? 'background:rgba(0,214,143,0.1);border:1px solid #00d68f;color:#00d68f;' : 'background:#13151e;border:1px solid #232840;color:#232840;'}">${show ? l : '·'}</div>`;
    }).join('');

    const grid = document.getElementById('letterGrid');
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    grid.innerHTML = alphabet.split('').map(l => {
      const used = wordState.usedLetters.includes(l);
      const inWord = wordState.letters.includes(l) && wordState.revealed[wordState.letters.indexOf(l)];
      return `<button class="letter-btn" data-letter="${l}" style="width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;${used ? (inWord ? 'background:rgba(0,214,143,0.15);color:#00d68f;border:1px solid #00d68f;' : 'background:#1c2035;color:#3d4466;border:1px solid #232840;cursor:default;') : 'background:#0B1331;color:#e8eaf6;border:1px solid #232840;cursor:pointer;transition:all .15s ease;'}">${l}</button>`;
    }).join('');

    grid.querySelectorAll('.letter-btn:not([style*="cursor:default"])').forEach(btn => {
      btn.addEventListener('click', () => guessLetter(btn.dataset.letter, containerId));
      btn.addEventListener('mouseenter', () => { btn.style.borderColor = '#1E5BFF'; btn.style.background = '#161a26'; });
      btn.addEventListener('mouseleave', () => { btn.style.borderColor = '#232840'; btn.style.background = '#0B1331'; });
    });

    document.getElementById('wordInfo').textContent = `Erreurs: ${wordState.mistakes}/${wordState.maxMistakes}`;

    if (wordState.revealed.every(r => r)) {
      endWordGame(containerId, true);
    } else if (wordState.mistakes >= wordState.maxMistakes) {
      endWordGame(containerId, false);
    }
  }

  function guessLetter(letter, containerId) {
    if (wordState.usedLetters.includes(letter)) return;
    wordState.usedLetters.push(letter);

    const indices = [];
    wordState.letters.forEach((l, i) => { if (l === letter) indices.push(i); });

    if (indices.length > 0) {
      indices.forEach(i => wordState.revealed[i] = true);
      // XP is awarded at end of game, not per letter
    } else {
      wordState.mistakes++;
    }
    renderWordState(containerId);
  }

  function endWordGame(containerId, won) {
    // Award XP only at end: per-letter XP + bonus for winning
    const letterXP = won ? XP.word * wordState.letters.length : XP.word * (wordState.letters.filter((l, i) => wordState.revealed[i]).length);
    if (letterXP > 0) addXP(letterXP, won ? `Mot deviné : ${wordState.word}` : 'Lettres trouvées');

    document.getElementById(containerId).innerHTML = `
      <div style="text-align:center;padding:40px 20px;">
        <div style="font-size:64px;margin-bottom:16px;">${won ? '🎉' : '😅'}</div>
        <h3 style="font-family:'Poppins',sans-serif;font-size:28px;font-weight:800;color:white;margin-bottom:8px;">${won ? 'Bravo !' : 'Perdu !'}</h3>
        <p style="font-size:18px;color:#00C4FF;margin-bottom:4px;font-weight:700;">${wordState.word}</p>
        <p style="font-size:14px;color:#8892b0;margin-bottom:24px;">${won ? `+${letterXP} XP gagnés` : 'Réessayez pour gagner des XP !'}</p>
        <div style="display:flex;justify-content:center;gap:12px;">
          <button onclick="MiniGames.startWordGame('${containerId}')" style="padding:12px 24px;background:linear-gradient(135deg,#1E5BFF,#00C4FF);color:white;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;">Rejouer</button>
          <button onclick="MiniGames.renderMenu('${containerId}')" style="padding:12px 24px;background:#13151e;border:1px solid #1c2035;color:#8892b0;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;">Retour</button>
        </div>
      </div>
    `;
  }

  /* ===== MENU ===== */
  function renderMenu(containerId) {
    const c = document.getElementById(containerId);
    if (!c) return;
    checkStreak();
    c.innerHTML = `
      <div style="text-align:center;margin-bottom:32px;">
        <h3 style="font-family:'Poppins',sans-serif;font-size:24px;font-weight:800;color:white;margin-bottom:8px;">🎮 Mini-Jeux</h3>
        <p style="font-size:14px;color:#8892b0;">Jouez pour gagner des XP et monter de niveau</p>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;" id="gamesGrid"></div>
    `;
    const grid = document.getElementById('gamesGrid');
    const games = [
      { icon: '❓', title: 'Quiz', desc: 'Testez vos connaissances', action: `MiniGames.renderQuizSelector('${containerId}')`, xp: '+25 XP/question' },
      { icon: '🔗', title: 'Association', desc: 'Reliez termes et définitions', action: `MiniGames.renderMatchSelector('${containerId}')`, xp: '+30 XP/paire' },
      { icon: '🔤', title: 'Mot Mystère', desc: 'Devinez le mot caché', action: `MiniGames.startWordGame('${containerId}')`, xp: '+40 XP/lettre' },
    ];
    grid.innerHTML = games.map(g => `
      <div class="game-card" style="background:#13151e;border:1px solid #1c2035;border-radius:16px;padding:28px 20px;text-align:center;cursor:pointer;transition:all .2s ease;">
        <div style="font-size:48px;margin-bottom:16px;">${g.icon}</div>
        <h4 style="font-size:16px;font-weight:700;color:white;margin-bottom:6px;">${g.title}</h4>
        <p style="font-size:13px;color:#8892b0;margin-bottom:12px;">${g.desc}</p>
        <span style="font-size:12px;color:#00d68f;font-weight:600;">${g.xp}</span>
      </div>
    `).join('');

    grid.querySelectorAll('.game-card').forEach((card, i) => {
      card.addEventListener('click', () => {
        if (i === 0) MiniGames.renderQuizSelector(containerId);
        else if (i === 1) MiniGames.renderMatchSelector(containerId);
        else if (i === 2) MiniGames.startWordGame(containerId);
      });
      card.addEventListener('mouseenter', () => { card.style.borderColor = '#232840'; card.style.transform = 'translateY(-4px)'; });
      card.addEventListener('mouseleave', () => { card.style.borderColor = '#1c2035'; card.style.transform = 'none'; });
    });
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  return {
    getXP, getLevel, getLevelName, getLevelIcon, getXPToNext, getXPProgress, addXP, checkStreak,
    renderMenu, renderQuizSelector, renderMatchSelector, startWordGame, startQuiz
  };
})();
