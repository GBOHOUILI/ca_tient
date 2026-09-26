-- CreateEnum
CREATE TYPE "CanvasBlockSource" AS ENUM ('ia_suggere', 'utilisateur_edite');

-- AlterTable: cast in place instead of Prisma's default drop/re-add, which would lose existing rows' source.
ALTER TABLE "CanvasBlock" ALTER COLUMN "source" TYPE "CanvasBlockSource" USING "source"::"CanvasBlockSource";
