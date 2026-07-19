/* Panda mascot speech rotation — externalized for CSP */
(function() {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var speeches = [
    "Apprendre, c'est fun !",
    "Mon niveau monte !",
    "On est une équipe !",
    "+50 XP !",
    "Prêt à coder ?",
    "Le savoir, c'est le pouvoir !",
    "N'hésite pas !",
    "On y va ensemble !"
  ];
  var idx = 0;
  var el = document.getElementById('heroPandaSpeech');
  if (!el) return;
  setInterval(function() {
    el.style.opacity = '0';
    el.style.transform = 'translateX(-50%) translateY(6px)';
    setTimeout(function() {
      idx = (idx + 1) % speeches.length;
      el.textContent = speeches[idx];
      el.style.opacity = '1';
      el.style.transform = 'translateX(-50%) translateY(0)';
    }, 280);
  }, 3500);
})();
