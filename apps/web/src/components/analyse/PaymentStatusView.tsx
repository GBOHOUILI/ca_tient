import Link from "next/link";
import type { PaymentGateView } from "./use-payment-gate";

const primaryButton =
  "rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-6 py-3 text-body font-semibold text-white disabled:opacity-40";

// Every state of the analysis page before the paid content: loading, no access, pending, failed, error.
export function PaymentStatusView({
  view,
  retrying,
  onCheckAgain,
  onRetryPayment,
}: {
  view: Exclude<PaymentGateView, { kind: "paid" }>;
  retrying: boolean;
  onCheckAgain: () => void;
  onRetryPayment: () => void;
}) {
  if (view.kind === "loading") {
    return <p className="text-center text-body text-text-secondary">Chargement de ton analyse...</p>;
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
      {view.kind === "no-access" && (
        <>
          <h1 className="text-h2-mobile font-semibold md:text-h2">Analyse introuvable</h1>
          <p className="text-body text-text-secondary">
            Ce navigateur n&apos;a pas accès à cette analyse. Si tu as payé, utilise le code que tu as noté pour la
            retrouver.
          </p>
          <Link href="/retrouver" className={primaryButton}>
            Retrouver mon analyse
          </Link>
          <Link href="/commencer" className="text-body font-medium text-text-secondary">
            Tester une idée
          </Link>
        </>
      )}

      {view.kind === "pending" && (
        <>
          <h1 className="text-h2-mobile font-semibold md:text-h2">Paiement en cours de confirmation</h1>
          <p className="text-body text-text-secondary">
            {view.timedOut
              ? "Le paiement n'est pas encore confirmé. S'il a bien été débité, il sera pris en compte dès la confirmation de FedaPay."
              : "On attend la confirmation de FedaPay, ça prend en général quelques secondes."}
          </p>
          {view.timedOut ? (
            <button type="button" onClick={onCheckAgain} className={primaryButton}>
              Vérifier à nouveau
            </button>
          ) : null}
        </>
      )}

      {view.kind === "failed" && (
        <>
          <h1 className="text-h2-mobile font-semibold md:text-h2">Le paiement n&apos;a pas abouti</h1>
          <p className="text-body text-text-secondary">Rien n&apos;a été perdu : tes hypothèses sont enregistrées. Tu peux réessayer.</p>
          <button type="button" onClick={onRetryPayment} disabled={retrying} className={primaryButton}>
            {retrying ? "Redirection..." : "Réessayer le paiement"}
          </button>
        </>
      )}

      {view.kind === "error" && (
        <>
          <h1 className="text-h2-mobile font-semibold md:text-h2">Service momentanément indisponible</h1>
          <button type="button" onClick={onCheckAgain} className={primaryButton}>
            Réessayer
          </button>
        </>
      )}
    </div>
  );
}
