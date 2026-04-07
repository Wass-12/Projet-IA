# ╔══════════════════════════════════════════════════════════════╗
# ║              StyleSync Backend — Dockerfile                  ║
# ║         Build multi-stage avec durcissement sécurité         ║
# ╚══════════════════════════════════════════════════════════════╝

# ── Stage 1 : dépendances ────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /build

# Copier uniquement les manifestes pour profiter du cache Docker
COPY package.json package-lock.json* ./

# Installer UNIQUEMENT les dépendances de production
RUN npm ci --omit=dev --ignore-scripts \
    && npm cache clean --force


# ── Stage 2 : image finale durcie ────────────────────────────────
FROM node:20-alpine AS runtime

# --- Métadonnées ---
LABEL org.opencontainers.image.title="stylesync-backend"
LABEL org.opencontainers.image.version="1.0.0"

# --- Sécurité OS ---
# Mettre à jour les paquets système (correctifs de sécurité)
RUN apk update && apk upgrade --no-cache \
    && apk add --no-cache \
        dumb-init \
        curl \
    && rm -rf /var/cache/apk/*

# Créer un utilisateur non-root dédié
RUN addgroup -g 1001 -S appgroup \
    && adduser  -u 1001 -S appuser -G appgroup

WORKDIR /app

# Copier les dépendances depuis le stage "deps"
COPY --from=deps --chown=appuser:appgroup /build/node_modules ./node_modules

# Copier le code source (exclure ce qui est dans .dockerignore)
COPY --chown=appuser:appgroup src/ ./src/

# Lecture seule sur node_modules
RUN chmod -R 550 ./node_modules

# --- Variables d'environnement par défaut (non-secrets) ---
ENV NODE_ENV=production \
    PORT=3000

# --- Ne jamais tourner en root ---
USER appuser

# Port exposé (documentation uniquement — mapping dans docker-compose)
EXPOSE 3000

# Healthcheck intégré
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# dumb-init gère les signaux correctement (PID 1)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]
