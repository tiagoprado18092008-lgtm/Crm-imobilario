-- Corrects PasswordResetToken.
--
-- The reconciliation migration created this table with a userId foreign key,
-- guessing at its shape. The model keys on email instead, so a reset can be
-- requested for an address before confirming an account exists — which is also
-- what stops the endpoint confirming whether an email is registered.

ALTER TABLE "PasswordResetToken" ADD COLUMN IF NOT EXISTS "email" TEXT;

-- Backfill from the user, for any row the wrong shape created.
UPDATE "PasswordResetToken" t
SET "email" = u."email"
FROM "User" u
WHERE t."email" IS NULL
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'PasswordResetToken' AND column_name = 'userId'
  )
  AND u."id" = t."userId";

-- Anything still without an email cannot identify a recipient, so it is dead.
DELETE FROM "PasswordResetToken" WHERE "email" IS NULL;

ALTER TABLE "PasswordResetToken" ALTER COLUMN "email" SET NOT NULL;

ALTER TABLE "PasswordResetToken" DROP CONSTRAINT IF EXISTS "PasswordResetToken_userId_fkey";
DROP INDEX IF EXISTS "PasswordResetToken_userId_idx";
ALTER TABLE "PasswordResetToken" DROP COLUMN IF EXISTS "userId";

CREATE INDEX IF NOT EXISTS "PasswordResetToken_email_idx" ON "PasswordResetToken"("email");
