/*
  Warnings:

  - Added the required column `nextRunAt` to the `post_cron` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "post_cron" ADD COLUMN     "nextRunAt" TIMESTAMP(3) NOT NULL;
