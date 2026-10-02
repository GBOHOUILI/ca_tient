import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { AdminKeyGuard } from "./admin-key.guard.js";
import { AnalyticsService } from "./analytics.service.js";
import { StatsQueryDto, TrackEventDto } from "./dto/track-event.dto.js";

@Controller()
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  // A full visit sends a handful of events: 60/min leaves room without letting a script flood the table.
  @Post("analytics/events")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async track(@Body() dto: TrackEventDto): Promise<void> {
    await this.analytics.track(dto);
  }

  @Get("admin/stats")
  @UseGuards(AdminKeyGuard)
  stats(@Query() query: StatsQueryDto) {
    return this.analytics.funnel(query.period ?? "30d");
  }
}
