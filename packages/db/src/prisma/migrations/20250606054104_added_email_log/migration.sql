-- CreateEnum
CREATE TYPE "EmailLogType" AS ENUM ('verification', 'reset');

-- CreateTable
CREATE TABLE "email_log" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "type" "EmailLogType" NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_log_pkey" PRIMARY KEY ("id")
);
