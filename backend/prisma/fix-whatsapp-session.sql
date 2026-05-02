-- Idempotent schema fix-up for WhatsAppSession.
--
-- Background: production was deploying with `prisma db push`, which silently
-- failed to add the `userId` column on top of pre-existing rows. Every WA
-- upsert/updateMany then 500'd with "column WhatsAppSession.userId does not
-- exist", breaking QR generation. This script repairs the table without
-- touching the migrations history.
--
-- Safe to run on every boot — every statement uses IF NOT EXISTS / WHERE
-- guards, so applying it on a healthy DB is a no-op.

-- 1. Add agencyId if missing
ALTER TABLE "WhatsAppSession" ADD COLUMN IF NOT EXISTS "agencyId" TEXT;

-- 2. Backfill agencyId from id for any legacy rows (id used to double as agencyId)
UPDATE "WhatsAppSession" SET "agencyId" = "id" WHERE "agencyId" IS NULL;

-- 3. Drop legacy rows that don't map to a real agency (cannot be attributed safely)
DELETE FROM "WhatsAppSession"
 WHERE "agencyId" NOT IN (SELECT "id" FROM "Agency");

-- 4. Add userId if missing — this is the column whose absence was breaking QR
ALTER TABLE "WhatsAppSession" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- 5. Composite unique on (agencyId, userId) — Postgres treats NULL as distinct,
--    so multiple userId=NULL rows for different agencies are fine
CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppSession_agencyId_userId_key"
  ON "WhatsAppSession"("agencyId", "userId");

-- 6. Partial unique enforcing one agency-level session per agency
CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppSession_agencyId_shared_key"
  ON "WhatsAppSession"("agencyId")
  WHERE "userId" IS NULL;
