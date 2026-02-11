-- CreateEnum: UserStatus
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'PENDING');

-- AlterTable: Add status field to User
ALTER TABLE "User" ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'PENDING';

-- Grandfather ALL existing users as ACTIVE (they already had access pre-invite system)
UPDATE "User" SET "status" = 'ACTIVE';

-- CreateTable: Invite
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "usedById" TEXT,
    "createdById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invite_token_key" ON "Invite"("token");
CREATE INDEX "Invite_email_idx" ON "Invite"("email");
CREATE INDEX "Invite_token_idx" ON "Invite"("token");

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_usedById_fkey" FOREIGN KEY ("usedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Migrate GENERAL visibility jobs to PRIVATE before removing the enum value.
-- NOTE: This is a lossy, irreversible data migration. GENERAL jobs become PRIVATE.
-- To rollback, re-create the GENERAL enum value and manually re-tag affected jobs.
UPDATE "ResearchJob" SET "visibilityScope" = 'PRIVATE' WHERE "visibilityScope" = 'GENERAL';

-- Replace VisibilityScope enum (PostgreSQL cannot remove enum values directly)
CREATE TYPE "VisibilityScope_new" AS ENUM ('PRIVATE', 'GROUP');
ALTER TABLE "ResearchJob" ALTER COLUMN "visibilityScope" TYPE "VisibilityScope_new" USING ("visibilityScope"::text::"VisibilityScope_new");
ALTER TYPE "VisibilityScope" RENAME TO "VisibilityScope_old";
ALTER TYPE "VisibilityScope_new" RENAME TO "VisibilityScope";
DROP TYPE "VisibilityScope_old";
