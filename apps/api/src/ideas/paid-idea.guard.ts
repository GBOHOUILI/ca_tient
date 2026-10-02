import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { PrismaService } from "../prisma/prisma.service.js";

// Runs after IdeaAccessGuard: the idea exists and the token matched.
@Injectable()
export class PaidIdeaGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request<{ id?: string }>>();
    const idea = await this.prisma.idea.findUnique({ where: { id: request.params.id ?? "" }, select: { paidAt: true } });
    if (!idea?.paidAt) {
      throw new ForbiddenException("L'analyse complete n'est pas encore payee.");
    }
    return true;
  }
}
