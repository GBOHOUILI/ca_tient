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
  pages: {
    startTitle: "Tester mon idée",
    startDescription:
      "Décris ton idée, vérifie les chiffres proposés et découvre gratuitement si ton business peut être rentable.",
    recoverTitle: "Retrouver mon analyse",
    analysisTitle: "Mon analyse",
    privacyTitle: "Confidentialité",
    privacyDescription: "Comment Ça tient ? utilise tes informations et comment les supprimer.",
  },
  labels: {
    businessModels: {
      ECOMMERCE: "E-commerce",
      FORMATION: "Formation",
      EBOOK: "E-book",
      SERVICE: "Service",
      PRODUIT_PHYSIQUE: "Produit physique",
      RESTAURATION: "Restauration",
      AGRICULTURE: "Agriculture",
      TRANSFORMATION_ALIMENTAIRE: "Transformation alimentaire",
      AUTRE: "Autre",
    },
  },
  cta: {
    start: "Tester mon idée",
    priced: (price: string) => `Aperçu gratuit · analyse complète ${price}`,
    free: "Aperçu et analyse complète gratuits",
  },
  landing: {
    heroTitle: "Ton idée de business,",
    heroHighlight: "tient-elle vraiment ?",
    heroText:
      "Vérifie-le avant d'y mettre ton argent. Décris ton idée : tu sais en quelques minutes ce qu'elle rapporte, ce qu'elle coûte et combien tu dois vendre chaque mois.",
    businessTypes: "Boutique en ligne, formation, service, restauration, agriculture ou transformation",
    problemTitle: "Se lancer sans calculer, c'est parier ton argent",
    problems: [
      "Ton prix de vente est fixé « au feeling », sans savoir ce qu'il te reste sur chaque vente.",
      "Tu as compté le stock, mais pas le loyer, le transport, les emballages ou les frais de paiement.",
      "Tu ne sais pas combien il faut vendre chaque mois pour simplement couvrir tes charges.",
      "Tu t'apprêtes à mettre tes économies, une tontine ou un prêt, sans savoir combien il te faut vraiment.",
    ],
    problemOutro: "Ça tient ? fait ces calculs avec toi, avant que tu dépenses quoi que ce soit.",
    previewTitle: "Voilà ce que tu vois, gratuitement",
    previewExample: (price: string, volume: string, cost: string, fixed: string) =>
      `Exemple : vente de pagnes en ligne à ${price} pièce, ${volume} ventes par mois, ${cost} de coût par pièce et ${fixed} de charges fixes par mois.`,
    previewNote: "Écran réel de l'aperçu, calculé sur cet exemple.",
    extractTitle: "Et dans l'analyse complète",
    extractIntro: (startup: string, saved: string) =>
      `Extrait réel du rapport, sur le même exemple, avec ${startup} de dépenses de départ et ${saved} de côté.`,
    extractCapital: "Capital pour te lancer",
    extractNeeded: "Capital nécessaire",
    extractSaved: "Déjà de côté",
    extractMissing: (amount: string) => `Il manque ${amount}`,
    extractWeighs: "Ce qui pèse le plus",
    perMonth: "par mois",
    extractWatch: "Points à surveiller",
    howTitle: "Trois étapes, quelques minutes",
    howSteps: (price: string | null) => [
      {
        title: "Décris ton idée",
        description: "Le type de business et quelques phrases sur ce que tu veux lancer. Pas besoin de vocabulaire financier.",
      },
      {
        title: "Vérifie tes chiffres",
        description:
          "L'IA propose ton prix, tes ventes par mois et tes coûts à partir de ta description. Tu corriges ce qui ne colle pas.",
      },
      {
        title: "Vois si ça tient",
        description: price
          ? `Ton aperçu gratuit s'affiche aussitôt. Si tu veux aller plus loin, l'analyse complète coûte ${price}.`
          : "Ton aperçu s'affiche aussitôt, et l'analyse complète est gratuite en ce moment.",
      },
    ],
    reviewsTitle: "Ce qu'en disent les utilisateurs",
    reviewsCount: (count: number) => `${count} avis`,
    offerTitle: "Tu sais si ça tient avant de payer",
    offerText: (price: string | null) =>
      price
        ? `L'aperçu est gratuit. Tu ne paies que si tu veux l'analyse complète : ${price} par idée, une seule fois, sans abonnement.`
        : "L'aperçu et l'analyse complète sont gratuits en ce moment.",
    offerPreview: "Aperçu",
    offerFull: "Analyse complète",
    offerFree: "Gratuit",
    offerFreeItems: [
      "Les hypothèses proposées par l'IA à partir de ta description",
      "Ton chiffre d'affaires, ta marge et ton résultat par mois",
      "Le nombre de ventes par mois pour couvrir tes charges",
      "Le verdict : ça tient, ou pas encore",
    ],
    offerPaidItems: [
      "« Et si ? » : change ton prix, tes ventes ou tes coûts et vois l'effet en direct, mois par mois",
      "4 scénarios comparés : prudent, réaliste, ambitieux, crise",
      "Le capital qu'il te faut pour te lancer, et ce qu'il te manque",
      "Un rapport à imprimer : synthèse, chiffres qui comptent le plus, points à surveiller, business model",
      "Un code pour retrouver ton analyse depuis un autre téléphone",
    ],
    benefitsTitle: "Ce que ça change avant de te lancer",
    benefits: [
      {
        title: "Sache combien tu dois vendre chaque mois",
        detail: "Ton seuil de rentabilité : le nombre de ventes à partir duquel tu ne perds plus d'argent.",
      },
      {
        title: "Vois ce qui se passe si ça va moins bien",
        detail: "Ventes plus faibles, coûts plus élevés : les scénarios prudent et crise te montrent si tu tiens quand même.",
      },
      {
        title: "Sache combien d'argent il te faut pour démarrer",
        detail: "Tes dépenses de départ plus trois mois de charges, comparées à ce que tu as déjà de côté.",
      },
      {
        title: "Repère le chiffre qui peut tout faire basculer",
        detail: "Prix, ventes, coût par unité, charges : le rapport classe ce qui pèse le plus sur ton résultat.",
      },
    ],
    trustTitle: "Pourquoi tu peux t'y fier",
    trust: [
      {
        title: "Les chiffres sont calculés, pas inventés",
        detail: "L'IA t'aide à formuler tes hypothèses. Tous les résultats viennent de formules fixes et testées, jamais de l'IA.",
      },
      {
        title: "Tu ne paies qu'une fois le verdict vu",
        detail: "L'aperçu est gratuit. L'analyse complète ne s'ouvre qu'après la confirmation de ton paiement par FedaPay.",
      },
      {
        title: "Pas de compte à créer",
        detail: "Ton analyse s'ouvre dans ton navigateur. Après paiement, un code te permet de la retrouver ailleurs.",
      },
      {
        title: "Une aide à la décision, pas une promesse",
        detail:
          "Les résultats dépendent des chiffres que tu donnes. Ça tient ? t'aide à décider, il ne garantit pas que ça marchera.",
      },
    ],
    faqTitle: "Questions fréquentes",
    finalTitle: "Avant d'investir, vérifie que ça tient",
    finalText: "Quelques minutes pour décrire ton idée, et tu sais si tes chiffres tiennent la route.",
  },
  faq: (price: string | null) => [
    {
      question: "Qu'est-ce qui est gratuit ?",
      answer:
        "Tout jusqu'à l'aperçu : la description de ton idée, les hypothèses proposées par l'IA, ton chiffre d'affaires, ta marge, ton résultat, ton seuil de rentabilité et le verdict. Tu ne paies que pour l'analyse complète.",
    },
    {
      question: "Je n'y connais rien en finance, je vais m'en sortir ?",
      answer:
        "Oui. Les questions sont posées simplement (« À combien tu vends une unité ? »), l'IA propose des chiffres de départ et le rapport explique les résultats en phrases simples.",
    },
    {
      question: "L'IA va-t-elle inventer mes chiffres ?",
      answer:
        "Non. L'IA propose des hypothèses que tu vérifies et corriges. Tous les résultats sont calculés par des formules fixes, et la synthèse rédigée par l'IA ne contient aucun chiffre.",
    },
    {
      question: "Le résultat compte-t-il ma propre rémunération ?",
      answer:
        "Seulement si tu l'ajoutes à tes charges fixes, et c'est ce qu'on te conseille : sinon, un résultat positif peut cacher le fait que tu travailles gratuitement. Pense aussi à compter les pertes, les retours et la publicité dans ton coût par unité.",
    },
    {
      question: "Le capital calculé suffit-il pour démarrer ?",
      answer:
        "C'est un minimum : tes dépenses de départ plus trois mois de charges. Il ne compte pas le fonds de roulement (le stock à racheter, l'argent que tes clients te doivent encore). Garde une marge en plus.",
    },
    {
      question: "Combien de temps ça prend ?",
      answer: "Quelques minutes pour décrire ton idée et vérifier tes chiffres. L'aperçu s'affiche aussitôt.",
    },
    {
      question: "Comment je paie ?",
      answer: price
        ? `${price}, une seule fois, sur la page de paiement sécurisée de FedaPay (mobile money ou carte). Pas d'abonnement, pas de frais cachés.`
        : "En ce moment, l'analyse complète est gratuite : rien à payer.",
    },
    {
      question: "Et si je change de téléphone ?",
      answer:
        "Après le paiement, tu peux obtenir un code. Il te permet de rouvrir ton analyse depuis n'importe quel téléphone ou navigateur, sur la page « Retrouver mon analyse ».",
    },
    {
      question: "Je veux tester plusieurs idées.",
      answer: price
        ? `Chaque idée a son aperçu gratuit. L'analyse complète coûte ${price} par idée : tu ne paies que ce que tu approfondis.`
        : "Chaque idée a son aperçu et son analyse complète, gratuitement en ce moment.",
    },
    {
      question: "Que deviennent mes informations ?",
      answer:
        "Ta description est envoyée à un service d'IA pour te proposer des hypothèses. Tes chiffres et ton analyse restent chez nous. Ton contact n'est enregistré que si tu coches la case prévue, et il n'est jamais partagé.",
    },
    {
      question: "Si l'analyse dit que ça tient, c'est sûr que ça marchera ?",
      answer:
        "Non. C'est une aide à la décision : les résultats dépendent des chiffres que tu donnes. Elle te montre où sont les risques, pas une garantie de succès.",
    },
  ],
  report: {
    watchPoints: {
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
    },
    sensitivity: {
      price: { label: "Prix de vente", up: "Si ton prix monte de 10 %", down: "S'il baisse de 10 %" },
      volume: { label: "Ventes par mois", up: "Si tu vends 10 % de plus", down: "Si tu vends 10 % de moins" },
      variableCostPerUnit: { label: "Coût par unité", up: "Si ce coût monte de 10 %", down: "S'il baisse de 10 %" },
      fixedCosts: { label: "Charges fixes", up: "Si tes charges montent de 10 %", down: "Si elles baissent de 10 %" },
    },
    // Osterwalder order: partners -> activities -> resources -> value -> relationships -> channels -> segments -> costs -> revenues.
    canvas: {
      keyPartners: "Partenaires clés",
      keyActivities: "Activités clés",
      keyResources: "Ressources clés",
      valueProposition: "Proposition de valeur",
      customerRelationships: "Relations clients",
      channels: "Canaux",
      customerSegments: "Segments de clients",
      costStructure: "Structure de coûts",
      revenueStreams: "Flux de revenus",
    },
  },
  privacy: {
    updated: "Mise à jour le 3 octobre 2026",
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
