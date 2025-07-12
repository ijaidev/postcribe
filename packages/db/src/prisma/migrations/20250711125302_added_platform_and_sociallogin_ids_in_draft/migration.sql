/*
  Warnings:

  - Added the required column `platform` to the `draft` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "draft" ADD COLUMN     "linkedinLoginId" TEXT,
ADD COLUMN     "platform" "Platform" NOT NULL,
ADD COLUMN     "xLoginId" TEXT;

-- AddForeignKey
ALTER TABLE "draft" ADD CONSTRAINT "draft_xLoginId_fkey" FOREIGN KEY ("xLoginId") REFERENCES "social_login"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft" ADD CONSTRAINT "draft_linkedinLoginId_fkey" FOREIGN KEY ("linkedinLoginId") REFERENCES "social_login"("id") ON DELETE SET NULL ON UPDATE CASCADE;
