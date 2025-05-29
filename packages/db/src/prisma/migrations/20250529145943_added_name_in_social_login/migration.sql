/*
  Warnings:

  - Added the required column `name` to the `social_login` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "social_login" ADD COLUMN     "name" TEXT NOT NULL;
