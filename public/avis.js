firebase.initializeApp({
  apiKey:            'AIzaSyBcHaY5Zdy6pLqq1PxYcMSMr-NqCOCvhj4',
  authDomain:        'burger-king-avis.firebaseapp.com',
  projectId:         'burger-king-avis',
  storageBucket:     'burger-king-avis.firebasestorage.app',
  messagingSenderId: '756976293842',
  appId:             '1:756976293842:web:0c9cb6d0094c4cda545a0b',
});

const auth    = firebase.auth();
const db      = firebase.firestore();
const AVIS_COL = (typeof CONFIG !== 'undefined') ? CONFIG.AVIS_COLLECTION : 'avis';

let allAvis       = [];
let activeFilter  = 'all';
let unsubscribe   = null;

auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = '/admin';
    return;
  }
  document.getElementById('avis-section').style.display = 'flex';
  startListening();
});

function startListening() {
  unsubscribe = db.collection(AVIS_COL)
    .orderBy('timestamp', 'desc')
    .onSnapshot(snapshot => {
      allAvis = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      render();
    }, () => {
      document.getElementById('loading-state').textContent = 'Erreur de chargement.';
    });
}

function render() {
  const filtered = activeFilter === 'all'
    ? allAvis
    : allAvis.filter(a => String(a.stars) === activeFilter);

  const loadingEl = document.getElementById('loading-state');
  const countEl   = document.getElementById('avis-count');
  const listEl    = document.getElementById('avis-list');

  loadingEl.style.display = 'none';
  countEl.style.display   = 'block';

  const total     = allAvis.length;
  const displayed = filtered.length;
  countEl.textContent = activeFilter === 'all'
    ? `${total} avis`
    : `${displayed} avis sur ${total}`;

  if (filtered.length === 0) {
    listEl.innerHTML = '<div class="empty-state">Aucun avis pour ce filtre.</div>';
    return;
  }

  listEl.innerHTML = filtered.map(a => {
    const stars   = renderStars(a.stars || 0);
    const date    = formatDate(a.timestamp);
    const message = escapeHtml(a.message || '');
    const prize   = a.prize
      ? `<span class="avis-prize">🎁 ${escapeHtml(a.prize)}</span>`
      : '';
    return `
      <div class="avis-card">
        <div class="avis-card-header">
          <span class="avis-stars">${stars}</span>
          <span class="avis-date">${date}</span>
        </div>
        ${message ? `<div class="avis-message">${message}</div>` : ''}
        ${prize}
      </div>`;
  }).join('');
}

function renderStars(n) {
  const filled = '★'.repeat(Math.max(0, Math.min(5, n)));
  const empty  = '☆'.repeat(Math.max(0, 5 - n));
  return `<span style="color:#FFAA00">${filled}</span><span style="color:rgba(80,35,20,.25)">${empty}</span>`;
}

function formatDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

document.getElementById('filters').addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  activeFilter = btn.dataset.filter;
  render();
});
