import { Module } from "@nestjs/common";
import { IdeasController } from "./ideas.controller.js";
import { IdeasService } from "./ideas.service.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { FinancialEngineModule } from "../financial-engine/financial-engine.module.js";

@Module({
  imports: [PrismaModule, FinancialEngineModule],
  controllers: [IdeasController],
  providers: [IdeasService],
})
export class IdeasModule {}
