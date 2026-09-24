#!/bin/sh
set -e

# Fallback: if DATABASE_DIRECT_URL is not set, use DATABASE_URL
export DATABASE_DIRECT_URL="${DATABASE_DIRECT_URL:-$DATABASE_URL}"

echo "Running Prisma migrations..."
# This used to swallow a failed migration and start the server anyway. One
# failure blocks every later migration, so the database silently fell behind
# the code: login worked while screens such as the pipeline board returned 500
# because PipelineStage.probability, rotDays and requiredFields never existed.
if ! npx prisma migrate deploy; then
  echo "!!! prisma migrate deploy FAILED — see the error above."
  echo "!!! Bringing the database up to the schema without dropping anything..."
  # db push only adds what is missing. Without --accept-data-loss it refuses
  # any change that would drop a column or table, so it cannot destroy data.
  npx prisma db push --skip-generate
fi

echo "Applying safety migrations (idempotent)..."
npx prisma db execute --stdin <<'SQL'
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
SELECT gen_random_uuid()::text, 'manual', NOW(), '20260509000000_add_ami_number_and_contact_tags', NULL, NULL, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '20260509000000_add_ami_number_and_contact_tags');
SQL

# Refuse to start over a database that is missing columns the code reads. A
# failed deploy keeps the previous version live on Railway; a server started
# over a stale database looks healthy and breaks screen by screen.
echo "Verifying the database matches the schema..."
node scripts/check-schema.mjs

echo "Starting server..."
exec node dist/server.js
