const Auth = (() => {
  function getUser() {
    try {
      return JSON.parse(localStorage.getItem('skillsdz_user'));
    } catch {
      return null;
    }
  }

  function setUser(user) {
    localStorage.setItem('skillsdz_user', JSON.stringify(user));
  }

  function clearUser() {
    localStorage.removeItem('skillsdz_user');
    localStorage.removeItem('skillsdz_token');
    localStorage.removeItem('skillsdz_game');
    localStorage.removeItem('skillsdz_minigames');
  }

  function isLoggedIn() {
    return !!getUser() && !!localStorage.getItem('skillsdz_token');
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
