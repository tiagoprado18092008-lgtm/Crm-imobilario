-- AlphaCRM phase 1: drop the real-estate portfolio and multi-office concepts.
--
-- Destructive by agreement: the CRM tables were treated as disposable for this
-- migration, so there is no dedupe or backfill path. Conversation gains its own
-- agencyId because it previously reached its tenant through Location.

-- 1. Conversation: denormalise tenant ownership before Location disappears.
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "agencyId" TEXT;

UPDATE "Conversation" c
SET "agencyId" = l."agencyId"
FROM "Location" l
WHERE c."locationId" = l."id" AND c."agencyId" IS NULL;

ALTER TABLE "Conversation"
  ADD CONSTRAINT "Conversation_agencyId_fkey"
  FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Conversation_agencyId_lastMessageAt_idx"
  ON "Conversation"("agencyId", "lastMessageAt");

-- 2. Drop the property module.
DROP TABLE IF EXISTS "PropertyVisit" CASCADE;
DROP TABLE IF EXISTS "PropertyDocument" CASCADE;
DROP TABLE IF EXISTS "PropertyPhoto" CASCADE;
DROP TABLE IF EXISTS "Property" CASCADE;

-- 3. Drop the multi-office (location) concept.
DROP TABLE IF EXISTS "LocationSettings" CASCADE;
DROP TABLE IF EXISTS "Location" CASCADE;

-- 4. Drop locationId / propertyId columns left on surviving tables.
ALTER TABLE "User"                DROP COLUMN IF EXISTS "locationId";
ALTER TABLE "Contact"             DROP COLUMN IF EXISTS "locationId";
ALTER TABLE "Opportunity"         DROP COLUMN IF EXISTS "locationId",
                                  DROP COLUMN IF EXISTS "propertyId";
ALTER TABLE "Interaction"         DROP COLUMN IF EXISTS "locationId";
ALTER TABLE "Task"                DROP COLUMN IF EXISTS "locationId";
ALTER TABLE "Conversation"        DROP COLUMN IF EXISTS "locationId";
ALTER TABLE "Message"             DROP COLUMN IF EXISTS "locationId";
ALTER TABLE "Appointment"         DROP COLUMN IF EXISTS "locationId";
ALTER TABLE "CalendarEvent"       DROP COLUMN IF EXISTS "locationId",
                                  DROP COLUMN IF EXISTS "propertyId";
ALTER TABLE "MessageTemplate"     DROP COLUMN IF EXISTS "locationId";
ALTER TABLE "AppointmentCalendar" DROP COLUMN IF EXISTS "locationId";
ALTER TABLE "Invitation"          DROP COLUMN IF EXISTS "locationId";
ALTER TABLE "Pipeline"            DROP COLUMN IF EXISTS "locationId";
ALTER TABLE "ActivityLog"         DROP COLUMN IF EXISTS "locationId";
ALTER TABLE "EmailCampaign"       DROP COLUMN IF EXISTS "locationId";
ALTER TABLE "Form"                DROP COLUMN IF EXISTS "locationId";

-- 5. Drop the real-estate fields carried on Contact and Opportunity.
ALTER TABLE "Contact"
  DROP COLUMN IF EXISTS "budget_min",
  DROP COLUMN IF EXISTS "budget_max",
  DROP COLUMN IF EXISTS "interest_type",
  DROP COLUMN IF EXISTS "interest_zones",
  DROP COLUMN IF EXISTS "timeline",
  DROP COLUMN IF EXISTS "selling_also",
  DROP COLUMN IF EXISTS "needs_financing",
  DROP COLUMN IF EXISTS "property_address",
  DROP COLUMN IF EXISTS "asking_price",
  DROP COLUMN IF EXISTS "sale_reason",
  DROP COLUMN IF EXISTS "buying_also",
  DROP COLUMN IF EXISTS "commission";

ALTER TABLE "Opportunity"
  DROP COLUMN IF EXISTS "selling_also",
  DROP COLUMN IF EXISTS "needs_financing",
  DROP COLUMN IF EXISTS "property_address",
  DROP COLUMN IF EXISTS "asking_price",
  DROP COLUMN IF EXISTS "sale_reason",
  DROP COLUMN IF EXISTS "buying_also",
  DROP COLUMN IF EXISTS "commission",
  DROP COLUMN IF EXISTS "opp_commission";

-- 6. LOCATION_ADMIN is gone; demote anyone still holding it.
UPDATE "User" SET "role" = 'CONSULTANT' WHERE "role" = 'LOCATION_ADMIN';
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'AGENCY_OWNER', 'AGENCY_ADMIN', 'TEAM_LEADER', 'CONSULTANT', 'USER');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole" USING ("role"::text::"UserRole");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CONSULTANT';
DROP TYPE "UserRole_old";
