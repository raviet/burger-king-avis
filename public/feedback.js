const WEB3FORMS_KEY = (typeof CONFIG !== 'undefined') ? CONFIG.WEB3FORMS_KEY : '';

function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

if (new URLSearchParams(window.location.search).has('reset')) {
  localStorage.removeItem('bk_last_submit');
}

const clientId = localStorage.getItem('bk_client_id') || (() => {
  const id = generateId();
  localStorage.setItem('bk_client_id', id);
  return id;
})();

const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const lastSubmit  = parseInt(localStorage.getItem('bk_last_submit') || '0', 10);
const onCooldown  = Date.now() - lastSubmit < COOLDOWN_MS;

if (onCooldown) {
  document.getElementById('form-section').style.display    = 'none';
  document.getElementById('already-section').style.display = 'flex';
}

firebase.initializeApp({
  apiKey:            'AIzaSyBcHaY5Zdy6pLqq1PxYcMSMr-NqCOCvhj4',
  authDomain:        'burger-king-avis.firebaseapp.com',
  projectId:         'burger-king-avis',
  storageBucket:     'burger-king-avis.firebasestorage.app',
  messagingSenderId: '756976293842',
  appId:             '1:756976293842:web:0c9cb6d0094c4cda545a0b',
});
const db = firebase.firestore();

let rouletteEnabled = true;
let emailEnabled = true;
const CONFIG_COL  = (typeof CONFIG !== 'undefined') ? CONFIG.FIRESTORE_COLLECTION : 'config';
const CONFIG_DOC  = (typeof CONFIG !== 'undefined') ? CONFIG.FIRESTORE_CONFIG_DOC : 'settings';
const AVIS_COL    = (typeof CONFIG !== 'undefined') ? CONFIG.AVIS_COLLECTION      : 'avis';
let   avisRef     = null;
const configPromise = db.collection(CONFIG_COL).doc(CONFIG_DOC).get()
  .then(doc => {
    if (doc.exists) {
      const data = doc.data();
      rouletteEnabled = data.roulette_enabled !== false;
      emailEnabled    = data.email_enabled    !== false;
    }
  })
  .catch(() => {});

const params     = new URLSearchParams(window.location.search);
const stars      = Math.max(1, Math.min(4, parseInt(params.get('stars'), 10) || 1));
const starLabels = ['', 'Très mauvais', 'Décevant', 'Correct', 'Bien', 'Excellent !'];

let selectedStars = stars;

const feedbackStars = document.querySelectorAll('#feedback-stars .star');
const feedbackHint  = document.getElementById('feedback-stars-hint');

function highlightFeedbackStars(upTo) {
  feedbackStars.forEach(s => {
    s.classList.toggle('hovered', parseInt(s.dataset.value) <= upTo);
  });
}

function selectFeedbackStars(value) {
  selectedStars = value;
  highlightFeedbackStars(value);
  feedbackHint.textContent = value + '/5 – ' + starLabels[value];
}

feedbackStars.forEach(star => {
  const value = parseInt(star.dataset.value);
  star.addEventListener('mouseenter', () => {
    highlightFeedbackStars(value);
    feedbackHint.textContent = value + '/5 – ' + starLabels[value];
  });
  star.addEventListener('mouseleave', () => {
    highlightFeedbackStars(selectedStars);
    feedbackHint.textContent = selectedStars + '/5 – ' + starLabels[selectedStars];
  });
  star.addEventListener('click', () => selectFeedbackStars(value));
  star.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectFeedbackStars(value); }
  });
});

selectFeedbackStars(stars);

const DEBUG = new URLSearchParams(window.location.search).has('debug');

if (DEBUG) {
  document.getElementById('form-section').style.display     = 'none';
  document.getElementById('roulette-section').style.display = 'flex';
  drawWheel(currentAngle);
}

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
    await configPromise;

    avisRef = await db.collection(AVIS_COL).add({
      stars:     selectedStars,
      message:   message,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      clientId:  clientId,
    });

    localStorage.setItem('bk_last_submit', Date.now());
    db.collection('cooldowns').doc(clientId).set({
      lastSubmit: firebase.firestore.FieldValue.serverTimestamp(),
    }).catch(() => {});

    if (emailEnabled) {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject:    `Avis client BK – ${selectedStars}/5`,
          stars:      selectedStars + '/5',
          message:    message,
          date:       new Date().toLocaleString('fr-FR'),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
    }
    document.getElementById('form-section').style.display = 'none';
    if (rouletteEnabled) {
      document.getElementById('roulette-section').style.display = 'flex';
      drawWheel(currentAngle);
    } else {
      document.getElementById('merci-section').style.display = 'flex';
    }
  } catch (err) {
    console.error('Web3Forms error:', err);
    statusEl.textContent = 'Une erreur est survenue. Veuillez réessayer.';
    statusEl.className   = 'status error';
    submitBtn.disabled   = false;
    submitBtn.textContent = 'Envoyer mon avis';
  }
});

