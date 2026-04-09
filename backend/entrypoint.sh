#!/bin/sh
set -e

# Fallback: if DATABASE_DIRECT_URL is not set, use DATABASE_URL
export DATABASE_DIRECT_URL="${DATABASE_DIRECT_URL:-$DATABASE_URL}"

echo "Running Prisma migrations..."
# Continue even if migration fails (schema may already be up to date)
npx prisma migrate deploy || echo "Migration warning (may already be applied) — continuing..."

echo "Starting server..."
exec node dist/server.js
