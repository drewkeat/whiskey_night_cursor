-- AlterTable
ALTER TABLE "public"."Whiskey" ADD COLUMN     "flavorProfile" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
