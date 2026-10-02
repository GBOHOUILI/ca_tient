"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  AdminKeyRejectedError,
  StatsDisabledError,
  fetchStats,
  type FunnelStats,
  type StatsPeriod,
} from "@/lib/analytics";

const KEY_STORAGE = "ca-tient:admin-key";

const STEP_LABELS: Record<string, string> = {
  landing_view: "Visites de la page d'accueil (sessions)",
  test_started: "Tests demarres (sessions)",
  preview: "Apercus generes (idees)",
  offer_viewed: "Offre a 1 000 FCFA vue (idees)",
  payment_initiated: "Paiements inities (idees)",
  payment_confirmed: "Paiements confirmes (idees)",
  what_if_used: "\"Et si ?\" utilise (idees)",
  report_viewed: "Rapports consultes (idees)",
};

const PERIODS: { value: StatsPeriod; label: string }[] = [
  { value: "7d", label: "7 derniers jours" },
  { value: "30d", label: "30 derniers jours" },
  { value: "all", label: "Depuis le debut" },
];

function readStoredKey(): string {
  try {
    return window.sessionStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

function passRate(count: number, previous: number | undefined): string {
  if (previous === undefined) return "";
  if (previous === 0) return "—";
  return `${Math.round((count * 100) / previous)} %`;
}

export default function AdminStatsPage() {
  const [keyInput, setKeyInput] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [period, setPeriod] = useState<StatsPeriod>("30d");
  const [stats, setStats] = useState<FunnelStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The stored key is read after mount (sessionStorage does not exist during server rendering).
  useEffect(() => {
    const timeout = setTimeout(() => setAdminKey(readStoredKey()), 0);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!adminKey) return;
    let cancelled = false;
    fetchStats(adminKey, period)
      .then((loaded) => {
        if (cancelled) return;
        setStats(loaded);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setStats(null);
        if (caught instanceof AdminKeyRejectedError) {
          setError("Cle incorrecte.");
          setAdminKey("");
          try {
            window.sessionStorage.removeItem(KEY_STORAGE);
          } catch {
            // nothing stored
          }
        } else if (caught instanceof StatsDisabledError) {
          setError("Statistiques desactivees : ADMIN_KEY n'est pas configuree sur l'API.");
        } else {
          setError("Statistiques indisponibles pour le moment.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [adminKey, period]);

  function submitKey(event: FormEvent) {
    event.preventDefault();
    const key = keyInput.trim();
    try {
      window.sessionStorage.setItem(KEY_STORAGE, key);
    } catch {
      // kept in memory only
    }
    setAdminKey(key);
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-16 sm:px-6">
      <h1 className="text-h2-mobile font-semibold md:text-h2">Statistiques</h1>

      {!adminKey ? (
        <form onSubmit={submitKey} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="password"
            value={keyInput}
            onChange={(event) => setKeyInput(event.target.value)}
            placeholder="Cle d'administration"
            autoComplete="off"
            className="flex-1 rounded-lg border border-border bg-surface p-3 text-body text-text-primary focus:border-accent-emerald focus:outline-none"
          />
          <button
            type="submit"
            disabled={keyInput.trim().length === 0}
            className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-6 py-3 text-body font-semibold text-white disabled:opacity-40"
          >
            Afficher
          </button>
        </form>
      ) : (
        <label className="flex flex-col gap-2 text-small text-text-secondary sm:max-w-xs">
          Periode
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value as StatsPeriod)}
            className="rounded-lg border border-border bg-surface p-3 text-body text-text-primary"
          >
            {PERIODS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {error ? <p className="text-small text-error">{error}</p> : null}

      {stats ? (
        <div className="flex flex-col gap-4">
          <table className="w-full rounded-2xl border border-border bg-surface text-body">
            <thead>
              <tr className="text-left text-small text-text-secondary">
                <th className="p-4 font-medium">Etape</th>
                <th className="p-4 text-right font-medium">Nombre</th>
                <th className="p-4 text-right font-medium">Passage</th>
              </tr>
            </thead>
            <tbody>
              {stats.steps.map((step, index) => (
                <tr key={step.key} className="border-t border-border">
                  <td className="p-4">{STEP_LABELS[step.key] ?? step.key}</td>
                  <td className="p-4 text-right tabular-nums">{step.count}</td>
                  <td className="p-4 text-right tabular-nums text-text-secondary">
                    {passRate(step.count, stats.steps[index - 1]?.count)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-small text-text-secondary">
            Rapports imprimes : <span className="tabular-nums text-text-primary">{stats.reportPrinted}</span> · Analyses
            retrouvees par code : <span className="tabular-nums text-text-primary">{stats.recoveries}</span>
          </p>
          <p className="text-micro text-text-secondary">
            Sessions = onglets distincts, sans cookie. Les paiements viennent de la base, pas du navigateur.
          </p>
        </div>
      ) : null}
    </main>
  );
}
