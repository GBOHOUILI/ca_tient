"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface ScenarioBar {
  label: string;
  estimatedResult: number;
}

function formatAmount(value: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export function ScenarioComparisonChart({ bars, currency }: { bars: ScenarioBar[]; currency: string }) {
  return (
    <div aria-label="Graphique comparant le resultat estime pour chaque scenario : prudent, realiste, ambitieux, crise et personnalise.">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={bars} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(value: number) => formatAmount(value, currency)} width={90} />
          <Tooltip formatter={(value) => formatAmount(Number(value), currency)} />
          <Bar dataKey="estimatedResult" radius={[4, 4, 0, 0]}>
            {bars.map((bar) => (
              <Cell key={bar.label} fill={bar.estimatedResult >= 0 ? "var(--color-success)" : "var(--color-error)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
