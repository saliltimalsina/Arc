#!/bin/bash
# Start Postgres + Redis via Colima/Docker

set -e

echo "Starting Colima..."
colima start --cpu 2 --memory 4 2>/dev/null || echo "Colima already running"

echo "Starting PostgreSQL..."
docker run -d \
  --name mantra-postgres \
  --restart unless-stopped \
  -e POSTGRES_USER=dev \
  -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=mantra_arc \
  -p 5432:5432 \
  postgres:16-alpine 2>/dev/null || echo "PostgreSQL already running"

echo "Starting Redis..."
docker run -d \
  --name mantra-redis \
  --restart unless-stopped \
  -p 6379:6379 \
  redis:7-alpine 2>/dev/null || echo "Redis already running"

echo ""
echo "Waiting for Postgres to be ready..."
until docker exec mantra-postgres pg_isready -U dev -q 2>/dev/null; do
  sleep 1
done

echo "Running Prisma migrations..."
cd "$(dirname "$0")/apps/api"
DATABASE_URL="postgresql://dev:dev@localhost:5432/mantra_arc" npx prisma migrate dev --name init --schema=prisma/schema.prisma

echo ""
echo "Done! Services running:"
echo "  PostgreSQL → localhost:5432"
echo "  Redis      → localhost:6379"
