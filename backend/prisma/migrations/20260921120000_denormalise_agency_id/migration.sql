-- AlphaCRM phase 1.5: give every workspace-owned table its own agencyId.
--
-- Tenant isolation previously ran through a join (assignedTo.agencyId), which
-- meant no query could be served by an index led by the tenant. Every model now
-- carries the column directly, and the composite indexes below match the
-- orderBy clauses the list screens actually use.
--
-- The column is nullable on purpose. Rows that predate this migration and have
-- no resolvable owner would otherwise block it; `withWorkspace` treats a null
-- agencyId as "matches nothing", so an unbackfilled row is invisible rather
-- than leaked.

-- ─── 1. Add the columns ──────────────────────────────────────────────────────
ALTER TABLE "Contact"                ADD COLUMN IF NOT EXISTS "agencyId" TEXT;
ALTER TABLE "Interaction"            ADD COLUMN IF NOT EXISTS "agencyId" TEXT;
ALTER TABLE "Task"                   ADD COLUMN IF NOT EXISTS "agencyId" TEXT;
ALTER TABLE "Message"                ADD COLUMN IF NOT EXISTS "agencyId" TEXT;
ALTER TABLE "PhoneNumber"            ADD COLUMN IF NOT EXISTS "agencyId" TEXT;
ALTER TABLE "Appointment"            ADD COLUMN IF NOT EXISTS "agencyId" TEXT;
ALTER TABLE "EmailCampaign"          ADD COLUMN IF NOT EXISTS "agencyId" TEXT;
ALTER TABLE "EmailCampaignRecipient" ADD COLUMN IF NOT EXISTS "agencyId" TEXT;
ALTER TABLE "Form"                   ADD COLUMN IF NOT EXISTS "agencyId" TEXT;
ALTER TABLE "FormSubmission"         ADD COLUMN IF NOT EXISTS "agencyId" TEXT;
ALTER TABLE "AutomationLog"          ADD COLUMN IF NOT EXISTS "agencyId" TEXT;
ALTER TABLE "AutomationEnrollment"   ADD COLUMN IF NOT EXISTS "agencyId" TEXT;
ALTER TABLE "AutomationRun"          ADD COLUMN IF NOT EXISTS "agencyId" TEXT;
ALTER TABLE "CalendarIntegration"    ADD COLUMN IF NOT EXISTS "agencyId" TEXT;
ALTER TABLE "CalendarEvent"          ADD COLUMN IF NOT EXISTS "agencyId" TEXT;
ALTER TABLE "CalendarSlot"           ADD COLUMN IF NOT EXISTS "agencyId" TEXT;
ALTER TABLE "PipelineStage"          ADD COLUMN IF NOT EXISTS "agencyId" TEXT;

-- ─── 2. Backfill from the owning row ─────────────────────────────────────────
-- Owned directly by a user.
UPDATE "Contact" t           SET "agencyId" = u."agencyId" FROM "User" u WHERE t."assignedToId" = u."id" AND t."agencyId" IS NULL;
UPDATE "Task" t              SET "agencyId" = u."agencyId" FROM "User" u WHERE t."assignedToId" = u."id" AND t."agencyId" IS NULL;
UPDATE "Appointment" t       SET "agencyId" = u."agencyId" FROM "User" u WHERE t."assignedToId" = u."id" AND t."agencyId" IS NULL;
UPDATE "Interaction" t       SET "agencyId" = u."agencyId" FROM "User" u WHERE t."createdById" = u."id" AND t."agencyId" IS NULL;
UPDATE "EmailCampaign" t     SET "agencyId" = u."agencyId" FROM "User" u WHERE t."createdById" = u."id" AND t."agencyId" IS NULL;
UPDATE "PhoneNumber" t       SET "agencyId" = u."agencyId" FROM "User" u WHERE t."userId" = u."id" AND t."agencyId" IS NULL;
UPDATE "CalendarIntegration" t SET "agencyId" = u."agencyId" FROM "User" u WHERE t."userId" = u."id" AND t."agencyId" IS NULL;
UPDATE "CalendarEvent" t     SET "agencyId" = u."agencyId" FROM "User" u WHERE t."userId" = u."id" AND t."agencyId" IS NULL;
UPDATE "CalendarSlot" t      SET "agencyId" = u."agencyId" FROM "User" u WHERE t."userId" = u."id" AND t."agencyId" IS NULL;
UPDATE "Form" t              SET "agencyId" = u."agencyId" FROM "User" u WHERE t."assignedToId" = u."id" AND t."agencyId" IS NULL;

