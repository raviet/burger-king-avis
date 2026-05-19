# 🔍 Rapport d'Audit, Sécurité & Idées — Burger King Avis

> **Date d'analyse :** 18 mai 2026
> **Analyste :** Hermès Agent
> **Instruction :** Analyse non destructive — aucun fichier du projet n'a été modifié.
> **Repo :** `https://github.com/raviet/burger-king-avis`

---

## 1. 🧪 Tests — Résultats

```
163 test(s) réussi(s)  |  0 échec(s)
```

- Le fichier `tests/test.js` contient en réalité **163 tests** (et non 92 comme indiqué dans le README).
- Couverture : clamp des notes, easing roulette, calcul d'angle, cohérence PRIZES, routage, fonctions utilitaires (darkenHex, isLight), toggles Firestore, isolation dev/prod, payload avis, anti-abus cooldown, graphique temporel, pagination, XSS escapeHtml.
- **Verdict :** ✅ Suite de tests robuste et complète pour un projet vanilla. Zéro dépendance, assertions manuelles bien structurées.

---

## 2. 🛡️ Audit Sécurité

### 2.1 FAILLE CRITIQUE — `allow update: if true` sur les avis

**Fichier :** `firestore.rules` (lignes 26 et 36)

```
match /avis/{doc} {
  allow create: if ...cooldown...;
  allow update: if true;        ← 🚨 N'IMPORTE QUI peut modifier n'importe quel avis
  allow read:   if request.auth != null;
  allow delete: if false;
}
```

**Problème :** Un attaquant non authentifié peut `update` un document existant dans `avis` ou `avis-dev` pour y injecter du contenu malveillant, effacer le `message`, modifier le `stars`, ou changer le `prize`. Seul le `create` est protégé par le cooldown.

**Recommandation :**
- Restreindre `update` à l'auteur du doc (via `clientId`) ou à un admin authentifié.
- Exemple de règle correcte :
  ```
  allow update: if request.auth != null
                 || resource.data.clientId == request.resource.data.clientId;
  ```
  Mais attention : le client non auth doit pouvoir update son propre avis pour y ajouter le prize après la roulette. Il faut donc autoriser l'update si `resource.data.clientId == request.resource.data.clientId` ET que seul le champ `prize` est modifié.

**Impact :** 🔴 Critique — intégrité des données compromise.

---

### 2.2 FAILLE MOYENNE — Écriture libre dans `cooldowns`

**Fichier :** `firestore.rules` (lignes 12-19)

```
match /cooldowns/{clientId} {
  allow write: if true;
  allow read:  if request.auth != null;
}
```

**Problème :** N'importe qui peut écrire/supprimer un doc `cooldowns/{id}`, ce qui permet de :
1. Forger un cooldown pour bloquer un autre client (DoS).
2. Supprimer son propre cooldown pour bypass la protection 24h.

**Recommandation :**
- Valider que `request.resource.data.keys().hasOnly(['lastSubmit'])`.
- Optionnellement, restreindre la suppression (`delete: if false`).

**Impact :** 🟡 Moyen — contournement de l'anti-abus possible.

---

### 2.3 Exposition des credentials Firebase dans le code client

**Fichiers :** `feedback.js`, `admin.js`, `avis.js` (tous ligne ~29-36)

```js
firebase.initializeApp({
  apiKey: 'AIzaSy...vhj4',
  authDomain: 'burger-king-avis.firebaseapp.com',
  projectId: 'burger-king-avis',
  ...
});
```

**Analyse :** Pour Firebase, la `apiKey` est conçue pour être publique dans les apps web. Cependant, combinée avec une règle `update: if true`, cela permet à n'importe qui d'initialiser l'app et d'attaquer la base. Ce n'est pas une fuite en soi, mais c'est une surface d'attaque.

**Recommandation :**
- Renforcer les Security Rules (voir 2.1 et 2.2).
- Activer **Firebase App Check** (reCAPTCHA v3 ou DeviceCheck) pour bloquer les requêtes venant d'apps non autorisées.
- Activer la **vérification d'email** obligatoire dans Firebase Auth pour l'admin.

