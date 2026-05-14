// ── À PERSONNALISER ──────────────────────────────────────────────
const GOOGLE_REVIEWS_URL = 'https://www.google.com/maps/place/Burger+King/@48.8203079,2.6217964,15z/data=!4m8!3m7!1s0x47e60fd6c70c054d:0xe65143e7bc07dd47!8m2!3d48.8224029!4d2.6165143!9m1!1b1!16s%2Fg%2F11xmf5xbvs?entry=ttu&g_ep=EgoyMDI2MDUxMi4wIKXMDSoASAFQAw%3D%3D';
// Exemple : 'https://g.page/r/XXXXXXXXXXXXXXXX/review'
// ─────────────────────────────────────────────────────────────────

const stars = document.querySelectorAll('.star');
const hint  = document.getElementById('stars-hint');

const labels = ['', 'Très mauvais', 'Décevant', 'Correct', 'Bien', 'Excellent !'];

stars.forEach(star => {
  const value = parseInt(star.dataset.value, 10);

  star.addEventListener('mouseenter', () => {
    highlight(value);
    hint.textContent = labels[value];
  });

  star.addEventListener('mouseleave', () => {
    highlight(0);
    hint.textContent = 'Appuyez sur une étoile pour donner votre note';
  });

  star.addEventListener('click', () => choose(value));

  star.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(value);
    }
  });
});

function highlight(upTo) {
  stars.forEach(s => {
    const v = parseInt(s.dataset.value, 10);
    s.classList.toggle('hovered', v <= upTo);
  });
}

function choose(value) {
  if (value === 5) {
    window.location.href = GOOGLE_REVIEWS_URL;
  } else {
    window.location.href = 'feedback.html?stars=' + value;
  }
}