-- Owned through a parent row.
UPDATE "Message" t              SET "agencyId" = c."agencyId" FROM "Conversation" c WHERE t."conversationId" = c."id" AND t."agencyId" IS NULL;
UPDATE "PipelineStage" t        SET "agencyId" = p."agencyId" FROM "Pipeline" p     WHERE t."pipelineId" = p."id" AND t."agencyId" IS NULL;
UPDATE "EmailCampaignRecipient" t SET "agencyId" = c."agencyId" FROM "EmailCampaign" c WHERE t."campaignId" = c."id" AND t."agencyId" IS NULL;
UPDATE "FormSubmission" t       SET "agencyId" = f."agencyId" FROM "Form" f         WHERE t."formId" = f."id" AND t."agencyId" IS NULL;
UPDATE "AutomationEnrollment" t SET "agencyId" = a."agencyId" FROM "Automation" a   WHERE t."automationId" = a."id" AND t."agencyId" IS NULL;
UPDATE "AutomationRun" t        SET "agencyId" = a."agencyId" FROM "Automation" a   WHERE t."automationId" = a."id" AND t."agencyId" IS NULL;

-- Last resort: fall back to the contact's workspace.
UPDATE "AutomationLog" t SET "agencyId" = c."agencyId" FROM "Contact" c WHERE t."contactId" = c."id" AND t."agencyId" IS NULL;
UPDATE "Interaction" t   SET "agencyId" = c."agencyId" FROM "Contact" c WHERE t."contactId" = c."id" AND t."agencyId" IS NULL;

-- ─── 3. Foreign keys ─────────────────────────────────────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'Contact','Interaction','Task','Message','PhoneNumber','Appointment',
    'EmailCampaign','EmailCampaignRecipient','Form','FormSubmission',
    'AutomationLog','AutomationEnrollment','AutomationRun',
    'CalendarIntegration','CalendarEvent','CalendarSlot','PipelineStage'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = t || '_agencyId_fkey'
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE',
        t, t || '_agencyId_fkey'
      );
    END IF;
  END LOOP;
END $$;

-- ─── 4. Composite indexes, led by the tenant ─────────────────────────────────
-- Shaped to match the orderBy of the list screens so keyset pagination can use
-- them end to end instead of sorting in memory.
CREATE INDEX IF NOT EXISTS "Contact_agencyId_createdAt_id_idx"
  ON "Contact"("agencyId", "createdAt" DESC, "id" DESC);
CREATE INDEX IF NOT EXISTS "Contact_agencyId_assignedToId_createdAt_idx"
  ON "Contact"("agencyId", "assignedToId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Opportunity_agencyId_createdAt_id_idx"
  ON "Opportunity"("agencyId", "createdAt" DESC, "id" DESC);
CREATE INDEX IF NOT EXISTS "Opportunity_agencyId_stageId_position_idx"
  ON "Opportunity"("agencyId", "stageId", "position");
CREATE INDEX IF NOT EXISTS "Opportunity_agencyId_stage_expectedCloseDate_idx"
  ON "Opportunity"("agencyId", "stage", "expectedCloseDate");

CREATE INDEX IF NOT EXISTS "Task_agencyId_assignedToId_status_dueDate_idx"
  ON "Task"("agencyId", "assignedToId", "status", "dueDate");

CREATE INDEX IF NOT EXISTS "Interaction_agencyId_contactId_createdAt_idx"
  ON "Interaction"("agencyId", "contactId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Appointment_agencyId_assignedToId_startAt_idx"
  ON "Appointment"("agencyId", "assignedToId", "startAt");

CREATE INDEX IF NOT EXISTS "Message_conversationId_createdAt_idx"
  ON "Message"("conversationId", "createdAt");

CREATE INDEX IF NOT EXISTS "CalendarEvent_agencyId_userId_startAt_idx"
  ON "CalendarEvent"("agencyId", "userId", "startAt");

CREATE INDEX IF NOT EXISTS "PipelineStage_pipelineId_position_idx"
  ON "PipelineStage"("pipelineId", "position");

-- ─── 5. Trigram search (phase 2 prerequisite) ────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "Contact_name_trgm_idx"  ON "Contact" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Contact_email_trgm_idx" ON "Contact" USING GIN ("email" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Contact_phone_trgm_idx" ON "Contact" USING GIN ("phone" gin_trgm_ops);
