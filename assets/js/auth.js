const Auth = (() => {
  const STORAGE_KEY = 'skillsdz_user';
  const TOKEN_KEY = 'skillsdz_token';
  const GAME_KEY = 'skillsdz_game';
  const MINIGAMES_KEY = 'skillsdz_minigames';
  const ENROLLED_KEY = 'skillsdz_enrolled';
  const JOURNAL_KEY = 'skillsdz_journal_ideas';

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch {
      return null;
    }
  }

  function setUser(user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }

  function clearUser() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(GAME_KEY);
    localStorage.removeItem(MINIGAMES_KEY);
    localStorage.removeItem(ENROLLED_KEY);
    localStorage.removeItem(JOURNAL_KEY);
  }

  function isLoggedIn() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || !getUser()) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        clearUser();
        return false;
      }
    } catch {}
    return true;
  }

  function requireAuth() {
    if (!isLoggedIn()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }

  async function login(email, password) {
    const data = await api.login({ email, password });
    api.setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function signup(userData) {
    const data = await api.signup(userData);
    api.setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function googleLogin(googleData) {
    const data = await api.googleAuth(googleData);
    api.setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function refreshUser() {
    if (!isLoggedIn()) return null;
    try {
      const data = await api.getMe();
      setUser(data.user);
      return data.user;
    } catch {
      clearUser();
      return null;
    }
  }

  function logout() {
    clearUser();
    window.location.href = '../index.html';
  }

  return {
    getUser,
    setUser,
    clearUser,
    isLoggedIn,
    requireAuth,
    login,
    signup,
    googleLogin,
    refreshUser,
    logout,
  };
})();
