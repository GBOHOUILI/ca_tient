import type { WizardStep } from "./wizard-reducer";

const STEPS: { key: WizardStep; label: string }[] = [
  { key: "business-type", label: "Type" },
  { key: "description", label: "Description" },
  { key: "hypotheses", label: "Hypotheses" },
  { key: "canvas", label: "Ton business model" },
  { key: "results", label: "Resultats" },
  { key: "et-si", label: "Et si ?" },
  { key: "scenarios", label: "Scenarios" },
];

export function WizardProgress({ currentStep }: { currentStep: WizardStep }) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <ol className="flex flex-wrap items-center justify-center gap-2 text-micro font-medium tracking-micro text-text-secondary">
      {STEPS.map((step, index) => (
        <li key={step.key} className="flex items-center gap-2">
          <span
            className={
              index <= currentIndex
                ? "flex h-6 w-6 items-center justify-center rounded-full bg-accent-emerald text-white"
                : "flex h-6 w-6 items-center justify-center rounded-full border border-border"
            }
          >
            {index + 1}
          </span>
          <span className={index === currentIndex ? "text-text-primary" : ""}>{step.label}</span>
          {index < STEPS.length - 1 ? <span aria-hidden>/</span> : null}
        </li>
      ))}
    </ol>
  );
}
