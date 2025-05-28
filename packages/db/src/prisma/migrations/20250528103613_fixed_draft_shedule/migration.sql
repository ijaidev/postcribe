/*
  Warnings:

  - You are about to drop the column `draftScheduleId` on the `draft` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[draftId]` on the table `draft_schedule` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `draftId` to the `draft_schedule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `timeZone` to the `user` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "draft" DROP CONSTRAINT "draft_draftScheduleId_fkey";

-- DropIndex
DROP INDEX "draft_draftScheduleId_key";

-- AlterTable
ALTER TABLE "draft" DROP COLUMN "draftScheduleId";

-- AlterTable
ALTER TABLE "draft_schedule" ADD COLUMN     "draftId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "timeZone" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "draft_schedule_draftId_key" ON "draft_schedule"("draftId");

-- AddForeignKey
ALTER TABLE "draft_schedule" ADD CONSTRAINT "draft_schedule_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "draft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
