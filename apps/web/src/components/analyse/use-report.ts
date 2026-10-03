"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchReport,
  fetchReportSummary,
  saveCapital,
  type CapitalPlanInput,
  type IdeaReport,
  type ReportSummary,
} from "@/lib/api/report";
import { useI18n } from "@/i18n/I18nProvider";

// Report of a paid idea. Loaded at once when the capital was already entered (the report is then
// the landing screen); the AI summary is fetched separately so it never delays the report.
export function useReport(ideaId: string, hasCapitalPlan: boolean) {
  const { t } = useI18n();
  const [report, setReport] = useState<IdeaReport | null>(null);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(hasCapitalPlan);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const loaded = await fetchReport(ideaId);
      setSummary(null);
      setReport(loaded);
      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }, [ideaId]);

  useEffect(() => {
    if (!hasCapitalPlan) return;
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [hasCapitalPlan, load]);

  useEffect(() => {
    if (!report) return;
    let cancelled = false;
    fetchReportSummary(ideaId)
      .then((loaded) => {
        if (!cancelled) setSummary(loaded);
      })
      .catch(() => {
        if (!cancelled) setSummary({ text: t.analysis.summaryUnavailable, source: "template" });
      });
    return () => {
      cancelled = true;
    };
  }, [ideaId, report, t]);

  const submitCapital = useCallback(
    async (plan: CapitalPlanInput): Promise<boolean> => {
      setSaving(true);
      setError(null);
      try {
        await saveCapital(ideaId, plan);
        const reloaded = await load();
        if (!reloaded) throw new Error("report unavailable");
        return true;
      } catch {
        setError(t.analysis.capitalSaveFailed);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [ideaId, load, t],
  );

  return { report, summary, loading, saving, error, clearError: () => setError(null), submitCapital };
}
