DO $$
BEGIN
  CREATE TYPE "role" AS ENUM ('artist', 'fan', 'super_admin', 'writer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "role" "role" NOT NULL DEFAULT 'fan';

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "onboarding_complete" boolean NOT NULL DEFAULT false;
