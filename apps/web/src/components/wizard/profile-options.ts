export const COUNTRY_OPTIONS = [
  { value: "BJ", label: "Benin" },
  { value: "TG", label: "Togo" },
  { value: "CI", label: "Cote d'Ivoire" },
  { value: "SN", label: "Senegal" },
  { value: "BF", label: "Burkina Faso" },
  { value: "NE", label: "Niger" },
  { value: "ML", label: "Mali" },
  { value: "GN", label: "Guinee" },
  { value: "CM", label: "Cameroun" },
  { value: "GA", label: "Gabon" },
  { value: "CG", label: "Congo" },
  { value: "CD", label: "RD Congo" },
  { value: "NG", label: "Nigeria" },
  { value: "GH", label: "Ghana" },
  { value: "FR", label: "France" },
  { value: "BE", label: "Belgique" },
  { value: "CA", label: "Canada" },
  { value: "OTHER", label: "Autre pays" },
] as const;

export const PROFILE_KIND_OPTIONS = [
  { value: "etudiant", label: "Etudiant" },
  { value: "salarie", label: "Salarie" },
  { value: "entrepreneur", label: "Deja entrepreneur" },
  { value: "sans_emploi", label: "Sans emploi" },
  { value: "autre", label: "Autre" },
] as const;

export const STAGE_OPTIONS = [
  { value: "idee", label: "Une simple idee" },
  { value: "preparation", label: "En preparation" },
  { value: "lance", label: "Deja lance" },
] as const;

export const HEARD_FROM_OPTIONS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "bouche_a_oreille", label: "Bouche-a-oreille" },
  { value: "recherche", label: "Recherche Google" },
  { value: "autre", label: "Autre" },
] as const;

export function labelOf(options: readonly { value: string; label: string }[], value: string | null | undefined): string {
  return options.find((option) => option.value === value)?.label ?? "—";
}
