# Site de filtrage d'avis clients — Burger King

## Objectif

Filtrer les avis clients avant qu'ils n'atteignent Google :
- Client satisfait **(5 étoiles)** → redirigé vers la page Google Avis pour laisser un commentaire public
- Client insatisfait **(1 à 4 étoiles)** → formulaire interne + email au gérant + roulette cadeau

Un QR code placé en restaurant pointe vers ce site.

---

## Architecture

```
QR Code → index.html (étoiles 1-5)
              ├── 5★  → Google Reviews (URL externe)
              └── 1-4★ → feedback.html → Web3Forms (email)
                                              ↓
                                     roulette cadeau (si activée)
                                     ou merci simple (si désactivée)

admin.html → Firebase Auth → dashboard admin
                                 ├── toggle roulette (Firestore config)
                                 └── toggle email (Firestore config)
```

---

## Structure des fichiers

```
burger-king-avis/
├── README.md
├── DECISIONS.md
├── TESTS.md
├── firebase.json         ← hosting + firestore config
├── firestore.rules       ← read public, write auth only
├── build.sh              ← copie config/$ENV.js → public/config.js avant deploy
├── .firebaserc
├── .gitignore
├── config/
│   ├── dev.js            ← constantes environnement DEV
│   └── prod.js           ← constantes environnement PROD
├── public/
│   ├── config.js         ← généré par build.sh (gitignored)
│   ├── index.html        ← page de notation (5 étoiles)
│   ├── script.js         ← logique de redirection selon la note
│   ├── feedback.html     ← formulaire pour les avis négatifs
│   ├── feedback.js       ← soumission email + roulette + lecture config Firestore
│   ├── admin.html        ← dashboard admin (login + toggles)
│   ├── admin.js          ← Firebase Auth + Firestore onSnapshot + toggles
│   ├── style.css         ← styles partagés (thème BK)
│   ├── 404.html          ← page d'erreur personnalisée
│   └── images/           ← photos des cadeaux roulette (.png)
└── tests/
    └── test.js           ← 92 tests (Node.js natif, zéro dépendance)
```

---

## Environnements DEV / PROD

| Fichier | ENV | Collection Firestore | URL Google |
|---------|-----|---------------------|------------|
| `config/dev.js` | `dev` | `config-dev/settings` | `#` (pas de redirect) |
| `config/prod.js` | `prod` | `config/settings` | URL réelle |

```bash
# DEV (test local)
ENV=dev ./build.sh && firebase serve

# PROD
ENV=prod ./build.sh && firebase deploy
```

`build.sh` copie `config/$ENV.js` → `public/config.js` (gitignored).

Le bandeau DEV orange s'affiche automatiquement en env `dev` sur toutes les pages.

---

## Admin dashboard

URL : `https://burger-king-avis.web.app/admin`

Login : Email/Password Firebase Auth (`thibaudravier@gmail.com`).

**Toggles :**
- **Roulette** : active/désactive la roulette cadeau post-feedback
- **Email** : active/désactive l'envoi Web3Forms

États stockés dans Firestore `config/settings` (prod) ou `config-dev/settings` (dev).

---

## Firestore

```
config/settings          ← PROD
  roulette_enabled: bool (défaut true si absent)
  email_enabled: bool    (défaut true si absent)

config-dev/settings      ← DEV (mêmes champs)
```

Règles : lecture publique, écriture authentifiée uniquement.

---

## Cadeaux de la roulette

Tableau `PRIZES` dans `public/feedback.js` — 5 segments :

| Cadeau | Couleur |
|--------|---------|
| 4 Nuggets | `#D62300` rouge |
| Cheeseburger | `#F5A623` orange |
| King Fusion M&M's | `#1A1A1A` noir |
| 6 Onion Rings | `#502314` marron |
| Pâtisserie | `#F5C518` jaune |

---

## Configuration à personnaliser

### URL Google Reviews

Dans `config/prod.js` :
```js
GOOGLE_REVIEWS_URL: 'https://g.page/r/XXXXXXXXXXXXXXXX/review',
```

### Clés Web3Forms

- Prod : `854bf41c-...` (dans `config/prod.js`)
- Dev : `39c512ae-...` (dans `config/dev.js`)

---

## Déploiement

```bash
ENV=prod ./build.sh && firebase deploy
```

URL publique : **https://burger-king-avis.web.app**

---

## Tests

```bash
node tests/test.js
```

Résultat attendu : **92 tests réussis, 0 échec.**

---

## Design

Palette Burger King : Rouge `#D62300`, Orange `#F5A623`, Fond `#1A1A1A`, Marron `#502314`.

Responsive mobile-first.

---

## TODO

- [ ] Générer QR code → https://burger-king-avis.web.app → imprimer en restaurant
- [ ] Enregistrer chaque avis soumis dans Firestore (collection `avis`)
- [ ] Dashboard : compteurs (total, par étoile, produits gagnés)
- [ ] Analyser produits gagnés à la roulette (fréquence par prix)
