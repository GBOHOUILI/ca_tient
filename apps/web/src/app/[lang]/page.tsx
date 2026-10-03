import type { Metadata } from "next";
import { TrackEvent } from "@/components/analytics/TrackEvent";
import { Benefits } from "@/components/landing/Benefits";
import { BusinessTypes } from "@/components/landing/BusinessTypes";
import { Faq } from "@/components/landing/Faq";
import { FinalCta } from "@/components/landing/FinalCta";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Offer } from "@/components/landing/Offer";
import { Problem } from "@/components/landing/Problem";
import { ProductPreview } from "@/components/landing/ProductPreview";
import { ReportExtract } from "@/components/landing/ReportExtract";
import { Trust } from "@/components/landing/Trust";
import { Testimonials } from "@/components/landing/Testimonials";
import { JsonLd } from "@/components/seo/JsonLd";
import { landingStructuredData } from "@/components/seo/structured-data";
import { alternatesFor } from "@/i18n/seo";
import { getI18n } from "@/i18n/server";
import { getAnalysisPrice } from "@/lib/api/pricing";
import { getPublishedReviews } from "@/lib/api/reviews";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getI18n();
  return { alternates: alternatesFor("/", locale) };
}

// Conversion order: problem -> promise -> proof -> how -> offer -> benefits -> trust -> objections -> action.
export default async function Home() {
  const [price, reviews, { locale, t }] = await Promise.all([getAnalysisPrice(), getPublishedReviews(), getI18n()]);

  return (
    <>
      <JsonLd data={landingStructuredData(price, locale, t)} />
      <TrackEvent type="landing_view" />
      <Hero price={price} />
      <BusinessTypes />
      <Problem />
      <ProductPreview />
      <ReportExtract />
      <HowItWorks price={price} />
      <Testimonials data={reviews} />
      <Offer price={price} />
      <Benefits />
      <Trust />
      <Faq price={price} />
      <FinalCta price={price} />
    </>
  );
}
