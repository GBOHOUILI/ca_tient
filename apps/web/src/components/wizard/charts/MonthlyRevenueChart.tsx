"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MonthlyResult } from "financial-engine";
import { useI18n } from "@/i18n/I18nProvider";
import { formatAmount } from "@/lib/format";
import { AXIS_PROPS, TOOLTIP_CONTENT_STYLE, TOOLTIP_LABEL_STYLE } from "./chart-theme";

export function MonthlyRevenueChart({ projection, currency }: { projection: MonthlyResult[]; currency: string }) {
  const { t, locale } = useI18n();
  const data = projection.map((monthly) => ({
    month: t.analysis.months[monthly.month - 1],
    revenue: monthly.result.revenue,
  }));

  return (
    <div role="img" aria-label={t.analysis.chartMonthly}>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis {...AXIS_PROPS} dataKey="month" />
          <YAxis {...AXIS_PROPS} tickFormatter={(value: number) => formatAmount(value, currency, locale)} width={90} />
          <Tooltip contentStyle={TOOLTIP_CONTENT_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} formatter={(value) => formatAmount(Number(value), currency, locale)} />
          <Bar dataKey="revenue" fill="var(--color-accent-cyan)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
