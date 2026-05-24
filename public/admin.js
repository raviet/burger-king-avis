firebase.initializeApp({
  apiKey:            'AIzaSyBcHaY5Zdy6pLqq1PxYcMSMr-NqCOCvhj4',
  authDomain:        'burger-king-avis.firebaseapp.com',
  projectId:         'burger-king-avis',
  storageBucket:     'burger-king-avis.firebasestorage.app',
  messagingSenderId: '756976293842',
  appId:             '1:756976293842:web:0c9cb6d0094c4cda545a0b',
});

const auth = firebase.auth();
const db   = firebase.firestore();
const CONFIG_COL = (typeof CONFIG !== 'undefined') ? CONFIG.FIRESTORE_COLLECTION : 'config';
const CONFIG_DOC = (typeof CONFIG !== 'undefined') ? CONFIG.FIRESTORE_CONFIG_DOC : 'settings';
const AVIS_COL   = (typeof CONFIG !== 'undefined') ? CONFIG.AVIS_COLLECTION      : 'avis';
const CONFIG_REF = db.collection(CONFIG_COL).doc(CONFIG_DOC);

// ── Auth ──────────────────────────────────────────────────────────────────────

auth.onAuthStateChanged(user => {
  if (user) {
    showDashboard(user);
  } else {
    showLogin();
  }
});

document.getElementById('login-btn').addEventListener('click', async () => {
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const errEl    = document.getElementById('login-error');
  const btn      = document.getElementById('login-btn');

  if (!email || !password) {
    errEl.textContent = 'Veuillez saisir votre email et votre mot de passe.';
    return;
  }

  errEl.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Connexion…';

  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (err) {
    errEl.textContent = messageForError(err.code);
    btn.disabled = false;
    btn.textContent = 'Se connecter';
  }
});

document.getElementById('password').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('login-btn').click();
});

document.getElementById('logout-btn').addEventListener('click', () => auth.signOut());

function messageForError(code) {
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Email ou mot de passe incorrect.';
  }
  if (code === 'auth/too-many-requests') return 'Trop de tentatives. Réessayez plus tard.';
  return 'Erreur de connexion. Vérifiez vos identifiants.';
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

let unsubscribe     = null;
let unsubscribeAvis = null;
let lastAvis        = [];
let lastVisitTs     = 0;

function showLogin() {
  document.getElementById('login-section').style.display    = 'flex';
  document.getElementById('dashboard-section').style.display = 'none';
  document.getElementById('login-btn').disabled = false;
  document.getElementById('login-btn').textContent = 'Se connecter';
  if (unsubscribe)     { unsubscribe();     unsubscribe     = null; }
  if (unsubscribeAvis) { unsubscribeAvis(); unsubscribeAvis = null; }
}

function showDashboard(user) {
  document.getElementById('login-section').style.display    = 'none';
  document.getElementById('dashboard-section').style.display = 'flex';
  document.getElementById('user-info').textContent = user.email;

  lastVisitTs = +(localStorage.getItem('bk_admin_last_visit') || 0);
  localStorage.setItem('bk_admin_last_visit', Date.now());

  try {
    db.collection(AVIS_COL).count().get()
      .then(snap => { document.getElementById('stat-total').textContent = snap.data().count; })
      .catch(() => {});
  } catch (_) {}

  unsubscribeAvis = db.collection(AVIS_COL)
    .orderBy('timestamp', 'desc')
    .limit(500)
    .onSnapshot(snapshot => {
      updateStats(snapshot.docs.map(d => d.data()), lastVisitTs);
    }, () => {
      document.getElementById('stat-total').textContent = '–';
    });

  unsubscribe = CONFIG_REF.onSnapshot(doc => {
    const data = doc.exists ? doc.data() : {};

    const roulette = data.roulette_enabled !== false;
    const rouletteToggle = document.getElementById('roulette-toggle');
    rouletteToggle.checked = roulette;
    updateRouletteUI(roulette);

    const email = data.email_enabled !== false;
    const emailToggle = document.getElementById('email-toggle');
    emailToggle.checked = email;
    updateEmailUI(email);

    const cooldown = data.cooldown_enabled !== false;
    const cooldownToggle = document.getElementById('cooldown-toggle');
    cooldownToggle.checked = cooldown;
    updateCooldownUI(cooldown);
  }, () => {
    document.getElementById('toggle-sub').textContent = 'Erreur de lecture';
    document.getElementById('email-toggle-sub').textContent = 'Erreur de lecture';
    document.getElementById('cooldown-toggle-sub').textContent = 'Erreur de lecture';
  });

}

