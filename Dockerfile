# syntax=docker/dockerfile:1

FROM node:24-slim AS base
WORKDIR /app

# Dependencies, installed once and shared by the stages below.
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Development: `docker compose up` mounts the source over /app and reloads on change.
FROM deps AS development
ENV NODE_ENV=development
COPY . .
RUN npx nuxt prepare
EXPOSE 3000
CMD ["npx", "nuxt", "dev", "--host", "0.0.0.0", "--port", "3000"]

FROM deps AS build
COPY . .
RUN npm run build

# Production: only the built server, run by the unprivileged `node` user.
FROM node:24-slim AS production
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /app/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
