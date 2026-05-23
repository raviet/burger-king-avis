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

const PAGE_SIZE = 20;
let currentPage = 0;
let pageStack   = [null]; // pageStack[i] = first doc of page i, null = beginning
let lastDoc     = null;
let hasNextPage = false;
let activeFilter = 'all';

auth.onAuthStateChanged(user => {
  if (!user) { window.location.href = '/admin'; return; }
  document.getElementById('avis-section').style.display = 'flex';
  loadPage(0);
});

function buildQuery() {
  if (activeFilter === 'all') {
    return db.collection(AVIS_COL).orderBy('timestamp', 'desc');
  }
  return db.collection(AVIS_COL)
    .where('stars', '==', parseInt(activeFilter, 10))
    .orderBy('timestamp', 'desc');
}

async function loadPage(pageIndex) {
  showLoading();
  try {
    let q = buildQuery();
    const startDoc = pageStack[pageIndex];
    if (startDoc) q = q.startAt(startDoc);
    q = q.limit(PAGE_SIZE + 1);

    const snap = await q.get();
    const docs = snap.docs;

    hasNextPage      = docs.length > PAGE_SIZE;
    const displayDocs = docs.slice(0, PAGE_SIZE);
    lastDoc          = displayDocs.length > 0 ? displayDocs[displayDocs.length - 1] : null;
    currentPage      = pageIndex;

    renderDocs(displayDocs);
    updatePagination();
  } catch (e) {
    const el = document.getElementById('loading-state');
    el.textContent = 'Erreur de chargement.';
    el.style.display = 'block';
  }
}

async function goNext() {
  if (!hasNextPage || !lastDoc) return;
  const nextIndex = currentPage + 1;
  showLoading();
  try {
    const snap = await buildQuery().startAfter(lastDoc).limit(PAGE_SIZE + 1).get();
    const docs = snap.docs;

    hasNextPage       = docs.length > PAGE_SIZE;
    const displayDocs  = docs.slice(0, PAGE_SIZE);

    if (!pageStack[nextIndex] && displayDocs.length > 0) {
      pageStack[nextIndex] = displayDocs[0];
    }

    lastDoc     = displayDocs.length > 0 ? displayDocs[displayDocs.length - 1] : null;
    currentPage = nextIndex;

    renderDocs(displayDocs);
    updatePagination();
  } catch (e) {
    document.getElementById('loading-state').textContent = 'Erreur de chargement.';
  }
}

function showLoading() {
  const loadingEl = document.getElementById('loading-state');
  loadingEl.textContent = 'Chargement…';
  loadingEl.style.display = 'block';
  document.getElementById('avis-count').style.display = 'none';
  document.getElementById('avis-list').innerHTML = '';
  document.getElementById('pagination').style.display = 'none';
}

function renderDocs(docs) {
  document.getElementById('loading-state').style.display = 'none';

  const countEl = document.getElementById('avis-count');
  countEl.style.display = 'block';

  if (docs.length === 0) {
    countEl.textContent = '0 avis';
    document.getElementById('avis-list').innerHTML =
      '<div class="empty-state">Aucun avis pour ce filtre.</div>';
    return;
  }

  const from = currentPage * PAGE_SIZE + 1;
  const to   = currentPage * PAGE_SIZE + docs.length;
  countEl.textContent = `${from}–${to} avis`;

  document.getElementById('avis-list').innerHTML = docs.map(d => {
    const a       = { id: d.id, ...d.data() };
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

function updatePagination() {
  const pag      = document.getElementById('pagination');
  const prevBtn  = document.getElementById('btn-prev');
  const nextBtn  = document.getElementById('btn-next');
  const pageInfo = document.getElementById('page-info');

  if (currentPage === 0 && !hasNextPage) {
    pag.style.display = 'none';
    return;
  }

  pag.style.display = 'flex';
  prevBtn.disabled  = currentPage === 0;
  nextBtn.disabled  = !hasNextPage;
  pageInfo.textContent = `Page ${currentPage + 1}`;
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
  currentPage  = 0;
  pageStack    = [null];
  lastDoc      = null;
  hasNextPage  = false;
  loadPage(0);
});

document.getElementById('btn-prev').addEventListener('click', () => {
  if (currentPage > 0) loadPage(currentPage - 1);
});

document.getElementById('btn-next').addEventListener('click', goNext);
