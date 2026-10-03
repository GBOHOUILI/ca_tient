import type { Dictionary } from "./fr";

export const en: Dictionary = {
  meta: {
    title: "Ça tient ? — Test your business idea before you invest",
    description:
      "Describe your business idea: in a few minutes, see what it earns, what it costs and how much you need to sell each month. Free preview.",
    ogLocale: "en_GB",
    ogImageAlt: "Ça tient ? — Test your business idea before you invest",
    ogHeadline: ["Does your business idea", "really hold up?"],
    ogSubline: "Revenue, margin, break-even point, in a few minutes.",
    ogBadge: "Free preview",
  },
  header: {
    nav: "Main navigation",
    recover: "Find my analysis",
    start: "Test my idea",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    menu: "Menu",
    pricing: "Pricing",
    faq: "FAQ",
    privacy: "Privacy",
    themeToDark: "Switch to dark mode",
    themeToLight: "Switch to light mode",
    switchLanguage: "Français",
    switchLanguageLabel: "Lire cette page en français",
  },
  pages: {
    startTitle: "Test my idea",
    startDescription:
      "Describe your idea, check the suggested numbers and find out for free whether your business can be profitable.",
    recoverTitle: "Find my analysis",
    analysisTitle: "My analysis",
    privacyTitle: "Privacy",
    privacyDescription: "How Ça tient ? uses your information and how to delete it.",
  },
  labels: {
    businessModels: {
      ECOMMERCE: "E-commerce",
      FORMATION: "Training course",
      EBOOK: "E-book",
      SERVICE: "Service",
      PRODUIT_PHYSIQUE: "Physical product",
      RESTAURATION: "Food service",
      AGRICULTURE: "Farming",
      TRANSFORMATION_ALIMENTAIRE: "Food processing",
      AUTRE: "Other",
    },
  },
  cta: {
    start: "Test my idea",
    priced: (price: string) => `Free preview · full analysis ${price}`,
    free: "Free preview and full analysis",
  },
  landing: {
    heroTitle: "Your business idea:",
    heroHighlight: "does it really hold up?",
    heroText:
      "Check before you put your money in. Describe your idea: in a few minutes you'll know what it earns, what it costs and how much you need to sell each month.",
    businessTypes: "Online shop, training, services, food service, farming or food processing",
    problemTitle: "Starting without doing the maths is gambling your money",
    problems: [
      "Your selling price is set on gut feeling, without knowing what you keep on each sale.",
      "You counted the stock, but not the rent, transport, packaging or payment fees.",
      "You don't know how much you need to sell each month just to cover your costs.",
      "You're about to put in your savings, a tontine or a loan, without knowing how much you really need.",
    ],
    problemOutro: "Ça tient ? does these calculations with you, before you spend anything.",
    previewTitle: "Here's what you see, for free",
    previewExample: (price: string, volume: string, cost: string, fixed: string) =>
      `Example: selling wax-print fabric online at ${price} a piece, ${volume} sales a month, ${cost} cost per piece and ${fixed} of fixed costs a month.`,
    previewNote: "The real preview screen, computed on this example.",
    extractTitle: "And in the full analysis",
    extractIntro: (startup: string, saved: string) =>
      `A real extract of the report, on the same example, with ${startup} of startup costs and ${saved} set aside.`,
    extractCapital: "Capital to get started",
    extractNeeded: "Capital needed",
    extractSaved: "Already set aside",
    extractMissing: (amount: string) => `${amount} missing`,
    extractWeighs: "What weighs the most",
    perMonth: "a month",
    extractWatch: "Points to watch",
    howTitle: "Three steps, a few minutes",
    howSteps: (price: string | null) => [
      {
        title: "Describe your idea",
        description: "The type of business and a few sentences about what you want to launch. No finance jargon needed.",
      },
      {
        title: "Check your numbers",
        description:
          "The AI suggests your price, monthly sales and costs from your description. You fix whatever doesn't fit.",
      },
      {
        title: "See if it holds up",
        description: price
          ? `Your free preview shows up straight away. To go further, the full analysis costs ${price}.`
          : "Your preview shows up straight away, and the full analysis is free right now.",
      },
    ],
    reviewsTitle: "What users say",
    reviewsCount: (count: number) => `${count} ${count === 1 ? "review" : "reviews"}`,
    offerTitle: "You know if it holds up before you pay",
    offerText: (price: string | null) =>
      price
        ? `The preview is free. You only pay if you want the full analysis: ${price} per idea, once, no subscription.`
        : "The preview and the full analysis are free right now.",
    offerPreview: "Preview",
    offerFull: "Full analysis",
    offerFree: "Free",
    offerFreeItems: [
      "Assumptions suggested by the AI from your description",
      "Your monthly revenue, margin and result",
      "How many sales a month you need to cover your costs",
      "The verdict: it holds up, or not yet",
    ],
    offerPaidItems: [
      "“What if?”: change your price, sales or costs and see the effect live, month by month",
      "4 scenarios compared: cautious, realistic, ambitious, crisis",
      "The capital you need to get started, and how much you're missing",
      "A printable report: summary, the numbers that matter most, points to watch, business model",
      "A code to find your analysis again from another phone",
    ],
    benefitsTitle: "What it changes before you start",
    benefits: [
      {
        title: "Know how much you need to sell each month",
        detail: "Your break-even point: the number of sales from which you stop losing money.",
      },
      {
        title: "See what happens if things go worse",
        detail: "Lower sales, higher costs: the cautious and crisis scenarios show whether you still hold up.",
      },
      {
        title: "Know how much money you need to start",
        detail: "Your startup costs plus three months of costs, compared with what you've already set aside.",
      },
      {
        title: "Spot the number that can tip everything over",
        detail: "Price, sales, cost per unit, fixed costs: the report ranks what weighs most on your result.",
      },
    ],
    trustTitle: "Why you can trust it",
    trust: [
      {
        title: "The numbers are calculated, not made up",
        detail: "The AI helps you phrase your assumptions. Every result comes from fixed, tested formulas, never from the AI.",
      },
      {
        title: "You only pay once you've seen the verdict",
        detail: "The preview is free. The full analysis only opens once FedaPay has confirmed your payment.",
      },
      {
        title: "No account to create",
        detail: "Your analysis opens in your browser. After payment, a code lets you find it again elsewhere.",
      },
      {
        title: "A decision aid, not a promise",
        detail: "The results depend on the numbers you give. Ça tient ? helps you decide; it doesn't guarantee it will work.",
      },
    ],
    faqTitle: "Frequently asked questions",
    finalTitle: "Before you invest, check that it holds up",
    finalText: "A few minutes to describe your idea, and you'll know whether your numbers stand up.",
  },
  faq: (price: string | null) => [
    {
      question: "What is free?",
      answer:
        "Everything up to the preview: describing your idea, the assumptions suggested by the AI, your revenue, margin, result, break-even point and the verdict. You only pay for the full analysis.",
    },
    {
      question: "I know nothing about finance. Will I manage?",
      answer:
        "Yes. The questions are simple (“How much do you sell one unit for?”), the AI suggests starting numbers and the report explains the results in plain sentences.",
    },
    {
      question: "Will the AI make up my numbers?",
      answer:
        "No. The AI suggests assumptions that you check and correct. Every result is calculated by fixed formulas, and the summary written by the AI contains no figures.",
    },
    {
      question: "Does the result include paying myself?",
      answer:
        "Only if you add it to your fixed costs, which we recommend: otherwise a positive result can hide the fact that you're working for free. Also count losses, returns and advertising in your cost per unit.",
    },
    {
      question: "Is the calculated capital enough to start?",
      answer:
        "It's a minimum: your startup costs plus three months of costs. It doesn't include working capital (stock to buy again, money your customers still owe you). Keep some extra margin.",
    },
    {
      question: "How long does it take?",
      answer: "A few minutes to describe your idea and check your numbers. The preview shows up straight away.",
    },
    {
      question: "How do I pay?",
      answer: price
        ? `${price}, once, on FedaPay's secure payment page (mobile money or card). No subscription, no hidden fees.`
        : "Right now, the full analysis is free: nothing to pay.",
    },
    {
      question: "What if I change phones?",
      answer:
        "After payment, you can get a code. It lets you reopen your analysis from any phone or browser, on the “Find my analysis” page.",
    },
    {
      question: "I want to test several ideas.",
      answer: price
        ? `Each idea gets its free preview. The full analysis costs ${price} per idea: you only pay for what you dig into.`
        : "Each idea gets its preview and full analysis, free right now.",
    },
    {
      question: "What happens to my information?",
      answer:
        "Your description is sent to an AI service to suggest assumptions. Your numbers and your analysis stay with us. Your contact details are only saved if you tick the box for it, and they are never shared.",
    },
    {
      question: "If the analysis says it holds up, is success guaranteed?",
      answer:
        "No. It's a decision aid: the results depend on the numbers you give. It shows you where the risks are, not a guarantee of success.",
    },
  ],
  report: {
    watchPoints: {
      non_positive_unit_margin:
        "Each sale costs you as much as or more than it brings in: raise your price or lower your cost per unit first.",
      below_break_even: "The number of sales you expect is below your break-even point: you don't cover your costs yet.",
      thin_gross_margin: "Your margin on each sale is thin: a small rise in your costs can tip your result over.",
      prudent_scenario_loss: "If your sales are a bit weaker than expected (cautious scenario), you lose money.",
      financing_gap:
        "Your capital doesn't cover your startup costs and three months of costs: plan for financing or a smaller launch.",
      no_cash_reserve:
        "Your capital doesn't even cover your startup costs: you'd have no reserve for the first months.",
    },
    sensitivity: {
      price: { label: "Selling price", up: "If your price rises by 10%", down: "If it drops by 10%" },
      volume: { label: "Sales per month", up: "If you sell 10% more", down: "If you sell 10% less" },
      variableCostPerUnit: { label: "Cost per unit", up: "If this cost rises by 10%", down: "If it drops by 10%" },
      fixedCosts: { label: "Fixed costs", up: "If your costs rise by 10%", down: "If they drop by 10%" },
    },
    canvas: {
      keyPartners: "Key partners",
      keyActivities: "Key activities",
      keyResources: "Key resources",
      valueProposition: "Value proposition",
      customerRelationships: "Customer relationships",
      channels: "Channels",
      customerSegments: "Customer segments",
      costStructure: "Cost structure",
      revenueStreams: "Revenue streams",
    },
  },
  privacy: {
    updated: "Updated on 3 October 2026",
  },
  notFound: {
    title: "Page not found",
    text: "This page does not exist or has moved.",
    back: "Back to home",
  },
  footer: {
    tagline: "Test the numbers of your business idea before you invest your money.",
    productBy: "A product by",
    product: "Product",
    help: "Help",
  },
};
