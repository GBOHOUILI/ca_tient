import { faqs } from "@/components/landing/Faq";
import { priceLabel } from "@/lib/price";
import { PUBLISHER, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export function landingStructuredData(price: number) {
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
        url: `${SITE_URL}/`,
        description: SITE_DESCRIPTION,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: "fr",
        publisher: { "@id": organization["@id"] },
        offers: { "@type": "Offer", price: String(price), priceCurrency: "XOF" },
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs(priceLabel(price)).map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  };
}
