import { HeroSceneLoader } from "./HeroSceneLoader";
import { CtaLink } from "./CtaLink";

export function Hero() {
  return (
    <section className="relative isolate flex min-h-[90vh] items-center justify-center overflow-hidden px-4 text-center sm:px-6">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 motion-safe:animate-pulse bg-[radial-gradient(ellipse_at_center,_var(--color-accent-emerald)_0%,_transparent_60%)] opacity-20 dark:opacity-25"
      />
      <HeroSceneLoader />
      <div aria-hidden className="absolute inset-0 -z-[5] bg-gradient-to-b from-transparent via-bg/30 to-bg" />

      <div className="flex max-w-2xl flex-col items-center gap-6">
        <h1 className="text-display-mobile md:text-display text-balance font-bold">
          Ton idée de business,{" "}
          <span className="bg-gradient-to-r from-accent-emerald to-accent-cyan bg-clip-text text-transparent">
            tient-elle vraiment ?
          </span>
        </h1>
        <p className="max-w-lg text-body-lg text-text-secondary">
          Vérifie-le avant d&apos;y mettre ton argent. Décris ton idée : tu sais en quelques minutes ce qu&apos;elle
          rapporte, ce qu&apos;elle coûte et combien tu dois vendre chaque mois.
        </p>
        <CtaLink />
      </div>
    </section>
  );
}
