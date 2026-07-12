/* Lead Modal — externalized for CSP */
var _leadFormation = '';

function openLeadModal(formation) {
  _leadFormation = formation || '';
  document.getElementById('leadFormationName').textContent = 'Formation : ' + _leadFormation;
  document.getElementById('leadModal').style.display = 'flex';
  document.getElementById('leadForm').reset();
  document.getElementById('leadForm').style.display = 'flex';
  document.getElementById('leadSuccess').style.display = 'none';
}

function closeLeadModal() {
  document.getElementById('leadModal').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function() {
  var form = document.getElementById('leadForm');
  if (!form) return;

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    var name = document.getElementById('leadName').value;
    var email = document.getElementById('leadEmail').value;
    var phone = document.getElementById('leadPhone').value;
    if (!name || !email || !phone) return;

    var btn = form.querySelector('button[type="submit"]');
    btn.textContent = 'Envoi en cours...';
    btn.disabled = true;

    fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, email: email, phone: phone, formation: _leadFormation })
    }).then(function(r) { return r.json(); }).then(function() {
      form.style.display = 'none';
      document.getElementById('leadSuccess').style.display = 'block';
      if (typeof fbq !== 'undefined') fbq('track', 'Lead', { content_name: _leadFormation });
    }).catch(function() {
      btn.textContent = 'Envoyer ma demande';
      btn.disabled = false;
      alert('Erreur. Réessayez ou contactez-nous directement.');
    });
  });
});
