import { Body, Controller, Get, Param, Patch, Put, UseGuards } from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { AdminKeyGuard } from "../analytics/admin-key.guard.js";
import { IdeaAccessGuard } from "../ideas/idea-access.guard.js";
import { PaidIdeaGuard } from "../ideas/paid-idea.guard.js";
import { ModerateReviewDto, ReviewDto } from "./dto/review.dto.js";
import { ReviewsService } from "./reviews.service.js";

@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  // Reviews come from people who paid: they have seen the full analysis.
  @Get("ideas/:id/review")
  @UseGuards(IdeaAccessGuard, PaidIdeaGuard)
  getOwn(@Param("id") id: string) {
    return this.reviews.getOwn(id);
  }

  @Put("ideas/:id/review")
  @UseGuards(IdeaAccessGuard, PaidIdeaGuard)
  async saveOwn(@Param("id") id: string, @Body() dto: ReviewDto) {
    await this.reviews.saveOwn(id, dto);
    return { ok: true };
  }

  @Get("reviews")
  published() {
    return this.reviews.published();
  }

  @Get("admin/reviews")
  @UseGuards(ThrottlerGuard, AdminKeyGuard)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  listForAdmin() {
    return this.reviews.listForAdmin();
  }

  @Patch("admin/reviews/:id")
  @UseGuards(ThrottlerGuard, AdminKeyGuard)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async moderate(@Param("id") id: string, @Body() dto: ModerateReviewDto) {
    await this.reviews.moderate(id, dto);
    return { ok: true };
  }
}
