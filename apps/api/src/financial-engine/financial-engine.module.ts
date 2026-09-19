import { Module } from "@nestjs/common";
import { FinancialEngineService } from "./financial-engine.service.js";

// Module pur : aucune dépendance à l'IA ni à la couche HTTP (skills/backend.md).
// Pas de controller ici, les routes /ideas/:id/simulate arriveront avec la
// persistance des idées (Phase 3+), voir docs/API.md.
@Module({
  providers: [FinancialEngineService],
  exports: [FinancialEngineService],
})
export class FinancialEngineModule {}
