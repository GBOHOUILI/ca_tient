import type { PaymentStatus } from "@prisma/client";

// Only `approved` is a true dead end: a mobile money retry can confirm after an initial
// decline/cancellation, and that later server-confirmed approval must still unlock access.
export function nextPaymentStatus(current: PaymentStatus, incoming: PaymentStatus): PaymentStatus | null {
  if (incoming === current) return null;
  if (current === "approved") return null;
  if (current === "pending") return incoming;
  return incoming === "approved" ? "approved" : null;
}
