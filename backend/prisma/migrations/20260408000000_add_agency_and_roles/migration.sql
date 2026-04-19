-- CreateEnum (safe: skip if already exists)
DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('AGENCY_OWNER', 'AGENCY_ADMIN', 'TEAM_LEADER', 'CONSULTANT');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Agency_slug_key" ON "Agency"("slug");

-- AlterTable: cast role column safely (preserves existing data)
ALTER TABLE "User"
  ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "UserRole" USING
    CASE "role"
      WHEN 'ADMIN' THEN 'AGENCY_OWNER'::"UserRole"
      WHEN 'PRINCIPAL_CONSULTANT' THEN 'TEAM_LEADER'::"UserRole"
      WHEN 'SUB_AGENT' THEN 'CONSULTANT'::"UserRole"
      WHEN 'CONSULTANT' THEN 'CONSULTANT'::"UserRole"
      ELSE 'CONSULTANT'::"UserRole"
    END;

ALTER TABLE "User"
  ALTER COLUMN "role" SET DEFAULT 'CONSULTANT'::"UserRole";

-- AlterTable: add agencyId (nullable = safe, no existing rows affected)
ALTER TABLE "User" ADD COLUMN "agencyId" TEXT;

-- Drop old text agency column (was optional, no critical data)
ALTER TABLE "User" DROP COLUMN IF EXISTS "agency";

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;
