-- CreateEnum
CREATE TYPE "BusinessModel" AS ENUM ('ECOMMERCE', 'FORMATION', 'EBOOK', 'SERVICE', 'PRODUIT_PHYSIQUE', 'AUTRE');

-- CreateTable
CREATE TABLE "Idea" (
    "id" TEXT NOT NULL,
    "businessModel" "BusinessModel" NOT NULL,
    "rawDescription" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Idea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hypothesis" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "unit" TEXT,
    "source" TEXT NOT NULL,

    CONSTRAINT "Hypothesis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Simulation" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "inputsSnapshot" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "breakEven" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Simulation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Hypothesis_ideaId_key_key" ON "Hypothesis"("ideaId", "key");

-- AddForeignKey
ALTER TABLE "Hypothesis" ADD CONSTRAINT "Hypothesis_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Simulation" ADD CONSTRAINT "Simulation_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
