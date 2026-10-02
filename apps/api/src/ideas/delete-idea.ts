import type { PrismaService } from "../prisma/prisma.service.js";

// Deletes an idea and everything attached to it. Related tables cascade from Idea; analytics
// events only carry the id (no foreign key), so they are removed explicitly. The payment itself
// stays recorded at FedaPay, which remains the accounting record. Returns false if unknown.
export async function deleteIdeaWithData(prisma: PrismaService, ideaId: string): Promise<boolean> {
  const [, deleted] = await prisma.$transaction([
    prisma.analyticsEvent.deleteMany({ where: { ideaId } }),
    prisma.idea.deleteMany({ where: { id: ideaId } }),
  ]);
  return deleted.count > 0;
}
