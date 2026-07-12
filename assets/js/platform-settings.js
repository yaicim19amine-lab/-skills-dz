/* ========================================
   SKILLS DZ — Platform Settings Helper
   ======================================== */

const PlatformSettings = (() => {
  const DEFAULTS = {
    notif_new_signups: true,
    notif_pending_payments: true,
    notif_weekly_report: false,
    notif_live_sessions: true,
    appearance_dark_mode: true,
    appearance_reduced_animations: false,
    appearance_compact_mode: false,
    security_2fa: false,
    security_email_only: false,
    security_login_history: true,
    platform_registration_open: true,
    platform_ai_agents: true,
    platform_mini_games: true,
    platform_referral_system: true,
    platform_xp_shop: true,
    gamification_show_badges: true,
    gamification_leaderboard: true,
    gamification_xp_notifications: true,
    gamification_streak: true,
  };

  const LS_KEY = 'skillsdz_platform_settings';
  let _settings = { ...DEFAULTS };

  function load() {
    try {
      const local = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      Object.assign(_settings, DEFAULTS, local);
    } catch { Object.assign(_settings, DEFAULTS); }
    try {
      if (typeof api === 'undefined') return;
      api.get('/admin?action=publicSettings').then(result => {
        if (result?.settings) {
          Object.assign(_settings, DEFAULTS, result.settings);
          localStorage.setItem(LS_KEY, JSON.stringify(_settings));
        }
      }).catch(() => {});
    } catch {}
  }

  function get(key) {
    return _settings[key] ?? DEFAULTS[key] ?? true;
  }

  function getAll() {
    return { ..._settings };
  }

  return { load, get, getAll, DEFAULTS };
})();

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    PlatformSettings.load();
  });
}
