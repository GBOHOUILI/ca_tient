import {
  COUNTRY_OPTIONS,
  HEARD_FROM_OPTIONS,
  PROFILE_KIND_OPTIONS,
  STAGE_OPTIONS,
} from "@/components/wizard/profile-options";

export const BUSINESS_MODEL_OPTIONS = [
  { value: "ECOMMERCE", label: "E-commerce" },
  { value: "FORMATION", label: "Formation" },
  { value: "EBOOK", label: "E-book" },
  { value: "SERVICE", label: "Service" },
  { value: "PRODUIT_PHYSIQUE", label: "Produit physique" },
  { value: "AUTRE", label: "Autre" },
] as const;

export const EVENT_LABELS: Record<string, string> = {
  landing_view: "Page d'accueil vue",
  test_started: "Test demarre",
  offer_viewed: "Offre vue",
  what_if_used: "\"Et si ?\" utilise",
  report_viewed: "Rapport consulte",
  report_printed: "Rapport imprime",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  approved: "Approuve",
  declined: "Refuse",
  canceled: "Annule",
};

const ALL_OPTIONS: readonly { value: string; label: string }[] = [
  ...BUSINESS_MODEL_OPTIONS,
  ...COUNTRY_OPTIONS,
  ...PROFILE_KIND_OPTIONS,
  ...STAGE_OPTIONS,
  ...HEARD_FROM_OPTIONS,
];

export function label(value: string | null | undefined): string {
  if (!value || value === "inconnu") return "Non renseigne";
  return ALL_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function percent(ratio: number | null | undefined): string {
  return ratio === null || ratio === undefined ? "—" : `${Math.round(ratio * 100)} %`;
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}
