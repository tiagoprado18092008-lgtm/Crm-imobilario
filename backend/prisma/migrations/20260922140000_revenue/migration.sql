-- AlphaCRM phase 8: revenue.
--
-- Half the business lived outside the system: the CRM reported "Total
-- Clientes: 0" while the agency had paying clients, because nothing recorded
-- retainers or invoices.

CREATE TYPE "SubscriptionState" AS ENUM ('ATIVA', 'EM_PAUSA', 'CANCELADA');
CREATE TYPE "InvoiceState"      AS ENUM ('RASCUNHO', 'EMITIDA', 'PAGA', 'VENCIDA', 'ANULADA');
CREATE TYPE "HealthStatus"      AS ENUM ('VERDE', 'AMARELO', 'VERMELHO');

CREATE TABLE "Subscription" (
  "id"           TEXT PRIMARY KEY,
  "companyId"    TEXT NOT NULL,
  "productId"    TEXT,
  -- Snapshot, so repricing a product does not rewrite an existing contract.
  "name"         TEXT NOT NULL,
  "monthlyValue" DOUBLE PRECISION NOT NULL,
  "state"        "SubscriptionState" NOT NULL DEFAULT 'ATIVA',
  -- Capped at 28 in application code so the date exists in February.
  "billingDay"   INTEGER NOT NULL DEFAULT 1,
  "startDate"    TIMESTAMP(3) NOT NULL,
  "endDate"      TIMESTAMP(3),
  "renewsAt"     TIMESTAMP(3),
  "cancelledAt"  TIMESTAMP(3),
  "cancelReason" TEXT,
  "dealId"       TEXT,
  "agencyId"     TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL
);

ALTER TABLE "Subscription"
  ADD CONSTRAINT "Subscription_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id")     ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Subscription_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id")     ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Subscription_dealId_fkey"    FOREIGN KEY ("dealId")    REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Subscription_agencyId_fkey"  FOREIGN KEY ("agencyId")  REFERENCES "Agency"("id")      ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Subscription_agencyId_state_renewsAt_idx" ON "Subscription"("agencyId", "state", "renewsAt");
CREATE INDEX "Subscription_agencyId_companyId_idx"      ON "Subscription"("agencyId", "companyId");

-- Certified AT invoicing is out of scope. This records what is owed and links
-- to the number the accountant's software issued.
CREATE TABLE "Invoice" (
  "id"             TEXT PRIMARY KEY,
  "companyId"      TEXT NOT NULL,
  "subscriptionId" TEXT,
  "dealId"         TEXT,
  "number"         INTEGER NOT NULL,
  "amount"         DOUBLE PRECISION NOT NULL,
  "vatAmount"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total"          DOUBLE PRECISION NOT NULL,
  "state"          "InvoiceState" NOT NULL DEFAULT 'RASCUNHO',
  "issuedAt"       TIMESTAMP(3),
  "dueAt"          TIMESTAMP(3),
  "paidAt"         TIMESTAMP(3),
  "externalRef"    TEXT,
  "pdfUrl"         TEXT,
  "notes"          TEXT,
  "agencyId"       TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL
);

ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_companyId_fkey"      FOREIGN KEY ("companyId")      REFERENCES "Company"("id")      ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Invoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Invoice_dealId_fkey"         FOREIGN KEY ("dealId")         REFERENCES "Opportunity"("id")  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Invoice_agencyId_fkey"       FOREIGN KEY ("agencyId")       REFERENCES "Agency"("id")       ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Invoice_agencyId_number_key"          ON "Invoice"("agencyId", "number");
CREATE INDEX "Invoice_agencyId_state_dueAt_idx"            ON "Invoice"("agencyId", "state", "dueAt");
CREATE INDEX "Invoice_agencyId_companyId_issuedAt_idx"     ON "Invoice"("agencyId", "companyId", "issuedAt" DESC);

-- Monthly snapshot, so the revenue chart is a read rather than a
-- recomputation over every subscription's history.
CREATE TABLE "RevenueSnapshot" (
  "id"            TEXT PRIMARY KEY,
  "month"         TIMESTAMP(3) NOT NULL,
  "mrr"           DOUBLE PRECISION NOT NULL DEFAULT 0,
  "newMrr"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  "expansion"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "contraction"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "churn"         DOUBLE PRECISION NOT NULL DEFAULT 0,
  "activeClients" INTEGER NOT NULL DEFAULT 0,
  "agencyId"      TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "RevenueSnapshot"
  ADD CONSTRAINT "RevenueSnapshot_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "RevenueSnapshot_agencyId_month_key" ON "RevenueSnapshot"("agencyId", "month");
CREATE INDEX "RevenueSnapshot_agencyId_month_idx"        ON "RevenueSnapshot"("agencyId", "month" DESC);

CREATE TABLE "ClientHealth" (
  "id"                TEXT PRIMARY KEY,
  "companyId"         TEXT NOT NULL UNIQUE,
  "status"            "HealthStatus" NOT NULL DEFAULT 'VERDE',
  -- Why it is what it is, so the light can be argued with rather than obeyed.
  "reasons"           JSONB,
  "daysSinceContact"  INTEGER,
  "overdueInvoices"   INTEGER NOT NULL DEFAULT 0,
  "overdueTasks"      INTEGER NOT NULL DEFAULT 0,
  "daysSinceDelivery" INTEGER,
  "renewalRisk"       BOOLEAN NOT NULL DEFAULT false,
  "agencyId"          TEXT,
  "computedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "ClientHealth"
  ADD CONSTRAINT "ClientHealth_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE  ON UPDATE CASCADE,
  ADD CONSTRAINT "ClientHealth_agencyId_fkey"  FOREIGN KEY ("agencyId")  REFERENCES "Agency"("id")  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ClientHealth_agencyId_status_idx" ON "ClientHealth"("agencyId", "status");
