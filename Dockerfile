# syntax=docker/dockerfile:1

# ---- 1) Compila el frontend (Vite) --------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src
RUN npm install -g npm@12.0.0
RUN npm run build

# ---- 2) Dependencias de producción (sin Vite, Vitest ni herramientas de desarrollo) -------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---- 3) Imagen final: API Express que también sirve dist/ ---------------------------------
FROM node:22-alpine AS runtime
ARG GIT_SHA=unknown
ARG VERSION=dev
LABEL org.opencontainers.image.title="storego" \
      org.opencontainers.image.revision="${GIT_SHA}" \
      org.opencontainers.image.version="${VERSION}"
ENV NODE_ENV=production \
    PORT=3001 \
    GIT_SHA=${GIT_SHA}
WORKDIR /app
COPY --from=deps  --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node server ./server
COPY --from=build --chown=node:node /app/dist ./dist
# El proceso nunca corre como root (usuario "node", UID 1000).
USER node
EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/api/health || exit 1
CMD ["node", "server/index.js"]