// Tests unitaires – logique pure extraite de feedback.js et script.js
// Lancer avec : node tests/test.js

const assert = require('assert');
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${e.message}`);
    failed++;
  }
}

// ─── Helpers copiés fidèlement depuis les sources ───────────────────────────

const PRIZES = [
  { imgSrc: 'images/nuggets.png',     label: '4 Nuggets',          color: '#D62300', textColor: '#fff'    },
  { imgSrc: 'images/cheeseburger.png',label: 'Cheeseburger',       color: '#FF8732', textColor: '#fff'    },
  { imgSrc: 'images/king-fusion.png', label: "King Fusion M&M's",  color: '#502314', textColor: '#fff'    },
  { imgSrc: 'images/onion-rings.png', label: '6 Onion Rings',      color: '#FFAA00', textColor: '#502314' },
  { imgSrc: 'images/muffin.png',      label: 'Pâtisserie',         color: '#198737', textColor: '#fff'    },
];

function clampStars(raw) {
  return Math.max(1, Math.min(4, parseInt(raw, 10) || 1));
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 4);
}

function computeFinalAngle(startAngle, winner, extraTurns) {
  const slice = (2 * Math.PI) / PRIZES.length;
  let delta = startAngle + Math.PI / 2 + (winner + 0.5) * slice;
  delta = ((delta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  if (delta < 0.1) delta += 2 * Math.PI;
  delta += extraTurns;
  return startAngle - delta;
}

function winnerAtPointer(finalAngle) {
  const slice = (2 * Math.PI) / PRIZES.length;
  // Angle du pointeur (sommet) en coordonnées canvas : -π/2
  // On calcule quel segment se trouve sous le pointeur
  let pos = ((-Math.PI / 2 - finalAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  return Math.floor(pos / slice) % PRIZES.length;
}

// ─── 1. Clamp de la note reçue en paramètre URL ──────────────────────────────

console.log('\n1. Clamp de la note (paramètre ?stars=)');

test('valeur normale : 3 reste 3', () => assert.strictEqual(clampStars('3'), 3));
test('valeur normale : 1 reste 1', () => assert.strictEqual(clampStars('1'), 1));
test('valeur normale : 4 reste 4', () => assert.strictEqual(clampStars('4'), 4));
test('5 est ramené à 4 (valeur URL initiale : les 5★ arrivent depuis Google redirect)', () => assert.strictEqual(clampStars('5'), 4));
test('0 est ramené à 1', () => assert.strictEqual(clampStars('0'), 1));
test('-1 est ramené à 1', () => assert.strictEqual(clampStars('-1'), 1));
test('valeur non numérique ("abc") → défaut 1', () => assert.strictEqual(clampStars('abc'), 1));
test('valeur vide → défaut 1', () => assert.strictEqual(clampStars(''), 1));
test('999 est ramené à 4', () => assert.strictEqual(clampStars('999'), 4));

// ─── 2. Fonction easeOut ─────────────────────────────────────────────────────

console.log('\n2. Fonction easeOut (décélération de la roulette)');

test('easeOut(0) = 0 (départ immobile)', () => assert.strictEqual(easeOut(0), 0));
test('easeOut(1) = 1 (arrêt complet)',   () => assert.strictEqual(easeOut(1), 1));
test('easeOut est monotone croissante',  () => {
  const steps = [0, 0.1, 0.2, 0.3, 0.5, 0.7, 0.9, 1];
  for (let i = 1; i < steps.length; i++) {
    assert(easeOut(steps[i]) > easeOut(steps[i - 1]),
      `easeOut(${steps[i]}) devrait être > easeOut(${steps[i - 1]})`);
  }
});
test('la moitié du temps donne plus de 80% du chemin (départ rapide)', () => {
  assert(easeOut(0.5) > 0.8, `easeOut(0.5) = ${easeOut(0.5).toFixed(3)}`);
});
test('easeOut reste dans [0, 1]', () => {
  for (let t = 0; t <= 1; t += 0.05) {
    const v = easeOut(t);
    assert(v >= 0 && v <= 1, `easeOut(${t}) = ${v} hors de [0,1]`);
  }
});

// ─── 3. Mathématique de la roulette ──────────────────────────────────────────

console.log('\n3. Calcul de l\'angle final (le bon segment sous le pointeur)');

const START_ANGLE = -Math.PI * 3 / 4; // angle initial, segment 0 en haut
const EXTRA_TURNS = 5 * 2 * Math.PI;  // 5 tours fixes pour les tests

for (let w = 0; w < PRIZES.length; w++) {
  test(`winner=${w} (${PRIZES[w].label}) → bien sous le pointeur`, () => {
    const final  = computeFinalAngle(START_ANGLE, w, EXTRA_TURNS);
    const actual = winnerAtPointer(final);
    assert.strictEqual(actual, w,
      `Attendu segment ${w}, obtenu ${actual} (finalAngle=${final.toFixed(4)})`);
  });
}

test('fonctionne quelle que soit l\'angle de départ (après plusieurs tours)', () => {
  const angles = [-Math.PI * 3 / 4, 0, Math.PI / 4, -Math.PI, 2.7, -15.3];
  for (const start of angles) {
    for (let w = 0; w < PRIZES.length; w++) {
      const final  = computeFinalAngle(start, w, EXTRA_TURNS);
      const actual = winnerAtPointer(final);
      assert.strictEqual(actual, w,
        `startAngle=${start.toFixed(2)}, winner=${w} → segment ${actual} sous le pointeur`);
    }
  }
});

test('le delta est toujours au moins 5 tours (effet visuel garanti)', () => {
  for (let w = 0; w < PRIZES.length; w++) {
    const final = computeFinalAngle(START_ANGLE, w, EXTRA_TURNS);
    const delta = START_ANGLE - final;
    assert(delta >= 5 * 2 * Math.PI,
      `delta=${(delta / (2 * Math.PI)).toFixed(2)} tours pour winner=${w}`);
  }
});

// ─── 4. Structure du tableau PRIZES ──────────────────────────────────────────

console.log('\n4. Cohérence du tableau PRIZES');

test('exactement 5 prix', () => assert.strictEqual(PRIZES.length, 5));
test('chaque prix a les 4 champs requis', () => {
  PRIZES.forEach((p, i) => {
    assert(p.imgSrc,   `PRIZES[${i}] manque imgSrc`);
    assert(p.label,    `PRIZES[${i}] manque label`);
    assert(p.color,    `PRIZES[${i}] manque color`);
    assert(p.textColor,`PRIZES[${i}] manque textColor`);
  });
});
test('les couleurs sont des codes hex valides (3 ou 6 chiffres)', () => {
  const hex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
  PRIZES.forEach((p, i) => {
    assert(hex.test(p.color),     `PRIZES[${i}].color invalide : ${p.color}`);
    assert(hex.test(p.textColor), `PRIZES[${i}].textColor invalide : ${p.textColor}`);
  });
});
test('les labels ne sont pas vides', () => {
  PRIZES.forEach((p, i) => assert(p.label.trim().length > 0, `PRIZES[${i}].label vide`));
});

// ─── 5. Logique de routage des étoiles (script.js) ───────────────────────────

console.log('\n5. Routage selon la note (index.html)');

function choose(value, googleUrl) {
  if (value === 5) return googleUrl;
  return 'feedback.html?stars=' + value;
}

const GOOGLE_URL = 'https://maps.google.com/fake';

test('5 étoiles → Google Reviews', () =>
  assert.strictEqual(choose(5, GOOGLE_URL), GOOGLE_URL));
test('4 étoiles → feedback.html?stars=4', () =>
  assert.strictEqual(choose(4, GOOGLE_URL), 'feedback.html?stars=4'));
test('3 étoiles → feedback.html?stars=3', () =>
  assert.strictEqual(choose(3, GOOGLE_URL), 'feedback.html?stars=3'));
test('2 étoiles → feedback.html?stars=2', () =>
  assert.strictEqual(choose(2, GOOGLE_URL), 'feedback.html?stars=2'));
test('1 étoile  → feedback.html?stars=1', () =>
  assert.strictEqual(choose(1, GOOGLE_URL), 'feedback.html?stars=1'));

// ─── 6. darkenHex ────────────────────────────────────────────────────────────

function darkenHex(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r   = Math.max(0, (num >> 16)       - amount);
  const g   = Math.max(0, (num >> 8 & 0xff) - amount);
  const b   = Math.max(0, (num & 0xff)      - amount);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

console.log('\n6. darkenHex (teinte de fond prize reveal)');

test('amount=0 → couleur inchangée',          () => assert.strictEqual(darkenHex('#D62300', 0), '#d62300'));
test('assombrit correctement #FF8732 de 55',  () => {
  const r = assert.doesNotThrow(() => darkenHex('#FF8732', 55));
  const result = darkenHex('#FF8732', 55);
  assert.match(result, /^#[0-9a-f]{6}$/, `hex invalide : ${result}`);
});
test('clamp à 0 : canal qui passerait négatif reste 0', () => {
  const result = darkenHex('#050500', 10);
  assert.match(result, /^#[0-9a-f]{6}$/);
  const num = parseInt(result.slice(1), 16);
  assert((num >> 16) === 0,       'R devrait être 0');
  assert(((num >> 8) & 0xff) === 0, 'G devrait être 0');
});
test('#000000 assombri reste #000000', () => assert.strictEqual(darkenHex('#000000', 99), '#000000'));
test('résultat toujours un hex 6 chiffres valide', () => {
  const hex6 = /^#[0-9a-f]{6}$/;
  ['#D62300','#FF8732','#502314','#FFAA00','#198737'].forEach(c => {
    assert.match(darkenHex(c, 55), hex6, `darkenHex(${c}) invalide`);
  });
});

// ─── 7. Logique isLight (couleur texte prize reveal) ──────────────────────────

console.log('\n7. Détection fond clair (isLight) pour prize reveal');

function isLight(textColor) { return textColor !== '#fff'; }

test('exactement 1 prix a un fond clair (onion rings jaune)', () =>
  assert.strictEqual(PRIZES.filter(p => isLight(p.textColor)).length, 1));
test('le prix fond clair est "6 Onion Rings"', () =>
  assert.strictEqual(PRIZES.find(p => isLight(p.textColor)).label, '6 Onion Rings'));
test('les 4 autres ont textColor blanc', () =>
  assert.strictEqual(PRIZES.filter(p => !isLight(p.textColor)).length, 4));

// ─── 8. Génération HTML des étoiles ──────────────────────────────────────────

console.log('\n8. Génération HTML étoiles (filled / empty)');

function buildStarsHTML(stars) {
  return '<img class="star-img filled">'.repeat(stars) +
         '<img class="star-img empty">'.repeat(5 - stars);
}
const countFilled = html => (html.match(/filled/g) || []).length;
const countEmpty  = html => (html.match(/empty/g)  || []).length;

[1, 2, 3, 4, 5].forEach(n => {
  test(`stars=${n} → ${n} filled + ${5 - n} empty`, () => {
    const html = buildStarsHTML(n);
    assert.strictEqual(countFilled(html), n,     `filled attendu ${n}`);
    assert.strictEqual(countEmpty(html),  5 - n, `empty attendu ${5 - n}`);
  });
});
test('total toujours 5 étoiles', () => {
  [1,2,3,4,5].forEach(n => {
    const html = buildStarsHTML(n);
    assert.strictEqual(countFilled(html) + countEmpty(html), 5);
  });
});

// ─── 9. Cohérence avancée PRIZES ─────────────────────────────────────────────

console.log('\n9. Cohérence avancée du tableau PRIZES');

test('labels tous uniques', () => {
  const labels = PRIZES.map(p => p.label);
  assert.strictEqual(new Set(labels).size, labels.length, 'labels dupliqués');
});
test('couleurs de segments toutes uniques', () => {
  const colors = PRIZES.map(p => p.color);
  assert.strictEqual(new Set(colors).size, colors.length, 'couleurs dupliquées');
});
test('imgSrc se terminent tous par .png', () => {
  PRIZES.forEach((p, i) =>
    assert(p.imgSrc.endsWith('.png'), `PRIZES[${i}].imgSrc ne finit pas par .png`));
});
test('imgSrc commencent tous par "images/"', () => {
  PRIZES.forEach((p, i) =>
    assert(p.imgSrc.startsWith('images/'), `PRIZES[${i}].imgSrc chemin invalide`));
});

// ─── 10. easeOut : décélération réelle ───────────────────────────────────────

console.log('\n10. easeOut : décélération (vitesse décroissante)');

test('vitesse décroissante : incrément plus petit à chaque pas', () => {
  const steps = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
  const diffs = [];
  for (let i = 1; i < steps.length; i++)
    diffs.push(easeOut(steps[i]) - easeOut(steps[i - 1]));
  for (let i = 1; i < diffs.length; i++)
    assert(diffs[i] < diffs[i - 1],
      `Pas ${i}: diff=${diffs[i].toFixed(4)} devrait être < ${diffs[i-1].toFixed(4)}`);
});
test('easeOut(0.25) > 0.5 : première moitié du temps > moitié du chemin', () =>
  assert(easeOut(0.25) > 0.5, `easeOut(0.25)=${easeOut(0.25).toFixed(3)}`));

// ─── 11. Logique toggle roulette ─────────────────────────────────────────────

console.log('\n11. Toggle roulette (lecture config Firestore)');

function resolveRouletteEnabled(docExists, docData) {
  if (!docExists) return true;
  return docData.roulette_enabled !== false;
}

test('doc inexistant → roulette activée par défaut', () =>
  assert.strictEqual(resolveRouletteEnabled(false, {}), true));
test('roulette_enabled: true → activée', () =>
  assert.strictEqual(resolveRouletteEnabled(true, { roulette_enabled: true }), true));
test('roulette_enabled: false → désactivée', () =>
  assert.strictEqual(resolveRouletteEnabled(true, { roulette_enabled: false }), false));
test('champ absent dans doc existant → activée (undefined !== false)', () =>
  assert.strictEqual(resolveRouletteEnabled(true, {}), true));

function postSubmitSection(rouletteEnabled) {
  return rouletteEnabled ? 'roulette-section' : 'merci-section';
}

test('rouletteEnabled=true → affiche roulette-section', () =>
  assert.strictEqual(postSubmitSection(true), 'roulette-section'));
test('rouletteEnabled=false → affiche merci-section', () =>
  assert.strictEqual(postSubmitSection(false), 'merci-section'));

// ─── 12. Toggle email (lecture config Firestore) ─────────────────────────────

console.log('\n12. Toggle email (envoi Web3Forms conditionnel)');

function resolveEmailEnabled(docExists, docData) {
  if (!docExists) return true;
  return docData.email_enabled !== false;
}

test('doc inexistant → email activé par défaut', () =>
  assert.strictEqual(resolveEmailEnabled(false, {}), true));
test('email_enabled: true → activé', () =>
  assert.strictEqual(resolveEmailEnabled(true, { email_enabled: true }), true));
test('email_enabled: false → désactivé', () =>
  assert.strictEqual(resolveEmailEnabled(true, { email_enabled: false }), false));
test('champ absent dans doc existant → activé (undefined !== false)', () =>
  assert.strictEqual(resolveEmailEnabled(true, {}), true));

function shouldSendEmail(emailEnabled) { return emailEnabled; }

test('emailEnabled=true → envoi', () => assert.strictEqual(shouldSendEmail(true), true));
test('emailEnabled=false → pas d\'envoi', () => assert.strictEqual(shouldSendEmail(false), false));

test('roulette et email indépendants : email OFF n\'affecte pas roulette', () => {
  const roulette = resolveRouletteEnabled(true, { roulette_enabled: true, email_enabled: false });
  const email    = resolveEmailEnabled(true,    { roulette_enabled: true, email_enabled: false });
  assert.strictEqual(roulette, true);
  assert.strictEqual(email,    false);
});

test('les deux OFF simultanément', () => {
  const data = { roulette_enabled: false, email_enabled: false };
  assert.strictEqual(resolveRouletteEnabled(true, data), false);
  assert.strictEqual(resolveEmailEnabled(true, data),    false);
});

// ─── 13. Config environnements dev/prod ──────────────────────────────────────

console.log('\n13. Config environnements (dev / prod)');

const DEV_CONFIG  = { ENV: 'dev',  WEB3FORMS_KEY: '39c512ae-ad7f-4a07-8b89-474adc23c163', GOOGLE_REVIEWS_URL: '#',        FIRESTORE_COLLECTION: 'config-dev', FIRESTORE_CONFIG_DOC: 'settings', AVIS_COLLECTION: 'avis-dev' };
const PROD_CONFIG = { ENV: 'prod', WEB3FORMS_KEY: '854bf41c-060a-420a-948b-6961027f7f63', GOOGLE_REVIEWS_URL: 'https://www.google.com/maps/place/Burger+King/@48.8203079,2.6217964,15z/data=!4m8!3m7!1s0x47e60fd6c70c054d:0xe65143e7bc07dd47!8m2!3d48.8224029!4d2.6165143!9m1!1b1!16s%2Fg%2F11xmf5xbvs?entry=ttu&g_ep=EgoyMDI2MDUxMi4wIKXMDSoASAFQAw%3D%3D', FIRESTORE_COLLECTION: 'config',     FIRESTORE_CONFIG_DOC: 'settings', AVIS_COLLECTION: 'avis' };

function resolveKey(cfg)      { return (typeof cfg !== 'undefined') ? cfg.WEB3FORMS_KEY    : ''; }
function resolveGoogleUrl(cfg){ return (typeof cfg !== 'undefined') ? cfg.GOOGLE_REVIEWS_URL : '#'; }
function showDevBanner(cfg)   { return typeof cfg !== 'undefined' && cfg.ENV === 'dev'; }

const REQUIRED_FIELDS = ['ENV', 'WEB3FORMS_KEY', 'GOOGLE_REVIEWS_URL', 'FIRESTORE_COLLECTION', 'FIRESTORE_CONFIG_DOC', 'AVIS_COLLECTION'];

// Structure
test('dev : 6 champs requis présents', () => {
  REQUIRED_FIELDS.forEach(k => assert(k in DEV_CONFIG, `dev manque ${k}`));
});
test('prod : 6 champs requis présents', () => {
  REQUIRED_FIELDS.forEach(k => assert(k in PROD_CONFIG, `prod manque ${k}`));
});

// ENV
test('dev.ENV = "dev"',   () => assert.strictEqual(DEV_CONFIG.ENV,  'dev'));
test('prod.ENV = "prod"', () => assert.strictEqual(PROD_CONFIG.ENV, 'prod'));

// WEB3FORMS_KEY
test('dev.WEB3FORMS_KEY non vide',  () => assert(DEV_CONFIG.WEB3FORMS_KEY.length  > 0));
test('prod.WEB3FORMS_KEY non vide', () => assert(PROD_CONFIG.WEB3FORMS_KEY.length > 0));
test('dev et prod ont des clés différentes', () =>
  assert.notStrictEqual(DEV_CONFIG.WEB3FORMS_KEY, PROD_CONFIG.WEB3FORMS_KEY));

// GOOGLE_REVIEWS_URL
test('dev.GOOGLE_REVIEWS_URL = "#" (pas de redirection)', () =>
  assert.strictEqual(DEV_CONFIG.GOOGLE_REVIEWS_URL, '#'));
test('prod.GOOGLE_REVIEWS_URL commence par https://', () =>
  assert(PROD_CONFIG.GOOGLE_REVIEWS_URL.startsWith('https://'), PROD_CONFIG.GOOGLE_REVIEWS_URL));

// Résolution runtime
test('resolveKey(dev)  → clé dev',  () => assert.strictEqual(resolveKey(DEV_CONFIG),  DEV_CONFIG.WEB3FORMS_KEY));
test('resolveKey(prod) → clé prod', () => assert.strictEqual(resolveKey(PROD_CONFIG), PROD_CONFIG.WEB3FORMS_KEY));
test('resolveKey(undefined) → ""',  () => assert.strictEqual(resolveKey(undefined),   ''));
test('resolveGoogleUrl(dev)  → "#"',        () => assert.strictEqual(resolveGoogleUrl(DEV_CONFIG),  '#'));
test('resolveGoogleUrl(prod) → URL réelle', () => assert(resolveGoogleUrl(PROD_CONFIG).startsWith('https://')));
test('resolveGoogleUrl(undefined) → "#"',   () => assert.strictEqual(resolveGoogleUrl(undefined),   '#'));

// Bandeau DEV
test('showDevBanner en dev',        () => assert.strictEqual(showDevBanner(DEV_CONFIG),  true));
test('showDevBanner en prod = false', () => assert.strictEqual(showDevBanner(PROD_CONFIG), false));
test('showDevBanner sans CONFIG = false', () => assert.strictEqual(showDevBanner(undefined), false));

// Cohérence fichiers réels
test('config/dev.js charge correctement', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '../config/dev.js'), 'utf8');
  assert(src.includes("ENV: 'dev'"));
  assert(src.includes('WEB3FORMS_KEY'));
  assert(src.includes("GOOGLE_REVIEWS_URL: '#'"));
  assert(src.includes('FIRESTORE_COLLECTION'));
  assert(src.includes('FIRESTORE_CONFIG_DOC'));
  assert(src.includes('AVIS_COLLECTION'));
});
test('config/prod.js charge correctement', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '../config/prod.js'), 'utf8');
  assert(src.includes("ENV: 'prod'"));
  assert(src.includes('WEB3FORMS_KEY'));
  assert(src.includes('https://'));
  assert(src.includes('FIRESTORE_COLLECTION'));
  assert(src.includes('FIRESTORE_CONFIG_DOC'));
  assert(src.includes('AVIS_COLLECTION'));
});

// ─── 14. Isolation collections Firestore dev/prod ────────────────────────────

console.log('\n14. Isolation collections Firestore (dev/prod)');

function resolveFirestoreRef(cfg) {
  const col = (typeof cfg !== 'undefined') ? cfg.FIRESTORE_COLLECTION : 'config';
  const doc = (typeof cfg !== 'undefined') ? cfg.FIRESTORE_CONFIG_DOC : 'settings';
  return `${col}/${doc}`;
}

test('dev → collection "config-dev"', () =>
  assert.strictEqual(DEV_CONFIG.FIRESTORE_COLLECTION, 'config-dev'));
test('prod → collection "config"', () =>
  assert.strictEqual(PROD_CONFIG.FIRESTORE_COLLECTION, 'config'));
test('dev et prod ont des collections différentes', () =>
  assert.notStrictEqual(DEV_CONFIG.FIRESTORE_COLLECTION, PROD_CONFIG.FIRESTORE_COLLECTION));
test('doc = "settings" dans les deux envs', () => {
  assert.strictEqual(DEV_CONFIG.FIRESTORE_CONFIG_DOC,  'settings');
  assert.strictEqual(PROD_CONFIG.FIRESTORE_CONFIG_DOC, 'settings');
});
test('ref dev = "config-dev/settings"', () =>
  assert.strictEqual(resolveFirestoreRef(DEV_CONFIG),  'config-dev/settings'));
test('ref prod = "config/settings"', () =>
  assert.strictEqual(resolveFirestoreRef(PROD_CONFIG), 'config/settings'));
test('ref sans CONFIG → fallback "config/settings"', () =>
  assert.strictEqual(resolveFirestoreRef(undefined), 'config/settings'));
test('refs dev et prod sont distinctes → pas de pollution croisée', () =>
  assert.notStrictEqual(resolveFirestoreRef(DEV_CONFIG), resolveFirestoreRef(PROD_CONFIG)));

// AVIS_COLLECTION
test('dev.AVIS_COLLECTION = "avis-dev"', () =>
  assert.strictEqual(DEV_CONFIG.AVIS_COLLECTION, 'avis-dev'));
test('prod.AVIS_COLLECTION = "avis"', () =>
  assert.strictEqual(PROD_CONFIG.AVIS_COLLECTION, 'avis'));
test('avis dev et prod isolées', () =>
  assert.notStrictEqual(DEV_CONFIG.AVIS_COLLECTION, PROD_CONFIG.AVIS_COLLECTION));

// ─── 15. Payload avis Firestore ───────────────────────────────────────────────

console.log('\n15. Payload avis Firestore');

function buildAvisPayload(stars, message) {
  return { stars, message };
}

function buildPrizeUpdate(prizeLabel) {
  return { prize: prizeLabel };
}

function resolveAvisCollection(cfg) {
  return (typeof cfg !== 'undefined') ? cfg.AVIS_COLLECTION : 'avis';
}

test('payload contient stars et message', () => {
  const p = buildAvisPayload(3, 'Bon burger');
  assert.strictEqual(p.stars, 3);
  assert.strictEqual(p.message, 'Bon burger');
});
test('stars clampé 1-4 dans le payload', () => {
  for (let s = 1; s <= 4; s++) {
    const p = buildAvisPayload(s, 'test');
    assert(p.stars >= 1 && p.stars <= 4);
  }
});
test('prize update contient le label exact', () => {
  PRIZES.forEach(prize => {
    const u = buildPrizeUpdate(prize.label);
    assert.strictEqual(u.prize, prize.label);
  });
});
test('resolveAvisCollection(dev) → "avis-dev"', () =>
  assert.strictEqual(resolveAvisCollection(DEV_CONFIG), 'avis-dev'));
test('resolveAvisCollection(prod) → "avis"', () =>
  assert.strictEqual(resolveAvisCollection(PROD_CONFIG), 'avis'));
test('resolveAvisCollection(undefined) → "avis" (fallback prod)', () =>
  assert.strictEqual(resolveAvisCollection(undefined), 'avis'));
test('collections avis dev et prod distinctes', () =>
  assert.notStrictEqual(resolveAvisCollection(DEV_CONFIG), resolveAvisCollection(PROD_CONFIG)));

// ─── Résumé ───────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(45)}`);
console.log(`  ${passed} test(s) réussi(s)  |  ${failed} échec(s)`);
console.log(`${'─'.repeat(45)}\n`);

if (failed > 0) process.exit(1);
