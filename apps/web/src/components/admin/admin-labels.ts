import {
  COUNTRY_OPTIONS,
  HEARD_FROM_OPTIONS,
  PROFILE_KIND_OPTIONS,
  STAGE_OPTIONS,
} from "@/components/wizard/profile-options";
import { BUSINESS_MODEL_OPTIONS } from "@/lib/business-models";


export const EVENT_LABELS: Record<string, string> = {
  landing_view: "Page d'accueil vue",
  test_started: "Test démarré",
  offer_viewed: "Offre vue",
  what_if_used: "\"Et si ?\" utilisé",
  report_viewed: "Rapport consulté",
  report_printed: "Rapport imprimé",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  approved: "Approuvé",
  declined: "Refusé",
  canceled: "Annulé",
};

const ALL_OPTIONS: readonly { value: string; label: string }[] = [
  ...BUSINESS_MODEL_OPTIONS,
  ...COUNTRY_OPTIONS,
  ...PROFILE_KIND_OPTIONS,
  ...STAGE_OPTIONS,
  ...HEARD_FROM_OPTIONS,
];

export function label(value: string | null | undefined): string {
  if (!value || value === "inconnu") return "Non renseigné";
  return ALL_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function percent(ratio: number | null | undefined): string {
  return ratio === null || ratio === undefined ? "—" : `${Math.round(ratio * 100)} %`;
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

const TRAFFIC_LABELS: Record<string, string> = {
  direct: "Direct (lien tapé, favori, WhatsApp mobile)",
  google: "Google",
  facebook: "Facebook",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  x: "X (Twitter)",
  bing: "Bing",
  youtube: "YouTube",
  mobile: "Mobile",
  tablet: "Tablette",
  desktop: "Ordinateur",
  fr: "Français",
  en: "Anglais",
  unknown: "Inconnu",
};

export function trafficLabel(value: string): string {
  return TRAFFIC_LABELS[value] ?? label(value);
}
