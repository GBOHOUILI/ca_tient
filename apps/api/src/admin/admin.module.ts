import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { AnalyticsModule } from "../analytics/analytics.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { AdminController } from "./admin.controller.js";
import { AdminService } from "./admin.service.js";

@Module({
  imports: [PrismaModule, AnalyticsModule, ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 10 }])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
