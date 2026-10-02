import { AccessDeniedError, API_BASE_URL, authHeaders } from "./http";

export type PaymentStatus = "pending" | "approved" | "declined" | "canceled";

export async function startPayment(ideaId: string): Promise<{ redirectUrl: string }> {
  const response = await fetch(`${API_BASE_URL}/ideas/${ideaId}/payments`, {
    method: "POST",
    headers: authHeaders(ideaId),
  });

  if (response.status === 409) {
    return { redirectUrl: `/analyse/${ideaId}` };
  }
  if (response.status === 401 || response.status === 404) {
    throw new AccessDeniedError();
  }
  if (!response.ok) {
    throw new Error(`Le paiement n'a pas pu demarrer (${response.status}).`);
  }

  const body = (await response.json()) as { redirectUrl: string };
  return { redirectUrl: body.redirectUrl };
}

export async function fetchPaymentStatus(ideaId: string): Promise<{ paid: boolean; status: PaymentStatus | null }> {
  const response = await fetch(`${API_BASE_URL}/ideas/${ideaId}/payment`, { headers: authHeaders(ideaId) });

  if (response.status === 401 || response.status === 404) {
    throw new AccessDeniedError();
  }
  if (!response.ok) {
    throw new Error(`Le statut du paiement est indisponible (${response.status}).`);
  }

  return (await response.json()) as { paid: boolean; status: PaymentStatus | null };
}
