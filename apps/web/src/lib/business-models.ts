import { fr } from "@/i18n/dictionaries/fr";

export const BUSINESS_MODELS = [
  "ECOMMERCE",
  "FORMATION",
  "EBOOK",
  "SERVICE",
  "PRODUIT_PHYSIQUE",
  "RESTAURATION",
  "AGRICULTURE",
  "TRANSFORMATION_ALIMENTAIRE",
  "AUTRE",
] as const;

export type BusinessModel = (typeof BUSINESS_MODELS)[number];

// French labels for the admin, which is not translated; public pages read t.labels.businessModels.
export const BUSINESS_MODEL_OPTIONS = BUSINESS_MODELS.map((value) => ({ value, label: fr.labels.businessModels[value] }));
