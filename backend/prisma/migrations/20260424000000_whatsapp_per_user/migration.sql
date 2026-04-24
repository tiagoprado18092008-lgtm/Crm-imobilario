-- Migration: whatsapp_per_user
-- Adds agencyId and userId to WhatsAppSession with a composite unique constraint.
-- The previous migration (20260423000000_whatsapp_session_per_agency) was never applied,
-- so this migration handles the full transformation from the old schema.

-- 1. Remove rows that cannot be attributed to a valid agency (old singleton rows where id was not an agencyId)
DELETE FROM "WhatsAppSession"
WHERE "id" NOT IN (SELECT "id" FROM "Agency");

-- 2. Add agencyId column (nullable initially for backfill)
ALTER TABLE "WhatsAppSession" ADD COLUMN "agencyId" TEXT;

-- 3. Backfill agencyId from id (historically id == agencyId for surviving rows)
UPDATE "WhatsAppSession" SET "agencyId" = "id";

-- 4. Give each row a proper cuid-style primary key
UPDATE "WhatsAppSession" SET "id" = 'c' || md5(random()::text || clock_timestamp()::text);

-- 5. Enforce NOT NULL on agencyId
ALTER TABLE "WhatsAppSession" ALTER COLUMN "agencyId" SET NOT NULL;

-- 6. Add userId column (nullable — NULL means agency-level session)
ALTER TABLE "WhatsAppSession" ADD COLUMN "userId" TEXT;

-- 7. Add FK from agencyId -> Agency
ALTER TABLE "WhatsAppSession"
  ADD CONSTRAINT "WhatsAppSession_agencyId_fkey"
  FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 8. Add FK from userId -> User (optional)
ALTER TABLE "WhatsAppSession"
  ADD CONSTRAINT "WhatsAppSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 9. Add composite unique index (agencyId, userId)
-- PostgreSQL treats NULLs as distinct in unique indexes, so multiple rows with userId=NULL
-- for different agencies are allowed, which is correct behaviour.
CREATE UNIQUE INDEX "WhatsAppSession_agencyId_userId_key" ON "WhatsAppSession"("agencyId", "userId");
