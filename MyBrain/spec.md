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
- **Firebase project** : `burger-king-avis`
- **Repo** : `~/Projet/burger-king-avis` → `github.com/raviet/burger-king-avis`
- **URL live** : https://burger-king-avis.web.app

### Structure repo

```
burger-king-avis/
├── public/                ← fichiers servis par Firebase Hosting
│   ├── index.html         — page de notation (5 étoiles)
│   ├── feedback.html      — formulaire avis négatifs + roulette
│   ├── 404.html
│   ├── script.js          — redirection selon note
│   ├── feedback.js        — envoi email Web3Forms + roulette canvas
│   ├── style.css          — design BK charte 2023, responsive mobile
│   └── images/            — photos produits BK (nuggets, cheeseburger, onion-rings, king-fusion, muffin)
├── tests/test.js          ← 50 tests unitaires Node.js (sans dépendance)
├── hooks/post-commit      ← génère BurgerKingAvisGit.md dans vault
├── firebase.json
└── README.md
```

### Flow feedback.html

```
1-4★ → feedback.html?stars=X
  ├── Étoiles re-cliquables (selectedStars 1-5)
  ├── Formulaire (textarea + submit)
  │     └── Web3Forms API → email direction (avec selectedStars)
  │     Note : 5★ ici → email, pas redirect Google
  └── Roulette canvas (après envoi)
        ├── 5 prizes : 4 Nuggets / Cheeseburger / King Fusion M&M's / 6 Onion Rings / Pâtisserie
        ├── Photos produits officielles BK (PNG fond transparent)
        ├── Spin → prize reveal couleur dynamique (darkenHex) + confettis
        └── ?debug bypass Web3Forms (dev only)
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

- `script.js` ligne 2 : URL Google Avis (configurée ✅)
- `feedback.js` ligne 1 : clé Web3Forms (configurée ✅)

## Liens utiles

- Firebase console : https://console.firebase.google.com/project/burger-king-avis
- URL live : https://burger-king-avis.web.app
- Google Maps BK : URL Google Avis configurée dans script.js

## À venir

- Firestore pour stocker les avis en base (complément ou remplacement email)
- QR code à générer et imprimer en restaurant
