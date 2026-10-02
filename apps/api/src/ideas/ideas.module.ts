import { Module } from "@nestjs/common";
import { IdeasController } from "./ideas.controller.js";
import { IdeasService } from "./ideas.service.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { FinancialEngineModule } from "../financial-engine/financial-engine.module.js";
import { AiModule } from "../ai/ai.module.js";
import { ReportService } from "./report.service.js";

@Module({
  imports: [PrismaModule, FinancialEngineModule, AiModule],
  controllers: [IdeasController],
  providers: [IdeasService, ReportService],
})
export class IdeasModule {}
