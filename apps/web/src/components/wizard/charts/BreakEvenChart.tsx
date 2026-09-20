"use client";

import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatAmount } from "@/lib/format";
import { AXIS_PROPS, TOOLTIP_CONTENT_STYLE, TOOLTIP_LABEL_STYLE } from "./chart-theme";

const SAMPLE_POINTS = 20;

export function BreakEvenChart({
  price,
  variableCostPerUnit,
  fixedCosts,
  currentVolume,
  breakEvenVolume,
  currency,
}: {
  price: number;
  variableCostPerUnit: number;
  fixedCosts: number;
  currentVolume: number;
  breakEvenVolume: number | null;
  currency: string;
}) {
  const domainMax = Math.max(currentVolume, breakEvenVolume ?? 0, 10) * 2;
  const unitMargin = price - variableCostPerUnit;

  const data = Array.from({ length: SAMPLE_POINTS + 1 }, (_, i) => {
    const volume = Math.round((domainMax / SAMPLE_POINTS) * i);
    // Mirrors financial-engine's computeResult formula (revenue - variableCosts - fixedCosts) inlined for
    // per-point sampling performance; keep in sync if computeResult's formula ever changes.
    return { volume, margin: unitMargin * volume - fixedCosts };
  });

  const margins = data.map((point) => point.margin);
  const maxMargin = Math.max(...margins);
  const minMargin = Math.min(...margins);
  const range = maxMargin - minMargin;
  const zeroOffset = range === 0 ? 0.5 : maxMargin / range;
  const clampedOffset = Math.min(Math.max(zeroOffset, 0), 1);

  return (
    <div role="img" aria-label={`Graphique de seuil de rentabilite : marge estimee selon le volume de ventes, de 0 a ${domainMax} unites par mois.`}>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
          <defs>
            <linearGradient id="breakEvenSplitColor" x1="0" y1="0" x2="0" y2="1">
              <stop offset={clampedOffset} stopColor="var(--color-success)" stopOpacity={0.85} />
              <stop offset={clampedOffset} stopColor="var(--color-error)" stopOpacity={0.85} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            {...AXIS_PROPS}
            dataKey="volume"
            type="number"
            domain={[0, domainMax]}
            label={{ value: "Volume vendu / mois", position: "insideBottom", offset: -10, fontSize: 12 }}
          />
          <YAxis {...AXIS_PROPS} tickFormatter={(value: number) => formatAmount(value, currency)} width={90} />
          <Tooltip
            contentStyle={TOOLTIP_CONTENT_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            formatter={(value) => formatAmount(Number(value), currency)}
            labelFormatter={(label) => `${label} unites/mois`}
          />
          <ReferenceLine y={0} stroke="var(--color-text-secondary)" />
          <ReferenceLine
            x={currentVolume}
            stroke="var(--color-text-primary)"
            strokeDasharray="4 4"
            label={{ value: "Tu es ici", position: "top", fontSize: 12 }}
          />
          {breakEvenVolume !== null && (
            <ReferenceLine x={breakEvenVolume} stroke="var(--color-accent-emerald)" strokeDasharray="2 2" />
          )}
          <Area type="monotone" dataKey="margin" stroke="var(--color-text-primary)" fill="url(#breakEvenSplitColor)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
