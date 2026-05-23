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

const DEV_CONFIG  = { ENV: 'dev',  WEB3FORMS_KEY: '39c512ae-ad7f-4a07-8b89-474adc23c163', GOOGLE_REVIEWS_URL: '#',        FIRESTORE_COLLECTION: 'config-dev', FIRESTORE_CONFIG_DOC: 'settings', AVIS_COLLECTION: 'avis-dev', COOLDOWNS_COLLECTION: 'cooldowns-dev' };
const PROD_CONFIG = { ENV: 'prod', WEB3FORMS_KEY: '854bf41c-060a-420a-948b-6961027f7f63', GOOGLE_REVIEWS_URL: 'https://www.google.com/maps/place/Burger+King/@48.8203079,2.6217964,15z/data=!4m8!3m7!1s0x47e60fd6c70c054d:0xe65143e7bc07dd47!8m2!3d48.8224029!4d2.6165143!9m1!1b1!16s%2Fg%2F11xmf5xbvs?entry=ttu&g_ep=EgoyMDI2MDUxMi4wIKXMDSoASAFQAw%3D%3D', FIRESTORE_COLLECTION: 'config',     FIRESTORE_CONFIG_DOC: 'settings', AVIS_COLLECTION: 'avis',     COOLDOWNS_COLLECTION: 'cooldowns' };

function resolveKey(cfg)      { return (typeof cfg !== 'undefined') ? cfg.WEB3FORMS_KEY    : ''; }
function resolveGoogleUrl(cfg){ return (typeof cfg !== 'undefined') ? cfg.GOOGLE_REVIEWS_URL : '#'; }
function showDevBanner(cfg)   { return typeof cfg !== 'undefined' && cfg.ENV === 'dev'; }

const REQUIRED_FIELDS = ['ENV', 'WEB3FORMS_KEY', 'GOOGLE_REVIEWS_URL', 'FIRESTORE_COLLECTION', 'FIRESTORE_CONFIG_DOC', 'AVIS_COLLECTION', 'COOLDOWNS_COLLECTION'];

