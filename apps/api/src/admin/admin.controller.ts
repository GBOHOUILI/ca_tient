import { Controller, Get, Header, Param, Query, UseGuards } from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { AdminKeyGuard } from "../analytics/admin-key.guard.js";
import { AdminService } from "./admin.service.js";
import { AdminFiltersDto, AdminIdeasQueryDto } from "./dto/admin-filters.dto.js";

// Throttler first: failed key attempts count too, which slows down guessing ADMIN_KEY.
@Controller("admin")
@UseGuards(ThrottlerGuard, AdminKeyGuard)
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("overview")
  overview(@Query() filters: AdminFiltersDto) {
    return this.admin.overview(filters);
  }

  @Get("market")
  market(@Query() filters: AdminFiltersDto) {
    return this.admin.market(filters);
  }

  @Get("conversion")
  conversion(@Query() filters: AdminFiltersDto) {
    return this.admin.conversion(filters);
  }

  @Get("revenue")
  revenue(@Query() filters: AdminFiltersDto) {
    return this.admin.revenue(filters);
  }

  @Get("ideas")
  ideas(@Query() query: AdminIdeasQueryDto) {
    return this.admin.ideas(query);
  }

  @Get("ideas/:id")
  idea(@Param("id") id: string) {
    return this.admin.idea(id);
  }

  @Get("contacts.csv")
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Content-Disposition", 'attachment; filename="contacts-ca-tient.csv"')
  contacts() {
    return this.admin.contactsCsv();
  }
}
