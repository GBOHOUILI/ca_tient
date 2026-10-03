// Public identity of the site, used for canonical URLs, social cards and structured data.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://catient.zerotoone.bj").replace(/\/+$/, "");
export const SITE_NAME = "Ça tient ?";
export const SITE_TITLE = "Ça tient ? — Teste ton idée de business avant d'investir";
export const SITE_DESCRIPTION =
  "Décris ton idée de business : en quelques minutes, tu sais ce qu'elle rapporte, ce qu'elle coûte et combien tu dois vendre chaque mois. Aperçu gratuit, paiement mobile money.";
export const PUBLISHER = { name: "ZeroToOne", url: "https://zerotoone.bj", email: "contact@zerotoone.bj" };
