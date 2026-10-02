import { Hero } from "@/components/landing/Hero";
import { BusinessTypes } from "@/components/landing/BusinessTypes";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Scenarios } from "@/components/landing/Scenarios";
import { Faq } from "@/components/landing/Faq";
import { Pricing } from "@/components/landing/Pricing";
import { TrackEvent } from "@/components/analytics/TrackEvent";

export default function Home() {
  return (
    <>
      <TrackEvent type="landing_view" />
      <Hero />
      <BusinessTypes />
      <HowItWorks />
      <Scenarios />
      <Faq />
      <Pricing />
    </>
  );
}
