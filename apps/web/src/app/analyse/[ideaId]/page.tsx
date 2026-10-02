"use client";

import { useParams } from "next/navigation";
import { PaidAnalysis } from "@/components/analyse/PaidAnalysis";
import { PaymentStatusView } from "@/components/analyse/PaymentStatusView";
import { usePaymentGate } from "@/components/analyse/use-payment-gate";

export default function AnalysePage() {
  const { ideaId } = useParams<{ ideaId: string }>();
  const { view, checkAgain, retryPayment, retrying } = usePaymentGate(ideaId);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-12 px-4 py-16 sm:px-6">
      {view.kind === "paid" ? (
        <PaidAnalysis ideaId={ideaId} idea={view.idea} />
      ) : (
        <PaymentStatusView
          view={view}
          retrying={retrying}
          onCheckAgain={checkAgain}
          onRetryPayment={() => void retryPayment()}
        />
      )}
    </main>
  );
}
