# StyleSync — Backend API

Backend Node.js / Express pour l'application mobile StyleSync.

## Stack

| Couche | Technologie |
|---|---|
| Runtime | Node.js ≥ 20 |
| Framework | Express 4 |
| Base de données | Supabase (PostgreSQL) |
| Auth | Supabase Auth (JWT) |
| Storage images | Supabase Storage |
| Détourage IA | Photoroom API |
| Météo | OpenWeatherMap API |
| Validation | Joi |
| Sécurité | Helmet + CORS + Rate limiting |

---

## Installation

```bash
# 1. Cloner et installer les dépendances
git clone <repo>
cd stylesync-backend
npm install

# 2. Configurer l'environnement
cp .env.example .env
# → Remplir toutes les valeurs dans .env

# 3. Lancer en développement
npm run dev

# 4. Lancer en production
npm start
```

---

## Configuration Supabase

### 1. Créer le projet
1. Aller sur [supabase.com](https://supabase.com) → New project
2. Récupérer l'URL et les clés dans **Settings > API**
3. Les coller dans votre `.env`

### 2. Appliquer le schéma SQL
1. Ouvrir le **SQL Editor** dans le dashboard Supabase
2. Copier-coller le contenu de `db/schema.sql`
3. Cliquer **Run**

### 3. Configurer le Storage
1. Aller dans **Storage** → New bucket
2. Créer un bucket nommé `garments`
3. Le rendre **public** (les URLs des images doivent être accessibles depuis le mobile)

### 4. Activer l'Auth
1. Aller dans **Authentication > Providers**
2. Activer **Apple** et/ou **Google** selon votre plan
3. Suivre les instructions de configuration OAuth de chaque provider

---

## Endpoints API

Toutes les routes (sauf `/health`) nécessitent un header :
```
Authorization: Bearer <token_supabase>
```

Le token est obtenu après connexion via le SDK Supabase côté Flutter.

### Profil
```
GET    /api/profile              → Récupère le profil utilisateur
PUT    /api/profile              → Met à jour le profil (style, préférences)
GET    /api/profile/stats        → Statistiques du dressing
```

### Vêtements
```
GET    /api/garments             → Liste (filtres: category, season, is_active)
GET    /api/garments/:id         → Détail d'un vêtement
POST   /api/garments             → Crée + upload image + détourage IA (multipart/form-data)
PATCH  /api/garments/:id         → Met à jour les attributs
DELETE /api/garments/:id         → Soft delete (is_active=false) ou ?hard=true
```

**Exemple : créer un vêtement**
```bash
curl -X POST http://localhost:3000/api/garments \
  -H "Authorization: Bearer <token>" \
  -F "image=@photo.jpg" \
  -F "category=haut" \
  -F "label=Mon pull gris" \
  -F "formality=2"
```

### Tenues
```
POST   /api/outfits/generate     → Génère 3 suggestions (météo + agenda)
POST   /api/outfits/wear         → Enregistre une tenue comme portée
GET    /api/outfits/history      → Historique (filtres: from, to, limit, offset)
PATCH  /api/outfits/:id/rate     → Note une tenue (1-5)
```

**Exemple : générer des tenues**
```bash
curl -X POST http://localhost:3000/api/outfits/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "lat": 48.8566, "lng": 2.3522, "event": "Réunion client" }'
```

**Réponse :**
```json
{
  "weather": {
    "temp": 14,
    "feels_like": 11,
    "description": "nuageux",
    "rain": false,
    "city": "Paris"
  },
  "suggestions": [
    {
      "id": "uuid",
      "suggestion_type": "ia",
      "match_score": 87,
      "items": [
        { "slot": "haut",       "garment": { "id": "...", "label": "Chemise Oxford", ... } },
        { "slot": "bas",        "garment": { "id": "...", "label": "Chino marine", ... } },
        { "slot": "chaussures", "garment": { "id": "...", "label": "Derby cognac", ... } },
        { "slot": "sur-vetement","garment": { "id": "...", "label": "Trench beige", ... } }
      ]
    },
    { "suggestion_type": "confort", ... },
    { "suggestion_type": "audacieux", ... }
  ]
}
```

---

## Structure du projet

```
stylesync-backend/
├── db/
│   └── schema.sql              ← Schéma PostgreSQL complet (à appliquer sur Supabase)
├── src/
│   ├── index.js                ← Point d'entrée Express
│   ├── routes/
│   │   └── index.js            ← Définition de toutes les routes
│   ├── controllers/
│   │   ├── profile.controller.js
│   │   ├── garments.controller.js
│   │   └── outfits.controller.js
│   ├── services/
│   │   ├── weather.service.js  ← OpenWeatherMap
│   │   ├── vision.service.js   ← Photoroom + auto-tagging IA
│   │   └── outfit.service.js   ← Algorithme de recommandation
│   ├── middleware/
│   │   ├── auth.js             ← Vérification JWT Supabase
│   │   └── validate.js         ← Schémas de validation Joi
│   └── utils/
│       └── supabase.js         ← Client Supabase singleton
├── .env.example
├── package.json
└── README.md
```

---

## Sécurité & RGPD

- **RLS activé** sur toutes les tables : chaque utilisateur ne voit que ses données.
- **Analyse de l'agenda** : faite côté client (Flutter), seul le label de l'événement est transmis à l'API — jamais le contenu complet.
- **Localisation** : utilisée uniquement pour l'appel météo, jamais stockée en BDD.
- **Images** : stockées dans Supabase Storage avec chemins privés par `user_id`.
- **Rate limiting** : 100 req/15min global, 10 req/min sur la génération de tenues.

---

## Déploiement

### Option A : Railway (recommandé pour MVP)
```bash
# Installer Railway CLI
npm install -g @railway/cli
railway login
railway init
railway up
# Ajouter les variables d'env dans le dashboard Railway
```

### Option B : Google Cloud Run
```bash
gcloud run deploy stylesync-api \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated
```