// ─── Roulette ────────────────────────────────────────────────────────────────

const PRIZES = [
  { label: '4 Nuggets',          imgSrc: 'images/nuggets.png',     color: '#D62300', textColor: '#fff'     },
  { label: 'Cheeseburger',       imgSrc: 'images/cheeseburger.png',color: '#FF8732', textColor: '#fff'     },
  { label: 'King Fusion M&M\'s', imgSrc: 'images/king-fusion.png', color: '#502314', textColor: '#fff'     },
  { label: '6 Onion Rings',      imgSrc: 'images/onion-rings.png', color: '#FFAA00', textColor: '#502314'  },
  { label: 'Pâtisserie',         imgSrc: 'images/muffin.png',      color: '#198737', textColor: '#fff'     },
];

// Préchargement des images
PRIZES.forEach(p => {
  p.img = new Image();
  p.img.onload = () => drawWheel(currentAngle);
  p.img.src = p.imgSrc;
});

const bkLogoImg = new Image();
bkLogoImg.onload = () => drawWheel(currentAngle);
bkLogoImg.src = 'images/bk-logo.png';

const wheelCanvas = document.getElementById('wheel');
const spinBtn     = document.getElementById('spin-btn');
// -7π/10 centre le segment 0 sous le pointeur (5 segments × 72°)
let currentAngle  = -Math.PI * 7 / 10;
let isSpinning    = false;

function drawWheel(angle) {
  const ctx   = wheelCanvas.getContext('2d');
  const W     = wheelCanvas.width;
  const H     = wheelCanvas.height;
  const cx    = W / 2;
  const cy    = H / 2;
  const R     = cx - 12;
  const N     = PRIZES.length;
  const slice = (2 * Math.PI) / N;

  ctx.clearRect(0, 0, W, H);

  // Anneau extérieur décoratif BK
  ctx.beginPath();
  ctx.arc(cx, cy, R + 10, 0, 2 * Math.PI);
  ctx.fillStyle = '#D62300';
  ctx.fill();

  // Segments
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
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 2;
    ctx.stroke();

    const ex  = cx + Math.cos(mid) * R * 0.60;
    const ey  = cy + Math.sin(mid) * R * 0.60;
    const img = PRIZES[i].img;
    if (img && img.complete && img.naturalWidth) {
      const size  = R * 0.52;
      const scale = Math.min(size / img.naturalWidth, size / img.naturalHeight);
      const dw    = img.naturalWidth  * scale;
      const dh    = img.naturalHeight * scale;
      ctx.drawImage(img, ex - dw / 2, ey - dh / 2, dw, dh);
    }
  }

  // Gloss : reflet lumineux en haut du disque
  const gloss = ctx.createRadialGradient(cx, cy - R * .28, 0, cx, cy, R);
  gloss.addColorStop(0,   'rgba(255,255,255,.18)');
  gloss.addColorStop(.55, 'rgba(255,255,255,0)');
  gloss.addColorStop(1,   'rgba(0,0,0,.08)');
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, 2 * Math.PI);
  ctx.fillStyle = gloss;
  ctx.fill();

  // Bordure intérieure de l'anneau
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(255,255,255,.8)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Points décoratifs aux jonctions de segments (sur l'anneau BK)
  for (let i = 0; i < N; i++) {
    const a  = angle + i * slice;
    const dx = cx + Math.cos(a) * (R + 5);
    const dy = cy + Math.sin(a) * (R + 5);
    ctx.beginPath();
    ctx.arc(dx, dy, 3.5, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }

  // Hub central : cercle blanc + logo BK clipé
  const hubR = 32;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, hubR, 0, 2 * Math.PI);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.clip();
  if (bkLogoImg && bkLogoImg.complete && bkLogoImg.naturalWidth) {
    const maxS = hubR * 1.4;
    const ratio = bkLogoImg.naturalWidth / bkLogoImg.naturalHeight;
    const dw = ratio >= 1 ? maxS : maxS * ratio;
    const dh = ratio >= 1 ? maxS / ratio : maxS;
    ctx.drawImage(bkLogoImg, cx - dw / 2, cy - dh / 2, dw, dh);
  }
  ctx.restore();
}

