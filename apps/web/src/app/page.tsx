import { Hero } from "@/components/landing/Hero";
import { BusinessTypes } from "@/components/landing/BusinessTypes";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Pricing } from "@/components/landing/Pricing";

export default function Home() {
  return (
    <>
      <Hero />
      <BusinessTypes />
      <HowItWorks />
      <Pricing />
    </>
  );
}
