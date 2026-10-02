import type { ReactNode } from "react";
import type { AdminData } from "./AdminContext";

export function Card({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-body font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-border bg-surface p-5">
      <span className="text-small text-text-secondary">{label}</span>
      <span className="text-h3-mobile font-semibold tabular-nums md:text-h3">{value}</span>
      {hint ? <span className="text-micro text-text-secondary">{hint}</span> : null}
    </div>
  );
}

export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="text-h2-mobile font-semibold md:text-h2">{children}</h1>;
}

export function DataState<T>({ data, children }: { data: AdminData<T>; children: (value: T) => ReactNode }) {
  if (data.status === "loading") return <p className="text-body text-text-secondary">Chargement...</p>;
  if (data.status === "error") return <p className="text-body text-error">{data.message}</p>;
  return <>{children(data.data)}</>;
}

// A table that is also the chart: one row per category, a single-hue bar scaled to the largest
// value, the exact number in text (identity never carried by color alone).
export function BarTable({
  rows,
  valueLabel,
  extra,
}: {
  rows: { key: string; label: string; value: number; display?: string; extra?: string }[];
  valueLabel: string;
  extra?: string;
}) {
  if (rows.length === 0) return <p className="text-small text-text-secondary">Aucune donnée sur cette période.</p>;
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <table className="w-full text-small">
      <thead className="sr-only">
        <tr>
          <th>Catégorie</th>
          <th>{valueLabel}</th>
          {extra ? <th>{extra}</th> : null}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <td className="w-36 py-1.5 pr-3 align-middle text-text-secondary">{row.label}</td>
            <td className="py-1.5 align-middle">
              <div className="flex items-center gap-2">
                <div className="h-3 flex-1 rounded-sm bg-bg">
                  <div
                    className="h-3 rounded-r-[4px] bg-accent-emerald"
                    style={{ width: `${Math.max((row.value / max) * 100, row.value > 0 ? 2 : 0)}%` }}
                  />
                </div>
                <span className="w-16 text-right tabular-nums text-text-primary">{row.display ?? row.value}</span>
              </div>
            </td>
            {extra ? <td className="w-20 py-1.5 pl-3 text-right tabular-nums text-text-secondary">{row.extra}</td> : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
