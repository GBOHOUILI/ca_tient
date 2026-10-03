import { fr } from "@/i18n/dictionaries/fr";

type Labels = Readonly<Record<string, string>>;

function options<const K extends string>(labels: Readonly<Record<K, string>>) {
  return (Object.keys(labels) as K[]).map((value) => ({ value, label: labels[value] }));
}

// Option values are stable codes stored by the API; labels come from the dictionary.
// These French options serve the admin; public pages relabel them with t.profileLabels.
export const COUNTRY_OPTIONS = options(fr.profileLabels.countries);
export const PROFILE_KIND_OPTIONS = options(fr.profileLabels.kinds);
export const STAGE_OPTIONS = options(fr.profileLabels.stages);
export const HEARD_FROM_OPTIONS = options(fr.profileLabels.heardFrom);

export function relabel(list: readonly { value: string }[], labels: Labels) {
  return list.map((option) => ({ value: option.value, label: labels[option.value] ?? option.value }));
}

export function labelOf(list: readonly { value: string; label: string }[], value: string | null | undefined): string {
  return list.find((option) => option.value === value)?.label ?? "—";
}
