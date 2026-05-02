#!/bin/sh
# Fallback: if DATABASE_DIRECT_URL not set, use DATABASE_URL
export DATABASE_DIRECT_URL="${DATABASE_DIRECT_URL:-$DATABASE_URL}"

# Sync schema (idempotent). Note: WhatsAppSession schema repair is performed in
# server.ts on boot — db push has historically failed to add `userId` silently.
npx prisma db push --accept-data-loss --skip-generate

# Start server
node --max-old-space-size=400 dist/server.js
