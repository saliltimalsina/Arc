# syntax=docker/dockerfile:1.7
# ── deps: install all (dev + prod) for build ──
FROM node:20-bookworm-slim AS deps
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@11.0.8 --activate
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages ./packages
COPY apps/api/prisma apps/api/prisma

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile=false

# ── build: compile NestJS ──
FROM node:20-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@11.0.8 --activate
WORKDIR /repo

COPY --from=deps /repo /repo
COPY apps/api apps/api

RUN pnpm --filter @mantra-arc/api exec prisma generate && \
    pnpm --filter @mantra-arc/api run build

# ── prune: deploy prod-only deps into a flat folder ──
FROM node:20-bookworm-slim AS prune
RUN corepack enable && corepack prepare pnpm@11.0.8 --activate
WORKDIR /repo

COPY --from=build /repo /repo
RUN pnpm --filter @mantra-arc/api --prod deploy /pruned

# ── runtime: slim image, no pnpm, no dev deps ──
FROM node:20-bookworm-slim AS runtime
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl ca-certificates tini && \
    rm -rf /var/lib/apt/lists/* && \
    groupadd -r nodejs -g 1001 && useradd -r -u 1001 -g nodejs nestjs
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY --from=prune --chown=nestjs:nodejs /pruned/node_modules ./node_modules
COPY --from=prune --chown=nestjs:nodejs /pruned/package.json ./package.json
COPY --from=prune --chown=nestjs:nodejs /pruned/prisma ./prisma
COPY --from=build --chown=nestjs:nodejs /repo/apps/api/dist ./dist

USER nestjs
EXPOSE 3001

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node dist/main"]