document.getElementById('roulette-toggle').addEventListener('change', async e => {
  const enabled = e.target.checked;
  updateRouletteUI(enabled);
  try {
    await CONFIG_REF.set({ roulette_enabled: enabled }, { merge: true });
    setStatusLine('Sauvegardé ✓', 2000);
  } catch (err) {
    setStatusLine('Erreur de sauvegarde', 3000);
    e.target.checked = !enabled;
    updateRouletteUI(!enabled);
  }
});

document.getElementById('email-toggle').addEventListener('change', async e => {
  const enabled = e.target.checked;
  updateEmailUI(enabled);
  try {
    await CONFIG_REF.set({ email_enabled: enabled }, { merge: true });
    setStatusLine('Sauvegardé ✓', 2000);
  } catch (err) {
    setStatusLine('Erreur de sauvegarde', 3000);
    e.target.checked = !enabled;
    updateEmailUI(!enabled);
  }
});

function updateRouletteUI(enabled) {
  const sub = document.getElementById('toggle-sub');
  sub.innerHTML = enabled
    ? '<span class="status-dot status-on"></span>Activée – clients reçoivent la roulette'
    : '<span class="status-dot status-off"></span>Désactivée – message de remerciement simple';
}

function updateEmailUI(enabled) {
  const sub = document.getElementById('email-toggle-sub');
  sub.innerHTML = enabled
    ? '<span class="status-dot status-on"></span>Activé – avis reçus par email'
    : '<span class="status-dot status-off"></span>Désactivé – aucun email envoyé';
}

document.getElementById('cooldown-toggle').addEventListener('change', async e => {
  const enabled = e.target.checked;
  updateCooldownUI(enabled);
  try {
    await CONFIG_REF.set({ cooldown_enabled: enabled }, { merge: true });
    setStatusLine('Sauvegardé ✓', 2000);
  } catch (err) {
    setStatusLine('Erreur de sauvegarde', 3000);
    e.target.checked = !enabled;
    updateCooldownUI(!enabled);
  }
});

function updateCooldownUI(enabled) {
  const sub = document.getElementById('cooldown-toggle-sub');
  sub.innerHTML = enabled
    ? '<span class="status-dot status-on"></span>Activé – 1 avis par personne par 24h'
    : '<span class="status-dot status-off"></span>Désactivé – plusieurs avis autorisés (test)';
}

let statusTimer = null;
function setStatusLine(text, duration) {
  const el = document.getElementById('status-line');
  el.textContent = text;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => { el.textContent = ''; }, duration);
}

// ── Stats ─────────────────────────────────────────────────────────────────────

function updateStats(avis, lastVisit = 0) {
  lastAvis = avis;

  // Fallback si count() a échoué
  const totalEl = document.getElementById('stat-total');
  if (totalEl.textContent === '–') totalEl.textContent = avis.length;

  const badgeEl = document.getElementById('stat-new-badge');
  if (lastVisit > 0) {
    const newCount = avis.filter(a => {
      if (!a.timestamp) return false;
      const ts = a.timestamp.toDate ? a.timestamp.toDate().getTime() : +a.timestamp;
      return ts > lastVisit;
    }).length;
    if (newCount > 0) {
      badgeEl.textContent = `+${newCount}`;
      badgeEl.style.display = '';
    } else {
      badgeEl.style.display = 'none';
    }
  } else {
    badgeEl.style.display = 'none';
  }
  const total   = avis.length;
  const byStars = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const byPrize = {};

  avis.forEach(a => {
    const s = a.stars;
    if (s >= 1 && s <= 4) byStars[s]++;
    if (a.prize) byPrize[a.prize] = (byPrize[a.prize] || 0) + 1;
  });

  const maxStars = Math.max(...Object.values(byStars), 1);
  [1, 2, 3, 4].forEach(s => {
    const n = byStars[s];
    document.getElementById(`count-${s}`).textContent = n;
    document.getElementById(`bar-${s}`).style.width   = `${Math.round(n / maxStars * 100)}%`;
  });

  const prizeEntries = Object.entries(byPrize).sort((a, b) => b[1] - a[1]);
  const totalPrizes  = prizeEntries.reduce((s, [, n]) => s + n, 0);
  const maxPrize     = prizeEntries.length ? prizeEntries[0][1] : 1;
  const listEl       = document.getElementById('stat-prizes-list');
  const metaEl       = document.getElementById('stat-prizes-meta');
  const tauxEl       = document.getElementById('stat-taux');
  const tauxNumEl    = document.getElementById('stat-taux-num');

  if (prizeEntries.length === 0) {
    listEl.innerHTML   = '<span class="stat-empty">Aucun cadeau distribué</span>';
    metaEl.textContent = '';
    tauxEl.style.display = 'none';
  } else {
    metaEl.textContent = `${totalPrizes} distribué${totalPrizes > 1 ? 's' : ''}`;
    listEl.innerHTML = prizeEntries.map(([label, n]) => {
      const barPct = Math.round(n / maxPrize * 100);
      const pct    = total > 0 ? Math.round(n / totalPrizes * 100) : 0;
      return `<div class="stat-prize-row">
        <span>${label}</span>
        <div class="stat-prize-bar-track"><div class="stat-prize-bar-fill" style="width:${barPct}%"></div></div>
        <span class="stat-prize-count">${n}</span>
        <span class="stat-prize-pct">${pct}%</span>
      </div>`;
    }).join('');

    const taux = total > 0 ? Math.round(totalPrizes / total * 100) : 0;
    tauxNumEl.textContent  = `${taux}%`;
    tauxEl.style.display   = 'flex';
  }

  drawTemporalChart(avis, +(document.getElementById('chart-range').value));
}

