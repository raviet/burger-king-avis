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
                               email au gérant via Web3Forms
                                    ↓
                               roulette cadeau (produit offert aléatoire)
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
- 4 segments aux couleurs officielles Burger King
- Rotation avec easing `1 - (1-t)^4` pour un ralentissement réaliste
- 5 à 8 tours aléatoires avant l'arrêt pour l'effet de suspense
- Le segment gagnant est calculé mathématiquement (pas visuellement) — le résultat est choisi avant le lancement, puis la rotation est calculée pour y amener le pointeur

**Cadeaux disponibles :**

| Emoji | Cadeau          | Couleur segment |
|-------|-----------------|-----------------|
| 🍗   | 4 Nuggets       | `#D62300` rouge |
| 🍔   | Cheeseburger    | `#F5A623` orange|
| 🍦   | Sundae          | `#1A1A1A` noir  |
| 🧅   | 6 Onion Rings   | `#502314` marron|

**Mathématique de la rotation :**
```
angle_initial = -3π/4  (segment 0 centré en haut, sous le pointeur)
delta = (startAngle + π/2 + (winner + 0.5) * slice) mod 2π
finalAngle = startAngle - delta - extraTurns
```

---

## Configuration à personnaliser

### URL Google Reviews

Dans `public/script.js`, ligne 2 :
```js
const GOOGLE_REVIEWS_URL = 'https://www.google.com/maps/place/...';
```
À remplacer par l'URL Google Maps de l'établissement concerné.
Format court recommandé : `https://g.page/r/XXXXXXXXXXXXXXXX/review`

### Clé Web3Forms

Dans `public/feedback.js`, ligne 1 :
```js
const WEB3FORMS_KEY = '39c512ae-ad7f-4a07-8b89-474adc23c163';
```
Créer un compte sur [web3forms.com](https://web3forms.com), générer une clé liée à l'adresse email du gérant, et remplacer cette valeur.

### Cadeaux de la roulette

Dans `public/feedback.js`, tableau `PRIZES` :
```js
const PRIZES = [
  { emoji: '🍗', label: '4 Nuggets',     color: '#D62300', textColor: '#fff' },
  { emoji: '🍔', label: 'Cheeseburger',  color: '#F5A623', textColor: '#1A1A1A' },
  { emoji: '🍦', label: 'Sundae',        color: '#1A1A1A', textColor: '#fff' },
  { emoji: '🧅', label: '6 Onion Rings', color: '#502314', textColor: '#fff' },
];
```
Modifier les `label` et `emoji` pour changer les produits offerts. Toujours garder **4 entrées** (la roue est divisée en 4 segments égaux de 90°).

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
├── DECISIONS.md          ← ce fichier
├── firebase.json         ← configuration Firebase Hosting (public: "public")
├── .firebaserc           ← identifiant du projet Firebase (à remplir)
└── public/
    ├── index.html        ← page de notation (5 étoiles)
    ├── script.js         ← logique de redirection selon la note
    ├── feedback.html     ← formulaire de feedback (1-4 étoiles)
    ├── feedback.js       ← soumission email + logique roulette
    ├── style.css         ← styles partagés (thème BK)
    └── 404.html          ← page d'erreur personnalisée
```

---

## Déploiement

```bash
# Installer Firebase CLI (une seule fois)
npm install -g firebase-tools

# Se connecter
firebase login

# Déployer
firebase deploy
```

L'URL publique est fournie après déploiement. C'est cette URL qui doit être encodée dans le QR code à imprimer en restaurant.

---

## Points d'attention

- **Pas de backend** : tout est statique. La sécurité repose sur le fait que la clé Web3Forms ne donne accès qu'à l'envoi d'emails vers une adresse prédéfinie.
- **`noindex, nofollow`** sur toutes les pages : l'outil ne doit pas apparaître dans Google.
- **Responsive mobile-first** : breakpoint à 400px, taille d'étoile réduite, canvas roulette réduit à 220px.
- **Accessibilité** : les étoiles sont des `role="button"` avec `tabindex` et `aria-label`, navigables au clavier (Entrée/Espace).
- **La roulette ne valide pas les gagnants côté serveur** : un client pourrait recharger la page et rejouer. Si la fraude devient un problème, il faudra ajouter un token unique côté Web3Forms ou un backend minimal.
