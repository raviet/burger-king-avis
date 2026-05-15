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
- [ ] Implémenter Firestore pour stocker les avis (alternative/complément email)

## Fait
- [x] Créé projet `~/Projet/burger-king-avis` + git init + GitHub repo
- [x] Généré via `/ultraplan` : structure complète HTML/CSS/JS
- [x] Configuré URL Google Avis dans `script.js`
- [x] Configuré Web3Forms pour envoi email (remplacé EmailJS — domain restriction payante)
- [x] Firebase Hosting : projet `burger-king-avis` créé + déployé → https://burger-king-avis.web.app
- [x] Web3Forms confirmé fonctionnel (mail reçu ✅)
- [x] Restructuré repo → `public/` pour fichiers statiques + hook post-commit → `BurgerKingAvisGit.md`
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
