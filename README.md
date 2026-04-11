# StyleSync

> Application web de gestion intelligente de garde-robe — BTS SIO SISR · EPSI Montpellier · Avril 2026

---

## Présentation

StyleSync analyse la météo, votre agenda et votre garde-robe pour composer chaque matin la tenue parfaite. L'application combine un scanner IA de vêtements, un dressing virtuel, un calendrier de tenues et un moteur de suggestions personnalisé.

### Fonctionnalités

| Module | Description |
|--------|-------------|
| **Scanner** | Analyse photo via IA, auto-tagging type / couleur / matière / saison |
| **Dressing** | Inventaire filtrable, fréquence de port, alertes de désencombrement |
| **Calendrier** | Historique et planification, anti-répétition 48h |
| **Profil** | Préférences thermiques, palette personnelle, config IA |
| **Dashboard** | 3 looks suggérés chaque matin (IA / Confort / Audacieux) |

---

## Architecture

```
Client (Browser)
      │  HTTP :80
      ▼
┌─────────────────────────────┐
│           Nginx             │
│  Reverse Proxy + Statics    │
└────────────┬────────────────┘
             │  /api/*
             ▼
┌─────────────────────────────┐
│     Node.js / Express       │
│         Port 3000           │
│   /api/users  · /health     │
└─────────────────────────────┘
```

### Structure du projet

```
Projet-IA2/
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js              ← Point d'entrée Express
│       ├── config/env.js
│       ├── controllers/
│       ├── models/
│       └── routes/
├── frontend/
│   ├── index.html               ← Landing page + dashboard
│   ├── Ajout.html               ← Scanner de vêtements
│   ├── dressing.html            ← Inventaire
│   ├── profil.html              ← Profil & préférences IA
│   ├── calendrier.html          ← Calendrier de tenues
│   └── *.css / *.js
├── nginx/
│   ├── nginx.conf
│   └── conf.d/default.conf
├── database/
│   └── schema.sql
├── docker-compose.yml
└── .env
```

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Backend | Node.js 20 · Express 4 |
| Serveur | Nginx 1.27 Alpine |
| Infra | Docker · Docker Compose |
| Frontend | HTML5 · CSS3 · JavaScript vanilla |
| Base de données | Supabase (PostgreSQL) |
| IA | Claude Vision API (analyse de vêtements) |

---

## Démarrage

### Pré-requis

- Docker Desktop (ou Docker Engine + Compose plugin)
- Port **80** disponible sur la machine hôte

### Variables d'environnement

```bash
cp docker/env.example .env
# Renseigner les valeurs dans .env
```

Variables clés :

```env
NODE_ENV=production
PORT=3000
ANTHROPIC_API_KEY=sk-ant-...
```

### Lancer la stack

```bash
# Premier lancement (build inclus)
docker compose up --build

# Lancement suivants
docker compose up -d

# Arrêt
docker compose down
```

### Vérification

| URL | Résultat attendu |
|-----|-----------------|
| `http://localhost/` | Landing page StyleSync |
| `http://localhost/Ajout.html` | Scanner de vêtements |
| `http://localhost/dressing.html` | Inventaire |
| `http://localhost/profil.html` | Profil |
| `http://localhost/calendrier.html` | Calendrier |
| `http://localhost/api/users` | `[{"id":1,"name":"Alice"},…]` |

---

## Sécurité Docker

- Utilisateur non-root (`appuser` UID 1001) dans le backend
- `read_only: true` sur les deux conteneurs
- `tmpfs` monté sur `/tmp` et `/var/cache/nginx`
- `cap_drop: ALL` + réajout minimal des capabilities nécessaires
- `no-new-privileges: true`
- Réseau interne isolé entre `api` et `nginx`
- Build multi-stage — image finale sans devDependencies

---

## Routes API

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/health` | Healthcheck Docker |
| `GET` | `/api/users` | Liste des utilisateurs |

---

## Frontend — Pages

| Fichier | Description |
|---------|-------------|
| `index.html` | Landing page + dashboard prototype |
| `Ajout.html` | Scanner IA — caméra, import photo, analyse |
| `dressing.html` | Inventaire avec filtres, tri, panel de détail |
| `profil.html` | Préférences thermiques, couleurs, occasions |
| `calendrier.html` | Calendrier de port et historique |

**Design system** : Cormorant Garamond + DM Sans · palette dark luxury · accents or

---

## Informations

| | |
|-|-|
| **Formation** | BTS SIO SISR — EPSI Montpellier |
| **Version** | 1.0 — Avril 2026 |
| **Auteurs** | Lucas Deltro · Yoann |
