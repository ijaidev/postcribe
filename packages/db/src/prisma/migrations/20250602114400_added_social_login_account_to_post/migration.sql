/*
  Warnings:

  - Added the required column `socialLoginId` to the `post` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "post" ADD COLUMN     "socialLoginId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "post" ADD CONSTRAINT "post_socialLoginId_fkey" FOREIGN KEY ("socialLoginId") REFERENCES "social_login"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
