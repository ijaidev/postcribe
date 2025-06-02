/*
  Warnings:

  - Made the column `scheduledAt` on table `post_cron` required. This step will fail if there are existing NULL values in that column.
  - Made the column `nextRunAt` on table `post_cron` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "post_cron" ALTER COLUMN "scheduledAt" SET NOT NULL,
ALTER COLUMN "nextRunAt" SET NOT NULL;