// Décélération quartique : démarre vite, ralentit fortement en fin de course
function easeOut(t) {
  return 1 - Math.pow(1 - t, 4);
}

function spin() {
  if (isSpinning) return;
  isSpinning = true;
  spinBtn.style.display = 'none';

  // Le gagnant est tiré AVANT l'animation ; la rotation est calculée pour y amener le pointeur
  const winner     = Math.floor(Math.random() * PRIZES.length);
  const slice      = (2 * Math.PI) / PRIZES.length;
  const extraTurns = (5 + Math.floor(Math.random() * 4)) * 2 * Math.PI; // 5 à 8 tours

  const startAngle = currentAngle;

  // On veut : finalAngle + (winner + 0.5) * slice ≡ -π/2  (pointeur au sommet)
  // Donc     : delta = startAngle - finalAngle
  //          = startAngle + π/2 + (winner + 0.5) * slice
  // La normalisation ramène delta dans ]0, 2π] puis on ajoute les tours supplémentaires
  let delta = startAngle + Math.PI / 2 + (winner + 0.5) * slice;
  delta = ((delta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  if (delta < 0.1) delta += 2 * Math.PI; // évite un micro-déplacement invisible
  delta += extraTurns;

  const finalAngle = startAngle - delta; // rotation horaire = angle décroissant
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

function darkenHex(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r   = Math.max(0, (num >> 16)       - amount);
  const g   = Math.max(0, (num >> 8 & 0xff) - amount);
  const b   = Math.max(0, (num & 0xff)      - amount);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

function showPrize(winner) {
  const prize   = PRIZES[winner];
  const isLight = prize.textColor !== '#fff';

  if (avisRef) {
    avisRef.update({ prize: prize.label }).catch(() => {});
  }

  document.getElementById('prize-emoji').innerHTML = `<img src="${prize.imgSrc}" alt="${prize.label}">`;
  document.getElementById('prize-name').textContent = prize.label;

  document.querySelector('.wheel-wrapper').style.display = 'none';

  const el = document.getElementById('prize-reveal');
  el.style.background = `linear-gradient(145deg, ${prize.color} 0%, ${darkenHex(prize.color, 55)} 100%)`;
  el.style.boxShadow  = `0 8px 32px ${prize.color}66, 0 2px 8px rgba(0,0,0,.15)`;

  el.querySelector('.prize-won-label').style.color      = isLight ? 'rgba(80,35,20,.7)'   : 'rgba(255,255,255,.75)';
  el.querySelector('.prize-name').style.color           = isLight ? '#502314'              : '#FFAA00';
  el.querySelector('.prize-instruction').style.color      = isLight ? 'rgba(80,35,20,.85)'  : 'rgba(255,255,255,.92)';
  el.querySelector('.prize-instruction').style.background = isLight ? 'rgba(0,0,0,.08)'     : 'rgba(255,255,255,.15)';

  el.style.display   = 'flex';
  el.style.animation = 'none';
  requestAnimationFrame(() => {
    el.style.animation = 'prizeReveal 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
  });
  launchConfetti();
}

function launchConfetti() {
  const container = document.getElementById('confetti-container');
  container.innerHTML = '';
  const colors = ['#FFAA00', '#FF8732', '#fff', '#FFCC00', '#ffd966'];
  for (let i = 0; i < 38; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-particle';
    const size = 4 + Math.random() * 6;
    el.style.cssText = [
      `left:${10 + Math.random() * 80}%`,
      `background:${colors[Math.floor(Math.random() * colors.length)]}`,
      `width:${size}px`,
      `height:${size * (Math.random() > .5 ? 1 : 2.5)}px`,
      `border-radius:${Math.random() > .5 ? '50%' : '2px'}`,
      `animation-delay:${(Math.random() * .5).toFixed(2)}s`,
      `animation-duration:${(.9 + Math.random() * .7).toFixed(2)}s`,
    ].join(';');
    container.appendChild(el);
  }
  setTimeout(() => { container.innerHTML = ''; }, 2200);
}

spinBtn.addEventListener('click', spin);
