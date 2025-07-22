/*
  Warnings:

  - The values [MINUTE] on the enum `RepeatIntervalUnit` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RepeatIntervalUnit_new" AS ENUM ('HOUR', 'DAY', 'WEEK', 'MONTH');
ALTER TABLE "post_cron" ALTER COLUMN "repeatIntervalUnit" TYPE "RepeatIntervalUnit_new" USING ("repeatIntervalUnit"::text::"RepeatIntervalUnit_new");
ALTER TYPE "RepeatIntervalUnit" RENAME TO "RepeatIntervalUnit_old";
ALTER TYPE "RepeatIntervalUnit_new" RENAME TO "RepeatIntervalUnit";
DROP TYPE "RepeatIntervalUnit_old";
COMMIT;
