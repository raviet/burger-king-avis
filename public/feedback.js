const WEB3FORMS_KEY = '39c512ae-ad7f-4a07-8b89-474adc23c163';

const params     = new URLSearchParams(window.location.search);
const stars      = Math.max(1, Math.min(4, parseInt(params.get('stars'), 10) || 1));
const starLabels = ['', 'Très mauvais', 'Décevant', 'Correct', 'Bien'];

document.getElementById('stars-display').textContent = '★'.repeat(stars) + '☆'.repeat(5 - stars);
document.getElementById('note-label').textContent    = stars + '/5 – ' + starLabels[stars];

document.getElementById('feedback-form').addEventListener('submit', async e => {
  e.preventDefault();

  const message   = document.getElementById('message').value.trim();
  const statusEl  = document.getElementById('status-msg');
  const submitBtn = document.getElementById('submit-btn');

  if (!message) {
    statusEl.textContent = 'Veuillez écrire un commentaire avant d\'envoyer.';
    statusEl.className   = 'status error';
    return;
  }

  submitBtn.disabled    = true;
  submitBtn.textContent = 'Envoi en cours…';
  statusEl.textContent  = '';
  statusEl.className    = 'status';

  try {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY,
        subject:    `Avis client BK – ${stars}/5`,
        stars:      stars + '/5',
        message:    message,
        date:       new Date().toLocaleString('fr-FR'),
      }),
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    document.getElementById('form-section').style.display = 'none';
    document.getElementById('thank-you').style.display    = 'flex';
  } catch (err) {
    console.error('Web3Forms error:', err);
    statusEl.textContent = 'Une erreur est survenue. Veuillez réessayer.';
    statusEl.className   = 'status error';
    submitBtn.disabled   = false;
    submitBtn.textContent = 'Envoyer mon avis';
  }
});