// ── Graphique temporel ────────────────────────────────────────────────────────

document.getElementById('chart-range').addEventListener('change', e => {
  drawTemporalChart(lastAvis, +e.target.value);
});

function drawTemporalChart(avis, days) {
  const today = new Date();
  let DAYS;
  if (!days) {
    // "Tout" : span from earliest avis to today
    let earliest = new Date();
    avis.forEach(a => {
      if (!a.timestamp) return;
      const d = a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
      if (d < earliest) earliest = d;
    });
    DAYS = Math.max(7, Math.ceil((today - earliest) / 86400000) + 1);
  } else {
    DAYS = days;
  }
  const canvas  = document.getElementById('temporal-chart');
  const dpr     = window.devicePixelRatio || 1;
  const cssW    = canvas.clientWidth || 320;
  const cssH    = 80;

  canvas.width  = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.height = cssH + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const W = cssW;
  const H = cssH;

  // Build last DAYS buckets (day keys: "YYYY-MM-DD")
  const buckets = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    buckets.push({
      key:   dayKey(d),
      label: d.getDate() + '/' + String(d.getMonth() + 1).padStart(2, '0'),
      count: 0,
    });
  }

  const bucketMap = {};
  buckets.forEach(b => { bucketMap[b.key] = b; });

  avis.forEach(a => {
    if (!a.timestamp) return;
    const d  = a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
    const k  = dayKey(d);
    if (bucketMap[k]) bucketMap[k].count++;
  });

  const maxCount = Math.max(...buckets.map(b => b.count), 1);
  const recentTotal = buckets.reduce((s, b) => s + b.count, 0);

  document.getElementById('chart-meta').textContent =
    recentTotal > 0 ? `${recentTotal} avis` : 'Aucun avis';

  // Layout
  const LABEL_H  = 18;
  const BAR_AREA = H - LABEL_H - 4;
  const GAP      = 3;
  const barW     = (W - GAP * (DAYS - 1)) / DAYS;

  ctx.clearRect(0, 0, W, H);

  buckets.forEach((b, i) => {
    const x      = i * (barW + GAP);
    const fillH  = b.count > 0 ? Math.max(4, Math.round(b.count / maxCount * BAR_AREA)) : 2;
    const y      = BAR_AREA - fillH + 2;
    const radius = Math.min(3, barW / 2);

    // Bar
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + barW - radius, y);
    ctx.quadraticCurveTo(x + barW, y, x + barW, y + radius);
    ctx.lineTo(x + barW, y + fillH);
    ctx.lineTo(x, y + fillH);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fillStyle = b.count > 0 ? '#FF8732' : 'rgba(80,35,20,.1)';
    ctx.fill();

    // Label step: ~1 label per week regardless of range
    const labelStep = Math.ceil(DAYS / 7);
    if (i % labelStep === 0) {
      const cx = x + barW / 2;
      // Tick line from bar baseline to label
      ctx.beginPath();
      ctx.moveTo(cx, BAR_AREA + 3);
      ctx.lineTo(cx, H - 12);
      ctx.strokeStyle = 'rgba(80,35,20,.15)';
      ctx.lineWidth   = 1;
      ctx.stroke();

      ctx.fillStyle = 'rgba(80,35,20,.4)';
      ctx.font      = '600 9px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.label, cx, H - 2);
    }
  });
}

function dayKey(d) {
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}
