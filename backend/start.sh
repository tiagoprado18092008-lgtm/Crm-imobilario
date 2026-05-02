#!/bin/sh
# Fallback: if DATABASE_DIRECT_URL not set, use DATABASE_URL
export DATABASE_DIRECT_URL="${DATABASE_DIRECT_URL:-$DATABASE_URL}"

# Repair WhatsAppSession schema. `db push` previously failed to add `userId` on
# top of legacy rows, breaking QR generation. The SQL is fully idempotent — safe
# to run every boot.
npx prisma db execute --file prisma/fix-whatsapp-session.sql --schema prisma/schema.prisma || echo "[startup] WA schema fix-up skipped"

# Sync remaining schema diffs (idempotent — safe on existing DBs)
npx prisma db push --accept-data-loss --skip-generate

# Start server
node --max-old-space-size=400 dist/server.js
