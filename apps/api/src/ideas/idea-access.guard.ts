import { CanActivate, ExecutionContext, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { PrismaService } from "../prisma/prisma.service.js";
import { accessTokenMatches } from "./access-token.js";

@Injectable()
export class IdeaAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request<{ id?: string }>>();
    const header = request.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
    if (!token) {
      throw new UnauthorizedException("Jeton d'acces manquant.");
    }

    const ideaId = request.params.id ?? "";
    const idea = ideaId
      ? await this.prisma.idea.findUnique({ where: { id: ideaId }, select: { accessTokenHash: true } })
      : null;

    // Same 404 for unknown idea and wrong token: never reveal that an idea exists.
    if (!idea?.accessTokenHash || !accessTokenMatches(token, idea.accessTokenHash)) {
      throw new NotFoundException(`Idee ${ideaId} introuvable.`);
    }
    return true;
  }
}
