# syntax=docker/dockerfile:1

ARG NODE_VERSION=22-alpine

# ---- deps: install full dependency tree (cached separately from source) ----
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build: compile the Angular app (browser + SSR server bundles) ----
FROM node:${NODE_VERSION} AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- prod-deps: production-only node_modules for the runtime image ----
FROM node:${NODE_VERSION} AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- runtime: minimal image that only serves the built app ----
FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production \
    PORT=4200
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

USER appuser
EXPOSE 4200

CMD ["node", "dist/SmartLogix/server/server.mjs"]
