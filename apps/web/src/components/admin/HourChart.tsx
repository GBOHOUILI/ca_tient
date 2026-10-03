"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS_PROPS, TOOLTIP_CONTENT_STYLE, TOOLTIP_LABEL_STYLE } from "@/components/wizard/charts/chart-theme";

const hourLabel = (hour: number) => `${String(hour).padStart(2, "0")} h`;

// Page views per hour of the day, Benin time: one measure, single hue.
export function HourChart({ data }: { data: { hour: number; pageViews: number }[] }) {
  const peak = data.reduce((best, hour) => (hour.pageViews > best.pageViews ? hour : best), data[0]);
  return (
    <div role="img" aria-label={`Pages vues par heure, heure du Bénin. Pic à ${hourLabel(peak.hour)}.`}>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis {...AXIS_PROPS} dataKey="hour" tickFormatter={hourLabel} interval={2} />
          <YAxis {...AXIS_PROPS} allowDecimals={false} width={40} />
          <Tooltip
            cursor={{ fill: "var(--color-border)", opacity: 0.4 }}
            contentStyle={TOOLTIP_CONTENT_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            labelFormatter={(value) => hourLabel(Number(value))}
            formatter={(value) => [String(value), "Pages vues"]}
          />
          <Bar dataKey="pageViews" fill="var(--color-accent-emerald)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
