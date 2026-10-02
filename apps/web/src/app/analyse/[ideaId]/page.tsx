"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SeasonalityProfileKey } from "financial-engine";
import { RecoveryCodeBox } from "@/components/analyse/RecoveryCodeBox";
import { ReportView } from "@/components/analyse/ReportView";
import { StepCapital } from "@/components/analyse/StepCapital";
import { StepEtSi } from "@/components/wizard/StepEtSi";
import { StepScenarios } from "@/components/wizard/StepScenarios";
import type { WhatIfDeltas } from "@/components/wizard/wizard-reducer";
import {
  AccessDeniedError,
  fetchIdea,
  fetchPaymentStatus,
  fetchReport,
  fetchReportSummary,
  hypothesesFromDetail,
  issueRecoveryCode,
  saveCapital,
  startPayment,
  type CapitalPlanInput,
  type IdeaDetail,
  type IdeaReport,
  type ReportSummary,
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
  const [screen, setScreen] = useState<"et-si" | "scenarios" | "capital" | "report">("et-si");
  const [report, setReport] = useState<IdeaReport | null>(null);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [issuingCode, setIssuingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [savingCapital, setSavingCapital] = useState(false);
  const [capitalError, setCapitalError] = useState<string | null>(null);
  const [deltas, setDeltas] = useState<WhatIfDeltas>(NO_DELTAS);
  const [profile, setProfile] = useState<SeasonalityProfileKey>("stable");
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollStartedAt = useRef<number>(0);
  // Holds the latest `check` so the setTimeout callback below can call it without
  // referencing `check` before its own declaration (react-hooks/immutability).
  const checkRef = useRef<() => void>(() => {});
  // Guards every setState/timer re-arm in check() against firing after unmount.
  // Set to true inside the effect body (not at ref creation) so it survives
  // React 19 StrictMode's dev-only mount -> cleanup -> remount cycle correctly.
  const mountedRef = useRef(false);

  const check = useCallback(async () => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    try {
      const payment = await fetchPaymentStatus(ideaId);
      if (!mountedRef.current) return;
      if (payment.paid) {
        const idea = await fetchIdea(ideaId);
        if (!mountedRef.current) return;
        // Coming back after entering the capital: the report is the natural landing screen.
        if (idea.hasCapitalPlan) {
          const loaded = await fetchReport(ideaId);
          if (!mountedRef.current) return;
          setSummary(null);
          setReport(loaded);
          setScreen("report");
        }
        setView({ kind: "paid", idea });
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
      if (!mountedRef.current) return;
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
    mountedRef.current = true;
    pollStartedAt.current = Date.now();
    const timeout = setTimeout(() => checkRef.current(), 0);
    return () => {
      mountedRef.current = false;
      clearTimeout(timeout);
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, []);

  // The summary may wait for the AI (several seconds): it is loaded after the report is shown.
  useEffect(() => {
    if (!report) return;
    let cancelled = false;
    fetchReportSummary(ideaId)
      .then((loaded) => {
        if (!cancelled) setSummary(loaded);
      })
      .catch(() => {
        if (!cancelled) {
          setSummary({
            text: "La synthese n'a pas pu etre redigee pour le moment. Le reste du rapport est complet.",
            source: "template",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ideaId, report]);

  async function issueCode() {
    setIssuingCode(true);
    setCodeError(null);
    try {
      setRecoveryCode(await issueRecoveryCode(ideaId));
    } catch {
      setCodeError("Le code n'a pas pu etre genere. Reessaie.");
    } finally {
      setIssuingCode(false);
    }
  }

  async function openCapital() {
    setCapitalError(null);
    setScreen("capital");
    // Pre-fill with the saved plan if the report was not loaded yet (direct jump from Scenarios).
    if (!report && view.kind === "paid" && view.idea.hasCapitalPlan) {
      setLoadingReport(true);
      try {
        setReport(await fetchReport(ideaId));
      } catch {
        // the form simply starts empty
      } finally {
        setLoadingReport(false);
      }
    }
  }

  async function submitCapital(plan: CapitalPlanInput) {
    setSavingCapital(true);
    setCapitalError(null);
    try {
      await saveCapital(ideaId, plan);
      const loaded = await fetchReport(ideaId);
      setSummary(null);
      setReport(loaded);
      setScreen("report");
    } catch {
      setCapitalError("L'enregistrement n'a pas abouti. Reessaie : tes montants sont conserves.");
    } finally {
      setSavingCapital(false);
    }
  }

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
            Ce navigateur n&apos;a pas acces a cette analyse. Si tu as paye, utilise le code que tu as note pour la
            retrouver.
          </p>
          <Link href="/retrouver" className={primaryButton}>
            Retrouver mon analyse
          </Link>
          <Link href="/commencer" className="text-body font-medium text-text-secondary">
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
          onNext={() => void openCapital()}
        />
      )}

      {view.kind === "paid" && screen === "capital" && loadingReport && (
        <p className="text-center text-body text-text-secondary">Chargement de ton capital...</p>
      )}

      {view.kind === "paid" && screen === "capital" && !loadingReport && (
        <StepCapital
          currency={view.idea.currency}
          fixedCosts={hypothesesFromDetail(view.idea).fixedCosts}
          initialPlan={report?.capital?.plan ?? null}
          saving={savingCapital}
          error={capitalError}
          onSubmit={(plan) => void submitCapital(plan)}
          onBack={() => setScreen(report ? "report" : "scenarios")}
        />
      )}

      {view.kind === "paid" && screen === "report" && report && (
        <ReportView
          report={report}
          summary={summary}
          recoveryCode={recoveryCode}
          onEditCapital={() => void openCapital()} onBackToAnalysis={() => setScreen("et-si")} />
      )}

      {view.kind === "paid" && (
        <RecoveryCodeBox code={recoveryCode} issuing={issuingCode} error={codeError} onIssue={() => void issueCode()} />
      )}
    </main>
  );
}
