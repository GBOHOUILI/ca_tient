-- AlterTable
ALTER TABLE "Idea" ADD COLUMN     "recoveryCodeHash" TEXT;

-- CreateTable
CREATE TABLE "IdeaAccessToken" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdeaAccessToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IdeaAccessToken_tokenHash_key" ON "IdeaAccessToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Idea_recoveryCodeHash_key" ON "Idea"("recoveryCodeHash");

-- AddForeignKey
ALTER TABLE "IdeaAccessToken" ADD CONSTRAINT "IdeaAccessToken_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

