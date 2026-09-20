import type { CSSProperties } from "react";

export const AXIS_PROPS = {
  stroke: "var(--color-border)",
  tick: { fontSize: 12, fill: "var(--color-text-secondary)" },
} as const;

export const TOOLTIP_CONTENT_STYLE: CSSProperties = {
  backgroundColor: "color-mix(in srgb, var(--color-surface) 70%, transparent)",
  backdropFilter: "blur(12px)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  color: "var(--color-text-primary)",
  fontVariantNumeric: "tabular-nums",
};

export const TOOLTIP_LABEL_STYLE: CSSProperties = {
  color: "var(--color-text-secondary)",
};
