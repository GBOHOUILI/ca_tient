import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { AdminKeyGuard } from "./admin-key.guard.js";
import { AnalyticsService } from "./analytics.service.js";
import { AdminFiltersDto } from "../admin/dto/admin-filters.dto.js";
import { PageViewDto } from "./dto/page-view.dto.js";
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

  // One request per page change: a fast reader stays well below 120/min.
  @Post("analytics/pageviews")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  async pageView(@Body() dto: PageViewDto): Promise<void> {
    await this.analytics.recordPageView(dto);
  }

  @Get("admin/traffic")
  @UseGuards(AdminKeyGuard)
  traffic(@Query() filters: AdminFiltersDto) {
    // Same filters as the other admin tabs: language and (estimated) country apply, business model does not.
    return this.analytics.traffic(filters.period ?? "30d", { locale: filters.locale, country: filters.country });
  }

  @Get("admin/stats")
  @UseGuards(AdminKeyGuard)
  stats(@Query() query: StatsQueryDto) {
    return this.analytics.funnel(query.period ?? "30d");
  }
}
