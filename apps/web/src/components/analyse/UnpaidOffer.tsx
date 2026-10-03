"use client";

import { useMemo } from "react";
import { applyDelta, computeBreakEven, computeResult, type Hypotheses } from "financial-engine";
import { TrackEvent } from "@/components/analytics/TrackEvent";
import { StepOffer } from "@/components/wizard/StepOffer";
import { StepResults } from "@/components/wizard/StepResults";
import { useI18n } from "@/i18n/I18nProvider";
import { isAccessTokenPersisted } from "@/lib/api/access-token";
import { hypothesesFromDetail, type IdeaDetail } from "@/lib/api/ideas";

// An idea reopened before paying: its free preview again (same engine), then the offer.
export function UnpaidOffer({ idea, paying, onPay }: { idea: IdeaDetail; paying: boolean; onPay: () => void }) {
  const { t } = useI18n();
  const preview = useMemo(() => {
    const hypotheses: Hypotheses = { currency: idea.currency, ...hypothesesFromDetail(idea) };
    try {
      return {
        result: computeResult(hypotheses),
        breakEven: computeBreakEven(hypotheses),
        downside: computeResult(applyDelta(hypotheses, { volume: -20 })),
      };
    } catch {
      return null;
    }
  }, [idea]);

  return (
    <div className="flex flex-col gap-12">
      <TrackEvent type="offer_viewed" ideaId={idea.id} />
      <p className="mx-auto max-w-xl text-center text-body text-text-secondary">{t.analysis.unpaidIntro}</p>
      {preview ? <StepResults result={preview.result} breakEven={preview.breakEven} headingAs="h3" downside={preview.downside} /> : null}
      <StepOffer onPay={onPay} paying={paying} error={null} persistenceWarning={!isAccessTokenPersisted(idea.id)} />
    </div>
  );
}
