// ── À PERSONNALISER ──────────────────────────────────────────────
const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY';
const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';
// ─────────────────────────────────────────────────────────────────
// Template EmailJS : créez un template avec ces variables :
//   {{stars}}    → note donnée par le client
//   {{message}}  → texte de l'avis
//   {{date}}     → date et heure de l'envoi
// L'email destinataire est à configurer directement dans EmailJS.
// ─────────────────────────────────────────────────────────────────

emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

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

  submitBtn.disabled  = true;
  submitBtn.textContent = 'Envoi en cours…';
  statusEl.textContent  = '';
  statusEl.className    = 'status';

  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      stars:   stars + '/5',
      message: message,
      date:    new Date().toLocaleString('fr-FR'),
    });

    document.getElementById('form-section').style.display = 'none';
    const thankYou = document.getElementById('thank-you');
    thankYou.style.display = 'flex';
  } catch (err) {
    console.error('EmailJS error:', err);
    statusEl.textContent = 'Une erreur est survenue. Veuillez réessayer.';
    statusEl.className   = 'status error';
    submitBtn.disabled   = false;
    submitBtn.textContent = 'Envoyer mon avis';
  }
});
