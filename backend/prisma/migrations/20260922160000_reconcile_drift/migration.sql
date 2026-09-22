-- Reconciles the database with the schema.
--
-- The database was built with `db push` and had no migration history. When
-- that history was baselined, every pre-AlphaCRM migration was recorded as
-- applied — but several had never actually run, so their columns were missing
-- while Prisma believed they were present. The pipeline screen failed on
-- Contact.tags, and settings failed on SystemSettings.id.
--
-- Everything here is idempotent, so it is safe whether or not a given piece
-- already exists.

-- ─── SystemSettings ──────────────────────────────────────────────────────────
-- Created as a key-value store keyed on "key"; the schema since moved to a
-- surrogate id with a unique key.
CREATE TABLE IF NOT EXISTS "SystemSettings" (
  "key"       TEXT NOT NULL,
  "value"     TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'SystemSettings' AND column_name = 'id'
  ) THEN
    -- Drop the old key-based primary key before introducing the surrogate one.
    ALTER TABLE "SystemSettings" DROP CONSTRAINT IF EXISTS "SystemSettings_pkey";
    ALTER TABLE "SystemSettings" ADD COLUMN "id" TEXT;
    UPDATE "SystemSettings" SET "id" = gen_random_uuid()::text WHERE "id" IS NULL;
    ALTER TABLE "SystemSettings" ALTER COLUMN "id" SET NOT NULL;
    ALTER TABLE "SystemSettings" ADD PRIMARY KEY ("id");
  END IF;
END $$;

ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "agencyId"  TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "SystemSettings_agencyId_key_key"
  ON "SystemSettings"("agencyId", "key");

-- ─── Agency ──────────────────────────────────────────────────────────────────
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "address"     TEXT;
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "city"        TEXT;
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "country"     TEXT;
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "coverUrl"    TEXT;
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "email"       TEXT;
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "phone"       TEXT;
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "website"     TEXT;
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "legalName"   TEXT;
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "logoUrl"     TEXT;
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "nif"         TEXT;
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "niche"       TEXT;
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "currency"    TEXT NOT NULL DEFAULT 'EUR';
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "isActive"    BOOLEAN NOT NULL DEFAULT true;
-- Real-estate licence number, still on the model. Added so the database
-- matches the schema; removing it from both is a separate change.
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "amiNumber"   TEXT;

-- ─── Contact ─────────────────────────────────────────────────────────────────
-- The column the pipeline screen was failing on.
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- ─── Invitation ──────────────────────────────────────────────────────────────
ALTER TABLE "Invitation" ADD COLUMN IF NOT EXISTS "type"        TEXT NOT NULL DEFAULT 'CONSULTANT';
ALTER TABLE "Invitation" ADD COLUMN IF NOT EXISTS "permissions" JSONB;

-- ─── Auth tokens ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
  "id"        TEXT PRIMARY KEY,
  "token"     TEXT NOT NULL UNIQUE,
  "userId"    TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt"    TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "RefreshToken" (
  "id"        TEXT PRIMARY KEY,
  "token"     TEXT NOT NULL UNIQUE,
  "userId"    TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PasswordResetToken_userId_fkey') THEN
    ALTER TABLE "PasswordResetToken"
      ADD CONSTRAINT "PasswordResetToken_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RefreshToken_userId_fkey') THEN
    ALTER TABLE "RefreshToken"
      ADD CONSTRAINT "RefreshToken_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
CREATE INDEX IF NOT EXISTS "RefreshToken_userId_idx"       ON "RefreshToken"("userId");

-- ─── User ────────────────────────────────────────────────────────────────────
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "clerkUserId"         TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "permissions"         JSONB;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "supervisorId"        TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "amiNumber"           TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_clerkUserId_key" ON "User"("clerkUserId");
