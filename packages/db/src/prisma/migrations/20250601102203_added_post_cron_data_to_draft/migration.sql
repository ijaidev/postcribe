/*
  Warnings:

  - A unique constraint covering the columns `[postCronId]` on the table `draft` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `title` to the `draft` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CronState" AS ENUM ('DRAFT_CREATION', 'AI_GENERATION', 'MEDIA_UPLOAD', 'POST_CREATION', 'PLATFORM_PUBLISHING', 'EMAIL_NOTIFICATION', 'COMPLETED');

-- AlterTable
ALTER TABLE "draft" ADD COLUMN     "cronState" "CronState",
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "postCronId" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "title" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "draft_postCronId_key" ON "draft"("postCronId");

-- AddForeignKey
ALTER TABLE "draft" ADD CONSTRAINT "draft_postCronId_fkey" FOREIGN KEY ("postCronId") REFERENCES "post_cron"("id") ON DELETE CASCADE ON UPDATE CASCADE;
