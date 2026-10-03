"use client";

import { useI18n } from "@/i18n/I18nProvider";
import type { WizardStep } from "./wizard-reducer";

const STEPS: WizardStep[] = ["business-type", "description", "hypotheses", "canvas", "profile", "results", "offer"];

export function WizardProgress({ currentStep }: { currentStep: WizardStep }) {
  const { t } = useI18n();
  const currentIndex = STEPS.indexOf(currentStep);

  return (
    <ol className="flex flex-wrap items-center justify-center gap-2 text-micro font-medium tracking-micro text-text-secondary">
      {STEPS.map((step, index) => (
        <li key={step} className="flex items-center gap-2">
          <span
            className={
              index <= currentIndex
                ? "flex h-6 w-6 items-center justify-center rounded-full bg-accent-emerald text-white"
                : "flex h-6 w-6 items-center justify-center rounded-full border border-border"
            }
          >
            {index + 1}
          </span>
          <span className={index === currentIndex ? "text-text-primary" : ""}>{t.wizard.steps[step]}</span>
          {index < STEPS.length - 1 ? <span aria-hidden>/</span> : null}
        </li>
      ))}
    </ol>
  );
}
