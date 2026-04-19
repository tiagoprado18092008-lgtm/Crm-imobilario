#!/bin/sh
# Fallback: if DATABASE_DIRECT_URL not set, use DATABASE_URL
export DATABASE_DIRECT_URL="${DATABASE_DIRECT_URL:-$DATABASE_URL}"

# Sync schema to DB (idempotent - safe on existing DBs, no migration history needed)
npx prisma db push --accept-data-loss --skip-generate

# Start server
node dist/server.js