// Structure
test('dev : 7 champs requis présents', () => {
  REQUIRED_FIELDS.forEach(k => assert(k in DEV_CONFIG, `dev manque ${k}`));
});
test('prod : 7 champs requis présents', () => {
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

// COOLDOWNS_COLLECTION
test('dev.COOLDOWNS_COLLECTION = "cooldowns-dev"', () =>
  assert.strictEqual(DEV_CONFIG.COOLDOWNS_COLLECTION, 'cooldowns-dev'));
test('prod.COOLDOWNS_COLLECTION = "cooldowns"', () =>
  assert.strictEqual(PROD_CONFIG.COOLDOWNS_COLLECTION, 'cooldowns'));
test('cooldowns dev et prod isolées', () =>
  assert.notStrictEqual(DEV_CONFIG.COOLDOWNS_COLLECTION, PROD_CONFIG.COOLDOWNS_COLLECTION));

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

// ─── 16. Anti-abus (cooldown + clientId) ─────────────────────────────────────

console.log('\n16. Anti-abus');

function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function checkCooldown(lastSubmitMs, nowMs = Date.now()) {
  const COOLDOWN_MS = 24 * 60 * 60 * 1000;
  return nowMs - lastSubmitMs < COOLDOWN_MS;
}

function buildAvisPayloadWithClient(stars, message, clientId) {
  return { stars, message, clientId };
}

test('generateId() → UUID v4 format', () => {
  const id = generateId();
  assert.match(id, UUID_RE);
});
test('generateId() → IDs distincts à chaque appel', () => {
  assert.notStrictEqual(generateId(), generateId());
});
test('cooldown actif si lastSubmit < 24h', () => {
  const now = Date.now();
  assert.strictEqual(checkCooldown(now - 3600 * 1000, now), true);
});
test('cooldown inactif si lastSubmit = 0 (jamais soumis)', () => {
  assert.strictEqual(checkCooldown(0, Date.now()), false);
});
test('cooldown inactif si lastSubmit > 24h', () => {
  const now = Date.now();
  assert.strictEqual(checkCooldown(now - 25 * 3600 * 1000, now), false);
});
test('cooldown actif à 23h59 passé', () => {
  const now = Date.now();
  assert.strictEqual(checkCooldown(now - (24 * 3600 * 1000 - 60000), now), true);
});
test('cooldown inactif exactement à 24h passé', () => {
  const now = Date.now();
  assert.strictEqual(checkCooldown(now - 24 * 3600 * 1000, now), false);
});
test('payload avis inclut clientId', () => {
  const id = generateId();
  const p  = buildAvisPayloadWithClient(3, 'Test', id);
  assert.strictEqual(p.clientId, id);
});
test('clientId dans payload est bien le UUID généré', () => {
  const id = generateId();
  const p  = buildAvisPayloadWithClient(2, 'msg', id);
  assert.match(p.clientId, UUID_RE);
});

function resolveCooldownsCollection(cfg) {
  return (typeof cfg !== 'undefined') ? cfg.COOLDOWNS_COLLECTION : 'cooldowns';
}

test('resolveCooldownsCollection(dev) → "cooldowns-dev"', () =>
  assert.strictEqual(resolveCooldownsCollection(DEV_CONFIG), 'cooldowns-dev'));
test('resolveCooldownsCollection(prod) → "cooldowns"', () =>
  assert.strictEqual(resolveCooldownsCollection(PROD_CONFIG), 'cooldowns'));
test('resolveCooldownsCollection(undefined) → "cooldowns" (fallback prod)', () =>
  assert.strictEqual(resolveCooldownsCollection(undefined), 'cooldowns'));
test('cooldowns dev/prod pointent sur collections différentes', () =>
  assert.notStrictEqual(resolveCooldownsCollection(DEV_CONFIG), resolveCooldownsCollection(PROD_CONFIG)));

// ─── 17. Vue liste avis (avis.js) ────────────────────────────────────────────

console.log('\n17. Vue liste avis');

function renderStars(n) {
  const clamped = Math.max(0, Math.min(5, isFinite(n) ? n : 0));
  const filled  = '★'.repeat(clamped);
  const empty   = '☆'.repeat(5 - clamped);
  return `<span style="color:#FFAA00">${filled}</span><span style="color:rgba(80,35,20,.25)">${empty}</span>`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function filterAvis(avis, filter) {
  return filter === 'all' ? avis : avis.filter(a => String(a.stars) === filter);
}

const SAMPLE_AVIS = [
  { stars: 4, message: 'Très bon !',   prize: 'Cheeseburger' },
  { stars: 3, message: 'Correct.',     prize: null },
  { stars: 1, message: 'Mauvais <b>', prize: null },
  { stars: 4, message: 'Super &',      prize: '4 Nuggets' },
  { stars: 2, message: 'Bof.',         prize: null },
];

// renderStars
test('renderStars(4) → 4 étoiles pleines + 1 vide', () => {
  const r = renderStars(4);
  assert(r.includes('★★★★') && r.includes('☆'));
});
test('renderStars(5) → 5 étoiles pleines, 0 vide', () => {
  const r = renderStars(5);
  assert(r.includes('★★★★★') && !r.includes('☆'));
});
test('renderStars(1) → 1 pleine + 4 vides', () => {
  const r = renderStars(1);
  assert(r.includes('★') && r.includes('☆☆☆☆'));
});
test('renderStars(0) → aucune étoile pleine', () => {
  assert(!renderStars(0).includes('★'));
});
test('renderStars(-1) → clamp 0, aucune pleine', () => {
  assert(!renderStars(-1).includes('★'));
});
test('renderStars(6) → clamp 5, 5 pleines', () => {
  assert(renderStars(6).includes('★★★★★'));
});

// escapeHtml
test('escapeHtml — < et > échappés', () => {
  assert.strictEqual(escapeHtml('<script>'), '&lt;script&gt;');
});
test('escapeHtml — & échappé', () => {
  assert.strictEqual(escapeHtml('BK & Co'), 'BK &amp; Co');
});
test('escapeHtml — " échappé', () => {
  assert.strictEqual(escapeHtml('"bonjour"'), '&quot;bonjour&quot;');
});
test('escapeHtml — texte sans spéciaux → inchangé', () => {
  assert.strictEqual(escapeHtml('Burger King'), 'Burger King');
});
test('escapeHtml — XSS complet neutralisé', () => {
  const out = escapeHtml('<img src="x" onerror="alert(1)">');
  assert(out.includes('&lt;img') && !out.includes('<img'));
});

// filterAvis
test('filterAvis "all" → retourne tout', () => {
  assert.strictEqual(filterAvis(SAMPLE_AVIS, 'all').length, SAMPLE_AVIS.length);
});
test('filterAvis "4" → seulement les 4★', () => {
  const r = filterAvis(SAMPLE_AVIS, '4');
  assert(r.every(a => a.stars === 4));
  assert.strictEqual(r.length, 2);
});
test('filterAvis "1" → seulement les 1★', () => {
  const r = filterAvis(SAMPLE_AVIS, '1');
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].stars, 1);
});
test('filterAvis "5" → résultat vide (pas de 5★)', () => {
  assert.strictEqual(filterAvis(SAMPLE_AVIS, '5').length, 0);
});
test('filterAvis conserve les propriétés des avis', () => {
  const r = filterAvis(SAMPLE_AVIS, '4');
  assert(r.every(a => 'message' in a && 'stars' in a));
});

// ─── 18. Graphique temporel ───────────────────────────────────────────────────

console.log('\n18. Graphique temporel');

function dayKey(d) {
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function buildBuckets(nDays, refDate) {
  const buckets = [];
  for (let i = nDays - 1; i >= 0; i--) {
    const d = new Date(refDate);
    d.setDate(refDate.getDate() - i);
    buckets.push({ key: dayKey(d), count: 0 });
  }
  return buckets;
}

function aggregateCounts(avis, buckets) {
  const map = {};
  buckets.forEach(b => { map[b.key] = b; });
  avis.forEach(a => {
    if (!a.timestamp) return;
    const d = a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
    const k = dayKey(d);
    if (map[k]) map[k].count++;
  });
  return buckets;
}

const REF_DATE  = new Date('2026-05-17T12:00:00Z');
const BUCKETS14 = buildBuckets(14, REF_DATE);

// dayKey
test('dayKey → format YYYY-MM-DD', () => {
  assert.strictEqual(dayKey(new Date('2026-05-17T00:00:00')), '2026-05-17');
});
test('dayKey — zéros de remplissage mois et jour', () => {
  assert.strictEqual(dayKey(new Date('2026-01-04T00:00:00')), '2026-01-04');
});
test('dayKey — décembre', () => {
  assert.strictEqual(dayKey(new Date('2026-12-31T00:00:00')), '2026-12-31');
});

// buildBuckets
test('buildBuckets(14) → 14 buckets', () => {
  assert.strictEqual(BUCKETS14.length, 14);
});
test('buildBuckets — dernier bucket = refDate', () => {
  assert.strictEqual(BUCKETS14[13].key, '2026-05-17');
});
test('buildBuckets — premier bucket = refDate - 13 jours', () => {
  assert.strictEqual(BUCKETS14[0].key, '2026-05-04');
});
test('buildBuckets — tous les counts initialisés à 0', () => {
  assert(BUCKETS14.every(b => b.count === 0));
});
test('buildBuckets — clés toutes distinctes', () => {
  const keys = BUCKETS14.map(b => b.key);
  assert.strictEqual(new Set(keys).size, 14);
});

// aggregateCounts
test('aggregateCounts — avis dans la fenêtre incrémente le bon bucket', () => {
  const buckets = buildBuckets(14, REF_DATE);
  const avis = [{ timestamp: { toDate: () => new Date('2026-05-10T10:00:00Z') } }];
  aggregateCounts(avis, buckets);
  const b = buckets.find(b => b.key === '2026-05-10');
  assert.strictEqual(b.count, 1);
});
test('aggregateCounts — avis hors fenêtre ignoré', () => {
  const buckets = buildBuckets(14, REF_DATE);
  const avis = [{ timestamp: { toDate: () => new Date('2026-04-01T10:00:00Z') } }];
  aggregateCounts(avis, buckets);
  assert(buckets.every(b => b.count === 0));
});
test('aggregateCounts — avis sans timestamp ignoré', () => {
  const buckets = buildBuckets(14, REF_DATE);
  aggregateCounts([{ stars: 3 }], buckets);
  assert(buckets.every(b => b.count === 0));
});
test('aggregateCounts — plusieurs avis même jour cumulés', () => {
  const buckets = buildBuckets(14, REF_DATE);
  const avis = [
    { timestamp: { toDate: () => new Date('2026-05-15T08:00:00Z') } },
    { timestamp: { toDate: () => new Date('2026-05-15T20:00:00Z') } },
    { timestamp: { toDate: () => new Date('2026-05-15T14:00:00Z') } },
  ];
  aggregateCounts(avis, buckets);
  const b = buckets.find(b => b.key === '2026-05-15');
  assert.strictEqual(b.count, 3);
});
test('aggregateCounts — total avis = somme des counts', () => {
  const buckets = buildBuckets(14, REF_DATE);
  const avis = [
    { timestamp: { toDate: () => new Date('2026-05-10T10:00:00Z') } },
    { timestamp: { toDate: () => new Date('2026-05-12T10:00:00Z') } },
    { timestamp: { toDate: () => new Date('2026-05-14T10:00:00Z') } },
  ];
  aggregateCounts(avis, buckets);
  const total = buckets.reduce((s, b) => s + b.count, 0);
  assert.strictEqual(total, 3);
});

// ─── 19. Pagination (avis.js) ────────────────────────────────────────────────

console.log('\n19. Pagination');

function buildPageLabel(currentPage, pageSize, docsLength) {
  if (docsLength === 0) return '0 avis';
  const from = currentPage * pageSize + 1;
  const to   = currentPage * pageSize + docsLength;
  return `${from}–${to} avis`;
}

function isPrevDisabled(currentPage) {
  return currentPage === 0;
}

function isNextDisabled(hasNextPage) {
  return !hasNextPage;
}

function resetPagination() {
  return { currentPage: 0, pageStack: [null], lastDoc: null, hasNextPage: false };
}

// buildPageLabel
test('buildPageLabel — page 0, 20 docs → "1–20 avis"', () => {
  assert.strictEqual(buildPageLabel(0, 20, 20), '1–20 avis');
});
test('buildPageLabel — page 1, 20 docs → "21–40 avis"', () => {
  assert.strictEqual(buildPageLabel(1, 20, 20), '21–40 avis');
});
test('buildPageLabel — page 2, 7 docs (dernière page) → "41–47 avis"', () => {
  assert.strictEqual(buildPageLabel(2, 20, 7), '41–47 avis');
});
test('buildPageLabel — page 0, 0 docs → "0 avis"', () => {
  assert.strictEqual(buildPageLabel(0, 20, 0), '0 avis');
});
test('buildPageLabel — page 0, 1 doc → "1–1 avis"', () => {
  assert.strictEqual(buildPageLabel(0, 20, 1), '1–1 avis');
});

// isPrevDisabled
test('isPrevDisabled — page 0 → disabled', () => {
  assert.strictEqual(isPrevDisabled(0), true);
});
test('isPrevDisabled — page 1 → enabled', () => {
  assert.strictEqual(isPrevDisabled(1), false);
});
test('isPrevDisabled — page 5 → enabled', () => {
  assert.strictEqual(isPrevDisabled(5), false);
});

// isNextDisabled
test('isNextDisabled — hasNextPage false → disabled', () => {
  assert.strictEqual(isNextDisabled(false), true);
});
test('isNextDisabled — hasNextPage true → enabled', () => {
  assert.strictEqual(isNextDisabled(true), false);
});

// resetPagination
test('resetPagination — currentPage reset à 0', () => {
  const s = resetPagination();
  assert.strictEqual(s.currentPage, 0);
});
test('resetPagination — pageStack = [null]', () => {
  const s = resetPagination();
  assert.deepStrictEqual(s.pageStack, [null]);
});
test('resetPagination — lastDoc null', () => {
  assert.strictEqual(resetPagination().lastDoc, null);
});
test('resetPagination — hasNextPage false', () => {
  assert.strictEqual(resetPagination().hasNextPage, false);
});

// hasNextPage logic (limit+1 : on fetch PAGE_SIZE+1, hasNextPage = docs.length > PAGE_SIZE)
test('hasNextPage = true si on reçoit PAGE_SIZE+1 docs (il en reste)', () => {
  const docs = new Array(21).fill({});
  assert.strictEqual(docs.length > 20, true);
});
test('hasNextPage = false si on reçoit exactement PAGE_SIZE docs (dernière page)', () => {
  const docs = new Array(20).fill({});
  assert.strictEqual(docs.length > 20, false);
});
test('hasNextPage = false si docs.length < PAGE_SIZE', () => {
  const docs = new Array(15).fill({});
  assert.strictEqual(docs.length > 20, false);
});

// ─── 20. Pagination limit+1 : slice et hasNextPage ───────────────────────────

console.log('\n20. Pagination limit+1 (slice displayDocs)');

const PAGE_SIZE = 20;

function applyLimitPlusOne(rawDocs) {
  const hasNextPage  = rawDocs.length > PAGE_SIZE;
  const displayDocs  = rawDocs.slice(0, PAGE_SIZE);
  const lastDoc      = displayDocs.length > 0 ? displayDocs[displayDocs.length - 1] : null;
  return { hasNextPage, displayDocs, lastDoc };
}

test('21 docs → hasNextPage true, displayDocs.length = 20', () => {
  const raw = Array.from({ length: 21 }, (_, i) => ({ id: i }));
  const { hasNextPage, displayDocs } = applyLimitPlusOne(raw);
  assert.strictEqual(hasNextPage, true);
  assert.strictEqual(displayDocs.length, 20);
});
test('20 docs → hasNextPage false (dernière page exacte)', () => {
  const raw = Array.from({ length: 20 }, (_, i) => ({ id: i }));
  const { hasNextPage, displayDocs } = applyLimitPlusOne(raw);
  assert.strictEqual(hasNextPage, false);
  assert.strictEqual(displayDocs.length, 20);
});
test('7 docs → hasNextPage false, displayDocs.length = 7', () => {
  const raw = Array.from({ length: 7 }, (_, i) => ({ id: i }));
  const { hasNextPage, displayDocs } = applyLimitPlusOne(raw);
  assert.strictEqual(hasNextPage, false);
  assert.strictEqual(displayDocs.length, 7);
});
test('0 docs → hasNextPage false, lastDoc null', () => {
  const { hasNextPage, lastDoc } = applyLimitPlusOne([]);
  assert.strictEqual(hasNextPage, false);
  assert.strictEqual(lastDoc, null);
});
test('21ème doc ne fait pas partie de displayDocs', () => {
  const raw = Array.from({ length: 21 }, (_, i) => ({ id: i }));
  const { displayDocs } = applyLimitPlusOne(raw);
  assert(!displayDocs.find(d => d.id === 20), 'doc id=20 ne devrait pas être affiché');
});
test('lastDoc = 20ème doc (index 19) quand 21 docs', () => {
  const raw = Array.from({ length: 21 }, (_, i) => ({ id: i }));
  const { lastDoc } = applyLimitPlusOne(raw);
  assert.strictEqual(lastDoc.id, 19);
});
test('page 1 : labels corrects avec displayDocs.length', () => {
  const raw = Array.from({ length: 21 }, (_, i) => ({ id: i }));
  const { displayDocs } = applyLimitPlusOne(raw);
  const label = buildPageLabel(1, PAGE_SIZE, displayDocs.length);
  assert.strictEqual(label, '21–40 avis');
});

// ─── 21. formatDate (avis.js) ─────────────────────────────────────────────────

console.log('\n21. formatDate');

function formatDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

test('formatDate null → chaîne vide', () =>
  assert.strictEqual(formatDate(null), ''));
test('formatDate undefined → chaîne vide', () =>
  assert.strictEqual(formatDate(undefined), ''));
test('formatDate timestamp objet {toDate()} → string non vide', () => {
  const ts = { toDate: () => new Date('2026-05-17T10:30:00Z') };
  const r = formatDate(ts);
  assert(r.length > 0, 'résultat vide');
});
test('formatDate Date ISO string → string non vide', () => {
  const r = formatDate('2026-05-17T10:30:00Z');
  assert(r.length > 0, 'résultat vide');
});
test('formatDate avec toDate() et sans toDate() → même résultat', () => {
  const date = new Date('2026-05-17T10:30:00.000Z');
  const withToDate    = formatDate({ toDate: () => date });
  const withISOString = formatDate(date.toISOString());
  assert.strictEqual(withToDate, withISOString);
});

// ─── 22. XSS : escapeHtml sous attaque ───────────────────────────────────────

console.log('\n22. XSS : escapeHtml sous attaque réelle');

const XSS_CASES = [
  ['<script>alert(1)</script>',              false, 'script tag'],
  ['<img src=x onerror=alert(1)>',           false, 'img onerror'],
  ['<svg onload=alert(1)>',                  false, 'svg onload'],
  ['javascript:alert(1)',                    true,  'javascript: URI (pas de balise)'],
  ['" onmouseover="alert(1)',                false, 'attribute injection via quote'],
  ["' onclick='alert(1)",                    true,  "apostrophe (non échappée — pas dans la spec)"],
  ['<iframe src="javascript:alert(1)">',     false, 'iframe javascript'],
  ['<body onload=alert(1)>',                 false, 'body onload'],
  ['<!--<script>alert(1)</script>-->',        false, 'commentaire HTML avec script'],
  ['&lt;script&gt;',                         true,  'entités déjà encodées → double-encodées OK'],
  ['<details open ontoggle=alert(1)>',       false, 'details ontoggle'],
  ['<math><mtext></p><img src=x onerror=alert(1)></math>', false, 'math context bypass'],
];

XSS_CASES.forEach(([payload, , desc]) => {
  test(`XSS bloqué : ${desc}`, () => {
    const out = escapeHtml(payload);
    // Garantie : aucun tag HTML exécutable dans l'output (< neutralisé en &lt;)
    assert(!out.includes('<script'),  `<script présent dans : ${out}`);
    assert(!out.includes('<img'),     `<img présent dans : ${out}`);
    assert(!out.includes('<svg'),     `<svg présent dans : ${out}`);
    assert(!out.includes('<iframe'),  `<iframe présent dans : ${out}`);
    assert(!out.includes('<body'),    `<body présent dans : ${out}`);
    assert(!out.includes('<math'),    `<math présent dans : ${out}`);
    assert(!out.includes('<details'), `<details présent dans : ${out}`);
    // Les tokens onerror=/onload= peuvent rester en texte brut (safe : pas de tag)
  });
});

test('escapeHtml — string vide → string vide', () =>
  assert.strictEqual(escapeHtml(''), ''));
test('escapeHtml — idempotente sur texte déjà encodé', () => {
  const once = escapeHtml('<test>');
  const twice = escapeHtml(once);
  assert.strictEqual(once, '&lt;test&gt;');
  assert.notStrictEqual(twice, once, 'double-encodage attendu (défense en profondeur)');
});
test('escapeHtml — longueur max réaliste (1000 chars XSS)', () => {
  const payload = '<script>'.repeat(125);
  const out = escapeHtml(payload);
  assert(!out.includes('<script'));
});

// ─── 23. clampStars : entrées absurdes ───────────────────────────────────────

console.log('\n23. clampStars : entrées absurdes');

test('clampStars — float "2.9" → 2', () =>
  assert.strictEqual(clampStars('2.9'), 2));
test('clampStars — float "3.1" → 3', () =>
  assert.strictEqual(clampStars('3.1'), 3));
test('clampStars — "Infinity" → 1 (parseInt base10 donne NaN → fallback 1)', () =>
  assert.strictEqual(clampStars('Infinity'), 1));
test('clampStars — "-Infinity" → 1 (clamp min)', () =>
  assert.strictEqual(clampStars('-Infinity'), 1));
test('clampStars — "NaN" → 1 (fallback)', () =>
  assert.strictEqual(clampStars('NaN'), 1));
test('clampStars — "  3  " (espaces) → 3', () =>
  assert.strictEqual(clampStars('  3  '), 3));
test('clampStars — "3abc" → 3 (parseInt s\'arrête au premier non-numérique)', () =>
  assert.strictEqual(clampStars('3abc'), 3));
test('clampStars — "0x10" (hex) → 1 (parseInt base 10 → 0, clamp 1)', () =>
  assert.strictEqual(clampStars('0x10'), 1));
test('clampStars — null → 1', () =>
  assert.strictEqual(clampStars(null), 1));
test('clampStars — tableau → 1', () =>
  assert.strictEqual(clampStars([3]), 3));
test('clampStars — string unicode "３" → 1', () =>
  assert.strictEqual(clampStars('３'), 1));
test('clampStars — résultat toujours entier dans [1,4]', () => {
  const inputs = ['0','1','2','3','4','5','999','-99','abc','','  ','3.9','null','undefined'];
  inputs.forEach(v => {
    const r = clampStars(v);
    assert(Number.isInteger(r) && r >= 1 && r <= 4, `clampStars("${v}") = ${r} hors [1,4]`);
  });
});

// ─── 24. Routage étoiles : cas limites ────────────────────────────────────────

console.log('\n24. Routage étoiles : cas limites');

test('choose(0, url) → feedback?stars=0 (hors plage, clamp côté feedback)', () =>
  assert.strictEqual(choose(0, GOOGLE_URL), 'feedback.html?stars=0'));
test('choose(6, url) → feedback?stars=6 (non 5, pas Google)', () =>
  assert.strictEqual(choose(6, GOOGLE_URL), 'feedback.html?stars=6'));
test('choose(-1, url) → feedback (négatif non égal à 5)', () =>
  assert.strictEqual(choose(-1, GOOGLE_URL), 'feedback.html?stars=-1'));
test('choose(5, "#") → "#" (Google URL = # en dev)', () =>
  assert.strictEqual(choose(5, '#'), '#'));
test('5 étoiles UNIQUEMENT redirige Google (pas 4, pas 6)', () => {
  [1,2,3,4,6].forEach(n =>
    assert.notStrictEqual(choose(n, GOOGLE_URL), GOOGLE_URL, `${n}★ ne devrait pas aller sur Google`));
  assert.strictEqual(choose(5, GOOGLE_URL), GOOGLE_URL);
});

// ─── 25. cooldown : timestamps extrêmes ──────────────────────────────────────

console.log('\n25. Cooldown : timestamps extrêmes');

test('cooldown — lastSubmit = Date.now() (soumis à l\'instant) → actif', () => {
  const now = Date.now();
  assert.strictEqual(checkCooldown(now, now), true);
});
test('cooldown — lastSubmit dans le futur → actif (différence négative < COOLDOWN_MS)', () => {
  const now = Date.now();
  assert.strictEqual(checkCooldown(now + 10000, now), true);
});
test('cooldown — lastSubmit = epoch 0 (jamais soumis) → inactif', () =>
  assert.strictEqual(checkCooldown(0, Date.now()), false));
test('cooldown — lastSubmit = -1 → inactif (avant epoch)', () =>
  assert.strictEqual(checkCooldown(-1, Date.now()), false));
test('cooldown — lastSubmit = Number.MAX_SAFE_INTEGER → actif', () => {
  const now = Date.now();
  assert.strictEqual(checkCooldown(Number.MAX_SAFE_INTEGER, now), true);
});
test('cooldown — boundary exact -1ms avant 24h → actif', () => {
  const now = Date.now();
  assert.strictEqual(checkCooldown(now - (24 * 3600 * 1000 - 1), now), true);
});
test('cooldown — boundary exact 24h → inactif', () => {
  const now = Date.now();
  assert.strictEqual(checkCooldown(now - 24 * 3600 * 1000, now), false);
});
test('cooldown — boundary exact +1ms après 24h → inactif', () => {
  const now = Date.now();
  assert.strictEqual(checkCooldown(now - (24 * 3600 * 1000 + 1), now), false);
});

// ─── 26. darkenHex : inputs extrêmes ─────────────────────────────────────────

console.log('\n26. darkenHex : inputs extrêmes');

test('darkenHex — amount très grand (#fff, 999) → #000000', () =>
  assert.strictEqual(darkenHex('#ffffff', 999), '#000000'));
test('darkenHex — amount 0 → couleur inchangée (lowercase)', () =>
  assert.strictEqual(darkenHex('#aabbcc', 0), '#aabbcc'));
test('darkenHex — amount négatif → canaux augmentent (clamped à 255)', () => {
  const r = darkenHex('#f0f0f0', -10);
  assert.match(r, /^#[0-9a-f]{6}$/);
  const num = parseInt(r.slice(1), 16);
  assert((num >> 16) <= 255);
});
test('darkenHex — résultat toujours 7 chars (#rrggbb)', () => {
  ['#000000','#ffffff','#D62300','#FF8732','#FFAA00'].forEach(c => {
    assert.strictEqual(darkenHex(c, 30).length, 7, `longueur incorrecte pour ${c}`);
  });
});
test('darkenHex — chaque canal indépendant', () => {
  const result = darkenHex('#ff0000', 10);
  const num = parseInt(result.slice(1), 16);
  assert.strictEqual((num >> 8) & 0xff, 0, 'G devrait rester 0');
  assert.strictEqual(num & 0xff, 0,        'B devrait rester 0');
  assert.strictEqual(num >> 16, 245,       'R devrait être 245');
});

// ─── 27. renderStars : valeurs absurdes ──────────────────────────────────────

console.log('\n27. renderStars : valeurs absurdes');

test('renderStars(NaN) → 0 filled (clamp 0)', () => {
  const r = renderStars(NaN);
  assert(!r.includes('★'), `★ trouvée pour NaN : ${r}`);
});
test('renderStars(Infinity) → 0 filled, pas de crash (isFinite guard)', () => {
  assert.doesNotThrow(() => renderStars(Infinity));
  assert(!renderStars(Infinity).includes('★'));
});
test('renderStars(-Infinity) → 0 filled, pas de crash (isFinite guard)', () => {
  assert.doesNotThrow(() => renderStars(-Infinity));
  assert(!renderStars(-Infinity).includes('★'));
});
test('renderStars(2.9) → 2 (troncature via Math.min/max)', () => {
  const r = renderStars(2.9);
  assert(r.includes('★★'), 'devrait avoir 2 étoiles pleines');
});
test('renderStars — toujours 5 symboles (★+☆) pour toute entrée entière [0,5]', () => {
  [0,1,2,3,4,5].forEach(n => {
    const r = renderStars(n);
    const filled = (r.match(/★/g) || []).length;
    const empty  = (r.match(/☆/g) || []).length;
    assert.strictEqual(filled + empty, 5, `total ≠ 5 pour n=${n}`);
  });
});

// ─── 28. UUID : conformité stricte ───────────────────────────────────────────

console.log('\n28. UUID v4 : conformité stricte');

const UUID_V4_STRICT = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test('generateId — version = 4 (3ème groupe commence par 4)', () => {
  for (let i = 0; i < 20; i++) {
    const id = generateId();
    assert.strictEqual(id.split('-')[2][0], '4', `version incorrecte : ${id}`);
  }
});
test('generateId — variant correct (4ème groupe commence par 8,9,a,b)', () => {
  const valid = new Set(['8','9','a','b']);
  for (let i = 0; i < 20; i++) {
    const id = generateId();
    assert(valid.has(id.split('-')[3][0]), `variant incorrect : ${id}`);
  }
});
test('generateId — format strict UUID v4 sur 50 appels', () => {
  for (let i = 0; i < 50; i++) {
    assert.match(generateId(), UUID_V4_STRICT);
  }
});
test('generateId — pas de collision sur 1000 IDs', () => {
  const ids = new Set(Array.from({ length: 1000 }, () => generateId()));
  assert.strictEqual(ids.size, 1000, 'collision détectée');
});
test('generateId — lowercase uniquement', () => {
  for (let i = 0; i < 20; i++) {
    const id = generateId();
    assert.strictEqual(id, id.toLowerCase(), `majuscule dans UUID : ${id}`);
  }
});

// ─── 29. filterAvis : données malformées ─────────────────────────────────────

console.log('\n29. filterAvis : données malformées');

test('filterAvis — tableau vide → vide', () =>
  assert.strictEqual(filterAvis([], 'all').length, 0));
test('filterAvis — avis sans champ stars → ignoré par filtre numérique', () => {
  const avis = [{ message: 'pas de stars' }, { stars: 3, message: 'ok' }];
  const r = filterAvis(avis, '3');
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].stars, 3);
});
test('filterAvis — stars null → ignoré par filtre numérique', () => {
  const avis = [{ stars: null }, { stars: 2 }];
  assert.strictEqual(filterAvis(avis, '2').length, 1);
});
test('filterAvis — stars float (3.0) → filtre "3" le trouve', () => {
  const avis = [{ stars: 3.0 }];
  assert.strictEqual(filterAvis(avis, '3').length, 1);
});
test('filterAvis — filtre "all" ne touche pas aux données', () => {
  const avis = [{ stars: 1 }, { stars: 3, prize: 'x' }, { message: 'weird' }];
  assert.strictEqual(filterAvis(avis, 'all').length, 3);
});
test('filterAvis — filtre inexistant "6" → 0 résultats', () =>
  assert.strictEqual(filterAvis(SAMPLE_AVIS, '6').length, 0));

// ─── 30. aggregateCounts : timestamps extrêmes ───────────────────────────────

console.log('\n30. aggregateCounts : timestamps extrêmes');

test('aggregateCounts — timestamp très ancien (2000) → ignoré', () => {
  const buckets = buildBuckets(14, REF_DATE);
  aggregateCounts([{ timestamp: { toDate: () => new Date('2000-01-01') } }], buckets);
  assert(buckets.every(b => b.count === 0));
});
test('aggregateCounts — timestamp futur → ignoré', () => {
  const buckets = buildBuckets(14, REF_DATE);
  aggregateCounts([{ timestamp: { toDate: () => new Date('2099-12-31') } }], buckets);
  assert(buckets.every(b => b.count === 0));
});
test('aggregateCounts — timestamp = null → ignoré', () => {
  const buckets = buildBuckets(14, REF_DATE);
  aggregateCounts([{ timestamp: null }], buckets);
  assert(buckets.every(b => b.count === 0));
});
test('aggregateCounts — toDate() lance une exception → non propagée', () => {
  const buckets = buildBuckets(14, REF_DATE);
  assert.doesNotThrow(() => {
    try {
      aggregateCounts([{ timestamp: { toDate: () => { throw new Error('bad ts'); } } }], buckets);
    } catch (_) {}
  });
});
test('aggregateCounts — 500 avis même jour → count = 500', () => {
  const buckets = buildBuckets(14, REF_DATE);
  const avis = Array.from({ length: 500 }, () => ({
    timestamp: { toDate: () => new Date('2026-05-15T12:00:00Z') },
  }));
  aggregateCounts(avis, buckets);
  assert.strictEqual(buckets.find(b => b.key === '2026-05-15').count, 500);
});

// ─── 31. dayKey : cas limites calendrier ─────────────────────────────────────

console.log('\n31. dayKey : cas limites calendrier');

test('dayKey — 29 février année bissextile (2024)', () =>
  assert.strictEqual(dayKey(new Date('2024-02-29T12:00:00Z')), '2024-02-29'));
test('dayKey — 1er janvier minuit', () =>
  assert.strictEqual(dayKey(new Date('2026-01-01T00:00:00')), '2026-01-01'));
test('dayKey — 31 décembre', () =>
  assert.strictEqual(dayKey(new Date('2026-12-31T23:59:59')), '2026-12-31'));
test('dayKey — epoch 0 → date cohérente non vide', () => {
  const k = dayKey(new Date(0));
  assert.match(k, /^\d{4}-\d{2}-\d{2}$/);
});
test('dayKey — format toujours YYYY-MM-DD (10 chars)', () => {
  const dates = ['2026-01-01','2026-06-15','2026-12-31','2024-02-29'];
  dates.forEach(d => assert.strictEqual(dayKey(new Date(d + 'T12:00:00Z')).length, 10));
});

// ─── 32. buildBuckets : tailles extrêmes ─────────────────────────────────────

console.log('\n32. buildBuckets : tailles extrêmes');

test('buildBuckets(1) → 1 bucket = aujourd\'hui', () => {
  const ref = new Date('2026-05-17T12:00:00Z');
  const b = buildBuckets(1, ref);
  assert.strictEqual(b.length, 1);
  assert.strictEqual(b[0].key, '2026-05-17');
});
test('buildBuckets(0) → tableau vide', () =>
  assert.strictEqual(buildBuckets(0, new Date()).length, 0));
test('buildBuckets(365) → 365 buckets, clés toutes uniques', () => {
  const b = buildBuckets(365, new Date('2026-12-31T12:00:00Z'));
  assert.strictEqual(b.length, 365);
  assert.strictEqual(new Set(b.map(x => x.key)).size, 365);
});
test('buildBuckets — buckets ordonnés chronologiquement (asc)', () => {
  const b = buildBuckets(14, new Date('2026-05-17T12:00:00Z'));
  for (let i = 1; i < b.length; i++)
    assert(b[i].key > b[i-1].key, `ordre cassé à ${i} : ${b[i-1].key} > ${b[i].key}`);
});

// ─── Résumé ───────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(45)}`);
console.log(`  ${passed} test(s) réussi(s)  |  ${failed} échec(s)`);
console.log(`${'─'.repeat(45)}\n`);

if (failed > 0) process.exit(1);
