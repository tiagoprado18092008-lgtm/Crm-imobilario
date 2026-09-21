-- AlphaCRM phase 6: products, line items and quotes.

CREATE TYPE "PriceType"   AS ENUM ('UNICO', 'MENSAL');
CREATE TYPE "QuoteState"  AS ENUM ('RASCUNHO', 'ENVIADA', 'VISTA', 'ACEITE', 'RECUSADA', 'EXPIRADA');
CREATE TYPE "RevenueType" AS ENUM ('ONE_OFF', 'RECORRENTE');

CREATE TABLE "Product" (
  "id"          TEXT PRIMARY KEY,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "priceType"   "PriceType" NOT NULL DEFAULT 'UNICO',
  -- Net of VAT, in euros.
  "price"       DOUBLE PRECISION NOT NULL,
  "vatRate"     DOUBLE PRECISION NOT NULL DEFAULT 23,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "position"    INTEGER NOT NULL DEFAULT 0,
  "agencyId"    TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL
);

ALTER TABLE "Product"
  ADD CONSTRAINT "Product_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Product_agencyId_isActive_position_idx" ON "Product"("agencyId", "isActive", "position");

-- Line items copy the product's name and price rather than referencing them,
-- so raising a price next year cannot rewrite what was quoted last year.
CREATE TABLE "DealLineItem" (
  "id"          TEXT PRIMARY KEY,
  "dealId"      TEXT NOT NULL,
  "productId"   TEXT,
  "name"        TEXT NOT NULL,
  "quantity"    INTEGER NOT NULL DEFAULT 1,
  "unitPrice"   DOUBLE PRECISION NOT NULL,
  "discount"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "vatRate"     DOUBLE PRECISION NOT NULL DEFAULT 23,
  "revenueType" "RevenueType" NOT NULL DEFAULT 'ONE_OFF',
  "position"    INTEGER NOT NULL DEFAULT 0,
  "agencyId"    TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL
);

ALTER TABLE "DealLineItem"
  ADD CONSTRAINT "DealLineItem_dealId_fkey"    FOREIGN KEY ("dealId")    REFERENCES "Opportunity"("id") ON DELETE CASCADE  ON UPDATE CASCADE,
  ADD CONSTRAINT "DealLineItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id")     ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "DealLineItem_agencyId_fkey"  FOREIGN KEY ("agencyId")  REFERENCES "Agency"("id")      ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "DealLineItem_dealId_position_idx" ON "DealLineItem"("dealId", "position");
CREATE INDEX "DealLineItem_agencyId_idx"        ON "DealLineItem"("agencyId");

CREATE TABLE "Quote" (
  "id"                 TEXT PRIMARY KEY,
  "dealId"             TEXT NOT NULL,
  "number"             INTEGER NOT NULL,
  "version"            INTEGER NOT NULL DEFAULT 1,
  "state"              "QuoteState" NOT NULL DEFAULT 'RASCUNHO',
  -- Snapshotted when sent, so a quote keeps showing what the client was told
  -- even if the deal's line items change afterwards.
  "subtotal"           DOUBLE PRECISION NOT NULL DEFAULT 0,
  "vatTotal"           DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total"              DOUBLE PRECISION NOT NULL DEFAULT 0,
  -- Monthly component kept apart: a one-off website plus a retainer is two
  -- commitments, and adding them gives a number that means nothing.
  "mrr"                DOUBLE PRECISION NOT NULL DEFAULT 0,
  "validUntil"         TIMESTAMP(3),
  "notes"              TEXT,
  -- Unguessable; the id is sequential enough to enumerate.
  "publicToken"        TEXT NOT NULL UNIQUE,
  "pdfUrl"             TEXT,
  "sentAt"             TIMESTAMP(3),
  "viewedAt"           TIMESTAMP(3),
  "acceptedAt"         TIMESTAMP(3),
  "rejectedAt"         TIMESTAMP(3),
  "signatureProvider"  TEXT,
  "signatureRequestId" TEXT,
  "signedAt"           TIMESTAMP(3),
  "agencyId"           TEXT,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL
);

ALTER TABLE "Quote"
  ADD CONSTRAINT "Quote_dealId_fkey"   FOREIGN KEY ("dealId")   REFERENCES "Opportunity"("id") ON DELETE CASCADE  ON UPDATE CASCADE,
  ADD CONSTRAINT "Quote_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id")      ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Quote_agencyId_number_version_key" ON "Quote"("agencyId", "number", "version");
CREATE INDEX "Quote_agencyId_state_createdAt_idx"       ON "Quote"("agencyId", "state", "createdAt" DESC);
CREATE INDEX "Quote_agencyId_validUntil_idx"            ON "Quote"("agencyId", "validUntil");

-- What AlphaScale sells today, net of VAT.
INSERT INTO "Product" ("id", "name", "description", "priceType", "price", "vatRate", "position", "agencyId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text, p.name, p.description, p.price_type::"PriceType", p.price, 23, p.position, a."id",
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Agency" a
CROSS JOIN (VALUES
  ('Website',                'Website institucional, entregue e publicado',      'UNICO',  700.0, 0),
  ('Ads Setup',              'Configuração inicial de campanhas Google e Meta',  'UNICO',  250.0, 1),
  ('Gestão de Ads',          'Gestão mensal de campanhas e relatório',           'MENSAL', 200.0, 2),
  ('Gestão de Redes Sociais','Planeamento e publicação mensal',                  'MENSAL', 200.0, 3),
  ('SEO',                    'Otimização para motores de busca, mensal',         'MENSAL', 200.0, 4)
) AS p(name, description, price_type, price, position)
WHERE NOT EXISTS (
  SELECT 1 FROM "Product" existing WHERE existing."agencyId" = a."id" AND existing."name" = p.name
);
