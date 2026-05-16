const GOOGLE_REVIEWS_URL = (typeof CONFIG !== 'undefined') ? CONFIG.GOOGLE_REVIEWS_URL : '#';

const stars = document.querySelectorAll('.star');
const hint  = document.getElementById('stars-hint');

// Index 0 volontairement vide pour que labels[1..5] correspondent aux valeurs des étoiles
const labels = ['', 'Très mauvais', 'Décevant', 'Correct', 'Bien', 'Excellent !'];

stars.forEach(star => {
  const value = parseInt(star.dataset.value, 10);

  star.addEventListener('mouseenter', () => {
    highlight(value);
    hint.textContent = labels[value];
  });

  star.addEventListener('mouseleave', () => {
    highlight(0); // 0 = aucune étoile colorée
    hint.textContent = 'Appuyez sur une étoile pour donner votre note';
  });

  star.addEventListener('click', () => choose(value));

  // Accessibilité clavier : les étoiles sont des role="button"
  star.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(value);
    }
  });
});

// Colorie toutes les étoiles jusqu'à upTo (effet de survol progressif)
function highlight(upTo) {
  stars.forEach(s => {
    const v = parseInt(s.dataset.value, 10);
    s.classList.toggle('hovered', v <= upTo);
  });
}

// Stratégie de filtrage : 5★ → avis public Google, 1-4★ → formulaire interne
function choose(value) {
  if (value === 5) {
    window.location.href = GOOGLE_REVIEWS_URL;
  } else {
    window.location.href = 'feedback.html?stars=' + value;
  }
}
