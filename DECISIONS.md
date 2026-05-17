# Burger King Avis – Décisions & Documentation

Ce fichier centralise toutes les décisions techniques et de conception prises sur ce projet, ainsi que les informations importantes pour le maintenir ou le faire évoluer.

---

## Vue d'ensemble

Application web statique (HTML/CSS/JS vanilla) permettant de collecter les avis clients en restaurant Burger King via un QR code.

**Flux principal :**
```
QR code → index.html (notation 1-5 étoiles)
              ├── 5 étoiles → redirection Google Reviews (avis public)
              └── 1-4 étoiles → feedback.html (formulaire interne)
                                    ↓
                               email au gérant via Web3Forms (si email_enabled)
                                    ↓
                               roulette cadeau (si roulette_enabled)
                               ou merci simple (si désactivée)

admin.html → Firebase Auth → dashboard admin
                                 ├── toggle roulette → Firestore config
                                 └── toggle email → Firestore config
```

---

## Stack technique

| Composant       | Choix             | Raison                                                          |
|-----------------|-------------------|-----------------------------------------------------------------|
| Langage         | HTML/CSS/JS vanilla | Zéro dépendance, déploiement immédiat, aucune build step      |
| Hébergement     | Firebase Hosting  | CDN global, HTTPS gratuit, déploiement simple                  |
| Email           | Web3Forms         | Pas de backend requis, clé API publique sans risque            |
| Framework CSS   | Aucun             | Le projet est trop petit pour justifier Bootstrap ou Tailwind  |
| Animations      | Canvas API + CSS  | Natif, performant, pas de librairie externe                    |

---

## Décisions clés

### 1. Séparer les avis 5 étoiles des autres

**Décision :** Les 5 étoiles redirigent immédiatement vers Google Reviews. Les 1-4 étoiles ouvrent un formulaire interne.

**Raison :** Les clients satisfaits doivent laisser un avis public sur Google (meilleur référencement). Les clients mécontents sont redirigés en interne pour éviter un avis Google négatif et permettre au gérant de traiter le problème directement.

---

### 2. Remplacer EmailJS par Web3Forms

**Commit :** `fix: remplace EmailJS par Web3Forms`

**Problème :** EmailJS nécessitait une clé API privée difficile à sécuriser côté client, et le compte avait atteint ses limites.

**Solution :** Web3Forms accepte une clé publique (`access_key`) dans le code source client sans risque de sécurité, car elle est liée à une adresse email de destination et non à un compte de facturation. La clé est donc intentionnellement visible dans le code.

**Clé Web3Forms (publique) :** `39c512ae-ad7f-4a07-8b89-474adc23c163`

---

### 3. Déplacer les fichiers dans `/public`

**Commit :** `refactor: déplace fichiers statiques dans public/`

**Raison :** Firebase Hosting attend les fichiers dans le dossier `public/` selon la configuration `firebase.json`. Cette structure permet aussi de séparer clairement les fichiers déployés de la configuration du projet.

---

### 4. Roulette cadeau après soumission du formulaire

**Commit :** `feat: roulette BK après envoi d'avis client`

**Décision :** Après envoi réussi du formulaire (1-4 étoiles), afficher une roulette interactive plutôt qu'un simple message de remerciement.

**Raison :** Récompenser le client mécontent qui prend le temps de laisser un avis augmente la probabilité qu'il revienne. C'est aussi un levier pour encourager la complétion du formulaire.

**Implémentation :**
- Roue dessinée en **Canvas API** (pas de librairie externe)
- 5 segments aux couleurs officielles Burger King
- Rotation avec easing `1 - (1-t)^4` pour un ralentissement réaliste
- 5 à 8 tours aléatoires avant l'arrêt pour l'effet de suspense
- Le segment gagnant est calculé mathématiquement (pas visuellement) — le résultat est choisi avant le lancement, puis la rotation est calculée pour y amener le pointeur

**Cadeaux disponibles :**

| Emoji | Cadeau              | Couleur segment  |
|-------|---------------------|------------------|
| 🍗   | 4 Nuggets           | `#D62300` rouge  |
| 🍔   | Cheeseburger        | `#F5A623` orange |
| 🍦   | King Fusion M&M's   | `#1A1A1A` noir   |
| 🧅   | 6 Onion Rings       | `#502314` marron |
| 🥧   | Pâtisserie          | `#F5C518` jaune  |

