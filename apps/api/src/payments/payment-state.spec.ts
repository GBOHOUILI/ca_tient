import { describe, expect, it } from "vitest";
import { nextPaymentStatus } from "./payment-state.js";

describe("nextPaymentStatus", () => {
  it.each(["approved", "declined", "canceled"] as const)("moves a pending payment to %s", (incoming) => {
    expect(nextPaymentStatus("pending", incoming)).toBe(incoming);
  });

  it("does nothing when the status is unchanged", () => {
    expect(nextPaymentStatus("pending", "pending")).toBeNull();
    expect(nextPaymentStatus("approved", "approved")).toBeNull();
    expect(nextPaymentStatus("declined", "declined")).toBeNull();
    expect(nextPaymentStatus("canceled", "canceled")).toBeNull();
  });

  it("keeps approved terminal: nothing can move it away", () => {
    expect(nextPaymentStatus("approved", "declined")).toBeNull();
    expect(nextPaymentStatus("approved", "canceled")).toBeNull();
    expect(nextPaymentStatus("approved", "pending")).toBeNull();
  });

  // A late server-confirmed approval (e.g. the user retried mobile money after an initial decline)
  // must still unlock access: approved is the only terminal status.
  it.each(["declined", "canceled"] as const)("lets a later server-confirmed approval override %s", (current) => {
    expect(nextPaymentStatus(current, "approved")).toBe("approved");
  });

  it.each([
    ["declined", "canceled"],
    ["canceled", "declined"],
    ["declined", "pending"],
    ["canceled", "pending"],
  ] as const)("ignores %s -> %s (only an approval can move it)", (current, incoming) => {
    expect(nextPaymentStatus(current, incoming)).toBeNull();
  });
});