**Impact :** 🟡 Moyen — surface d'attaque élargie si règles laxistes.

---

### 2.4 Pas de Content Security Policy (CSP)

**Constat :** Aucun header `Content-Security-Policy` ni meta tag CSP dans les HTML. Firebase Hosting ne permet pas de configurer des headers custom via `firebase.json` (contrairement à Netlify/Vercel), mais un meta tag peut être ajouté.

**Risque :** Si un vecteur XSS venait à être introduit (ex: via une lib tierce injectée), il n'y a aucune mitigation.

**Recommandation :**
```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self' https://www.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' blob: data:; connect-src 'self' https://*.firebaseio.com https://firestore.googleapis.com https://api.web3forms.com https://identitytoolkit.googleapis.com; font-src https://fonts.gstatic.com;">
```

**Impact :** 🟡 Moyen — défense en profondeur manquante.

---

### 2.5 Clés Web3Forms exposées — Acceptable mais à documenter

**Fichiers :** `config/dev.js`, `config/prod.js`

**Analyse :** Web3Forms est conçu pour que la clé `access_key` soit publique. Elle est liée à une adresse email de destination unique. Le risque est limité à du spam vers cette adresse.

**Recommandation :**
- Activer la protection anti-spam côté Web3Forms (reCAPTCHA/honeypot si dispo).
- Surveiller le volume d'emails. En cas d'abus, régénérer la clé.
- Ne PAS tenter de cacher la clé côté client (impossible avec un site statique).

**Impact :** 🟢 Faible — acceptable par design.

---

### 2.6 Absence de rate limiting côté client/serveur

**Constat :** Sur `feedback.html`, un utilisateur peut spammer le bouton "Envoyer" rapidement. Le cooldown est localStorage + Firestore, mais les deux peuvent être contournés (incognito, autre navigateur, nettoyage localStorage).

**Recommandation :**
- Le rate limiting Firestore via `cooldowns` est la bonne approche, mais doit être renforcé (voir 2.2).
- Désactiver le bouton côté client dès le premier clic (déjà fait ✅).
- Ajouter un **honeypot** dans le formulaire (champ caché qui doit rester vide) pour bloquer les bots basiques.

**Impact :** 🟡 Moyen — spam possible, coûts Firestore + emails.

---

### 2.7 Pas de validation serveur de la longueur du message

**Constat :** Seul le `maxlength="1000"` côté HTML protège. Facilement bypassable via curl/Postman vers Firestore direct.

**Recommandation :**
- Ajouter une validation dans les Firestore Rules :
  ```
  allow create: if request.resource.data.message is string
                && request.resource.data.message.size() <= 1000;
  ```

**Impact :** 🟢 Faible — pas de risque de sécurité direct, mais pollution possible.

---

### 2.8 Roulette entièrement côté client — truquable

**Constat :** Le gagnant est tiré par `Math.random()` dans `feedback.js`. Un utilisateur peut :
1. Recharger la page et rejouer (cooldown contourne ce cas).
2. Modifier le JS dans les DevTools pour forcer un gagnant.
3. Appeler `spin()` plusieurs fois via console.

