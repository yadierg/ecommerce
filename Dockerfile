# ============================================
# STAGE 1: BUILDER
# ============================================
FROM node:20-alpine AS builder

ARG APP_NAME
ENV NX_DAEMON=false
ENV NX_SKIP_NX_CACHE=true

WORKDIR /app

COPY package*.json ./
COPY nx.json tsconfig.base.json ./

RUN npm ci --legacy-peer-deps --no-audit --no-fund

COPY apps/ ./apps/
COPY libs/ ./libs/
COPY tools/ ./tools/
COPY jest.preset.js ./

RUN npx nx build ${APP_NAME} --configuration=production --skip-nx-cache

# ============================================
# STAGE 2: RUNTIME
# ============================================
FROM node:20-alpine AS runtime

ARG APP_NAME
ENV NODE_ENV=production

WORKDIR /app

RUN apk add --no-cache dumb-init wget

RUN addgroup -S app && adduser -S app -G app

# ✅ Copiar SOLO el package.json de la app
COPY --from=builder /app/dist/apps/${APP_NAME}/package*.json ./

# ✅ Instalar SOLO las deps de producción de esta app
RUN npm install --omit=dev --legacy-peer-deps --no-audit --no-fund && \
    npm cache clean --force

# ✅ Copiar el bundle (main.js)
COPY --from=builder /app/dist/apps/${APP_NAME}/main.js ./

RUN chown -R app:app /app
USER app

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "main.js"]