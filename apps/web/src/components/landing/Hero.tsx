import Link from "next/link";
import { HeroSceneLoader } from "./HeroSceneLoader";

export function Hero() {
  return (
    <section className="relative isolate flex min-h-[90vh] items-center justify-center overflow-hidden px-4 text-center sm:px-6">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 motion-safe:animate-pulse bg-[radial-gradient(ellipse_at_center,_var(--color-accent-emerald)_0%,_transparent_60%)] opacity-20 dark:opacity-25"
      />
      <HeroSceneLoader />
      <div
        aria-hidden
        className="absolute inset-0 -z-[5] bg-gradient-to-b from-transparent via-bg/30 to-bg"
      />

      <div className="flex max-w-2xl flex-col items-center gap-6">
        <span className="rounded-full border border-border px-4 py-1 text-micro font-medium tracking-micro text-text-secondary">
          Stress-test financier en quelques minutes
        </span>
        <h1 className="text-display-mobile md:text-display text-balance font-bold">
          Ton idée de business,{" "}
          <span className="bg-gradient-to-r from-accent-emerald to-accent-cyan bg-clip-text text-transparent">
            tient-elle vraiment ?
          </span>
        </h1>
        <p className="max-w-lg text-body-lg text-text-secondary">
          Décris ton idée, teste tes chiffres, sache où tu te situes — avant d&apos;investir un centime.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/commencer"
            className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-6 py-3 text-body font-semibold text-white shadow-[0_8px_32px_rgba(5,150,105,0.18)] transition-transform hover:scale-[1.02]"
          >
            Tester mon idée
          </Link>
          <span className="text-small tabular-nums text-text-secondary">1 000 FCFA · sans abonnement</span>
        </div>
      </div>
    </section>
  );
}
