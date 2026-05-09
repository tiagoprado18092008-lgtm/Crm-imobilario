-- Add amiNumber to Agency
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "amiNumber" TEXT;

-- Add amiNumber to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "amiNumber" TEXT;

-- Add tags to Contact
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
