# 🐳 StyleSync Backend — Déploiement Docker

Configuration Docker sécurisée pour le backend StyleSync API.

---

## Architecture

```
Internet
   │
   ▼
[Nginx :80/:443]  ← Reverse proxy + rate limiting + headers sécurité
   │  (réseau interne Docker)
   ▼
[Node.js API :3000]  ← Express, utilisateur non-root, FS read-only
   │
   ▼
[Supabase Cloud]  ← Base de données + Auth + Storage (externe)
```

---

## Sécurité implémentée

### 🐳 Docker
| Mesure | Détail |
|--------|--------|
| **Build multi-stage** | Image finale sans outils de build |
| **Utilisateur non-root** | `appuser` (UID 1001) — pas de root dans le container |
| **Filesystem read-only** | `read_only: true` — seul `/tmp` est inscriptible |
| **no-new-privileges** | Empêche l'élévation de privilèges via setuid |
| **Capabilities réduites** | `cap_drop: ALL` + seulement ce qui est nécessaire |
| **Réseau isolé** | L'API n'est pas exposée sur l'hôte, seul Nginx y accède |
| **Limites ressources** | CPU et RAM bornés (protection DoS) |
| **Image Alpine** | Surface d'attaque minimale |
| **dumb-init** | Gestion correcte des signaux (PID 1 safe) |

### 🌐 Nginx
| Mesure | Détail |
|--------|--------|
| **Reverse proxy** | L'API n'est jamais exposée directement |
| **Rate limiting** | 20 req/s global, 2 req/s sur `/api/outfits/generate` |
| **Headers sécurité** | X-Content-Type-Options, X-Frame-Options, CSP, etc. |
| **Blocage méthodes** | Seules GET/POST/PUT/PATCH/DELETE/OPTIONS autorisées |
| **Blocage scanners** | Détection des User-Agents malveillants |
| **Timeouts** | Protection contre les connexions lentes (Slowloris) |
| **TLS ready** | Configuration HTTPS commentée, prête à activer |

### 🔐 Application (déjà présent dans le code)
| Mesure | Détail |
|--------|--------|
| **Helmet** | Headers HTTP sécurisés |
| **CORS restreint** | Via `ALLOWED_ORIGINS` |
| **Rate limiting Node** | Double couche (Nginx + Express) |
| **Auth JWT Supabase** | Toutes les routes API protégées |
| **Validation Joi** | Input validé et sanitizé sur chaque route |
| **Multer fileFilter** | Seules les images acceptées en upload |

---

## Installation rapide

### 1. Préparer les fichiers

Placez tous ces fichiers dans le dossier `stylesync-backend/` :

```
stylesync-backend/
├── src/
├── package.json
├── package-lock.json
├── Dockerfile          ← nouveau
├── docker-compose.yml  ← nouveau
├── .dockerignore       ← nouveau
├── .env.example        ← mis à jour
├── .env                ← à créer (jamais committé !)
└── nginx/              ← nouveau
    ├── nginx.conf
    └── conf.d/
        ├── api.conf
        └── proxy_params.conf
```

### 2. Configurer l'environnement

```bash
cp .env.example .env
# Éditez .env avec vos vraies valeurs
nano .env
```

### 3. Construire et démarrer

```bash
# Build + démarrage
docker compose up -d --build

# Vérifier que tout tourne
docker compose ps

# Voir les logs
docker compose logs -f

# Tester l'API
curl http://localhost/health
```

### 4. Commandes utiles

```bash
# Stopper
docker compose down

# Rebuild après une modification du code
docker compose up -d --build api

# Inspecter la sécurité du container
docker inspect stylesync-api | grep -A5 SecurityOpt

# Vérifier que l'API tourne en non-root
docker exec stylesync-api whoami
# → appuser

# Vérifier que le FS est bien en read-only
docker exec stylesync-api touch /test.txt
# → touch: /test.txt: Read-only file system ✓
```

---

## Passage en production HTTPS

1. Obtenez un certificat (Let's Encrypt avec Certbot, ou votre CA)
2. Placez `fullchain.pem` et `privkey.pem` dans `nginx/certs/`
3. Décommentez le bloc `server { listen 443... }` dans `nginx/conf.d/api.conf`
4. Décommentez le port `443:443` dans `docker-compose.yml`
5. Décommentez le volume `./certs` dans `docker-compose.yml`
6. Décommentez la redirection HTTP → HTTPS dans `api.conf`
7. Relancez : `docker compose up -d --build nginx`

---

## .gitignore à vérifier

Assurez-vous que votre `.gitignore` contient :

```
.env
nginx/certs/
```
