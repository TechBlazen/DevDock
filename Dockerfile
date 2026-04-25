# syntax=docker/dockerfile:1.7

# ─── Build stage ───────────────────────────────────────────────────────────
# Compiles the Vite client into ./dist and the Fastify server into
# ./dist-server (see server/tsconfig.json outDir).
FROM node:20-alpine AS build
WORKDIR /app

# Install all deps (including dev) — tsc and vite are dev-only.
COPY package.json package-lock.json ./
RUN npm ci

# Copy the full source and build both halves.
COPY . .
RUN npm run build && npm run build:server

# Drop dev deps so the runtime stage only pulls in production packages.
RUN npm prune --omit=dev


# ─── Runtime stage ────────────────────────────────────────────────────────
# Minimal image: node runtime, production deps, compiled server, and the
# Vite client assets. server/index.ts auto-detects ./dist/index.html and
# registers @fastify/static, so nothing extra is needed at startup.
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Drop privileges — the base image ships a non-root `node` user.
RUN chown -R node:node /app
USER node

COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/package.json ./package.json
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node --from=build /app/dist-server ./dist-server

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "dist-server/index.js"]
