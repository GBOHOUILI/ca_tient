import { Test } from "@nestjs/testing";
import { FinancialEngineModule } from "./financial-engine.module.js";
import { FinancialEngineService } from "./financial-engine.service.js";

describe("FinancialEngineModule", () => {
  it("provides FinancialEngineService", async () => {
    const module = await Test.createTestingModule({
      imports: [FinancialEngineModule],
    }).compile();

    expect(module.get(FinancialEngineService)).toBeInstanceOf(FinancialEngineService);
  });
});
