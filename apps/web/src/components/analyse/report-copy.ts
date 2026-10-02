import type { SensitivityKey, WatchPointCode } from "financial-engine";

export const WATCH_POINT_COPY: Record<WatchPointCode, string> = {
  non_positive_unit_margin:
    "Chaque vente te coûte autant ou plus qu'elle ne te rapporte : augmente ton prix ou baisse ton coût par unité avant tout.",
  below_break_even:
    "Le nombre de ventes que tu prévois est sous ton seuil de rentabilité : tu ne couvres pas encore tes charges.",
  thin_gross_margin:
    "Ta marge sur chaque vente est faible : une petite hausse de tes coûts peut faire basculer ton résultat.",
  prudent_scenario_loss: "Si tes ventes sont un peu moins bonnes que prévu (scénario prudent), tu perds de l'argent.",
  financing_gap:
    "Ton capital ne couvre pas tes dépenses de départ et trois mois de charges : prévois un financement ou un lancement plus petit.",
  no_cash_reserve:
    "Ton capital ne couvre même pas tes dépenses de départ : tu n'aurais aucune réserve pour les premiers mois.",
};

export const SENSITIVITY_COPY: Record<SensitivityKey, { label: string; up: string; down: string }> = {
  price: { label: "Prix de vente", up: "Si ton prix monte de 10 %", down: "S'il baisse de 10 %" },
  volume: { label: "Ventes par mois", up: "Si tu vends 10 % de plus", down: "Si tu vends 10 % de moins" },
  variableCostPerUnit: { label: "Coût par unité", up: "Si ce coût monte de 10 %", down: "S'il baisse de 10 %" },
  fixedCosts: { label: "Charges fixes", up: "Si tes charges montent de 10 %", down: "Si elles baissent de 10 %" },
};

// Osterwalder order: partners -> activities -> resources -> value -> relationships -> channels -> segments -> costs -> revenues.
export const CANVAS_LABELS = {
  keyPartners: "Partenaires clés",
  keyActivities: "Activités clés",
  keyResources: "Ressources clés",
  valueProposition: "Proposition de valeur",
  customerRelationships: "Relations clients",
  channels: "Canaux",
  customerSegments: "Segments de clients",
  costStructure: "Structure de coûts",
  revenueStreams: "Flux de revenus",
} as const;
