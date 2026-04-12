# StyleSync

> Application web de gestion intelligente de garde-robe — BTS SIO SISR · EPSI Montpellier · Avril 2026

## Démarrage rapide

```bash
cp .env.example .env
# Remplir les valeurs dans .env
docker compose up --build
```

Ouvrir : **http://localhost/**

## Stack

| Couche | Technologie |
|--------|-------------|
| Backend | Node.js 20 · Express 4 |
| Serveur | Nginx 1.27 Alpine |
| Infra | Docker · Docker Compose |
| Frontend | HTML5 · CSS3 · JavaScript |
| Base de données | Supabase (PostgreSQL) |
| IA | Claude Vision API |

## Structure

```
├── backend/          Node.js/Express API
├── frontend/         Pages HTML/CSS/JS
├── nginx/            Config reverse proxy
├── database/         Schéma SQL Supabase
├── docker-compose.yml
└── .env.example
```

## Pages

| URL | Description |
|-----|-------------|
| `/` | Landing page + dashboard |
| `/Ajout.html` | Scanner de vêtements IA |
| `/dressing.html` | Inventaire garde-robe |
| `/profil.html` | Préférences & config IA |
| `/calendrier.html` | Calendrier de tenues |
| `/api/health` | Healthcheck backend |
