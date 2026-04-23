-- Migrate WhatsAppSession from singleton/arbitrary-id design to a proper per-agency model.
-- Old design: "id" was sometimes "singleton", sometimes an agencyId, sometimes a userId,
-- sometimes "default" — causing sessions to be shared across tenants.
-- New design: "id" is a cuid; "agencyId" is a unique FK to Agency.

-- 1. Drop any pre-existing rows whose id is not a valid agency id. They cannot be safely
--    attributed to a tenant and must be re-paired by reconnecting WhatsApp from Settings.
DELETE FROM "WhatsAppSession"
WHERE "id" NOT IN (SELECT "id" FROM "Agency");

-- 2. Add the new agencyId column (nullable initially so we can backfill).
ALTER TABLE "WhatsAppSession" ADD COLUMN "agencyId" TEXT;

-- 3. Backfill agencyId from the existing id (since historically id == agencyId for rows
--    that survived step 1).
UPDATE "WhatsAppSession" SET "agencyId" = "id";

-- 4. Replace the primary key id with a fresh random value and keep agencyId uniquely
--    linked to one agency. Using md5(random()::text || clock_timestamp()::text) so the
--    primary key is no longer overloaded with tenant semantics and works on any Postgres.
UPDATE "WhatsAppSession" SET "id" = 'c' || md5(random()::text || clock_timestamp()::text);

-- 5. Enforce NOT NULL and UNIQUE on agencyId now that all rows have a value.
ALTER TABLE "WhatsAppSession" ALTER COLUMN "agencyId" SET NOT NULL;
CREATE UNIQUE INDEX "WhatsAppSession_agencyId_key" ON "WhatsAppSession"("agencyId");

-- 6. Add the foreign-key constraint with ON DELETE CASCADE so deleting an Agency also
--    removes its WhatsApp session, preventing orphaned credentials.
ALTER TABLE "WhatsAppSession"
  ADD CONSTRAINT "WhatsAppSession_agencyId_fkey"
  FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
