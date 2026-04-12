FROM node:20-alpine AS deps
WORKDIR /build
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

FROM node:20-alpine AS runtime
LABEL org.opencontainers.image.title="stylesync-backend"
LABEL org.opencontainers.image.version="1.0.0"

RUN apk update && apk upgrade --no-cache \
    && apk add --no-cache dumb-init curl \
    && rm -rf /var/cache/apk/*

RUN addgroup -g 1001 -S appgroup \
    && adduser  -u 1001 -S appuser -G appgroup

WORKDIR /app

COPY --from=deps --chown=appuser:appgroup /build/node_modules ./node_modules
COPY --chown=appuser:appgroup src/ ./src/

RUN chmod -R 550 ./node_modules

ENV NODE_ENV=production \
    PORT=3000

USER appuser
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]
