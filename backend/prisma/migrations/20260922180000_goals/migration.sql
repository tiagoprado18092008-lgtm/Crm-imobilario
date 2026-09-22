-- AlphaCRM phase 9: goals.
--
-- The metric that matters most is meetings booked per week: everything
-- downstream follows from it, and it is the one a BDR can move today.

CREATE TYPE "GoalMetric" AS ENUM (
  'CHAMADAS', 'CONVERSAS', 'REUNIOES', 'NEGOCIOS_CRIADOS', 'VALOR_FECHADO', 'MRR_NOVO'
);
CREATE TYPE "GoalPeriod" AS ENUM ('SEMANAL', 'MENSAL', 'TRIMESTRAL');

CREATE TABLE "Goal" (
  "id"        TEXT PRIMARY KEY,
  "metric"    "GoalMetric" NOT NULL,
  "period"    "GoalPeriod" NOT NULL DEFAULT 'MENSAL',
  -- Money in euros, everything else a count.
  "target"    DOUBLE PRECISION NOT NULL,
  -- Null means the goal belongs to the workspace rather than one person.
  "userId"    TEXT,
  "startsAt"  TIMESTAMP(3) NOT NULL,
  "endsAt"    TIMESTAMP(3) NOT NULL,
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  "agencyId"  TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

ALTER TABLE "Goal"
  ADD CONSTRAINT "Goal_userId_fkey"   FOREIGN KEY ("userId")   REFERENCES "User"("id")   ON DELETE CASCADE  ON UPDATE CASCADE,
  ADD CONSTRAINT "Goal_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Goal_agencyId_userId_isActive_idx" ON "Goal"("agencyId", "userId", "isActive");
CREATE INDEX "Goal_agencyId_metric_startsAt_idx" ON "Goal"("agencyId", "metric", "startsAt");
