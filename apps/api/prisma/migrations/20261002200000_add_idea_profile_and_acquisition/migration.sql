-- CreateEnum
CREATE TYPE "UserProfileKind" AS ENUM ('etudiant', 'salarie', 'entrepreneur', 'sans_emploi', 'autre');

-- CreateEnum
CREATE TYPE "ProjectStage" AS ENUM ('idee', 'preparation', 'lance');

-- CreateEnum
CREATE TYPE "HeardFrom" AS ENUM ('whatsapp', 'facebook', 'instagram', 'tiktok', 'bouche_a_oreille', 'recherche', 'autre');

-- AlterTable
ALTER TABLE "Idea" ADD COLUMN     "referrerHost" TEXT,
ADD COLUMN     "utmCampaign" TEXT,
ADD COLUMN     "utmMedium" TEXT,
ADD COLUMN     "utmSource" TEXT;

-- CreateTable
CREATE TABLE "IdeaProfile" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "country" TEXT,
    "city" TEXT,
    "profile" "UserProfileKind",
    "stage" "ProjectStage",
    "heardFrom" "HeardFrom",
    "contact" TEXT,
    "contactConsent" BOOLEAN NOT NULL DEFAULT false,
    "consentAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdeaProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IdeaProfile_ideaId_key" ON "IdeaProfile"("ideaId");

-- AddForeignKey
ALTER TABLE "IdeaProfile" ADD CONSTRAINT "IdeaProfile_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

