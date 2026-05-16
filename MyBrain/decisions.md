---
type: project
project: burger-king-avis
status: active
tags: [decisions, firebase, avis]
parent: "[[BurgerKingAvis/spec]]"
---

# BurgerKingAvis — Décisions

## Web3Forms plutôt qu'EmailJS

**Contexte** : EmailJS nécessite plan payant pour whitelister un domaine custom (burger-king-avis.web.app). Error 403 "Failed to load resource" sur Safari.

**Décision** : Web3Forms — 250 soumissions/mois gratuit, aucune restriction domaine, API REST simple (POST JSON).

**Conséquences** : Pas de SDK externe. `feedback.js` envoie directement via `fetch` à `api.web3forms.com/submit`.

---

## Firebase Hosting plutôt que Netlify

**Contexte** : Déjà un projet Firebase pour BK Emerainville. Familiarité avec l'outil.

**Décision** : Firebase Hosting plan Spark (gratuit). Deploy via `firebase deploy --only hosting`.

**Conséquences** : URL `burger-king-avis.web.app`. CI/CD manuel (pas d'auto-deploy GitHub). Firebase MCP utilisé pour créer le projet et init Hosting.

---

## HTML/JS vanilla (pas de framework)

**Contexte** : Site one-page simple, QR code → formulaire. Aucune complexité état/routing.

**Décision** : HTML/CSS/JS vanilla. Généré par ultraplan.

**Conséquences** : Zéro dépendance, déploiement statique, ultra-léger.

---

## Images produits au lieu d'emojis dans la roulette

**Contexte** : Roulette initiale utilisait emojis. Visuellement pauvre vs photos officielles BK disponibles.

**Décision** : Photos produits officielles BK (PSD/PNG fournis). Traitement Python/Pillow : conversion PSD→PNG (sips), retrait fond noir (seuil 80), autocrop alpha bounding box, resize 300px. Stockées dans `public/images/`.

**Conséquences** : Canvas drawImage() au lieu de fillText() emoji. Préchargement asynchrone (onload → redraw). Taille repo +~500Ko.

---

## Redesign BK charte 2023

**Contexte** : Design initial générique (dark background, Inter-like font). Charte BK 2023 disponible.

**Décision** : Redesign complet respectant charte 2023. Palette officielle 6 couleurs. Typo Lilita One (substitut Google Fonts de Flame Bold) + Nunito. Structure HTML : bk-header rouge courbe + bk-main cream + card offset shadow.

**Conséquences** : Google Fonts import (léger overhead réseau). Aucun framework CSS ajouté. Roulette segments → couleurs palette officielle.

---

## Modernisation roulette : SVG pointer + gloss canvas

**Contexte** : Pointer triangle CSS (`border-*` hack) et segments canvas plats → aspect daté.

**Décision** : Pointer SVG map-pin teardrop. Anneau extérieur BK rouge + dots aux jonctions. Gloss radial (`createRadialGradient`) overlay sur segments. Logo BK PNG clipé dans hub central.

**Conséquences** : Hub sans cercle background → logo flotte sur segments. Preload `bkLogoImg` asynchrone comme les prize images.

---

## Fond page dégradé BK sunset

**Contexte** : Fond `cream` plat, peu distinctif. Référence visuelle coucher de soleil fournie par le client.

**Décision** : `linear-gradient(180deg, #3d1a0d → #D62300 → #FF8732 → #FFAA00 → #F5EBDC)` + `background-attachment: fixed`. Card `backdrop-filter: blur(12px)` semi-transparente. Header transparent (fond gradient visible derrière).

**Conséquences** : Fond non scrollable sur iOS (fixed attachment ignoré) → visuellement acceptable. Header perd son background rouge solide.

---

## Couleur prize reveal = couleur segment gagnant

**Contexte** : Prize reveal toujours rouge BK quelle que soit la prize. Opportunité de cohérence visuelle.

**Décision** : `darkenHex(prize.color, 55)` pour gradient fond. `isLight` detection (`textColor !== '#fff'`) pour adapter couleurs texte (jaune `#FFAA00` → texte brun).

**Conséquences** : 5 visuels distincts par prize. `darkenHex` utilitaire pur testé (section 6, 5 tests).

---

## Étoiles re-cliquables sur feedback.html (selectedStars)

**Contexte** : Étoiles statiques sur feedback.html. Client veut permettre correction de note.

**Décision** : `let selectedStars = stars` (mutable). Logique hover/click identique à index.html. 5★ sur feedback → email (pas redirect Google). `starLabels[5] = 'Excellent !'` ajouté.

**Conséquences** : Un client ayant cliqué 4★ par erreur peut corriger. 5★ sur feedback génère email "Avis client BK – 5/5".

---

## Dossier MyBrain/ + hook pre-commit sync Obsidian

**Contexte** : Fichiers Obsidian du projet (`spec.md`, `decisions.md`, `todo.md`) isolés dans le vault. Besoin de les versionner dans le repo pour avoir l'historique des décisions avec le code.

**Décision** : Dossier `MyBrain/` à la racine du repo contenant des copies des fichiers `10-Projets/BurgerKingAvis/` (sans `*Git.md`). Hook `hooks/pre-commit` recopie depuis le vault avant chaque commit → copies toujours fraîches.

**Conséquences** : Fichiers versionnés dans git. Éditer dans Obsidian = source de vérité. Pas de sync automatique hors commit.

---

## Firestore envisagé pour plus tard

**Contexte** : Email seul = risque de perte si spam filter. Firestore = source de vérité persistante.

**Décision** : À implémenter en complément de Web3Forms (pas remplacement). Les avis consultables depuis Firebase console.

**Conséquences** : Nécessitera plan Blaze si Cloud Functions utilisées. Firestore seul (write client) reste plan Spark.

---

## Dashboard admin + config roulette via Firestore

**Contexte** : Besoin de pouvoir activer/désactiver la roulette sans redéployer (ex: stock épuisé, maintenance).

**Décision** : Firestore document `config/settings { roulette_enabled: bool }`. Admin dashboard (`admin.html`) avec Firebase Auth Email/Password. Toggle switch → écrit dans Firestore. `feedback.js` lit la config au load et branche post-submit : roulette si enabled, merci simple sinon.

**Conséquences** : Firebase SDK compat v10 ajouté dans feedback.html et admin.html (CDN). Firestore rules : read public, write auth. `cleanUrls: true` dans firebase.json pour URL `/admin` propre.

---

## Toggle email (`email_enabled`) dans Firestore

**Contexte** : Pendant les tests, les avis soumis envoyaient de vrais emails au gérant. Besoin de pouvoir couper l'envoi sans redéployer.

**Décision** : Champ `email_enabled: bool` dans `config/settings` Firestore. Toggle dans dashboard admin. `feedback.js` skip Web3Forms si `email_enabled === false`.

**Conséquences** : Event listeners dashboard déplacés hors de `showDashboard()` (bug : accumulation à chaque re-render `onAuthStateChanged`).

---

## Séparation DEV/PROD via config/dev.js + build.sh

**Contexte** : Clés Web3Forms, URL Google et collection Firestore hardcodées → tests en dev polluaient prod (emails au gérant, redirect Google).

**Décision** : `config/dev.js` et `config/prod.js` contiennent `ENV`, `WEB3FORMS_KEY`, `GOOGLE_REVIEWS_URL`, `FIRESTORE_COLLECTION`, `FIRESTORE_CONFIG_DOC`. `build.sh [dev|prod]` copie le bon fichier vers `public/config.js`. `public/config.js` dans `.gitignore`. Bandeau DEV orange sticky intégré directement dans `config/dev.js` (IIFE).

**Conséquences** : Déploiement prod = `bash build.sh prod && firebase deploy`. Dev = `bash build.sh dev && firebase serve`. Aucune variable d'environnement serveur nécessaire (site 100% statique).

---

## Isolation Firestore dev/prod par collection distincte

**Contexte** : Même Firestore partagée → toggle admin en dev affectait les toggles prod.

**Décision** : Deux collections distinctes : `config` (prod) et `config-dev` (dev). Document `settings` identique dans les deux. `firestore.rules` étendu pour autoriser `config-dev`. `admin.js` et `feedback.js` lisent `CONFIG.FIRESTORE_COLLECTION` au runtime.

**Conséquences** : Toggles complètement isolés entre envs. Pas de second projet Firebase nécessaire.

---

## Firebase web app enregistrée (session 2026-05-16)

**Contexte** : Le projet Firebase `burger-king-avis` n'avait pas d'app web enregistrée (`.firebaserc` vide, aucun SDK config disponible).

**Décision** : Enregistrement via Firebase MCP → app ID `1:756976293842:web:0c9cb6d0094c4cda545a0b`. Config SDK stockée dans `admin.js` et `feedback.js`.

**Conséquences** : API key exposée côté client (`AIzaSyBcHaY5...`) — acceptable, clé publique Firebase restreinte à ce domaine.

