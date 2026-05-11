#!/bin/bash
# Start Postgres + Redis via Homebrew services (no Docker/Colima needed)

set -e

echo "Starting PostgreSQL..."
brew services start postgresql@16 2>/dev/null || echo "PostgreSQL already running"

echo "Starting Redis..."
brew services start redis 2>/dev/null || echo "Redis already running"

echo "Waiting for Postgres to be ready..."
until pg_isready -h localhost -p 5432 -q 2>/dev/null; do
  sleep 1
done

echo "Running Prisma migrations..."
cd "$(dirname "$0")/apps/api"
DATABASE_URL="postgresql://dev:dev@localhost:5432/mantra_arc" npx prisma migrate deploy --schema=prisma/schema.prisma 2>/dev/null || true

echo ""
echo "Done! Services running:"
echo "  PostgreSQL → localhost:5432"
echo "  Redis      → localhost:6379"
