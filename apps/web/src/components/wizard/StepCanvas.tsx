"use client";

import type { CanvasBlockKey, CanvasBlocks } from "@/lib/ideas-api";

const FIELDS: { key: CanvasBlockKey; label: string; placeholder: string }[] = [
  {
    key: "valueProposition",
    label: "Qu'est-ce que tu offres, et pourquoi c'est interessant ?",
    placeholder: "Ex : des sacs faits main, livres en 24h a Cotonou",
  },
  {
    key: "customerSegments",
    label: "A qui tu vends ?",
    placeholder: "Ex : jeunes actifs urbains, 20-35 ans",
  },
  {
    key: "channels",
    label: "Comment tes clients te trouvent et achetent ?",
    placeholder: "Ex : Instagram, bouche-a-oreille, marche local",
  },
  {
    key: "customerRelationships",
    label: "Comment tu gardes le contact avec eux dans la duree ?",
    placeholder: "Ex : WhatsApp, newsletter, programme de fidelite",
  },
  {
    key: "keyResources",
    label: "De quoi tu as absolument besoin pour fonctionner ?",
    placeholder: "Ex : machine a coudre, stock de tissu, local",
  },
  {
    key: "keyActivities",
    label: "Qu'est-ce que tu dois faire au quotidien pour faire tourner ca ?",
    placeholder: "Ex : production, livraison, reseaux sociaux",
  },
  {
    key: "keyPartners",
    label: "De qui tu as besoin autour de toi ?",
    placeholder: "Ex : fournisseur de tissu, livreur, comptable",
  },
];

export function StepCanvas({
  canvasBlocks,
  wasSuggested,
  onBlockChange,
  onNext,
  onBack,
  submitting,
  error,
}: {
  canvasBlocks: CanvasBlocks;
  wasSuggested: boolean;
  onBlockChange: (key: CanvasBlockKey, value: string) => void;
  onNext: () => void;
  onBack: () => void;
  submitting: boolean;
  error: string | null;
}) {
  // The API rejects empty blocks: the paid report (Phase 6b) needs a complete canvas.
  const allFilled = FIELDS.every((field) => canvasBlocks[field.key].trim().length > 0);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <h1 className="text-center text-h2-mobile font-semibold md:text-h2">Ton business model</h1>
      {wasSuggested ? (
        <p className="text-center text-small text-accent-emerald">
          Suggere par l&apos;IA a partir de ta description : verifie et corrige si besoin.
        </p>
      ) : null}
      {FIELDS.map((field) => (
        <label key={field.key} className="flex flex-col gap-2 text-small text-text-secondary">
          {field.label}
          <textarea
            value={canvasBlocks[field.key]}
            onChange={(e) => onBlockChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            maxLength={500}
            rows={2}
            className="rounded-lg border border-border bg-surface p-3 text-body text-text-primary focus:border-accent-emerald focus:outline-none"
          />
        </label>
      ))}
      {error ? <p className="text-small text-error">{error}</p> : null}
      {!allFilled ? (
        <p className="text-center text-small text-text-secondary">Remplis les 7 blocs pour continuer.</p>
      ) : null}
      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="text-body font-medium text-text-secondary">
          Retour
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={submitting || !allFilled}
          className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-6 py-3 text-body font-semibold text-white disabled:opacity-40"
        >
          {submitting ? "Enregistrement..." : "Continuer"}
        </button>
      </div>
    </div>
  );
}
