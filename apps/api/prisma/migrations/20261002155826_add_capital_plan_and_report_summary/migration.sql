-- CreateTable
CREATE TABLE "CapitalPlan" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "equipment" INTEGER NOT NULL,
    "initialStock" INTEGER NOT NULL,
    "openingCosts" INTEGER NOT NULL,
    "other" INTEGER NOT NULL,
    "availableCapital" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapitalPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportSummary" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "factsHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CapitalPlan_ideaId_key" ON "CapitalPlan"("ideaId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportSummary_ideaId_key" ON "ReportSummary"("ideaId");

-- AddForeignKey
ALTER TABLE "CapitalPlan" ADD CONSTRAINT "CapitalPlan_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportSummary" ADD CONSTRAINT "ReportSummary_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
