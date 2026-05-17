# Burger King Avis – Documentation des tests

## Lancer les tests

```bash
node tests/test.js
```

Aucune dépendance externe requise. Node.js suffit (module natif `assert`).

Résultat attendu : **147 tests réussis, 0 échec.**

---

## Approche

Le projet est du JavaScript vanilla sans framework de test. Les tests sont écrits dans un seul fichier `tests/test.js` qui :

1. **Extrait la logique pure** de `feedback.js` et `script.js` (les fonctions sans DOM)
2. **Les teste directement** avec `assert` de Node.js
3. **Affiche un rapport** coloré avec le nombre de succès et d'échecs

Les fonctions qui manipulent le DOM (dessin du canvas, manipulation du `document`) ne sont pas testables sans navigateur et sont donc exclues. On teste uniquement ce qui peut tourner en Node.js.

---

## Bug trouvé pendant les tests

Lors de l'écriture du test de validation des couleurs hex, le regex initial `/^#[0-9A-Fa-f]{6}$/` rejetait `#fff` (raccourci CSS à 3 chiffres valide utilisé dans `textColor`). Le regex a été corrigé en `/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/` pour accepter les deux formes.

---

## Détail des 15 sections de tests

---

### 1. Clamp de la note — 9 tests

**Fichier source :** `public/feedback.js`, ligne 8
**Fonction testée :**
```js
Math.max(1, Math.min(4, parseInt(raw, 10) || 1))
```

**Pourquoi ce test ?**
La note arrive via le paramètre `?stars=` dans l'URL. Un utilisateur peut modifier l'URL manuellement. Ce clamp empêche des valeurs absurdes d'atteindre le formulaire ou l'API Web3Forms.

| Entrée | Résultat attendu | Raison |
|--------|-----------------|--------|
| `"3"` | `3` | Valeur normale |
| `"1"` | `1` | Borne basse valide |
| `"4"` | `4` | Borne haute valide |
| `"5"` | `4` | Les 5★ ne passent jamais par cette page |
| `"0"` | `1` | En dessous du minimum |
| `"-1"` | `1` | Négatif → minimum |
| `"abc"` | `1` | Non numérique → `parseInt` renvoie `NaN`, `|| 1` s'active |
| `""` | `1` | Vide → même comportement que non numérique |
| `"999"` | `4` | Très grande valeur → maximum |

---

### 2. Fonction `easeOut` — 5 tests

**Fichier source :** `public/feedback.js`
**Fonction testée :**
```js
function easeOut(t) {
  return 1 - Math.pow(1 - t, 4);
}
```

**Pourquoi ce test ?**
`easeOut` contrôle le profil de décélération de la roulette. Si elle est mal implémentée, la roue peut s'arrêter brusquement ou ne jamais vraiment ralentir. Les propriétés mathématiques à garantir sont strictes.

| Test | Valeur vérifiée | Signification |
|------|----------------|---------------|
| `easeOut(0) = 0` | Exact | La roue part de l'immobile |
| `easeOut(1) = 1` | Exact | La roue atteint bien sa destination finale |
| Monotone croissante | Sur 8 points de [0,1] | Pas de retour en arrière possible |
| `easeOut(0.5) > 0.8` | ~0.9375 | Départ rapide : à mi-chemin du temps, 93% de la distance est parcourue |
| Reste dans [0, 1] | Sur 21 points | Aucun dépassement qui provoquerait une rotation inverse |

---

### 3. Mathématique de la roulette — 6 tests

**Fichier source :** `public/feedback.js`, fonction `spin()`
**Logique testée :**
```js
let delta = startAngle + Math.PI / 2 + (winner + 0.5) * slice;
delta = ((delta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
if (delta < 0.1) delta += 2 * Math.PI;
delta += extraTurns;
const finalAngle = startAngle - delta;
```

**Pourquoi ce test ?**
C'est la partie la plus critique : le gagnant est tiré aléatoirement *avant* l'animation, puis la rotation est calculée pour amener exactement ce segment sous le pointeur. Une erreur ici signifie que la roulette s'arrête sur le mauvais cadeau — ce serait un bug visible par tous les clients.

**Fonction de vérification inverse utilisée dans le test :**
```js
function winnerAtPointer(finalAngle) {
  let pos = ((-Math.PI / 2 - finalAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  return Math.floor(pos / slice) % PRIZES.length;
}
```
Elle calcule quel segment se trouve sous le pointeur (à -π/2, le sommet du canvas) après rotation.

