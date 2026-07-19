/* Register page — externalized for CSP */
document.addEventListener('DOMContentLoaded', function() {
  lucide.createIcons();

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (Auth.isLoggedIn()) { window.location.href = 'dashboard.html'; }

  // Panda speech
  var speeches = ["Bienvenue !", "Rejoins-nous !", "100 XP offerts !", "C'est gratuit !", "On t'attend !"];
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

  // Google Register
  window.handleGoogleRegister = function() {
    var btn = document.getElementById('googleRegisterBtn');
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
      btn.querySelector('.google-text').textContent = "S'inscrire avec Google";
      btn.disabled = false;
      if (!window.GOOGLE_CLIENT_ID) {
        alert('Google OAuth non configuré.\n\nPour activer :\n1. Allez sur console.cloud.google.com\n2. Créez un projet OAuth\n3. Ajoutez le Client ID dans config.js');
      }
    }
  };

  async function handleGoogleCredential(response) {
    var btn = document.getElementById('googleRegisterBtn');
    btn.querySelector('.google-text').textContent = 'Inscription...';
    try {
      var data = await api.googleAuth({ credential: response.credential });
      api.setToken(data.token);
      Auth.setUser(data.user);
      window.location.href = 'dashboard.html';
    } catch (err) {
      alert('Erreur: ' + err.message);
      btn.querySelector('.google-text').textContent = "S'inscrire avec Google";
      btn.disabled = false;
    }
  }

  // Email/Password Register
  document.getElementById('registerForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    var firstName = document.getElementById('firstName').value;
    var lastName = document.getElementById('lastName').value;
    var email = document.getElementById('email').value;
    var phone = document.getElementById('phone').value;
    var password = document.getElementById('password').value;
    var referralCode = document.getElementById('referralCode').value;
    if (!firstName || !lastName || !email || !phone || !password) { alert('Veuillez remplir tous les champs obligatoires'); return; }
    var submitBtn = this.querySelector('button[type="submit"]');
    submitBtn.innerHTML = '<span>Création en cours...</span>';
    submitBtn.disabled = true;
    try {
      await Auth.signup({ firstName: firstName, lastName: lastName, email: email, phone: phone, password: password, referralCode: referralCode });
      window.location.href = 'dashboard.html';
    } catch (err) {
      alert('Erreur: ' + err.message);
      submitBtn.innerHTML = '<i data-lucide="rocket"></i> Créer mon compte';
      submitBtn.disabled = false;
      lucide.createIcons();
    }
  });
});
