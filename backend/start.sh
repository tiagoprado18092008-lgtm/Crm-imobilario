#!/bin/sh
# Fallback: if DATABASE_DIRECT_URL not set, use DATABASE_URL
export DATABASE_DIRECT_URL="${DATABASE_DIRECT_URL:-$DATABASE_URL}"

# Run pending migrations
npx prisma migrate deploy

# Start server
node dist/server.js
