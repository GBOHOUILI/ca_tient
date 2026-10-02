"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS_PROPS, TOOLTIP_CONTENT_STYLE, TOOLTIP_LABEL_STYLE } from "@/components/wizard/charts/chart-theme";

function dayLabel(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", timeZone: "UTC" });
}

// One measure per chart (single hue, no legend): two counts of different scale get two charts.
export function DailyChart({
  data,
  label,
  format = (value) => String(value),
}: {
  data: { date: string; value: number }[];
  label: string;
  format?: (value: number) => string;
}) {
  const total = data.reduce((sum, day) => sum + day.value, 0);
  return (
    <div role="img" aria-label={`${label} par jour, total ${format(total)} sur la période.`}>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis {...AXIS_PROPS} dataKey="date" tickFormatter={dayLabel} minTickGap={24} />
          <YAxis {...AXIS_PROPS} allowDecimals={false} tickFormatter={(value: number) => format(value)} width={70} />
          <Tooltip
            cursor={{ fill: "var(--color-border)", opacity: 0.4 }}
            contentStyle={TOOLTIP_CONTENT_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            labelFormatter={(value) => dayLabel(String(value))}
            formatter={(value) => [format(Number(value)), label]}
          />
          <Bar dataKey="value" fill="var(--color-accent-emerald)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
