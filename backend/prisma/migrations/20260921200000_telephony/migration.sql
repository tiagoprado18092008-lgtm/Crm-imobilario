-- AlphaCRM phase 4: telephony.
--
-- Calls used to be rows in Interaction, which left nowhere to record a
-- disposition, a recording, a cost, or the provider id needed to reconcile
-- against the carrier's own statistics.

CREATE TYPE "CallDirection"     AS ENUM ('INBOUND', 'OUTBOUND');
CREATE TYPE "CallState"         AS ENUM ('INICIADA', 'A_TOCAR', 'ATENDIDA', 'TERMINADA', 'FALHADA');
CREATE TYPE "TelephonyProvider" AS ENUM ('ZADARMA', 'TWILIO');

CREATE TABLE "Call" (
  "id"             TEXT PRIMARY KEY,
  "direction"      "CallDirection" NOT NULL,
  "state"          "CallState" NOT NULL DEFAULT 'INICIADA',
  "from"           TEXT NOT NULL,
  "to"             TEXT NOT NULL,
  "duration"       INTEGER,
  "talkTime"       INTEGER,
  "disposition"    "CallDisposition",
  "notes"          TEXT,
  "userId"         TEXT,
  "contactId"      TEXT,
  "companyId"      TEXT,
  "leadId"         TEXT,
  "dealId"         TEXT,
  "provider"       "TelephonyProvider" NOT NULL DEFAULT 'ZADARMA',
  "providerCallId" TEXT,
  "cost"           DOUBLE PRECISION,
  "currency"       TEXT,
  "queueId"        TEXT,
  "agencyId"       TEXT,
  "startedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt"        TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL
);

ALTER TABLE "Call"
  ADD CONSTRAINT "Call_userId_fkey"    FOREIGN KEY ("userId")    REFERENCES "User"("id")        ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Call_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id")     ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Call_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id")     ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Call_leadId_fkey"    FOREIGN KEY ("leadId")    REFERENCES "Lead"("id")        ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Call_dealId_fkey"    FOREIGN KEY ("dealId")    REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Call_agencyId_fkey"  FOREIGN KEY ("agencyId")  REFERENCES "Agency"("id")      ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Call_agencyId_startedAt_id_idx"     ON "Call"("agencyId", "startedAt" DESC, "id" DESC);
CREATE INDEX "Call_agencyId_userId_startedAt_idx" ON "Call"("agencyId", "userId", "startedAt" DESC);
CREATE INDEX "Call_providerCallId_idx"            ON "Call"("providerCallId");
CREATE INDEX "Call_agencyId_disposition_idx"      ON "Call"("agencyId", "disposition");

-- Raw webhook log. Separate from Call so a malformed payload can never corrupt
-- the call, and so events can be replayed if processing fails.
CREATE TABLE "CallEvent" (
  "id"             TEXT PRIMARY KEY,
  "callId"         TEXT,
  "provider"       "TelephonyProvider" NOT NULL DEFAULT 'ZADARMA',
  "providerCallId" TEXT,
  "eventType"      TEXT NOT NULL,
  "payload"        JSONB NOT NULL,
  "agencyId"       TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "CallEvent"
  ADD CONSTRAINT "CallEvent_callId_fkey"   FOREIGN KEY ("callId")   REFERENCES "Call"("id")   ON DELETE CASCADE  ON UPDATE CASCADE,
  ADD CONSTRAINT "CallEvent_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Providers retry; this makes a redelivered event a no-op rather than a
-- duplicate row.
CREATE UNIQUE INDEX "CallEvent_providerCallId_eventType_key" ON "CallEvent"("providerCallId", "eventType");
CREATE INDEX "CallEvent_agencyId_createdAt_idx" ON "CallEvent"("agencyId", "createdAt" DESC);

-- Recordings are re-hosted: provider quota is small and their links expire.
CREATE TABLE "Recording" (
  "id"         TEXT PRIMARY KEY,
  "callId"     TEXT NOT NULL UNIQUE,
  "url"        TEXT NOT NULL,
  "duration"   INTEGER,
  "sizeBytes"  INTEGER,
  "transcript" TEXT,
  -- GDPR retention: recordings for calls that did not convert are deleted
  -- after 30 days (CNPD 1039/2017, quality and training).
  "deleteAt"   TIMESTAMP(3),
  "agencyId"   TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "Recording"
  ADD CONSTRAINT "Recording_callId_fkey"   FOREIGN KEY ("callId")   REFERENCES "Call"("id")   ON DELETE CASCADE  ON UPDATE CASCADE,
  ADD CONSTRAINT "Recording_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Recording_agencyId_deleteAt_idx" ON "Recording"("agencyId", "deleteAt");

CREATE TABLE "AgentExtension" (
  "id"          TEXT PRIMARY KEY,
  "userId"      TEXT NOT NULL UNIQUE,
  "extension"   TEXT NOT NULL,
  -- Encrypted at rest; the browser gets short-lived credentials instead.
  "sipLogin"    TEXT,
  "sipPassword" TEXT,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "agencyId"    TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL
);

ALTER TABLE "AgentExtension"
  ADD CONSTRAINT "AgentExtension_userId_fkey"   FOREIGN KEY ("userId")   REFERENCES "User"("id")   ON DELETE CASCADE  ON UPDATE CASCADE,
  ADD CONSTRAINT "AgentExtension_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "AgentExtension_agencyId_extension_idx" ON "AgentExtension"("agencyId", "extension");
