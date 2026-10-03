"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";

export function RecoveryCodeBox({
  code,
  issuing,
  error,
  onIssue,
}: {
  code: string | null;
  issuing: boolean;
  error: string | null;
  onIssue: () => void;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // Clipboard can be denied (insecure context, permissions): the code stays visible to copy by hand.
    }
  }

  return (
    <aside className="no-print mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-2xl border border-border bg-surface p-6">
      <h2 className="text-body font-semibold">{t.analysis.codeTitle}</h2>
      <p className="text-small text-text-secondary">
        {t.analysis.codeText}
      </p>
      {code ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-lg border border-border bg-bg px-4 py-2 text-h4 font-semibold tabular-nums tracking-wide">
            {code}
          </span>
          <button type="button" onClick={() => void copy()} className="text-small font-medium text-accent-emerald">
            {copied ? t.analysis.copied : t.analysis.copy}
          </button>
        </div>
      ) : null}
      {error ? <p className="text-small text-error">{error}</p> : null}
      <div>
        <button
          type="button"
          onClick={onIssue}
          disabled={issuing}
          className="rounded-lg border border-border px-4 py-2 text-small font-medium text-text-primary disabled:opacity-40"
        >
          {issuing ? t.analysis.generating : code ? t.analysis.newCode : t.analysis.getCode}
        </button>
        {code ? (
          <p className="mt-2 text-micro text-text-secondary">{t.analysis.codeReplaces}</p>
        ) : null}
      </div>
    </aside>
  );
}
