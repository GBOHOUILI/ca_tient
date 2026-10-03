import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import type { ModerateReviewDto, ReviewDto } from "./dto/review.dto.js";

const PUBLIC_REVIEWS_SHOWN = 6;

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOwn(ideaId: string) {
    const review = await this.prisma.review.findUnique({
      where: { ideaId },
      select: { rating: true, comment: true, displayName: true, publishConsent: true },
    });
    return review ?? {};
  }

  async saveOwn(ideaId: string, dto: ReviewDto): Promise<void> {
    const data = {
      rating: dto.rating,
      comment: dto.comment.trim(),
      displayName: dto.displayName?.trim() || null,
      publishConsent: dto.publishConsent,
      // Any edit goes back to moderation: the admin only ever publishes text they have read.
      status: "pending" as const,
    };
    await this.prisma.review.upsert({ where: { ideaId }, create: { ideaId, ...data }, update: data });
  }

  // Only reviews the admin published AND the author agreed to show.
  async published() {
    const where = { status: "published" as const, publishConsent: true };
    const [aggregate, reviews] = await Promise.all([
      this.prisma.review.aggregate({ where, _count: true, _avg: { rating: true } }),
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: PUBLIC_REVIEWS_SHOWN,
        select: { rating: true, comment: true, displayName: true, createdAt: true },
      }),
    ]);
    const average = aggregate._avg.rating;
    return { count: aggregate._count, average: average === null ? null : Math.round(average * 10) / 10, reviews };
  }

  listForAdmin() {
    return this.prisma.review.findMany({ orderBy: { createdAt: "desc" } });
  }

  async moderate(id: string, dto: ModerateReviewDto): Promise<void> {
    const review = await this.prisma.review.findUnique({ where: { id }, select: { publishConsent: true } });
    if (!review) throw new NotFoundException(`Avis ${id} introuvable.`);
    if (dto.status === "published" && !review.publishConsent) {
      throw new BadRequestException("La personne n'a pas accepte que son avis soit publie.");
    }
    await this.prisma.review.update({ where: { id }, data: { status: dto.status } });
  }
}
