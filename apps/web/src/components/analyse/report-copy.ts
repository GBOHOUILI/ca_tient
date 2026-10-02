import type { SensitivityKey, WatchPointCode } from "financial-engine";

export const WATCH_POINT_COPY: Record<WatchPointCode, string> = {
  non_positive_unit_margin:
    "Chaque vente te coute autant ou plus qu'elle ne te rapporte : augmente ton prix ou baisse ton cout par unite avant tout.",
  below_break_even:
    "Le nombre de ventes que tu prevois est sous ton seuil de rentabilite : tu ne couvres pas encore tes charges.",
  thin_gross_margin:
    "Ta marge sur chaque vente est faible : une petite hausse de tes couts peut faire basculer ton resultat.",
  prudent_scenario_loss: "Si tes ventes sont un peu moins bonnes que prevu (scenario prudent), tu perds de l'argent.",
  financing_gap:
    "Ton capital ne couvre pas tes depenses de depart et trois mois de charges : prevois un financement ou un lancement plus petit.",
  no_cash_reserve:
    "Ton capital ne couvre meme pas tes depenses de depart : tu n'aurais aucune reserve pour les premiers mois.",
};

export const SENSITIVITY_COPY: Record<SensitivityKey, { label: string; up: string; down: string }> = {
  price: { label: "Prix de vente", up: "Si ton prix monte de 10 %", down: "S'il baisse de 10 %" },
  volume: { label: "Ventes par mois", up: "Si tu vends 10 % de plus", down: "Si tu vends 10 % de moins" },
  variableCostPerUnit: { label: "Cout par unite", up: "Si ce cout monte de 10 %", down: "S'il baisse de 10 %" },
  fixedCosts: { label: "Charges fixes", up: "Si tes charges montent de 10 %", down: "Si elles baissent de 10 %" },
};

// Osterwalder order: partners -> activities -> resources -> value -> relationships -> channels -> segments -> costs -> revenues.
export const CANVAS_LABELS = {
  keyPartners: "Partenaires cles",
  keyActivities: "Activites cles",
  keyResources: "Ressources cles",
  valueProposition: "Proposition de valeur",
  customerRelationships: "Relations clients",
  channels: "Canaux",
  customerSegments: "Segments de clients",
  costStructure: "Structure de couts",
  revenueStreams: "Flux de revenus",
} as const;
