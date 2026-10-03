import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { alternatesFor } from "@/i18n/seo";
import { getI18n } from "@/i18n/server";
import { PrivacyEn } from "./content-en";
import { PrivacyFr } from "./content-fr";

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getI18n();
  return {
    title: t.pages.privacyTitle,
    description: t.pages.privacyDescription,
    alternates: alternatesFor("/confidentialite", locale),
  };
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-h3-mobile font-semibold md:text-h3">{title}</h2>
      <div className="flex flex-col gap-3 text-body text-text-secondary">{children}</div>
    </section>
  );
}

// Legal text is kept as whole paragraphs per language rather than split into dictionary keys.
export default async function ConfidentialitePage() {
  const { t, locale, href } = await getI18n();
  const Content = locale === "en" ? PrivacyEn : PrivacyFr;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10 px-4 py-16 sm:px-6">
      <div>
        <h1 className="text-h2-mobile font-semibold md:text-h2">{t.pages.privacyTitle}</h1>
        <p className="mt-2 text-small text-text-secondary">{t.privacy.updated}</p>
      </div>
      <Content Section={Section} />
      <Link href={href("/")} className="text-small text-text-secondary underline underline-offset-4">
        ← {t.notFound.back}
      </Link>
    </div>
  );
}
