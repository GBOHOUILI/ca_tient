import type { Dictionary } from "@/i18n/dictionaries";
import { localizedPath } from "@/i18n/locale-route";
import type { Locale } from "@/i18n/locales";
import { priceLabel } from "@/lib/price";
import { PUBLISHER, SITE_NAME, SITE_URL } from "@/lib/site";

export function landingStructuredData(price: number, locale: Locale, t: Dictionary) {
  const organization = {
    "@type": "Organization",
    "@id": `${PUBLISHER.url}/#organization`,
    name: PUBLISHER.name,
    url: PUBLISHER.url,
    email: PUBLISHER.email,
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      organization,
      {
        "@type": "WebApplication",
        name: SITE_NAME,
        url: `${SITE_URL}${localizedPath("/", locale)}`,
        description: t.meta.description,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: locale,
        publisher: { "@id": organization["@id"] },
        offers: { "@type": "Offer", price: String(price), priceCurrency: "XOF" },
      },
      {
        "@type": "FAQPage",
        inLanguage: locale,
        mainEntity: t.faq(priceLabel(price, locale)).map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  };
}
