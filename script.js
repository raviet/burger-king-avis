// ── À PERSONNALISER ──────────────────────────────────────────────
const GOOGLE_REVIEWS_URL = 'YOUR_GOOGLE_REVIEWS_URL';
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
