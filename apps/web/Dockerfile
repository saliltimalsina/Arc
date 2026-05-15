# syntax=docker/dockerfile:1.7
# ── deps ──
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@11.0.8 --activate
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/api/prisma apps/api/prisma
COPY packages ./packages

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile=false

# ── build (produces .next/standalone) ──
FROM node:20-alpine AS build
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@11.0.8 --activate
WORKDIR /repo

ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY --from=deps /repo /repo
COPY apps/web apps/web

RUN pnpm --filter @mantra-arc/web run build

# ── runtime: only standalone server + static + public ──
FROM node:20-alpine AS runtime
RUN apk add --no-cache libc6-compat && \
    addgroup -S nodejs -g 1001 && adduser -S nextjs -u 1001 -G nodejs
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Standalone output already has minimal node_modules + server.js
COPY --from=build --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nextjs:nodejs /repo/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