**Mathématique de la rotation :**
```
angle_initial = -3π/4  (segment 0 centré en haut, sous le pointeur)
delta = (startAngle + π/2 + (winner + 0.5) * slice) mod 2π
finalAngle = startAngle - delta - extraTurns
```

---

### 5. Dashboard admin + configuration Firestore

**Décision :** Ajouter `admin.html/admin.js` avec Firebase Auth Email/Password et deux toggles stockés dans Firestore.

**Raison :** Permettre au gérant d'activer/désactiver la roulette et l'envoi d'email sans toucher au code. Firestore `onSnapshot` → UI réactive sans polling.

**Implémentation :**
- `config/settings.roulette_enabled` (bool) → branching dans `feedback.js` post-submit
- `config/settings.email_enabled` (bool) → skip Web3Forms si false
- Valeur absente ou doc inexistant → comportement par défaut activé (pas de crash)
- Event listeners sur les toggles placés une seule fois (hors `showDashboard()`) pour éviter l'accumulation sur re-render

---

### 6. Séparation environnements DEV / PROD

**Décision :** Deux fichiers `config/dev.js` et `config/prod.js`, copiés vers `public/config.js` par `build.sh` avant déploiement.

**Raison :** Éviter de polluer la collection Firestore de prod pendant les tests. Chaque env a sa propre collection (`config-dev/settings` vs `config/settings`) et sa propre clé Web3Forms.

**Implémentation :**
- `config/dev.js` : `GOOGLE_REVIEWS_URL: '#'` (pas de redirect accidentel), bandeau DEV orange auto-injecté
- `config/prod.js` : clé prod Web3Forms `854bf41c-...`, URL Google réelle
- `public/config.js` est gitignored (fichier généré)
- Firestore rules mises à jour pour autoriser `config-dev`

---

### 7. Enregistrement avis dans Firestore

**Décision :** Sauvegarder chaque avis soumis dans Firestore (`avis` / `avis-dev`), puis mettre à jour le doc avec le prize gagné après la roulette.

**Raison :** Historique des avis pour le dashboard admin (stats, analyse roulette). Deux étapes (create → update) pour ne pas bloquer l'UX : l'utilisateur voit la roulette même si l'update prize échoue silencieusement.

**Implémentation :**
- `feedback.js` : `avisRef = await db.collection(AVIS_COL).add({ stars, message, timestamp })` à submit
- `showPrize()` : `avisRef.update({ prize: prize.label }).catch(() => {})` (silencieux si raté)
- `AVIS_COLLECTION` dans config (isolé par env : `avis` prod / `avis-dev` dev)
- Règles : `create + update` public (client non authentifié), `read` auth uniquement (admin), `delete` interdit

**Dashboard stats (`admin.js`) :**
- `onSnapshot(AVIS_COL)` → `updateStats()` : total, répartition par note, prizes triés par fréquence
- % par prize + barre proportionnelle + taux roulette (prizes / total avis)

---

### 8. Anti-abus cooldown 24h

**Décision :** Double protection contre les soumissions multiples. (1) UUID persistent `bk_client_id` en localStorage inclus dans chaque doc Firestore. (2) `bk_last_submit` timestamp → cooldown 24h côté client → section "Déjà envoyé !". (3) Collection Firestore `cooldowns/{clientId}` → rule `get()` bloque `avis create` côté serveur si cooldown actif. `?reset` URL param pour bypass en dev.

**Collections isolées par env :** `cooldowns` (prod) / `cooldowns-dev` (dev). `COOLDOWNS_COLLECTION` dans `config/dev.js` et `config/prod.js`.

---

### 9. Page liste avis (/avis)

**Décision :** `avis.html` + `avis.js` protégée par Firebase Auth. Redirect `/admin` si non connecté. `onSnapshot` temps réel. Filtres côté client (Tous/4★/3★/2★/1★). Cards avec `escapeHtml` sur les messages (XSS). Lien depuis dashboard admin.

---

### 10. Graphique temporel 14 jours

**Décision :** Bar chart Canvas natif dans le dashboard, 14 jours glissants. Barres orange BK, labels 9px fixe j/mm tous les 2 jours. Pas de librairie externe — Canvas cohérent avec la roulette.