| Test | Ce qui est vérifié |
|------|--------------------|
| winner=0 (4 Nuggets) | Le segment 0 est sous le pointeur après rotation |
| winner=1 (Cheeseburger) | Le segment 1 est sous le pointeur après rotation |
| winner=2 (Sundae) | Le segment 2 est sous le pointeur après rotation |
| winner=3 (6 Onion Rings) | Le segment 3 est sous le pointeur après rotation |
| 6 angles de départ différents × 4 gagnants | La formule est correcte quelle que soit la position de départ (24 combinaisons) |
| Delta ≥ 5 tours pour chaque gagnant | L'animation dure assez longtemps pour créer l'effet de suspense |

---

### 4. Structure du tableau `PRIZES` — 4 tests

**Fichier source :** `public/feedback.js`
**Données testées :**
```js
const PRIZES = [
  { emoji: '🍗', label: '4 Nuggets',     color: '#D62300', textColor: '#fff' },
  { emoji: '🍔', label: 'Cheeseburger',  color: '#F5A623', textColor: '#1A1A1A' },
  { emoji: '🍦', label: 'Sundae',        color: '#1A1A1A', textColor: '#fff' },
  { emoji: '🧅', label: '6 Onion Rings', color: '#502314', textColor: '#fff' },
];
```

**Pourquoi ce test ?**
Si quelqu'un modifie ce tableau pour changer les cadeaux, ces tests détectent immédiatement une entrée malformée (champ manquant, couleur invalide) avant même d'ouvrir le navigateur.

| Test | Ce qui est vérifié |
|------|--------------------|
| Exactement 4 entrées | La roue est divisée en 4 quarts de 90° — un 5ème segment casserait la géométrie |
| 4 champs présents par entrée | `emoji`, `label`, `color`, `textColor` tous requis par `drawWheel()` |
| Couleurs hex valides (`#xxx` ou `#xxxxxx`) | Une couleur invalide serait ignorée silencieusement par le canvas |
| Labels non vides | Un label vide afficherait un texte blanc sur fond coloré dans le résultat |

---

### 5. Routage selon la note — 5 tests

**Fichier source :** `public/script.js`, fonction `choose()`
**Logique testée :**
```js
function choose(value) {
  if (value === 5) {
    window.location.href = GOOGLE_REVIEWS_URL;
  } else {
    window.location.href = 'feedback.html?stars=' + value;
  }
}
```

**Pourquoi ce test ?**
C'est le cœur de la stratégie produit : les clients satisfaits doivent aller sur Google, les autres sur le formulaire interne. Une inversion ici enverrait des avis négatifs sur Google Maps.

| Entrée | Destination attendue |
|--------|---------------------|
| `5` | URL Google Reviews |
| `4` | `feedback.html?stars=4` |
| `3` | `feedback.html?stars=3` |
| `2` | `feedback.html?stars=2` |
| `1` | `feedback.html?stars=1` |

---

### 6. darkenHex — 5 tests

**Pourquoi ce test ?**
`darkenHex` génère la teinte de fond de la section prize reveal. Une couleur corrompue afficherait un fond transparent ou noir.

| Test | Ce qui est vérifié |
|------|--------------------|
| `amount=0` → couleur inchangée | Cas trivial |
| Assombrit `#FF8732` de 55 | Calcul canal correct |
| Clamp à 0 si canal négatif | Pas de valeurs négatives en hex |
| `#000000` reste `#000000` | Borne basse |
| Résultat toujours hex 6 chiffres | Format valide pour CSS |

---

### 7. isLight (fond clair pour prize reveal) — 3 tests

**Pourquoi ce test ?**
Détermine si le texte affiché sur le cadeau doit être sombre ou clair. Une erreur → texte illisible.

| Test | Ce qui est vérifié |
|------|--------------------|
| Exactement 1 prix a fond clair | Seul "6 Onion Rings" (jaune) |
| Ce prix est bien "6 Onion Rings" | Identification correcte |
| Les 4 autres ont `textColor` blanc | Pas de faux positif |

---

### 8. Génération HTML étoiles — 6 tests

| Entrée | Ce qui est vérifié |
|--------|--------------------|
| stars=1 à 5 | N filled + (5-N) empty = 5 toujours |

---

### 9. Cohérence avancée PRIZES — 4 tests

| Test | Ce qui est vérifié |
|------|--------------------|
| Labels uniques | Pas de doublons |
| Couleurs segments uniques | Roue visuellement distincte |
| `imgSrc` termine par `.png` | Format image correct |
| `imgSrc` commence par `images/` | Chemin relatif valide |

