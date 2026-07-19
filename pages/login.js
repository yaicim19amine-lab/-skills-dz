/* Login page — externalized for CSP */
document.addEventListener('DOMContentLoaded', function() {
  lucide.createIcons();

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (Auth.isLoggedIn()) { window.location.href = 'dashboard.html'; }

  // Panda speech
  var speeches = ["Salut !", "On apprend ?", "Prêt ?", "Niveau up !", "Tu peux !"];
  var speechIdx = 0;
  if (!reduceMotion) {
    setInterval(function() {
      var bubble = document.querySelector('.panda-speech');
      if (bubble) {
        bubble.style.opacity = '0';
        bubble.style.transform = 'translateY(6px)';
        setTimeout(function() {
          speechIdx = (speechIdx + 1) % speeches.length;
          bubble.textContent = speeches[speechIdx];
          bubble.style.opacity = '1';
          bubble.style.transform = 'translateY(0)';
        }, 250);
      }
    }, 3500);
  }

  // Toggle password
  window.togglePassword = function(btn) {
    var input = btn.previousElementSibling;
    var icon = btn.querySelector('i');
    if (input.type === 'password') { input.type = 'text'; icon.setAttribute('data-lucide', 'eye-off'); }
    else { input.type = 'password'; icon.setAttribute('data-lucide', 'eye'); }
    lucide.createIcons();
  };

  // Google Login
  window.handleGoogleLogin = function() {
    var btn = document.getElementById('googleLoginBtn');
    btn.querySelector('.google-text').textContent = 'Ouverture Google...';
    btn.disabled = true;
    try {
      google.accounts.id.initialize({
        client_id: window.GOOGLE_CLIENT_ID || '',
        callback: handleGoogleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      google.accounts.id.prompt();
    } catch (e) {
      btn.querySelector('.google-text').textContent = 'Continuer avec Google';
      btn.disabled = false;
      if (!window.GOOGLE_CLIENT_ID) {
        alert('Google OAuth non configuré.\n\nPour activer :\n1. Allez sur console.cloud.google.com\n2. Créez un projet OAuth\n3. Ajoutez le Client ID dans config.js');
      }
    }
  };

  async function handleGoogleCredential(response) {
    var btn = document.getElementById('googleLoginBtn');
    btn.querySelector('.google-text').textContent = 'Connexion...';
    try {
      var data = await api.googleAuth({ credential: response.credential });
      api.setToken(data.token);
      Auth.setUser(data.user);
      window.location.href = 'dashboard.html';
    } catch (err) {
      alert('Erreur: ' + err.message);
      btn.querySelector('.google-text').textContent = 'Continuer avec Google';
      btn.disabled = false;
    }
  }

  // Email/Password Login
  document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    var email = document.getElementById('email').value;
    var password = document.getElementById('password').value;
    var remember = document.getElementById('rememberMe')?.checked;
    if (!email || !password) { alert('Veuillez remplir tous les champs'); return; }
    if (remember) { localStorage.setItem('skillsdz_remember_email', email); }
    else { localStorage.removeItem('skillsdz_remember_email'); }
    var submitBtn = this.querySelector('button[type="submit"]');
    submitBtn.innerHTML = '<span>Connexion en cours...</span>';
    submitBtn.disabled = true;
    try {
      await Auth.login(email, password);
      window.location.href = 'dashboard.html';
    } catch (err) {
      alert('Erreur: ' + err.message);
      submitBtn.innerHTML = '<i data-lucide="log-in"></i> Se connecter';
      submitBtn.disabled = false;
      lucide.createIcons();
    }
  });

  // Restore remembered email
  var rememberedEmail = localStorage.getItem('skillsdz_remember_email');
  if (rememberedEmail) {
    document.getElementById('email').value = rememberedEmail;
    document.getElementById('rememberMe').checked = true;
  }

  // Forgot password modal
  window.openForgotModal = function(e) { e.preventDefault(); document.getElementById('forgotModal').style.display = 'flex'; };
  window.closeForgotModal = function() {
    document.getElementById('forgotModal').style.display = 'none';
    document.getElementById('forgotSuccess').style.display = 'none';
    document.getElementById('forgotForm').style.display = 'block';
  };
  document.getElementById('forgotForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    var email = document.getElementById('forgotEmail').value;
    if (!email) return;
    try { await api.post('/auth?action=forgot-password', { email }); } catch {}
    document.getElementById('forgotForm').style.display = 'none';
    document.getElementById('forgotSuccess').style.display = 'block';
  });
});
