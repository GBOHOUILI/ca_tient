"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SeasonalityProfileKey } from "financial-engine";
import { StepEtSi } from "@/components/wizard/StepEtSi";
import { StepScenarios } from "@/components/wizard/StepScenarios";
import type { WhatIfDeltas } from "@/components/wizard/wizard-reducer";
import {
  AccessDeniedError,
  fetchIdea,
  fetchPaymentStatus,
  hypothesesFromDetail,
  startPayment,
  type IdeaDetail,
} from "@/lib/ideas-api";

const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 120_000;
const NO_DELTAS: WhatIfDeltas = { price: 0, volume: 0, variableCostPerUnit: 0, fixedCosts: 0 };

type View =
  | { kind: "loading" }
  | { kind: "no-access" }
  | { kind: "pending"; timedOut: boolean }
  | { kind: "failed" }
  | { kind: "error" }
  | { kind: "paid"; idea: IdeaDetail };

export default function AnalysePage() {
  const { ideaId } = useParams<{ ideaId: string }>();
  const [view, setView] = useState<View>({ kind: "loading" });
  const [retrying, setRetrying] = useState(false);
  const [screen, setScreen] = useState<"et-si" | "scenarios">("et-si");
  const [deltas, setDeltas] = useState<WhatIfDeltas>(NO_DELTAS);
  const [profile, setProfile] = useState<SeasonalityProfileKey>("stable");
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollStartedAt = useRef<number>(0);
  // Holds the latest `check` so the setTimeout callback below can call it without
  // referencing `check` before its own declaration (react-hooks/immutability).
  const checkRef = useRef<() => void>(() => {});

  const check = useCallback(async () => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    try {
      const payment = await fetchPaymentStatus(ideaId);
      if (payment.paid) {
        setView({ kind: "paid", idea: await fetchIdea(ideaId) });
        return;
      }
      if (payment.status === "pending") {
        const timedOut = Date.now() - pollStartedAt.current >= POLL_TIMEOUT_MS;
        setView({ kind: "pending", timedOut });
        if (!timedOut) pollTimer.current = setTimeout(() => checkRef.current(), POLL_INTERVAL_MS);
        return;
      }
      setView({ kind: "failed" });
    } catch (error) {
      setView({ kind: error instanceof AccessDeniedError ? "no-access" : "error" });
    }
  }, [ideaId]);

  // Ref updated after render (not during it) so the setTimeout callbacks above
  // always call the latest `check` without referencing it before declaration.
  useEffect(() => {
    checkRef.current = () => void check();
  }, [check]);

  const checkAgain = useCallback(() => {
    pollStartedAt.current = Date.now();
    setView({ kind: "loading" });
    void check();
  }, [check]);

  // No token in this browser: the API answers 401, which check() turns into the "no-access" view.
  // The initial call is deferred to a timer so the effect body itself never calls
  // setState synchronously (react-hooks/set-state-in-effect).
  useEffect(() => {
    pollStartedAt.current = Date.now();
    const timeout = setTimeout(() => checkRef.current(), 0);
    return () => {
      clearTimeout(timeout);
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, []);

  async function retryPayment() {
    setRetrying(true);
    try {
      const { redirectUrl } = await startPayment(ideaId);
      window.location.assign(redirectUrl);
    } catch {
      setRetrying(false);
      setView({ kind: "error" });
    }
  }

  const primaryButton =
    "rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-6 py-3 text-body font-semibold text-white disabled:opacity-40";

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-12 px-4 py-16 sm:px-6">
      {view.kind === "loading" && <p className="text-center text-body text-text-secondary">Chargement de ton analyse...</p>}

      {view.kind === "no-access" && (
        <div className="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
          <h1 className="text-h2-mobile font-semibold md:text-h2">Analyse introuvable</h1>
          <p className="text-body text-text-secondary">
            Cette analyse n&apos;est accessible que depuis le navigateur qui l&apos;a creee.
          </p>
          <Link href="/commencer" className={primaryButton}>
            Tester une idee
          </Link>
        </div>
      )}

      {view.kind === "pending" && (
        <div className="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
          <h1 className="text-h2-mobile font-semibold md:text-h2">Paiement en cours de confirmation</h1>
          <p className="text-body text-text-secondary">
            {view.timedOut
              ? "Le paiement n'est pas encore confirme. S'il a bien ete debite, il sera pris en compte des la confirmation de FedaPay."
              : "On attend la confirmation de FedaPay, ca prend en general quelques secondes."}
          </p>
          {view.timedOut ? (
            <button type="button" onClick={checkAgain} className={primaryButton}>
              Verifier a nouveau
            </button>
          ) : null}
        </div>
      )}

      {view.kind === "failed" && (
        <div className="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
          <h1 className="text-h2-mobile font-semibold md:text-h2">Le paiement n&apos;a pas abouti</h1>
          <p className="text-body text-text-secondary">Rien n&apos;a ete perdu : tes hypotheses sont enregistrees. Tu peux reessayer.</p>
          <button type="button" onClick={() => void retryPayment()} disabled={retrying} className={primaryButton}>
            {retrying ? "Redirection..." : "Reessayer le paiement"}
          </button>
        </div>
      )}

      {view.kind === "error" && (
        <div className="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
          <h1 className="text-h2-mobile font-semibold md:text-h2">Service momentanement indisponible</h1>
          <button type="button" onClick={checkAgain} className={primaryButton}>
            Reessayer
          </button>
        </div>
      )}

      {view.kind === "paid" && screen === "et-si" && (
        <StepEtSi
          hypotheses={hypothesesFromDetail(view.idea)}
          currency={view.idea.currency}
          whatIfDeltas={deltas}
          seasonalityProfile={profile}
          onDeltaChange={(key, value) => setDeltas((current) => ({ ...current, [key]: value }))}
          onSeasonalityChange={setProfile}
          onNext={() => setScreen("scenarios")}
        />
      )}

      {view.kind === "paid" && screen === "scenarios" && (
        <StepScenarios
          hypotheses={hypothesesFromDetail(view.idea)}
          currency={view.idea.currency}
          whatIfDeltas={deltas}
          onBack={() => setScreen("et-si")}
        />
      )}
    </main>
  );
}