---

### 10. easeOut décélération — 2 tests

| Test | Ce qui est vérifié |
|------|--------------------|
| Vitesse décroissante sur 10 pas | Pas d'accélération en cours de route |
| `easeOut(0.25) > 0.5` | Départ rapide confirmé |

---

### 11. Toggle roulette (lecture config Firestore) — 6 tests

**Fichier source :** `public/feedback.js` + `public/admin.js`

| Test | Ce qui est vérifié |
|------|--------------------|
| Doc Firestore inexistant → roulette activée | Défaut sûr |
| `roulette_enabled: true` → activée | Cas normal |
| `roulette_enabled: false` → désactivée | Toggle off |
| Champ absent dans doc existant → activée | `undefined !== false` |
| `rouletteEnabled=true` → affiche `#roulette-section` | Branchement UI |
| `rouletteEnabled=false` → affiche `#merci-section` | Branchement UI |

---

### 12. Toggle email (envoi Web3Forms conditionnel) — 8 tests

| Test | Ce qui est vérifié |
|------|--------------------|
| Doc inexistant → email activé | Défaut sûr |
| `email_enabled: true/false` | Toggle |
| Champ absent → activé | `undefined !== false` |
| `emailEnabled=true` → envoi | Branchement |
| `emailEnabled=false` → pas d'envoi | Skip Web3Forms |
| Roulette et email indépendants | Email OFF n'affecte pas roulette |
| Les deux OFF simultanément | Pas d'interaction |

---

### 13. Config environnements (dev/prod) — 20 tests

| Catégorie | Ce qui est vérifié |
|-----------|--------------------|
| Structure | 6 champs requis présents dans dev et prod (incl. AVIS_COLLECTION) |
| ENV | `dev.ENV = "dev"`, `prod.ENV = "prod"` |
| Clés | Non vides, différentes entre dev et prod |
| URLs | `dev.GOOGLE_REVIEWS_URL = "#"`, `prod` commence par `https://` |
| `resolveKey()` | dev → clé dev, prod → clé prod, undefined → `""` |
| `resolveGoogleUrl()` | dev → `"#"`, prod → URL réelle, undefined → `"#"` |
| `showDevBanner` | true en dev, false en prod et sans CONFIG |
| Fichiers réels | `config/dev.js` et `config/prod.js` chargent sans erreur |

---

### 14. Isolation collections Firestore (dev/prod) — 8 tests

| Test | Ce qui est vérifié |
|------|--------------------|
| dev → collection `config-dev` | Isolation correcte |
| prod → collection `config` | Collection prod |
| dev ≠ prod | Pas de pollution croisée |
| doc = `settings` dans les deux | Cohérence doc |
| ref dev = `config-dev/settings` | Chemin complet |
| ref prod = `config/settings` | Chemin complet |
| Sans CONFIG → fallback `config/settings` | Défaut sûr |
| refs dev et prod distinctes | Garantie isolation |
| dev.AVIS_COLLECTION = `avis-dev` | Isolation avis |
| prod.AVIS_COLLECTION = `avis` | Collection prod |
| avis dev ≠ avis prod | Pas de pollution croisée |

---

### 15. Payload avis Firestore — 7 tests

**Fichier source :** `public/feedback.js`

| Test | Ce qui est vérifié |
|------|--------------------|
| Payload contient `stars` et `message` | Champs obligatoires |
| `stars` dans [1,4] pour toutes valeurs valides | Pas de valeur hors-range |
| `buildPrizeUpdate` contient le label exact | Update prize correct |
| `resolveAvisCollection(dev)` → `"avis-dev"` | Isolation dev |
| `resolveAvisCollection(prod)` → `"avis"` | Collection prod |
| `resolveAvisCollection(undefined)` → `"avis"` | Fallback prod sûr |
| Collections avis dev et prod distinctes | Pas de pollution croisée |

---

## Ce qui n'est pas testé (et pourquoi)

| Élément | Raison de l'exclusion |
|---------|----------------------|
| `drawWheel()` | Utilise l'API Canvas — pas disponible en Node.js sans librairie externe |
| `showPrize()` | Manipule le DOM (`getElementById`, `style`) — idem |
| `animate()` | Dépend de `requestAnimationFrame` — uniquement disponible en navigateur |
| Soumission du formulaire | Appel réseau réel vers Web3Forms — à tester manuellement |
| Affichage des étoiles au survol | Interaction CSS/DOM — à tester manuellement dans le navigateur |
