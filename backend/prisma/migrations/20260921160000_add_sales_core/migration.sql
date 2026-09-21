-- AlphaCRM phase 3: Lead, Company and SavedView.
--
-- Lead exists so that a cold-call list stops being modelled as a pipeline.
-- Company exists because B2B sells to organisations, not to individual people.

CREATE TYPE "Sector" AS ENUM (
  'FISIOTERAPIA', 'DENTARIA', 'VETERINARIA', 'MEDICINA_ESTETICA',
  'MEDICINA_CHINESA', 'CONSTRUCAO', 'IMOBILIARIA', 'OUTRO'
);
CREATE TYPE "CompanyType" AS ENUM ('LEAD', 'PROSPECT', 'CLIENTE', 'EX_CLIENTE');
CREATE TYPE "LeadState" AS ENUM ('NOVO', 'A_TRABALHAR', 'QUALIFICADO', 'DESQUALIFICADO', 'NURTURING');
CREATE TYPE "CallDisposition" AS ENUM (
  'ATENDEU_INTERESSADO', 'ATENDEU_SEM_INTERESSE', 'GATEKEEPER', 'PEDIU_INFO_EMAIL',
  'REMARCAR', 'NAO_ATENDEU', 'VOICEMAIL', 'NUMERO_ERRADO', 'NAO_CONTACTAR', 'REUNIAO_MARCADA'
);

-- ─── Company ─────────────────────────────────────────────────────────────────
CREATE TABLE "Company" (
  "id"                TEXT PRIMARY KEY,
  "name"              TEXT NOT NULL,
  "legalName"         TEXT,
  "nif"               TEXT,
  "domain"            TEXT,
  "website"           TEXT,
  "phone"             TEXT,
  "email"             TEXT,
  "address"           TEXT,
  "city"              TEXT,
  "distrito"          TEXT,
  "concelho"          TEXT,
  "sector"            "Sector" NOT NULL DEFAULT 'OUTRO',
  "type"              "CompanyType" NOT NULL DEFAULT 'LEAD',
  "size"              TEXT,
  "hasWebsite"        BOOLEAN NOT NULL DEFAULT false,
  "googleBusinessUrl" TEXT,
  "instagramUrl"      TEXT,
  "facebookUrl"       TEXT,
  "prospectingNotes"  TEXT,
  "ownerId"           TEXT,
  "source"            TEXT,
  "tags"              TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "notes"             TEXT,
  "agencyId"          TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,
  "deletedAt"         TIMESTAMP(3)
);

ALTER TABLE "Company"
  ADD CONSTRAINT "Company_ownerId_fkey"  FOREIGN KEY ("ownerId")  REFERENCES "User"("id")   ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Company_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Company_agencyId_createdAt_id_idx" ON "Company"("agencyId", "createdAt" DESC, "id" DESC);
CREATE INDEX "Company_agencyId_type_sector_idx"  ON "Company"("agencyId", "type", "sector");
CREATE INDEX "Company_agencyId_nif_idx"          ON "Company"("agencyId", "nif");

-- ─── Lead ────────────────────────────────────────────────────────────────────
CREATE TABLE "Lead" (
  "id"                       TEXT PRIMARY KEY,
  "companyId"                TEXT,
  "contactId"                TEXT,
  "companyName"              TEXT,
  "contactName"              TEXT,
  "phone"                    TEXT,
  "email"                    TEXT,
  "source"                   TEXT,
  "state"                    "LeadState" NOT NULL DEFAULT 'NOVO',
  "disqualifiedReason"       TEXT,
  "ownerId"                  TEXT,
  "attempts"                 INTEGER NOT NULL DEFAULT 0,
  "lastAttemptAt"            TIMESTAMP(3),
  "nextAttemptAt"            TIMESTAMP(3),
  "lastDisposition"          "CallDisposition",
  "qualification"            JSONB,
  "notes"                    TEXT,
  "tags"                     TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "optOutCalls"              BOOLEAN NOT NULL DEFAULT false,
  "optOutEmail"              BOOLEAN NOT NULL DEFAULT false,
  "optOutWhatsApp"           BOOLEAN NOT NULL DEFAULT false,
  "convertedToOpportunityId" TEXT,
  "convertedAt"              TIMESTAMP(3),
  "agencyId"                 TEXT,
  "createdAt"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                TIMESTAMP(3) NOT NULL,
  "deletedAt"                TIMESTAMP(3)
);

ALTER TABLE "Lead"
  ADD CONSTRAINT "Lead_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Lead_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Lead_ownerId_fkey"   FOREIGN KEY ("ownerId")   REFERENCES "User"("id")    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Lead_agencyId_fkey"  FOREIGN KEY ("agencyId")  REFERENCES "Agency"("id")  ON DELETE SET NULL ON UPDATE CASCADE;

-- nextAttemptAt leads the call-queue sort, so it leads the index.
CREATE INDEX "Lead_agencyId_state_nextAttemptAt_idx" ON "Lead"("agencyId", "state", "nextAttemptAt");
CREATE INDEX "Lead_agencyId_ownerId_state_idx"       ON "Lead"("agencyId", "ownerId", "state");
CREATE INDEX "Lead_agencyId_createdAt_id_idx"        ON "Lead"("agencyId", "createdAt" DESC, "id" DESC);
CREATE INDEX "Lead_agencyId_phone_idx"               ON "Lead"("agencyId", "phone");

-- ─── SavedView ───────────────────────────────────────────────────────────────
CREATE TABLE "SavedView" (
  "id"          TEXT PRIMARY KEY,
  "name"        TEXT NOT NULL,
  "entity"      TEXT NOT NULL,
  "filters"     JSONB NOT NULL,
  "sort"        JSONB,
  "columns"     JSONB,
  "isShared"    BOOLEAN NOT NULL DEFAULT false,
  "isCallQueue" BOOLEAN NOT NULL DEFAULT false,
  "icon"        TEXT,
  "position"    INTEGER NOT NULL DEFAULT 0,
  "ownerId"     TEXT NOT NULL,
  "agencyId"    TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL
);

ALTER TABLE "SavedView"
  ADD CONSTRAINT "SavedView_ownerId_fkey"  FOREIGN KEY ("ownerId")  REFERENCES "User"("id")   ON DELETE CASCADE  ON UPDATE CASCADE,
  ADD CONSTRAINT "SavedView_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "SavedView_agencyId_entity_position_idx" ON "SavedView"("agencyId", "entity", "position");

-- ─── Link existing records to a company ──────────────────────────────────────
ALTER TABLE "Contact"     ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "companyId" TEXT;

ALTER TABLE "Contact"
  ADD CONSTRAINT "Contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Opportunity"
  ADD CONSTRAINT "Opportunity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Trigram index on lead phone/company so the importer can dedupe on the way in.
CREATE INDEX IF NOT EXISTS "Lead_companyName_trgm_idx" ON "Lead" USING GIN ("companyName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Company_name_trgm_idx"     ON "Company" USING GIN ("name" gin_trgm_ops);
