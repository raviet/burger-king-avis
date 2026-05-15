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

    document.getElementById('form-section').style.display       = 'none';
    document.getElementById('roulette-section').style.display   = 'flex';
    drawWheel(currentAngle);
  } catch (err) {
    console.error('Web3Forms error:', err);
    statusEl.textContent = 'Une erreur est survenue. Veuillez réessayer.';
    statusEl.className   = 'status error';
    submitBtn.disabled   = false;
    submitBtn.textContent = 'Envoyer mon avis';
  }
});

// ---- Roulette ----

const PRIZES = [
  { emoji: '🍗', label: '4 Nuggets',     color: '#D62300', textColor: '#fff' },
  { emoji: '🍔', label: 'Cheeseburger',  color: '#F5A623', textColor: '#1A1A1A' },
  { emoji: '🍦', label: 'Sundae',        color: '#1A1A1A', textColor: '#fff' },
  { emoji: '🧅', label: '6 Onion Rings', color: '#502314', textColor: '#fff' },
];

const wheelCanvas = document.getElementById('wheel');
const spinBtn     = document.getElementById('spin-btn');
// Segment 0 centered at top: angle = -π/2 - slice/2
let currentAngle  = -Math.PI * 3 / 4;
let isSpinning    = false;

function drawWheel(angle) {
  const ctx   = wheelCanvas.getContext('2d');
  const W     = wheelCanvas.width;
  const H     = wheelCanvas.height;
  const cx    = W / 2;
  const cy    = H / 2;
  const R     = cx - 6;
  const N     = PRIZES.length;
  const slice = (2 * Math.PI) / N;

  ctx.clearRect(0, 0, W, H);

  for (let i = 0; i < N; i++) {
    const start = angle + i * slice;
    const end   = start + slice;
    const mid   = start + slice / 2;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, start, end);
    ctx.closePath();
    ctx.fillStyle = PRIZES[i].color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();

    const ex = cx + Math.cos(mid) * R * 0.58;
    const ey = cy + Math.sin(mid) * R * 0.58;
    ctx.font = '30px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(PRIZES[i].emoji, ex, ey);
  }

  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, 2 * Math.PI);
  ctx.strokeStyle = '#D62300';
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, 2 * Math.PI);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.strokeStyle = '#D62300';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.font = 'bold 12px Segoe UI, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#D62300';
  ctx.fillText('BK', cx, cy);
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 4);
}

function spin() {
  if (isSpinning) return;
  isSpinning = true;
  spinBtn.style.display = 'none';

  const winner     = Math.floor(Math.random() * PRIZES.length);
  const slice      = (2 * Math.PI) / PRIZES.length;
  const extraTurns = (5 + Math.floor(Math.random() * 4)) * 2 * Math.PI;
  const startAngle = currentAngle;

  // Rotate clockwise so winner ends up under pointer (top = -π/2)
  // Target: finalAngle + (winner + 0.5) * slice = -π/2
  // delta  = startAngle - finalAngle
  let delta = startAngle + Math.PI / 2 + (winner + 0.5) * slice;
  delta = ((delta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  if (delta < 0.1) delta += 2 * Math.PI;
  delta += extraTurns;

  const finalAngle = startAngle - delta;
  const duration   = 5000;
  const startTime  = performance.now();

  function animate(now) {
    const t      = Math.min((now - startTime) / duration, 1);
    currentAngle = startAngle + (finalAngle - startAngle) * easeOut(t);
    drawWheel(currentAngle);
    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      currentAngle = finalAngle;
      isSpinning   = false;
      showPrize(winner);
    }
  }

  requestAnimationFrame(animate);
}

function showPrize(winner) {
  document.getElementById('prize-emoji').textContent = PRIZES[winner].emoji;
  document.getElementById('prize-name').textContent  = PRIZES[winner].label;
  const el = document.getElementById('prize-reveal');
  el.style.display   = 'flex';
  el.style.animation = 'prizeReveal 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
}

spinBtn.addEventListener('click', spin);
