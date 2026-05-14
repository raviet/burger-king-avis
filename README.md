# Site de filtrage d'avis clients — Burger King

## Objectif

Filtrer les avis clients avant qu'ils n'atteignent Google :
- Client satisfait **(5 étoiles)** → redirigé vers la page Google Avis pour laisser un commentaire public
- Client insatisfait **(1 à 4 étoiles)** → redirigé vers un formulaire interne, l'avis est envoyé par email à la direction

Un QR code placé en restaurant pointe vers ce site.

---

## Architecture

```
QR Code → index.html (étoiles 1-5)
              ├── 5★  → Google Reviews (URL externe)
              └── 1-4★ → feedback.html → EmailJS → email restaurant
```

---

## Structure des fichiers

```
repo/
├── index.html      # Page de notation (5 étoiles cliquables)
├── script.js       # Redirection selon la note choisie
├── feedback.html   # Formulaire pour les avis négatifs
├── feedback.js     # Envoi de l'email via EmailJS
└── style.css       # Design thème Burger King, responsive mobile
```

---

## Ce qui reste à configurer

### 1. URL Google Avis

Dans `script.js`, ligne 2 :

```js
const GOOGLE_REVIEWS_URL = 'YOUR_GOOGLE_REVIEWS_URL';
```

Remplacer par l'URL réelle, ex. :
`https://g.page/r/XXXXXXXXXXXXXXXX/review`

Pour trouver cette URL : Google Maps → chercher le restaurant → Avis → "Obtenir le lien vers les avis".

---

### 2. EmailJS (envoi des avis négatifs par email)

#### Étapes de configuration
1. Créer un compte gratuit sur [emailjs.com](https://www.emailjs.com) (200 emails/mois gratuits)
2. Ajouter un service email : **Email Services** → Add Service → Gmail (ou autre)
3. Créer un template email : **Email Templates** → Create New Template
   - Le template doit contenir ces variables :
     - `{{stars}}` — la note du client
     - `{{message}}` — le texte de l'avis
     - `{{date}}` — la date et l'heure
   - Configurer l'email destinataire (adresse du restaurant) dans le champ **To email**
4. Récupérer les 3 clés nécessaires :
   - **Public Key** : Account → General → Public Key
   - **Service ID** : Email Services → ID de votre service
   - **Template ID** : Email Templates → ID de votre template

#### Les renseigner dans `feedback.js`, lignes 2-4 :

```js
const EMAILJS_PUBLIC_KEY  = 'YOUR_PUBLIC_KEY';
const EMAILJS_SERVICE_ID  = 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';
```

---

## Déploiement (mise en ligne)

Le code est hébergé sur GitHub : [github.com/raviet/burger-king-avis](https://github.com/raviet/burger-king-avis)

### Mettre en ligne avec Netlify (recommandé, gratuit)

1. Aller sur [app.netlify.com](https://app.netlify.com)
2. "Add new site" → "Import an existing project" → GitHub
3. Sélectionner le dépôt `burger-king-avis`
4. Laisser tous les paramètres par défaut → **Deploy**
5. Netlify génère une URL publique (ex. `https://burger-king-avis.netlify.app`)
6. Toute modification poussée sur GitHub se déploie automatiquement

### Générer le QR code

Une fois l'URL Netlify obtenue, générer un QR code sur [qr-code-generator.com](https://www.qr-code-generator.com) et l'imprimer à placer en restaurant.

---

## Test en local

```bash
cd repo/
python3 -m http.server
# Ouvrir http://localhost:8000
```

Scénarios à vérifier :
- Clic sur ★★★★★ → redirige vers l'URL Google Avis
- Clic sur ★★★ → ouvre `feedback.html?stars=3`
- Soumission du formulaire → email reçu (après config EmailJS)
- Test sur mobile via DevTools (mode responsive)

---

## Design

Palette Burger King :
- Rouge `#D62300`
- Orange/doré `#F5A623`
- Fond sombre `#1A1A1A`

Responsive mobile-first (les clients scannent depuis leur téléphone).
