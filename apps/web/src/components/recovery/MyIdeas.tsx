"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { computeResult } from "financial-engine";
import { useI18n } from "@/i18n/I18nProvider";
import { localizedPath } from "@/i18n/locale-route";
import { hasLocale } from "@/i18n/locales";
import { forgetAccessToken, storedIdeaIds } from "@/lib/api/access-token";
import { AccessDeniedError } from "@/lib/api/http";
import { fetchIdea, hypothesesFromDetail, type IdeaDetail } from "@/lib/api/ideas";
import { numberLocale } from "@/lib/format";

type State = { status: "loading" } | { status: "ready"; ideas: IdeaDetail[] };

function holds(idea: IdeaDetail): boolean | null {
  try {
    return computeResult({ currency: idea.currency, ...hypothesesFromDetail(idea) }).estimatedResult >= 0;
  } catch {
    return null;
  }
}

// Ideas this browser holds an access token for: a way back to an unpaid idea without any account.
export function MyIdeas() {
  const { t, locale } = useI18n();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const ids = storedIdeaIds();
    void Promise.allSettled(ids.map((id) => fetchIdea(id))).then((results) => {
      const ideas: IdeaDetail[] = [];
      results.forEach((result, index) => {
        if (result.status === "fulfilled") ideas.push(result.value);
        // Deleted idea or revoked token: forget it so it never shows again.
        else if (result.reason instanceof AccessDeniedError) forgetAccessToken(ids[index]);
      });
      ideas.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      if (!cancelled) setState({ status: "ready", ideas });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return <p className="text-center text-small text-text-secondary">{t.recovery.myIdeasLoading}</p>;
  }
  if (state.ideas.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <div className="text-center">
        <h2 className="text-h3-mobile font-semibold md:text-h3">{t.recovery.myIdeasTitle}</h2>
        <p className="mt-2 text-small text-text-secondary">{t.recovery.myIdeasIntro}</p>
      </div>
      <ul className="flex flex-col gap-3">
        {state.ideas.map((idea) => {
          const verdict = holds(idea);
          const date = new Date(idea.createdAt).toLocaleDateString(numberLocale(locale), { day: "numeric", month: "long" });
          const href = localizedPath(`/analyse/${idea.id}`, hasLocale(idea.locale) ? idea.locale : locale);
          return (
            <li key={idea.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-body font-semibold">{t.labels.businessModels[idea.businessModel]}</span>
                <span className="text-small text-text-secondary">{t.recovery.createdOn(date)}</span>
              </div>
              <p className="text-small text-text-secondary">
                {verdict === null ? null : (
                  <span className={verdict ? "text-success" : "text-error"}>
                    {verdict ? t.recovery.holds : t.recovery.doesNotHold}
                  </span>
                )}
                {verdict === null ? "" : " · "}
                {idea.paid ? t.recovery.paid : t.recovery.notPaid}
              </p>
              <Link
                href={href}
                className={
                  idea.paid
                    ? "self-start rounded-lg border border-border px-4 py-2 text-small font-medium text-text-primary"
                    : "self-start rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-4 py-2 text-small font-semibold text-white"
                }
              >
                {idea.paid ? t.recovery.open : t.recovery.unlock}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
