export const BUSINESS_MODEL_OPTIONS = [
  { value: "ECOMMERCE", label: "E-commerce" },
  { value: "FORMATION", label: "Formation" },
  { value: "EBOOK", label: "E-book" },
  { value: "SERVICE", label: "Service" },
  { value: "PRODUIT_PHYSIQUE", label: "Produit physique" },
  { value: "RESTAURATION", label: "Restauration" },
  { value: "AGRICULTURE", label: "Agriculture" },
  { value: "TRANSFORMATION_ALIMENTAIRE", label: "Transformation alimentaire" },
  { value: "AUTRE", label: "Autre" },
] as const;

export type BusinessModel = (typeof BUSINESS_MODEL_OPTIONS)[number]["value"];
