-- AlterTable: add inviteeEmail (nullable first for backfill)
ALTER TABLE "ClubInvite" ADD COLUMN "inviteeEmail" TEXT;

-- Backfill inviteeEmail from User for existing invites (fallback for null email)
UPDATE "ClubInvite" ci
SET "inviteeEmail" = LOWER(TRIM(COALESCE(NULLIF(u."email", ''), 'migrated-' || u."id" || '@placeholder')))
FROM "User" u
WHERE ci."inviteeId" = u."id";

-- Make inviteeEmail NOT NULL (all existing invites have inviteeId -> User with email)
ALTER TABLE "ClubInvite" ALTER COLUMN "inviteeEmail" SET NOT NULL;

-- Add inviteToken column
ALTER TABLE "ClubInvite" ADD COLUMN "inviteToken" TEXT;

-- CreateIndex for inviteToken
CREATE UNIQUE INDEX "ClubInvite_inviteToken_key" ON "ClubInvite"("inviteToken");

-- Drop old unique constraint
DROP INDEX "ClubInvite_clubId_inviteeId_key";

-- Make inviteeId nullable
ALTER TABLE "ClubInvite" ALTER COLUMN "inviteeId" DROP NOT NULL;

-- Add new unique constraint
CREATE UNIQUE INDEX "ClubInvite_clubId_inviteeEmail_key" ON "ClubInvite"("clubId", "inviteeEmail");
