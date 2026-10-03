import { describe, expect, it } from "vitest";
import { initialWizardState } from "./wizard-reducer";

describe("initialWizardState", () => {
  it("suggests euros in English and CFA francs in French", () => {
    expect(initialWizardState("en").currency).toBe("EUR");
    expect(initialWizardState("fr").currency).toBe("XOF");
  });
});
