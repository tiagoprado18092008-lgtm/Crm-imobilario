-- AlterTable Agency: add missing columns
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "legalName" TEXT;
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "niche" TEXT;
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'EUR';
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "apiKey" TEXT;

-- Create unique index for apiKey if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Agency_apiKey_key') THEN
    CREATE UNIQUE INDEX "Agency_apiKey_key" ON "Agency"("apiKey");
  END IF;
END $$;

-- AlterTable Opportunity: add currency if missing
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'EUR';
