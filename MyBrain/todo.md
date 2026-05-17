---
type: project
project: burger-king-avis
status: active
tags: [todo, firebase, web, avis]
parent: "[[BurgerKingAvis/spec]]"
---

# BurgerKingAvis — Todo

## En cours
-

## À faire
- [ ] Générer QR code → https://burger-king-avis.web.app → imprimer en restaurant
- [ ] Icône "Add to Home Screen" : se renseigner sur `apple-touch-icon` + PWA manifest pour afficher icône BK quand ajouté à l'écran d'accueil iPhone/Android

## Fait

### 2026-05-14
- [x] Créé projet `~/Projet/burger-king-avis` + git init + GitHub repo
- [x] Généré via `/ultraplan` : structure complète HTML/CSS/JS
- [x] Configuré URL Google Avis dans `script.js`
- [x] Configuré Web3Forms pour envoi email (remplacé EmailJS — domain restriction payante)
- [x] Firebase Hosting : projet `burger-king-avis` créé + déployé → https://burger-king-avis.web.app
- [x] Web3Forms confirmé fonctionnel (mail reçu ✅)
- [x] Restructuré repo → `public/` pour fichiers statiques + hook post-commit → `BurgerKingAvisGit.md`

### 2026-05-15
- [x] Roulette canvas après envoi avis (session iPhone) — 5 prizes, spin, prize reveal
- [x] Images produits BK dans roulette (photos officielles, fond transparent, autocrop)
- [x] 5ème prize "Pâtisserie" ajouté
- [x] Redesign complet UI/UX BK charte 2023 (Lilita One, palette officielle, card offset shadow)
- [x] Suite de tests 50/50 (Node.js, sans dépendance)
- [x] Modernisation roulette : pointer SVG, gloss, anneau BK, hub logo
- [x] Logo BK PNG (sans fond) dans header + hub roulette
- [x] Icônes remplacés : star, check, bk-logo (PNG sans fond via Pillow)
- [x] Prize reveal : couleur fond = couleur segment gagnant + confettis
- [x] Fond page dégradé BK sunset (dark → red → orange → yellow → cream)
- [x] Étoiles interactives feedback.html (selectedStars 1-5, 5★ → email)
- [x] Fix scroll horizontal mobile (overflow-x: hidden)

### 2026-05-16
- [x] Dashboard admin `admin.html` + `admin.js` (Firebase Auth + toggle roulette)
- [x] Firestore `config/settings { roulette_enabled }` + rules (read public, write auth)
- [x] `feedback.js` lecture config Firestore + branche roulette vs merci simple
- [x] `cleanUrls: true` dans firebase.json → `/admin` accessible sans extension
- [x] Firebase web app enregistrée + deploy firestore rules + hosting
- [x] Fix login admin : user créé dans Firebase Console → auth fonctionnel ✅
- [x] Toggle roulette ON/OFF testé bout en bout ✅
- [x] Toggle email (`email_enabled`) dans dashboard admin + feedback.js conditionnel
- [x] Fix bug event listeners (hors showDashboard → plus d'accumulation)
- [x] Séparation DEV/PROD : `config/dev.js`, `config/prod.js`, `build.sh`
- [x] Bandeau DEV orange sur toutes les pages (intégré dans config/dev.js)
- [x] Isolation Firestore : `config` (prod) vs `config-dev` (dev)
- [x] Suite tests étendue : 92 tests (sections 11-14 ajoutées)
- [x] Sync docs README/DECISIONS/TESTS (reflet état réel) + fix 2 tests chemin __dirname
- [x] Enregistrement avis Firestore : `{stars, message, timestamp}` à submit + `{prize}` post-roulette
- [x] `AVIS_COLLECTION` isolée par env (avis / avis-dev) + rules create+update public
- [x] Dashboard stats temps réel : total avis, barres par note 4★→1★
- [x] Analyse prizes : barre + count + % par cadeau + taux roulette global
- [x] 102 tests, 0 échec

### 2026-05-17
- [x] Anti-abus cooldown 24h : `generateId()` UUID v4 persistent `localStorage.bk_client_id`, cooldown via `localStorage.bk_last_submit`, écriture `cooldowns/{clientId}` Firestore + vérification rules
- [x] Isolation cooldowns par env : `COOLDOWNS_COLLECTION` dans `config/dev.js` (`cooldowns-dev`) et `config/prod.js` (`cooldowns`)
- [x] Page `/avis` : liste protégée Firebase Auth, filtres ★ client-side, cards avec badge 🎁, temps réel `onSnapshot`
- [x] Graphique temporel dashboard : canvas bar chart 14j glissants, barres orange BK, fix font labels 9px fixe
- [x] 147 tests, 0 échec
