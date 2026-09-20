"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MonthlyResult } from "financial-engine";

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Avr", "Mai", "Jun", "Jul", "Aou", "Sep", "Oct", "Nov", "Dec"];

function formatAmount(value: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export function MonthlyRevenueChart({ projection, currency }: { projection: MonthlyResult[]; currency: string }) {
  const data = projection.map((monthly) => ({
    month: MONTH_LABELS[monthly.month - 1],
    revenue: monthly.result.revenue,
  }));

  return (
    <div aria-label="Graphique du chiffre d'affaires estime pour chacun des 12 mois de l'annee, selon le profil de saisonnalite choisi.">
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(value: number) => formatAmount(value, currency)} width={90} />
          <Tooltip formatter={(value) => formatAmount(Number(value), currency)} />
          <Bar dataKey="revenue" fill="var(--color-accent-cyan)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
