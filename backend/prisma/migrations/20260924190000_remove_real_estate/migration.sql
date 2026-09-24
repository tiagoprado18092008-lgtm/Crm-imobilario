-- The product serves one digital-marketing agency. Retire the values left from
-- the real-estate CRM it started as, mapping each onto its agency equivalent so
-- no record is lost or left showing a code the interface no longer knows.

-- Appointments: visits, CPCV, escritura and angariação meetings.
UPDATE "Appointment"
   SET "type" = 'GENERAL_MEETING'
 WHERE "type" IN ('VISIT', 'ANGARIACAO_MEETING', 'CPCV', 'ESCRITURA', 'MEETING');
ALTER TABLE "Appointment" ALTER COLUMN "type" SET DEFAULT 'GENERAL_MEETING';

-- Contacts: buyer / owner / tenant. BUYER was also the old import default.
UPDATE "Contact" SET "type" = 'LEAD' WHERE "type" IN ('BUYER', 'OWNER', 'TENANT');

-- Stages created from the real-estate default template.
UPDATE "PipelineStage" SET "name" = 'Reunião Marcada' WHERE "name" = 'Visita Agendada';
UPDATE "PipelineStage" SET "name" = 'Reunião Feita'   WHERE "name" = 'Visita Realizada';

-- Legacy stage codes on deals that predate per-pipeline stages.
UPDATE "Opportunity" SET "stage" = 'MEETING_SCHEDULED' WHERE "stage" = 'VISIT_SCHEDULED';
UPDATE "Opportunity" SET "stage" = 'MEETING_DONE'      WHERE "stage" = 'VISIT_DONE';
UPDATE "Opportunity" SET "stage" = 'NEGOTIATION'       WHERE "stage" IN ('CPCV_SIGNED', 'FINANCING', 'ESCRITURA_SCHEDULED');

-- Automation trigger renamed with the stage.
UPDATE "AutomationRule" SET "trigger" = 'MEETING_SCHEDULED' WHERE "trigger" = 'VISIT_SCHEDULED';
UPDATE "Automation"
   SET "trigger" = replace("trigger"::text, '"VISIT_SCHEDULED"', '"MEETING_SCHEDULED"')::jsonb
 WHERE "trigger"::text LIKE '%"VISIT_SCHEDULED"%';

-- AMI is the real-estate mediator licence number. Empty in every database
-- checked before this was written.
ALTER TABLE "User"   DROP COLUMN IF EXISTS "amiNumber";
ALTER TABLE "Agency" DROP COLUMN IF EXISTS "amiNumber";
