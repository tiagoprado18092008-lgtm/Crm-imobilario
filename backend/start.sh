#!/bin/sh
# Fallback: if DATABASE_DIRECT_URL not set, use DATABASE_URL
export DATABASE_DIRECT_URL="${DATABASE_DIRECT_URL:-$DATABASE_URL}"

# Apply pending migrations safely (no data loss risk unlike db push).
npx prisma migrate deploy

# Start server
node --max-old-space-size=400 dist/server.js
