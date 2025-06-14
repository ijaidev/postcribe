-- AlterTable
ALTER TABLE "social_login" ADD COLUMN     "isVerified" BOOLEAN,
ALTER COLUMN "accessToken" DROP NOT NULL,
ALTER COLUMN "refreshToken" DROP NOT NULL;
