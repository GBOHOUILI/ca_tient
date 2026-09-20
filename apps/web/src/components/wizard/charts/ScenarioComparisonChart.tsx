"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatAmount } from "@/lib/format";
import { AXIS_PROPS, TOOLTIP_CONTENT_STYLE, TOOLTIP_LABEL_STYLE } from "./chart-theme";

export interface ScenarioBar {
  label: string;
  estimatedResult: number;
}

export function ScenarioComparisonChart({ bars, currency }: { bars: ScenarioBar[]; currency: string }) {
  return (
    <div role="img" aria-label="Graphique comparant le resultat estime pour chaque scenario : prudent, realiste, ambitieux, crise et personnalise.">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={bars} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis {...AXIS_PROPS} dataKey="label" />
          <YAxis {...AXIS_PROPS} tickFormatter={(value: number) => formatAmount(value, currency)} width={90} />
          <Tooltip contentStyle={TOOLTIP_CONTENT_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} formatter={(value) => formatAmount(Number(value), currency)} />
          <Bar dataKey="estimatedResult">
            {bars.map((bar) => {
              // recharts' Cell.d.ts inherits `radius` from React's SVGAttributes (number | string) instead of
              // Rectangle's RectRadius (number | [number, number, number, number]) that Bar actually renders it
              // with at runtime (see Bar.js spreading Cell's raw props onto the rectangle item) — cast through
              // `unknown` to work around this upstream typing gap without a bare `any`.
              const radius = (bar.estimatedResult >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4]) as unknown as string;
              return (
                <Cell
                  key={bar.label}
                  fill={bar.estimatedResult >= 0 ? "var(--color-success)" : "var(--color-error)"}
                  radius={radius}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
