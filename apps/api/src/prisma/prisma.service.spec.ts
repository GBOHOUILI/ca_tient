import { PrismaService } from "./prisma.service.js";

describe("PrismaService", () => {
  it("connects to Postgres and can run a raw query", async () => {
    const prisma = new PrismaService();
    await prisma.onModuleInit();

    const result = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`;

    expect(result).toEqual([{ ok: 1 }]);

    await prisma.onModuleDestroy();
  });
});
