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
import { Trust } from "@/components/landing/Trust";
import { Testimonials } from "@/components/landing/Testimonials";
import { getAnalysisPrice } from "@/lib/api/pricing";
import { getPublishedReviews } from "@/lib/api/reviews";

// Conversion order: problem -> promise -> proof -> how -> offer -> benefits -> trust -> objections -> action.
export default async function Home() {
  const [price, reviews] = await Promise.all([getAnalysisPrice(), getPublishedReviews()]);

  return (
    <>
      <TrackEvent type="landing_view" />
      <Hero price={price} />
      <BusinessTypes />
      <Problem />
      <ProductPreview />
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
