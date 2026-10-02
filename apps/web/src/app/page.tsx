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

// Conversion order: problem -> promise -> proof -> how -> offer -> benefits -> trust -> objections -> action.
export default function Home() {
  return (
    <>
      <TrackEvent type="landing_view" />
      <Hero />
      <BusinessTypes />
      <Problem />
      <ProductPreview />
      <HowItWorks />
      <Offer />
      <Benefits />
      <Trust />
      <Faq />
      <FinalCta />
    </>
  );
}
