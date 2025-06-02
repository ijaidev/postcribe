/*
  Warnings:

  - Added the required column `repeatInterval` to the `post_cron` table without a default value. This is not possible if the table is not empty.
  - Added the required column `repeatIntervalUnit` to the `post_cron` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RepeatIntervalUnit" AS ENUM ('MINUTE', 'HOUR', 'DAY', 'WEEK');

-- AlterTable
ALTER TABLE "post_cron" ADD COLUMN     "repeatInterval" INTEGER NOT NULL,
ADD COLUMN     "repeatIntervalUnit" "RepeatIntervalUnit" NOT NULL,
ALTER COLUMN "scheduledAt" DROP NOT NULL,
ALTER COLUMN "nextRunAt" DROP NOT NULL;
