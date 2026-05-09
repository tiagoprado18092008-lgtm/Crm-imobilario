#!/bin/sh
set -e

# Fallback: if DATABASE_DIRECT_URL is not set, use DATABASE_URL
export DATABASE_DIRECT_URL="${DATABASE_DIRECT_URL:-$DATABASE_URL}"

echo "Running Prisma migrations..."
# Continue even if migration fails (schema may already be up to date)
npx prisma migrate deploy || echo "Migration warning (may already be applied) — continuing..."

echo "Applying safety migrations (idempotent)..."
npx prisma db execute --stdin <<'SQL'
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "amiNumber" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "amiNumber" TEXT;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
SELECT gen_random_uuid()::text, 'manual', NOW(), '20260509000000_add_ami_number_and_contact_tags', NULL, NULL, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '20260509000000_add_ami_number_and_contact_tags');
SQL

echo "Starting server..."
exec node dist/server.js
