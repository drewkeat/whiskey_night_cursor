-- DropForeignKey
ALTER TABLE "WhiskeyNight" DROP CONSTRAINT "WhiskeyNight_whiskeyId_fkey";

-- AlterTable
ALTER TABLE "WhiskeyNight" ALTER COLUMN "whiskeyId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "WhiskeyNight" ADD CONSTRAINT "WhiskeyNight_whiskeyId_fkey" FOREIGN KEY ("whiskeyId") REFERENCES "Whiskey"("id") ON DELETE SET NULL ON UPDATE CASCADE;
