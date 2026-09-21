-- AlphaCRM phase 3: stage entry rules and rotting.
--
-- A deal may not enter a stage without the facts that stage depends on, and a
-- deal that sits too long without a next activity is flagged as going cold.

ALTER TABLE "PipelineStage"
  ADD COLUMN IF NOT EXISTS "probability"    INTEGER NOT NULL DEFAULT 50,
  -- Null disables rotting for the stage.
  ADD COLUMN IF NOT EXISTS "rotDays"        INTEGER,
  -- e.g. ["value", "expectedCloseDate"]
  ADD COLUMN IF NOT EXISTS "requiredFields" JSONB;

-- Denormalised activity clock: recomputing "days since last activity" per card
-- on every board render is what makes a kanban crawl.
ALTER TABLE "Opportunity"
  ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "nextActivityAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rottingAt"      TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "stageEnteredAt" TIMESTAMP(3);

-- Existing deals have no stage history, so treat their last update as the
-- moment they entered. Without this every old deal reads as rotting on day one.
UPDATE "Opportunity"
SET "stageEnteredAt" = COALESCE("updatedAt", "createdAt")
WHERE "stageEnteredAt" IS NULL;

CREATE INDEX IF NOT EXISTS "Opportunity_agencyId_nextActivityAt_idx"
  ON "Opportunity"("agencyId", "nextActivityAt");
CREATE INDEX IF NOT EXISTS "Opportunity_agencyId_rottingAt_idx"
  ON "Opportunity"("agencyId", "rottingAt");

-- Defaults for the two seeded pipelines. A proposal needs a value and a close
-- date before it can be forecast; negotiation needs a scheduled next step.
UPDATE "PipelineStage" SET "rotDays" = 7,  "probability" = 10 WHERE "name" = 'Novo';
UPDATE "PipelineStage" SET "rotDays" = 5,  "probability" = 20 WHERE "name" = 'Contactado';
UPDATE "PipelineStage" SET "rotDays" = 10, "probability" = 40 WHERE "name" = 'Reunião Marcada';
UPDATE "PipelineStage" SET "rotDays" = 5,  "probability" = 55 WHERE "name" = 'Reunião Feita';
UPDATE "PipelineStage" SET "rotDays" = 14, "probability" = 30 WHERE "name" = 'Diagnóstico Feito';

UPDATE "PipelineStage"
SET "rotDays" = 7, "probability" = 70,
    "requiredFields" = '["value", "expectedCloseDate"]'::jsonb
WHERE "name" = 'Proposta Enviada';

UPDATE "PipelineStage"
SET "rotDays" = 5, "probability" = 85,
    "requiredFields" = '["value", "nextActivityAt"]'::jsonb
WHERE "name" = 'Negociação';

UPDATE "PipelineStage" SET "probability" = 95 WHERE "name" = 'Contrato Assinado';