---

## Configuration à personnaliser

### URL Google Reviews

Dans `config/prod.js` :
```js
GOOGLE_REVIEWS_URL: 'https://g.page/r/XXXXXXXXXXXXXXXX/review',
```

### Clés Web3Forms

- Prod (`config/prod.js`) : `854bf41c-...`
- Dev (`config/dev.js`) : `39c512ae-ad7f-4a07-8b89-474adc23c163`

Chaque clé est liée à une adresse email de destination — intentionnellement visible dans le code (pas de risque de sécurité).

### Cadeaux de la roulette

Dans `public/feedback.js`, tableau `PRIZES` — toujours **5 entrées** (segments de 72°) :
```js
const PRIZES = [
  { emoji: '🍗', label: '4 Nuggets',          color: '#D62300', textColor: '#fff',     imgSrc: 'images/nuggets.png' },
  { emoji: '🍔', label: 'Cheeseburger',        color: '#F5A623', textColor: '#1A1A1A', imgSrc: 'images/cheeseburger.png' },
  { emoji: '🍦', label: "King Fusion M&M's",   color: '#1A1A1A', textColor: '#fff',     imgSrc: 'images/kingfusion.png' },
  { emoji: '🧅', label: '6 Onion Rings',       color: '#502314', textColor: '#fff',     imgSrc: 'images/onionrings.png' },
  { emoji: '🥧', label: 'Pâtisserie',          color: '#F5C518', textColor: '#1A1A1A', imgSrc: 'images/patisserie.png' },
];
```

---

## Charte graphique Burger King

Variables CSS définies dans `style.css` :
```css
--bk-red:    #D62300;  /* rouge principal */
--bk-orange: #F5A623;  /* orange/doré */
--bk-dark:   #1A1A1A;  /* fond sombre */
--bk-brown:  #502314;  /* marron */
```

---

## Structure des fichiers

```
burger-king-avis/
├── DECISIONS.md
├── README.md
├── TESTS.md
├── firebase.json         ← hosting + firestore config
├── firestore.rules       ← read public, write auth only
├── build.sh              ← copie config/$ENV.js → public/config.js
├── .firebaserc
├── .gitignore
├── config/
│   ├── dev.js            ← constantes DEV
│   └── prod.js           ← constantes PROD
├── public/
│   ├── config.js         ← généré par build.sh (gitignored)
│   ├── index.html        ← page de notation (5 étoiles)
│   ├── script.js         ← logique de redirection selon la note
│   ├── feedback.html     ← formulaire de feedback (1-4 étoiles)
│   ├── feedback.js       ← soumission email + roulette + config Firestore
│   ├── admin.html        ← dashboard admin (login + toggles + stats + graphique)
│   ├── admin.js          ← Firebase Auth + Firestore onSnapshot + toggles + graphique temporel
│   ├── avis.html         ← liste avis (auth requise)
│   ├── avis.js           ← liste avis + filtres + onSnapshot
│   ├── style.css         ← styles partagés (thème BK)
│   ├── 404.html          ← page d'erreur personnalisée
│   └── images/           ← photos des cadeaux roulette (.png)
└── tests/
    └── test.js           ← 147 tests (Node.js natif)
```

---

## Déploiement

```bash
# DEV (test local)
ENV=dev ./build.sh && firebase serve

# PROD
ENV=prod ./build.sh && firebase deploy
```

URL publique : **https://burger-king-avis.web.app**

---

## Points d'attention

- **Pas de backend** : tout est statique. La sécurité repose sur le fait que la clé Web3Forms ne donne accès qu'à l'envoi d'emails vers une adresse prédéfinie.
- **`noindex, nofollow`** sur toutes les pages : l'outil ne doit pas apparaître dans Google.
- **Responsive mobile-first** : breakpoint à 400px, taille d'étoile réduite, canvas roulette réduit à 220px.
- **Accessibilité** : les étoiles sont des `role="button"` avec `tabindex` et `aria-label`, navigables au clavier (Entrée/Espace).
- **La roulette ne valide pas les gagnants côté serveur** : un client pourrait recharger la page et rejouer. Si la fraude devient un problème, il faudra ajouter un token unique côté Web3Forms ou un backend minimal.
