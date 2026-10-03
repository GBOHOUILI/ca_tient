"use client";

import { useRef, useState } from "react";
import type { SeasonalityProfileKey } from "financial-engine";
import { TrackEvent } from "@/components/analytics/TrackEvent";
import { StepEtSi } from "@/components/wizard/StepEtSi";
import { StepScenarios } from "@/components/wizard/StepScenarios";
import type { WhatIfDeltas } from "@/components/wizard/wizard-reducer";
import { useI18n } from "@/i18n/I18nProvider";
import { trackEvent } from "@/lib/analytics";
import { hypothesesFromDetail, type IdeaDetail } from "@/lib/api/ideas";
import { issueRecoveryCode } from "@/lib/api/recovery";
import { DeleteAnalysis } from "./DeleteAnalysis";
import { RecoveryCodeBox } from "./RecoveryCodeBox";
import { ReviewBox } from "./ReviewBox";
import { ReportView } from "./ReportView";
import { StepCapital } from "./StepCapital";
import { useReport } from "./use-report";

const NO_DELTAS: WhatIfDeltas = { price: 0, volume: 0, variableCostPerUnit: 0, fixedCosts: 0 };

type Screen = "et-si" | "scenarios" | "capital" | "report";

const loadingClass = "text-center text-body text-text-secondary";

export function PaidAnalysis({ ideaId, idea }: { ideaId: string; idea: IdeaDetail }) {
  const { t } = useI18n();
  // Coming back after entering the capital: the report is the natural landing screen.
  const [screen, setScreen] = useState<Screen>(idea.hasCapitalPlan ? "report" : "et-si");
  const [deltas, setDeltas] = useState<WhatIfDeltas>(NO_DELTAS);
  const [profile, setProfile] = useState<SeasonalityProfileKey>("stable");
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [issuingCode, setIssuingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const whatIfTracked = useRef(false);
  const reportState = useReport(ideaId, idea.hasCapitalPlan);
  const { report } = reportState;
  const hypotheses = hypothesesFromDetail(idea);

  function changeDelta(key: keyof WhatIfDeltas, value: number) {
    if (!whatIfTracked.current) {
      whatIfTracked.current = true;
      trackEvent("what_if_used", ideaId);
    }
    setDeltas((current) => ({ ...current, [key]: value }));
  }

  function openCapital() {
    reportState.clearError();
    setScreen("capital");
  }

  async function submitCapital(plan: Parameters<typeof reportState.submitCapital>[0]) {
    if (await reportState.submitCapital(plan)) setScreen("report");
  }

  async function issueCode() {
    setIssuingCode(true);
    setCodeError(null);
    try {
      setRecoveryCode(await issueRecoveryCode(ideaId));
    } catch {
      setCodeError(t.analysis.codeFailed);
    } finally {
      setIssuingCode(false);
    }
  }

  return (
    <>
      {screen === "et-si" && (
        <StepEtSi
          hypotheses={hypotheses}
          currency={idea.currency}
          whatIfDeltas={deltas}
          seasonalityProfile={profile}
          onDeltaChange={changeDelta}
          onSeasonalityChange={setProfile}
          onNext={() => setScreen("scenarios")}
        />
      )}

      {screen === "scenarios" && (
        <StepScenarios
          hypotheses={hypotheses}
          currency={idea.currency}
          whatIfDeltas={deltas}
          onBack={() => setScreen("et-si")}
          onNext={openCapital}
        />
      )}

      {screen === "capital" &&
        (reportState.loading ? (
          <p className={loadingClass}>{t.analysis.loadingCapital}</p>
        ) : (
          <StepCapital
            currency={idea.currency}
            fixedCosts={hypotheses.fixedCosts}
            initialPlan={report?.capital?.plan ?? null}
            saving={reportState.saving}
            error={reportState.error}
            onSubmit={(plan) => void submitCapital(plan)}
            onBack={() => setScreen(report ? "report" : "scenarios")}
          />
        ))}

      {screen === "report" &&
        (report ? (
          <>
            <TrackEvent type="report_viewed" ideaId={ideaId} />
            <ReportView
              report={report}
              summary={reportState.summary}
              recoveryCode={recoveryCode}
              onEditCapital={openCapital}
              onBackToAnalysis={() => setScreen("et-si")}
            />
            <ReviewBox ideaId={ideaId} />
          </>
        ) : reportState.loading ? (
          <p className={loadingClass}>{t.analysis.loadingReport}</p>
        ) : (
          <p className="text-center text-body text-error">{t.analysis.reportUnavailable}</p>
        ))}

      <RecoveryCodeBox code={recoveryCode} issuing={issuingCode} error={codeError} onIssue={() => void issueCode()} />
      <DeleteAnalysis ideaId={ideaId} />
    </>
  );
}
