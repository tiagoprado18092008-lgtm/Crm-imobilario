-- CreateTable
CREATE TABLE IF NOT EXISTS "WhatsAppSession" (
    "id" TEXT NOT NULL,
    "creds" TEXT NOT NULL,
    "keys" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "phone" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppSession_pkey" PRIMARY KEY ("id")
);
