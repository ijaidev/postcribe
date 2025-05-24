-- CreateTable
CREATE TABLE "Draft" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "xPostId" TEXT,
    "linkedinPostId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Draft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "post" TEXT NOT NULL,
    "imageUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Draft_xPostId_key" ON "Draft"("xPostId");

-- CreateIndex
CREATE UNIQUE INDEX "Draft_linkedinPostId_key" ON "Draft"("linkedinPostId");

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_xPostId_fkey" FOREIGN KEY ("xPostId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_linkedinPostId_fkey" FOREIGN KEY ("linkedinPostId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
