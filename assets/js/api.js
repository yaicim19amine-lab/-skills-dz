const API_BASE = '/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('skillsdz_token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('skillsdz_token', token);
    } else {
      localStorage.removeItem('skillsdz_token');
    }
  }

  getToken() {
    return this.token || localStorage.getItem('skillsdz_token');
  }

  async request(path, options = {}) {
    const url = `${API_BASE}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur serveur');
      }

      return data;
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        throw new Error('Erreur de connexion. Vérifiez votre connexion internet.');
      }
      throw err;
    }
  }

  get(path) {
    return this.request(path, { method: 'GET' });
  }

  post(path, body) {
    return this.request(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  put(path, body) {
    return this.request(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  delete(path) {
    return this.request(path, { method: 'DELETE' });
  }

  // Auth
  signup(data) { return this.post('/auth?action=signup', data); }
  login(data) { return this.post('/auth?action=login', data); }
  googleAuth(data) { return this.post('/auth?action=google', data); }
  getMe() { return this.get('/auth?action=me'); }

  // Profile
  updateProfile(data) { return this.put('/profile', data); }

  // Formations
  getFormations() { return this.get('/formations'); }
  enrollFormation(formationId) { return this.post('/formations', { formationId }); }

  // Videos
  getVideos(category) { return this.get(`/videos${category ? `?category=${category}` : ''}`); }
  watchVideo(videoId) { return this.post('/videos', { videoId }); }

  // Referrals
  validateReferral(code) { return this.post('/referrals', { code }); }

  // AI
  chat(agentId, message, history) { return this.post('/ai/chat', { agentId, message, history }); }

  // Shop
  getShopItems(category) { return this.get(`/shop${category ? `?category=${category}` : ''}`); }
  purchaseItem(itemId) { return this.post('/shop', { itemId }); }

  // Payments
  getPayments() { return this.get('/payments'); }
  createPayment(data) { return this.post('/payments', data); }

  // Live
  getLiveSessions() { return this.get('/live'); }

  // Admin
  getAdminData() { return this.get('/admin'); }
  updateUser(data) { return this.put('/admin', data); }
}

const api = new ApiClient();
