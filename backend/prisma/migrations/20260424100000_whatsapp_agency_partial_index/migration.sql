-- Add partial unique index to enforce at most one agency session per agency (userId IS NULL)
CREATE UNIQUE INDEX "WhatsAppSession_agencyId_shared_key"
  ON "WhatsAppSession"("agencyId")
  WHERE "userId" IS NULL;
