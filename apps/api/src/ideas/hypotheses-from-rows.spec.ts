import { describe, expect, it } from "vitest";
import { hypothesesFromRows } from "./hypotheses-from-rows.js";

const ROWS = [
  { key: "price", value: 5000 },
  { key: "volume", value: 50 },
  { key: "variableCostPerUnit", value: 2000 },
  { key: "fixedCosts", value: 100000 },
];

describe("hypothesesFromRows", () => {
  it("builds the engine input from the stored rows", () => {
    expect(hypothesesFromRows("XOF", ROWS)).toEqual({
      currency: "XOF",
      price: 5000,
      volume: 50,
      variableCostPerUnit: 2000,
      fixedCosts: 100000,
    });
  });

  it("returns null when a hypothesis is missing", () => {
    expect(hypothesesFromRows("XOF", ROWS.slice(1))).toBeNull();
  });
});
