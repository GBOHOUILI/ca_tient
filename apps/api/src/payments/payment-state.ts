import type { PaymentStatus } from "@prisma/client";

// Only a pending payment can change: approved/declined/canceled are final (a retry creates a new payment).
export function nextPaymentStatus(current: PaymentStatus, incoming: PaymentStatus): PaymentStatus | null {
  if (current !== "pending" || incoming === current) return null;
  return incoming;
}
