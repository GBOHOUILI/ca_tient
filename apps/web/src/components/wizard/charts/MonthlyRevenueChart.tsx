"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MonthlyResult } from "financial-engine";
import { formatAmount } from "@/lib/format";
import { AXIS_PROPS, TOOLTIP_CONTENT_STYLE, TOOLTIP_LABEL_STYLE } from "./chart-theme";

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Avr", "Mai", "Jun", "Jul", "Aou", "Sep", "Oct", "Nov", "Dec"];

export function MonthlyRevenueChart({ projection, currency }: { projection: MonthlyResult[]; currency: string }) {
  const data = projection.map((monthly) => ({
    month: MONTH_LABELS[monthly.month - 1],
    revenue: monthly.result.revenue,
  }));

  return (
    <div role="img" aria-label="Graphique du chiffre d'affaires estime pour chacun des 12 mois de l'annee, selon le profil de saisonnalite choisi.">
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis {...AXIS_PROPS} dataKey="month" />
          <YAxis {...AXIS_PROPS} tickFormatter={(value: number) => formatAmount(value, currency)} width={90} />
          <Tooltip contentStyle={TOOLTIP_CONTENT_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} formatter={(value) => formatAmount(Number(value), currency)} />
          <Bar dataKey="revenue" fill="var(--color-accent-cyan)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
