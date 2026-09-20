export class FinancialEngineInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinancialEngineInputError";
  }
}
