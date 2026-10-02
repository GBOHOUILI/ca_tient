import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { PrismaModule } from "../prisma/prisma.module.js";
import { RecoveryController } from "./recovery.controller.js";
import { RecoveryService } from "./recovery.service.js";

@Module({
  imports: [PrismaModule, ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 10 }])],
  controllers: [RecoveryController],
  providers: [RecoveryService],
})
export class RecoveryModule {}
