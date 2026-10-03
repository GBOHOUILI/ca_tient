// Reference dictionary: its shape defines `Dictionary`, which every other language must match.
export const fr = {
  meta: {
    title: "Ça tient ? — Teste ton idée de business avant d'investir",
    description:
      "Décris ton idée de business : en quelques minutes, tu sais ce qu'elle rapporte, ce qu'elle coûte et combien tu dois vendre chaque mois. Aperçu gratuit, paiement mobile money.",
    ogLocale: "fr_FR",
    ogImageAlt: "Ça tient ? — Teste ton idée de business avant d'investir",
    ogHeadline: ["Ton idée de business", "tient-elle vraiment ?"],
    ogSubline: "Chiffre d'affaires, marge, seuil de rentabilité, en quelques minutes.",
    ogBadge: "Aperçu gratuit",
  },
  header: {
    nav: "Navigation principale",
    recover: "Retrouver mon analyse",
    start: "Tester mon idée",
    openMenu: "Ouvrir le menu",
    closeMenu: "Fermer le menu",
    menu: "Menu",
    pricing: "Tarif",
    faq: "Questions fréquentes",
    privacy: "Confidentialité",
    themeToDark: "Passer en mode sombre",
    themeToLight: "Passer en mode clair",
    switchLanguage: "English",
    switchLanguageLabel: "Read this page in English",
  },
  notFound: {
    title: "Page introuvable",
    text: "Cette page n'existe pas ou a été déplacée.",
    back: "Retour à l'accueil",
  },
  footer: {
    tagline: "Teste les chiffres de ton idée de business avant d'investir ton argent.",
    productBy: "Un produit",
    product: "Produit",
    help: "Aide",
  },
} as const;

type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => Widen<R>
    : T extends readonly (infer U)[]
      ? readonly Widen<U>[]
      : { readonly [K in keyof T]: Widen<T[K]> };

export type Dictionary = Widen<typeof fr>;
