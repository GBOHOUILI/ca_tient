import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { PrismaModule } from "../prisma/prisma.module.js";
import { AnalyticsController } from "./analytics.controller.js";
import { AnalyticsService } from "./analytics.service.js";

@Module({
  imports: [PrismaModule, ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 10 }])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
