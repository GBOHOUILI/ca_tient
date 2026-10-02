import { CanActivate, ExecutionContext, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { createHash, timingSafeEqual } from "node:crypto";
import type { Request } from "express";

function digest(value: string): Buffer {
  return createHash("sha256").update(value.trim(), "utf8").digest();
}

@Injectable()
export class AdminKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Read on each request so the key can be set or rotated without a code change.
    const expected = process.env.ADMIN_KEY?.trim();
    if (!expected) {
      throw new NotFoundException();
    }

    const header = context.switchToHttp().getRequest<Request>().headers["x-admin-key"];
    const provided = typeof header === "string" ? header : "";
    // Fixed-length digests: timingSafeEqual never sees inputs of different lengths.
    if (!provided || !timingSafeEqual(digest(provided), digest(expected))) {
      throw new UnauthorizedException("Cle d'administration invalide.");
    }
    return true;
  }
}