**Recommandation :**
- Si la fraude devient un problème, la roulette doit être validée côté serveur (Cloud Function, ou token signé).
- Pour un restaurant physique avec contrôle caisse, le risque est gérable (le serveur vérifie l'écran au moment de la remise).

**Impact :** 🟡 Moyen — fraude possible, impact financier limité si contrôle caisse.

---

### 2.9 Pas de 2FA sur le compte Admin

**Constat :** Firebase Auth Email/Password sans 2FA. Si le mot de passe fuite, l'attaquant a accès à tous les avis et peut modifier la config.

**Recommandation :**
- Activer l'**authentification multi-facteur (MFA)** dans Firebase Auth.
- Utiliser un mot de passe fort unique (gestionnaire de mots de passe).

**Impact :** 🟡 Moyen — accès admin sensible.

---

## 3. 🔎 Revue Code — Bugs & Points d'attention

### 3.1 `admin.js` — `onSnapshot` sans limite sur `AVIS_COL`

**Ligne 79-85 :**
```js
unsubscribeAvis = db.collection(AVIS_COL)
  .orderBy('timestamp', 'desc')
  .onSnapshot(snapshot => { ... });
```

**Problème :** Charge **tous** les documents de la collection en mémoire à chaque modification. Avec 10 000 avis, c'est un gouffre de bande passante Firestore et de RAM client. De plus, Firestore facture chaque lecture.

**Recommandation :**
- Utiliser `.limit(100)` ou implémenter une pagination + agrégation côté serveur (Firebase Extension ou Cloud Function).
- Pour le graphique 14 jours, une Cloud Function quotidienne qui pré-calcule les buckets serait plus efficace.

**Impact :** 🟡 Performance + coût Firestore.

---

### 3.2 `avis.js` — Condition inutile ligne 107

```js
countEl.textContent = hasNextPage ? `${from}–${to} avis` : `${from}–${to} avis`;
```

Les deux branches sont identiques. Peut être simplifié en une seule ligne.

---

### 3.3 `feedback.js` — `configPromise.catch(() => {})` silencieux

**Ligne 46-54 :**
```js
const configPromise = db.collection(CONFIG_COL).doc(CONFIG_DOC).get()
  .then(doc => { ... })
  .catch(() => {});
```

**Problème :** Si Firestore est injoignable (offline, quota dépassé, règles mal configurées), l'erreur est avalée. L'utilisateur verra la roulette et l'email fonctionner avec les valeurs par défaut (`true`), mais l'avis ne sera peut-être pas enregistré.

**Recommandation :**
- Au minimum, logger l'erreur en console en dev.
- Si l'enregistrement Firestore échoue, afficher un warning à l'utilisateur.

---

### 3.4 `feedback.js` — `darkenHex` ne gère pas les couleurs courtes (#RGB)

**Ligne 332-338 :**
```js
const num = parseInt(hex.replace('#', ''), 16);
```

Si `hex` est `#F00`, `parseInt('F00', 16)` donne 3840, puis `(3840 >> 16)` = 0. Le rouge est perdu.

**Heureusement :** Le code actuel n'utilise que des hex 6 chiffres, donc pas de bug actif.

**Recommandation :** Documenter l'hypothèse ou étendre la fonction.

---

### 3.5 `feedback.js` — `spin()` n'est pas debounced/protégé contre double-clic

**Ligne 291-293 :**
```js
function spin() {
  if (isSpinning) return;
  isSpinning = true;
```

C'est correct, mais `spinBtn` reste cliquable visuellement. Le `display = 'none'` intervient juste après.

**Recommandation :** Ajouter `spinBtn.disabled = true;` immédiatement pour feedback visuel instantané.

---

### 3.6 CSS — Déclarations répétées entre fichiers

`style.css` contient le thème partagé, mais `admin.html` et `avis.html` redéfinissent **tout** le CSS inline. Cela duplique ~200 lignes de styles.

**Recommandation :**
- Extraire les styles communs (variables, reset, card, boutons) dans `style.css` et l'importer aussi dans `admin.html` et `avis.html`. Garder seulement les spécifiques inline.

---

### 3.7 Pas de gestion d'erreur réseau sur Web3Forms

**Ligne 137-150 :**
```js
const res = await fetch('https://api.web3forms.com/submit', ...);
const data = await res.json();
```

Si Web3Forms est down (HTTP 5xx ou timeout), `res.json()` peut throw ou `data.success` peut être undefined.

**Recommandation :**
```js
if (!res.ok) throw new Error('Erreur réseau Web3Forms');
```

---

## 4. 🚀 Optimisations

### 4.1 Performance

| # | Problème | Recommandation | Gain |
|---|----------|----------------|------|
| 1 | **Pas de Service Worker** — PWA incomplète | Créer `public/sw.js` avec cache des assets statiques + stratégie `StaleWhileRevalidate` pour `config.js` | Offline support, chargement instantané |
| 2 | **Images PNG non optimisées** | Convertir en WebP, fournir fallback PNG via `<picture>` | ~60% de poids en moins |
| 3 | **Pas de `preconnect` sur index.html/feedback.html** | Ajouter `<link rel="preconnect" href="https://fonts.googleapis.com">` | Réduction du TTFB police |
| 4 | **Pas de lazy loading** | `loading="lazy"` sur les images de la roulette | Meilleur LCP |
| 5 | **Canvas roulette 270x270 fixe** | Rendre le canvas responsive selon le viewport | UX améliorée sur tablette |
| 6 | **Pas de `defer`/`async` sur les scripts** | `script.js` bloque le parsing. Ajouter `defer`. | Meilleur FCP |

### 4.2 UX / Accessibilité

| # | Problème | Recommandation |
|---|----------|----------------|
| 7 | **Pas de feedback visuel pendant le chargement de Firestore** | Ajouter un skeleton loader sur feedback.html avant que `configPromise` resolve |
| 8 | **Le bouton "Envoyer" reste disabled si erreur** | Le réactiver après le catch (déjà fait ✅), mais ajouter un compteur de tentatives |
| 9 | **Pas d'indicateur de temps restant sur le cooldown** | Afficher "Vous pourrez à nouveau voter dans 14h 32min" |
| 10 | **Pas de confirmation avant de quitter la page feedback** | `beforeunload` si le textarea est rempli mais non soumis |
| 11 | **Le graphique 14j dans admin est statique** | Le rendre interactif (hover sur une barre = nombre exact d'avis ce jour) |

### 4.3 SEO & Métadonnées

| # | Problème | Recommandation |
|---|----------|----------------|
| 12 | **Toutes les pages ont `noindex`** — OK pour l'outil interne, mais ajouter au moins `noindex` sur `/admin` et `/avis` | ✅ Déjà fait. Vérifier que `robots.txt` existe aussi. |
| 13 | **Pas de `robots.txt`** | Créer `public/robots.txt` avec `Disallow: /` pour bloquer tout |
| 14 | **Pas de favicon explicite** | `<link rel="icon" href="/images/icon-192.png">` |

### 4.4 DevOps & Déploiement

| # | Problème | Recommandation |
|---|----------|----------------|
| 15 | **Pas de CI/CD** | GitHub Actions : lint + tests + build.sh prod + firebase deploy sur push `main` |
| 16 | **Pas de preview channels** | Firebase Hosting preview channels pour chaque PR |
| 17 | **Pas de versioning/hash sur config.js** | `build.sh` pourrait injecter un `?v=$(git rev-parse --short HEAD)` | Cache busting |
| 18 | **Pas de monitoring d'erreurs** | Ajouter Sentry (gratuit pour petit volume) ou LogRocket pour tracker les erreurs JS en prod |
| 19 | **Pas d'alertes Firebase** | Activer les alertes de quota Firestore/Auth dans la console Firebase |

---

## 5. 💡 Idées de Features

### Features rapides (1-2h de dev)
1. **Indicateur cooldown avec compte à rebours** — Afficher le temps restant avant le prochain avis.
2. **Honeypot anti-bot** — Champ `<input type="text" name="website" style="display:none">` dans le formulaire. Rejeter si rempli.
3. **Bouton "Rejouer"** — Après la roulette, proposer de retourner à l'accueil ou de scanner un nouveau QR.
4. **Export CSV dans l'admin** — Bouton "Télécharger les avis (.csv)" sur `/admin`.
5. **Badge "Nouveau"** — Marquer les avis non lus dans `/avis` depuis la dernière connexion admin.

### Features moyennes (1/2 journée)
6. **Digest email quotidien** — Cloud Function Firebase qui envoie un récapitulatif des avis de la journée à l'admin (réduit la dépendance à Web3Forms en temps réel).
7. **Alertes automatiques** — Si 3 avis 1★ dans les dernières 24h, envoyer une alerte push/email à l'admin.
8. **Multi-établissement** — Ajouter un `restaurant_id` dans la config et l'URL (`?r=paris12`), permettre de gérer plusieurs BK depuis le même projet.
9. **Génération QR code dans l'admin** — Page `/admin/qr` qui génère un QR code avec l'URL de l'app + UTM tracking.
10. **Mode sombre** — Toggle dark mode pour l'admin (accessibilité nocturne).

### Features avancées (1-2 jours)
11. **Analyse sémantique des messages** — Cloud Function qui appelle l'API d'un LLM (ou utilise une lib locale) pour tagger automatiquement les avis : "problème de propreté", "attente trop longue", "nourriture froide", etc.
12. **Score NPS calculé** — Dashboard affichant le Net Promoter Score basé sur la répartition 1-5★.
13. **Authentification anonyme Firebase** — Pour tracker les utilisateurs sans localStorage (plus fiable contre le nettoyage).
14. **Roulette serveur** — Cloud Function qui tire le gagnant et renvoie un token signé (JWT) que le client présente à la caisse. Élimine la triche.
15. **Page publique de stats** — `/stats` (noindex) affichant des statistiques anonymisées en temps réel — utile pour les responsables régionaux.

---

## 6. 📋 Plan d'action priorisé

| Priorité | Tâche | Fichier(s) concerné(s) | Estimation |
|----------|-------|------------------------|------------|
| 🔴 **P0 — Sécurité** | Corriger `allow update: if true` dans Firestore Rules | `firestore.rules` | 30 min |
| 🔴 **P0 — Sécurité** | Restreindre l'écriture dans `cooldowns` | `firestore.rules` | 20 min |
| 🔴 **P0 — Sécurité** | Activer Firebase App Check | Console Firebase | 15 min |
| 🟡 **P1 — Fiabilité** | Ajouter `.limit(100)` au `onSnapshot` de `admin.js` | `admin.js` | 10 min |
| 🟡 **P1 — Fiabilité** | Gérer les erreurs réseau Web3Forms | `feedback.js` | 15 min |
| 🟡 **P1 — Perf** | Créer un Service Worker minimal | `public/sw.js` + HTML | 1h |
| 🟢 **P2 — Qualité** | Ajouter CI/CD GitHub Actions | `.github/workflows/deploy.yml` | 1h |
| 🟢 **P2 — Qualité** | Ajouter CSP meta tag | Tous les `.html` | 20 min |
| 🟢 **P2 — UX** | Compte à rebours cooldown | `feedback.js` | 1h |
| 🟢 **P2 — Perf** | Optimiser images (WebP) | `public/images/` | 30 min |
| 🔵 **P3 — Features** | Export CSV admin | `admin.js` | 1h |
| 🔵 **P3 — Features** | Digest email quotidien | Cloud Function | 2-4h |
| 🔵 **P3 — Features** | Alertes automatiques | Cloud Function | 2h |

---

## 7. 📊 Résumé exécutif

**Ce qui est très bien fait :**
- ✅ Suite de tests solide (163 tests, 0 échec) avec couverture edge cases.
- ✅ Architecture claire, zero-dependency, vanilla JS bien structuré.
- ✅ UX soignée (animations, accessibilité clavier, thème BK cohérent).
- ✅ Isolation dev/prod intelligente via `build.sh` et collections Firestore séparées.
- ✅ Anti-abus double couche (localStorage + Firestore rules).
- ✅ `escapeHtml` dans `avis.js` protège contre les XSS affichées.
- ✅ PWA partielle (manifest, icons, apple-touch-icon).

**Ce qui doit être corrigé en priorité :**
- 🔴 `allow update: if true` dans Firestore Rules = **n'importe qui peut modifier les avis**.
- 🟡 `onSnapshot` sans limite dans l'admin = risque de coûts Firestore explosifs.
- 🟡 Pas de Service Worker = PWA incomplète, pas d'offline.
- 🟡 Pas de CSP = défense en profondeur absente.

**Verdict global :** Projet bien conçu, propre et fonctionnel. **Une faille de sécurité majeure à corriger immédiatement** (Firestore Rules update). Le reste est de l'optimisation et de l'amélioration continue.

---

*Ce rapport a été généré automatiquement par analyse statique et exécution de tests. Aucun fichier du projet n'a été modifié.*
