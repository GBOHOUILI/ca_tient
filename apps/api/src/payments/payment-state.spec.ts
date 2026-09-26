import { describe, expect, it } from "vitest";
import { nextPaymentStatus } from "./payment-state.js";

describe("nextPaymentStatus", () => {
  it.each(["approved", "declined", "canceled"] as const)("moves a pending payment to %s", (incoming) => {
    expect(nextPaymentStatus("pending", incoming)).toBe(incoming);
  });

  it("does nothing when the status is unchanged", () => {
    expect(nextPaymentStatus("pending", "pending")).toBeNull();
    expect(nextPaymentStatus("approved", "approved")).toBeNull();
  });

  it.each([
    ["approved", "declined"],
    ["approved", "canceled"],
    ["approved", "pending"],
    ["declined", "approved"],
    ["canceled", "approved"],
  ] as const)("keeps the terminal status %s when %s arrives", (current, incoming) => {
    expect(nextPaymentStatus(current, incoming)).toBeNull();
  });
});
