---
type: project
project: burger-king-avis
status: active
tags:
  - firebase
  - web
  - javascript
  - burger-king
  - avis
todo: "[[BurgerKingAvis/todo]]"
decisions: "[[BurgerKingAvis/decisions]]"
commands: "[[commandsDev]]"
---

# BurgerKingAvis — Spec

## Objectif

Site de filtrage des avis clients Burger King. Les clients scannent un QR code, notent leur expérience sur 5 étoiles :
- **5★** → redirigé vers la page Google Avis du restaurant (avis public)
- **1-4★** → formulaire interne → email envoyé à la direction (avis privé)

## Architecture

```
QR Code → index.html (étoiles 1-5)
              ├── 5★  → Google Reviews (URL externe)
              └── 1-4★ → feedback.html → Web3Forms → email restaurant
```

## Stack technique

- **Frontend** : HTML / CSS / JS vanilla (pas de framework)
- **Hébergement** : Firebase Hosting (plan Spark, gratuit)
- **Email** : Web3Forms (gratuit, 250 soumissions/mois)
- **Base de données** : Firestore (`config/settings { roulette_enabled, email_enabled }`)
- **Auth** : Firebase Auth Email/Password (compte admin uniquement)
- **Firebase project** : `burger-king-avis` | App ID : `1:756976293842:web:0c9cb6d0094c4cda545a0b`
- **Repo** : `~/Projet/burger-king-avis` → `github.com/raviet/burger-king-avis`
- **URL live** : https://burger-king-avis.web.app
- **Admin** : https://burger-king-avis.web.app/admin
- **Environnements** : `build.sh [dev|prod]` → copie `config/$ENV.js` → `public/config.js`

### Structure repo

```
burger-king-avis/
├── public/                ← fichiers servis par Firebase Hosting
│   ├── index.html         — page de notation (5 étoiles)
│   ├── feedback.html      — formulaire avis négatifs + roulette (ou merci simple)
│   ├── admin.html         — dashboard admin : login + toggle roulette
│   ├── 404.html
│   ├── script.js          — redirection selon note
│   ├── feedback.js        — envoi email Web3Forms + lecture config Firestore + roulette canvas
│   ├── admin.js           — Firebase Auth + Firestore config toggle
│   ├── style.css          — design BK charte 2023, responsive mobile
│   └── images/            — photos produits BK (nuggets, cheeseburger, onion-rings, king-fusion, muffin)
├── config/
│   ├── dev.js             — ENV=dev, clé Web3Forms test, URL Google=#, Firestore=config-dev
│   └── prod.js            — ENV=prod, clés réelles, Firestore=config
├── build.sh               ← copie config/$ENV.js → public/config.js (jamais commité)
├── tests/test.js          ← 92 tests unitaires Node.js (sans dépendance)
├── hooks/post-commit      ← génère BurgerKingAvisGit.md dans vault
├── firestore.rules        ← règles Firestore (read public, write auth)
├── firebase.json          ← hosting (cleanUrls: true) + firestore
└── README.md
```

### Flow feedback.html

```
1-4★ → feedback.html?stars=X
  ├── Étoiles re-cliquables (selectedStars 1-5)
  ├── Formulaire (textarea + submit)
  │     └── Web3Forms API → email direction (avec selectedStars)
  │     Note : 5★ ici → email, pas redirect Google
  └── Post-submit : lit Firestore config/settings.roulette_enabled
        ├── true  → Roulette canvas
        │     ├── 5 prizes : 4 Nuggets / Cheeseburger / King Fusion M&M's / 6 Onion Rings / Pâtisserie
        │     ├── Photos produits officielles BK (PNG fond transparent)
        │     └── Spin → prize reveal couleur dynamique (darkenHex) + confettis
        └── false → Merci simple (check + message remerciement)
```

### Flow admin.html

```
/admin → login Firebase Auth (Email/Password)
  └── Dashboard :
        ├── toggle roulette_enabled  → Firestore config/settings (ou config-dev/settings en dev)
        └── toggle email_enabled     → Firestore config/settings
              └── onSnapshot → UI en temps réel
```

### Design system (BK charte 2023)

| Token | Valeur |
|-------|--------|
| Fiery Red | `#D62300` |
| Flaming Orange | `#FF8732` |
| Melty Yellow | `#FFAA00` |
| BBQ Brown | `#502314` |
| Mayo Egg White | `#F5EBDC` |
| Crunchy Green | `#198737` |
| Font display | Lilita One (Flame Bold substitute) |
| Font body | Nunito |

### Configuration

- `config/dev.js` : ENV=dev, WEB3FORMS_KEY=test, GOOGLE_REVIEWS_URL=#, FIRESTORE_COLLECTION=config-dev
- `config/prod.js` : ENV=prod, WEB3FORMS_KEY=prod, GOOGLE_REVIEWS_URL=URL réelle, FIRESTORE_COLLECTION=config
- `bash build.sh [dev|prod]` → génère `public/config.js` (dans .gitignore)

## Liens utiles

- Firebase console : https://console.firebase.google.com/project/burger-king-avis
- URL live : https://burger-king-avis.web.app
- Google Maps BK : URL Google Avis configurée dans script.js

## À venir

- QR code à générer et imprimer en restaurant
- Firestore pour stocker les avis en base (collection `avis`)
- Dashboard : compteurs (avis total, par étoile, produits gagnés, analyse roulette)
