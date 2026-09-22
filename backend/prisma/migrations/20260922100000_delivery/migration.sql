-- AlphaCRM phase 7: delivery.
--
-- Projects exist so work that was sold does not fall into the gap between
-- closing the deal and doing the work.

CREATE TYPE "ProjectType"      AS ENUM ('WEBSITE', 'ADS', 'REDES_SOCIAIS', 'SEO', 'OUTRO');
CREATE TYPE "ProjectState"     AS ENUM ('ONBOARDING', 'EM_CURSO', 'EM_REVISAO', 'ENTREGUE', 'EM_PAUSA', 'TERMINADO');
CREATE TYPE "DeliverableState" AS ENUM ('RASCUNHO', 'SUBMETIDO', 'EM_APROVACAO', 'APROVADO', 'ALTERACOES_PEDIDAS');

CREATE TABLE "Project" (
  "id"          TEXT PRIMARY KEY,
  "name"        TEXT NOT NULL,
  "type"        "ProjectType" NOT NULL DEFAULT 'OUTRO',
  "state"       "ProjectState" NOT NULL DEFAULT 'ONBOARDING',
  "companyId"   TEXT NOT NULL,
  "dealId"      TEXT,
  "ownerId"     TEXT,
  "startDate"   TIMESTAMP(3),
  "dueDate"     TIMESTAMP(3),
  -- Stamped on the transition to ENTREGUE, so cycle time measures delivery
  -- rather than the last time somebody edited the record.
  "deliveredAt" TIMESTAMP(3),
  "notes"       TEXT,
  "agencyId"    TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  "deletedAt"   TIMESTAMP(3)
);

ALTER TABLE "Project"
  ADD CONSTRAINT "Project_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id")     ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Project_dealId_fkey"    FOREIGN KEY ("dealId")    REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Project_ownerId_fkey"   FOREIGN KEY ("ownerId")   REFERENCES "User"("id")        ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Project_agencyId_fkey"  FOREIGN KEY ("agencyId")  REFERENCES "Agency"("id")      ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Project_agencyId_state_dueDate_idx"  ON "Project"("agencyId", "state", "dueDate");
CREATE INDEX "Project_agencyId_companyId_idx"      ON "Project"("agencyId", "companyId");
CREATE INDEX "Project_agencyId_createdAt_id_idx"   ON "Project"("agencyId", "createdAt" DESC, "id" DESC);

CREATE TABLE "ProjectTask" (
  "id"          TEXT PRIMARY KEY,
  "projectId"   TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "description" TEXT,
  "position"    INTEGER NOT NULL DEFAULT 0,
  "isDone"      BOOLEAN NOT NULL DEFAULT false,
  "doneAt"      TIMESTAMP(3),
  "assigneeId"  TEXT,
  "dueDate"     TIMESTAMP(3),
  "agencyId"    TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL
);

ALTER TABLE "ProjectTask"
  ADD CONSTRAINT "ProjectTask_projectId_fkey"  FOREIGN KEY ("projectId")  REFERENCES "Project"("id") ON DELETE CASCADE  ON UPDATE CASCADE,
  ADD CONSTRAINT "ProjectTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id")    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ProjectTask_agencyId_fkey"   FOREIGN KEY ("agencyId")   REFERENCES "Agency"("id")  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ProjectTask_projectId_position_idx"    ON "ProjectTask"("projectId", "position");
CREATE INDEX "ProjectTask_agencyId_isDone_dueDate_idx" ON "ProjectTask"("agencyId", "isDone", "dueDate");

CREATE TABLE "Deliverable" (
  "id"             TEXT PRIMARY KEY,
  "projectId"      TEXT NOT NULL,
  "name"           TEXT NOT NULL,
  "url"            TEXT,
  "state"          "DeliverableState" NOT NULL DEFAULT 'RASCUNHO',
  -- What the client said when asking for changes, kept so the next version
  -- answers the actual objection.
  "clientFeedback" TEXT,
  "submittedAt"    TIMESTAMP(3),
  "approvedAt"     TIMESTAMP(3),
  "agencyId"       TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL
);

ALTER TABLE "Deliverable"
  ADD CONSTRAINT "Deliverable_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE  ON UPDATE CASCADE,
  ADD CONSTRAINT "Deliverable_agencyId_fkey"  FOREIGN KEY ("agencyId")  REFERENCES "Agency"("id")  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Deliverable_projectId_state_idx" ON "Deliverable"("projectId", "state");
CREATE INDEX "Deliverable_agencyId_state_idx"  ON "Deliverable"("agencyId", "state");

CREATE TABLE "ProjectTemplate" (
  "id"        TEXT PRIMARY KEY,
  "name"      TEXT NOT NULL,
  "type"      "ProjectType" NOT NULL DEFAULT 'OUTRO',
  "tasks"     JSONB NOT NULL,
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  "agencyId"  TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

ALTER TABLE "ProjectTemplate"
  ADD CONSTRAINT "ProjectTemplate_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ProjectTemplate_agencyId_type_isActive_idx" ON "ProjectTemplate"("agencyId", "type", "isActive");
