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
test('5 est ramené à 4 (les 5★ ne passent pas par ce formulaire)', () => assert.strictEqual(clampStars('5'), 4));
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

// ─── Résumé ───────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(45)}`);
console.log(`  ${passed} test(s) réussi(s)  |  ${failed} échec(s)`);
console.log(`${'─'.repeat(45)}\n`);

if (failed > 0) process.exit(1);
