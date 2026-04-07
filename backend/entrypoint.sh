#!/bin/sh
set -e

# Fallback: if DATABASE_DIRECT_URL is not set, use DATABASE_URL (works for non-pooled connections)
export DATABASE_DIRECT_URL="${DATABASE_DIRECT_URL:-$DATABASE_URL}"

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Starting server..."
exec node dist/server.js
