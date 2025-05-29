-- CreateEnum
CREATE TYPE "LoginProvider" AS ENUM ('X', 'LINKEDIN');

-- CreateTable
CREATE TABLE "social_login" (
    "id" TEXT NOT NULL,
    "provider" "LoginProvider" NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_login_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "social_login" ADD CONSTRAINT "social_login_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
