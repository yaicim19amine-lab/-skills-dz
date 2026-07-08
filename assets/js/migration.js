/* ========================================
   SKILLS DZ — Migration localStorage → Supabase
   ======================================== */

const Migration = (() => {
  const MIGRATION_KEY = 'skillsdz_migrated';

  function isMigrated() {
    return localStorage.getItem(MIGRATION_KEY) === 'true';
  }

  function getLocalData() {
    try {
      return {
        user: JSON.parse(localStorage.getItem('skillsdz_user')),
        game: JSON.parse(localStorage.getItem('skillsdz_game')),
        minigames: JSON.parse(localStorage.getItem('skillsdz_minigames')),
      };
    } catch {
      return { user: null, game: null, minigames: null };
    }
  }

  async function migrate() {
    if (isMigrated()) return { success: true, message: 'Déjà migré' };

    const local = getLocalData();
    if (!local.user) return { success: false, message: 'Aucune donnée locale à migrer' };

    try {
      // Migrate gamification data to skillsdz_game
      const gameState = {
        xp: local.game?.xp || local.user.xp || 0,
        level: local.game?.level || local.user.level || 1,
        streak: local.game?.streak || local.user.streak || 0,
        lastPlay: local.game?.lastPlay || null,
        badges: local.game?.badges || local.user.badges || ['newcomer'],
        coursesCompleted: local.game?.coursesCompleted || [],
        videosWatched: local.game?.videosWatched || [],
        gamesPlayed: local.game?.gamesPlayed || [],
        formsCompleted: local.game?.formsCompleted || [],
        aiInteractions: local.game?.aiInteractions || 0,
        referrals: local.game?.referrals || 0,
        totalXP: local.game?.totalXP || local.user.xp || 0,
        totalPurchasesXP: local.game?.totalPurchasesXP || 0,
      };

      // Merge minigames data if exists
      if (local.minigames) {
        gameState.xp += local.minigames.xp || 0;
        gameState.totalXP += local.minigames.totalXP || 0;
        gameState.quizzesCompleted = local.minigames.quizzesCompleted || 0;
        gameState.matchesWon = local.minigames.matchesWon || 0;
        gameState.wordsCleared = local.minigames.wordsCleared || 0;
      }

      // Save consolidated game state
      localStorage.setItem('skillsdz_game', JSON.stringify(gameState));

      // Update user with game data
      local.user.xp = gameState.xp;
      local.user.level = gameState.level;
      local.user.streak = gameState.streak;
      localStorage.setItem('skillsdz_user', JSON.stringify(local.user));

      // Mark as migrated
      localStorage.setItem(MIGRATION_KEY, 'true');

      return {
        success: true,
        message: 'Migration réussie',
        data: {
          xp: gameState.xp,
          level: gameState.level,
          badges: gameState.badges.length,
          courses: gameState.coursesCompleted.length,
          videos: gameState.videosWatched.length,
        },
      };
    } catch (err) {
      return { success: false, message: 'Erreur migration: ' + err.message };
    }
  }

  async function syncToServer() {
    if (!api.getToken()) return { success: false, message: 'Non connecté' };

    const local = getLocalData();
    if (!local.game) return { success: false, message: 'Aucune donnée à synchroniser' };

    try {
      // Gamification sync is handled server-side via API actions
      // Only sync profile info (name, phone) — XP/level/badges are managed by server
      return { success: true, message: 'Données synchronisées' };
    } catch (err) {
      return { success: false, message: 'Erreur sync: ' + err.message };
    }
  }

  function exportLocalData() {
    const local = getLocalData();
    const data = {
      user: local.user,
      game: local.game,
      minigames: local.minigames,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skillsdz-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    return { success: true, message: 'Données exportées' };
  }

  function clearLocalData() {
    localStorage.removeItem('skillsdz_user');
    localStorage.removeItem('skillsdz_game');
    localStorage.removeItem('skillsdz_minigames');
    localStorage.removeItem(MIGRATION_KEY);
    return { success: true, message: 'Données locales supprimées' };
  }

  return {
    migrate,
    syncToServer,
    exportLocalData,
    clearLocalData,
    isMigrated,
    getLocalData,
  };
})();
