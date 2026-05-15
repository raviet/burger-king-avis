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
const CONFIG_REF = db.collection('config').doc('settings');

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

let unsubscribe = null;

function showLogin() {
  document.getElementById('login-section').style.display    = 'flex';
  document.getElementById('dashboard-section').style.display = 'none';
  document.getElementById('login-btn').disabled = false;
  document.getElementById('login-btn').textContent = 'Se connecter';
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
}

function showDashboard(user) {
  document.getElementById('login-section').style.display    = 'none';
  document.getElementById('dashboard-section').style.display = 'flex';
  document.getElementById('user-info').textContent = user.email;

  unsubscribe = CONFIG_REF.onSnapshot(doc => {
    const enabled = doc.exists ? doc.data().roulette_enabled !== false : true;
    const toggle  = document.getElementById('roulette-toggle');
    toggle.checked = enabled;
    updateToggleUI(enabled);
  }, () => {
    document.getElementById('toggle-sub').textContent = 'Erreur de lecture';
  });

  document.getElementById('roulette-toggle').addEventListener('change', async e => {
    const enabled = e.target.checked;
    updateToggleUI(enabled);
    try {
      await CONFIG_REF.set({ roulette_enabled: enabled }, { merge: true });
      setStatusLine('Sauvegardé ✓', 2000);
    } catch (err) {
      setStatusLine('Erreur de sauvegarde', 3000);
      e.target.checked = !enabled;
      updateToggleUI(!enabled);
    }
  });
}

function updateToggleUI(enabled) {
  const sub = document.getElementById('toggle-sub');
  sub.innerHTML = enabled
    ? '<span class="status-dot status-on"></span>Activée – clients reçoivent la roulette'
    : '<span class="status-dot status-off"></span>Désactivée – message de remerciement simple';
}

let statusTimer = null;
function setStatusLine(text, duration) {
  const el = document.getElementById('status-line');
  el.textContent = text;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => { el.textContent = ''; }, duration);
}
