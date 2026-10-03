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
  common: {
    back: "Retour",
    continue: "Continuer",
    saving: "Enregistrement...",
    seeResults: "Voir mes résultats",
  },
  profileLabels: {
    countries: {
      BJ: "Bénin",
      TG: "Togo",
      CI: "Côte d'Ivoire",
      SN: "Sénégal",
      BF: "Burkina Faso",
      NE: "Niger",
      ML: "Mali",
      GN: "Guinée",
      CM: "Cameroun",
      GA: "Gabon",
      CG: "Congo",
      CD: "RD Congo",
      NG: "Nigeria",
      GH: "Ghana",
      FR: "France",
      BE: "Belgique",
      CA: "Canada",
      OTHER: "Autre pays",
    },
    kinds: {
      etudiant: "Étudiant",
      salarie: "Salarié",
      entrepreneur: "Déjà entrepreneur",
      sans_emploi: "Sans emploi",
      autre: "Autre",
    },
    stages: { idee: "Une simple idée", preparation: "En préparation", lance: "Déjà lancé" },
    heardFrom: {
      whatsapp: "WhatsApp",
      facebook: "Facebook",
      instagram: "Instagram",
      tiktok: "TikTok",
      bouche_a_oreille: "Bouche-à-oreille",
      recherche: "Recherche Google",
      autre: "Autre",
    },
  },
  wizard: {
    steps: {
      "business-type": "Type",
      description: "Description",
      hypotheses: "Hypothèses",
      canvas: "Ton business model",
      profile: "Toi",
      results: "Aperçu",
      offer: "Analyse complète",
    },
    businessTypeTitle: "Quel type de business ?",
    descriptionTitle: "Décris ton idée",
    descriptionIntro: "Quelques phrases suffisent. Ça t'aidera plus tard quand l'IA proposera des hypothèses.",
    descriptionPlaceholder: "Ex : je veux vendre des vêtements en ligne pour jeunes actifs, livraison à domicile...",
    descriptionAi: "Ta description est analysée par une IA pour te proposer des chiffres de départ.",
    analysing: "Analyse en cours...",
    hypothesesTitle: "Tes hypothèses",
    suggested: "Suggéré par l'IA à partir de ta description : vérifie et corrige si besoin.",
    currency: "Devise",
    fields: {
      price: "À combien tu vends une unité ?",
      volume: "Combien tu penses en vendre par mois ?",
      variableCostPerUnit: "Combien ça te coûte de produire ou fournir une unité ?",
      fixedCosts: "Tes charges fixes chaque mois (loyer, salaires, abonnements...)",
    },
    volumeHint: "C'est le chiffre qui pèse le plus. Comment sais-tu que tu en vendras autant ? Vérifie-le en premier.",
    fixedCostsHint: "Compte aussi ce que tu veux te verser chaque mois : sans ça, le résultat est trop flatteur.",
    costHints: {
      ECOMMERCE: "Inclut coût produit, livraison et commissions.",
      FORMATION: "Inclut coût de production et plateforme.",
      EBOOK: "Inclut commissions et coût de création.",
      SERVICE: "Inclut sous-traitance et outils.",
      PRODUIT_PHYSIQUE: "Inclut matières, production et logistique.",
      RESTAURATION: "Inclut ingrédients, gaz ou charbon, emballages et livraison par plat.",
      AGRICULTURE: "Inclut semences, engrais, aliments du bétail, main-d'œuvre et transport par unité vendue.",
      TRANSFORMATION_ALIMENTAIRE: "Inclut matière première, énergie, emballages et transport par unité.",
      AUTRE: "Regroupe tous tes coûts qui varient avec le volume vendu.",
    },
    lossesHint: "Pense aussi aux pertes, aux retours et à la publicité par vente.",
    needPrice: "Indique ton prix de vente pour continuer.",
    calculating: "Calcul en cours...",
    calculationFailed: "Le calcul a échoué. Vérifie tes valeurs et réessaie.",
    canvasTitle: "Ton business model",
    canvasFields: {
      valueProposition: {
        label: "Qu'est-ce que tu offres, et pourquoi c'est intéressant ?",
        placeholder: "Ex : des sacs faits main, livrés en 24h à Cotonou",
      },
      customerSegments: { label: "À qui tu vends ?", placeholder: "Ex : jeunes actifs urbains, 20-35 ans" },
      channels: {
        label: "Comment tes clients te trouvent et achètent ?",
        placeholder: "Ex : Instagram, bouche-à-oreille, marché local",
      },
      customerRelationships: {
        label: "Comment tu gardes le contact avec eux dans la durée ?",
        placeholder: "Ex : WhatsApp, newsletter, programme de fidélité",
      },
      keyResources: {
        label: "De quoi tu as absolument besoin pour fonctionner ?",
        placeholder: "Ex : machine à coudre, stock de tissu, local",
      },
      keyActivities: {
        label: "Qu'est-ce que tu dois faire au quotidien pour faire tourner ça ?",
        placeholder: "Ex : production, livraison, réseaux sociaux",
      },
      keyPartners: {
        label: "De qui tu as besoin autour de toi ?",
        placeholder: "Ex : fournisseur de tissu, livreur, comptable",
      },
    },
    canvasIncomplete: "Remplis les 7 blocs pour continuer.",
    saveFailed: "L'enregistrement a échoué. Réessaie.",
    profileTitle: "Parle-nous de toi",
    profileIntro: "Tout est facultatif. Ça nous aide à améliorer Ça tient ? pour des projets comme le tien.",
    preferNotToSay: "Je préfère ne pas dire",
    profileCountry: "Dans quel pays veux-tu lancer ton projet ?",
    profileCity: "Dans quelle ville ?",
    profileKind: "Tu es...",
    profileStage: "Ton projet en est où ?",
    profileHeardFrom: "Comment as-tu connu Ça tient ?",
    profileContact: "Ton e-mail ou ton numéro WhatsApp",
    profileConsent: "J'accepte d'être recontacté par Ça tient ?",
    profileContactUse: "Uniquement pour te recontacter au sujet de Ça tient ?, jamais partagé.",
    learnMore: "En savoir plus",
    profileConsentMissing: "Coche la case pour qu'on garde ton contact, ou laisse le champ vide.",
    skip: "Passer",
    profileFailed: "On n'a pas pu enregistrer tes réponses : vérifie ton contact, ou passe cette étape.",
    seeFullAnalysis: "Voir l'analyse complète",
    payFailed: "Le paiement n'a pas pu démarrer. Réessaie.",
  },
  results: {
    preview: "Aperçu",
    holds: "Ça tient (pour l'instant)",
    doesNotHold: "Ça ne tient pas encore",
    revenue: "Chiffre d'affaires",
    grossMargin: "Marge brute",
    estimatedResult: "Résultat estimé",
    breakEven: "Seuil de rentabilité",
    breakEvenUnits: (units: string) => `Il te faut vendre ${units} unités par mois pour couvrir tes coûts.`,
    unreachable:
      "À prix et coûts actuels, aucun volume ne permet d'atteindre la rentabilité : ta marge par unité est nulle ou négative.",
    downside: "Si tu vends 20 % de moins :",
    perMonth: "par mois.",
    share: "Partager mon verdict sur WhatsApp",
    shareHolds: (units: number) =>
      `Mon idée de business tient : il me faut ${units} ventes par mois pour couvrir mes coûts.`,
    shareTested: "J'ai testé les chiffres de mon idée de business avant de me lancer.",
    shareInvite: (site: string) => `Teste la tienne sur Ça tient ? : ${site}`,
  },
  offer: {
    eyebrow: "Analyse complète",
    title: "Va plus loin que l'aperçu",
    items: [
      "« Et si ? » : change ton prix, tes ventes ou tes coûts et vois l'effet en direct, mois par mois selon ta saisonnalité.",
      "Les scénarios prudent, réaliste, ambitieux et crise, comparés côte à côte.",
      "Ton rapport complet à imprimer : synthèse, capital et besoin financier, variables sensibles, points à surveiller et business model.",
    ],
    free: "Gratuit",
    freeNow: "En ce moment, l'analyse complète est gratuite : rien à payer.",
    paidOnce: "Paiement unique, sans abonnement, sur la page sécurisée FedaPay (mobile money ou carte).",
    priceFailed: "Le prix n'a pas pu être chargé. Recharge la page pour réessayer.",
    disclaimer:
      "Ça tient ? est une aide à la décision, pas une garantie de rentabilité : les résultats dépendent des hypothèses que tu fournis.",
    storageWarning:
      "Ton navigateur bloque l'enregistrement local (navigation privée ?). Après le paiement, tu risques de ne pas pouvoir revenir à ton analyse. Ouvre Ça tient ? dans une fenêtre normale avant de payer.",
    redirecting: "Redirection...",
    pay: (price: string) => `Payer ${price}`,
    payPlain: "Payer",
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
