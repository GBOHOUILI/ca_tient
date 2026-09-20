-- CreateTable
CREATE TABLE "CanvasBlock" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL,

    CONSTRAINT "CanvasBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CanvasBlock_ideaId_key_key" ON "CanvasBlock"("ideaId", "key");

-- AddForeignKey
ALTER TABLE "CanvasBlock" ADD CONSTRAINT "CanvasBlock_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
