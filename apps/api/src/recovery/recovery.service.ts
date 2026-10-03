import { Injectable, NotFoundException } from "@nestjs/common";
import { generateAccessToken } from "../ideas/access-token.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { generateRecoveryCode, hashRecoveryCode, normalizeRecoveryCode } from "./recovery-code.js";
import { asLocale, type Locale } from "../i18n/locale.js";

@Injectable()
export class RecoveryService {
  constructor(private readonly prisma: PrismaService) {}

  // Each call replaces the previous code: only the hash is stored, so a code cannot be shown twice.
  async issueCode(ideaId: string): Promise<{ code: string }> {
    const code = generateRecoveryCode();
    const recoveryCodeHash = hashRecoveryCode(normalizeRecoveryCode(code)!);
    await this.prisma.idea.update({ where: { id: ideaId }, data: { recoveryCodeHash } });
    return { code };
  }

  async redeem(input: string): Promise<{ ideaId: string; accessToken: string; locale: Locale }> {
    const normalized = normalizeRecoveryCode(input);
    const idea = normalized
      ? await this.prisma.idea.findUnique({
          where: { recoveryCodeHash: hashRecoveryCode(normalized) },
          select: { id: true, paidAt: true, locale: true },
        })
      : null;
    // Same answer for a malformed code, an unknown code and an idea that is no longer paid.
    if (!idea?.paidAt) {
      throw new NotFoundException("Ce code ne correspond a aucune analyse.");
    }

    const { token, hash } = generateAccessToken();
    await this.prisma.ideaAccessToken.create({ data: { ideaId: idea.id, tokenHash: hash } });
    return { ideaId: idea.id, accessToken: token, locale: asLocale(idea.locale) };
  }
}
