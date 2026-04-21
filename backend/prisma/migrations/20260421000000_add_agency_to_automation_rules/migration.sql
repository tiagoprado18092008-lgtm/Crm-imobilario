-- Add agencyId to AutomationRule for tenant isolation
ALTER TABLE "AutomationRule" ADD COLUMN IF NOT EXISTS "agencyId" TEXT;

-- Add foreign key constraint
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_agencyId_fkey"
  FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS "AutomationRule_agencyId_idx" ON "AutomationRule"("agencyId");
