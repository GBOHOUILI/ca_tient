import type { ScenarioKey } from "financial-engine";

// Display order and labels of the engine's predefined scenarios.
export const SCENARIO_OPTIONS: readonly { key: ScenarioKey; label: string }[] = [
  { key: "prudent", label: "Prudent" },
  { key: "realiste", label: "Réaliste" },
  { key: "ambitieux", label: "Ambitieux" },
  { key: "crise", label: "Crise" },
];

export function scenarioLabel(key: ScenarioKey): string {
  return SCENARIO_OPTIONS.find((option) => option.key === key)?.label ?? key;
}
