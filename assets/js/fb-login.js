/* Facebook Login — externalized for CSP */
function initFacebookLogin() {
  if (!window.FB_APP_ID || typeof FB === 'undefined') return;

  FB.init({ appId: window.FB_APP_ID, cookie: true, xfbml: false, version: 'v19.0' });
}

function loadFacebookSdk() {
  if (!window.FB_APP_ID || document.getElementById('facebook-jssdk')) return;

  window.fbAsyncInit = initFacebookLogin;

  var script = document.createElement('script');
  script.id = 'facebook-jssdk';
  script.async = true;
  script.defer = true;
  script.crossOrigin = 'anonymous';
  script.src = 'https://connect.facebook.net/fr_FR/sdk.js';
  document.head.appendChild(script);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadFacebookSdk);
} else {
  loadFacebookSdk();
}

function handleFacebookLogin() {
  if (typeof FB === 'undefined') return;

  FB.login(function(response) {
    if (!response.authResponse || !response.authResponse.accessToken) return;

    FB.api('/me', { fields: 'first_name,last_name,email' }, function(profile) {
      const payload = {
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        email: profile.email || '',
        accessToken: response.authResponse.accessToken
      };

      fetch('/api/auth?action=facebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(r => r.json())
      .then(data => {
        if (data.error) { alert(data.error); return; }
        if (data.token && data.user) {
          if (typeof Auth !== 'undefined') {
            Auth.setUser(data.user);
            Auth.setToken(data.token);
          }
          window.location.href = 'dashboard.html';
        }
      })
      .catch(() => alert('Erreur de connexion. Réessayez.'));
    });
  }, { scope: 'public_profile,email' });
}
