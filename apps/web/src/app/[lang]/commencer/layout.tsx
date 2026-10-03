import type { Metadata } from "next";
import type { ReactNode } from "react";
import { alternatesFor } from "@/i18n/seo";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getI18n();
  return {
    title: t.pages.startTitle,
    description: t.pages.startDescription,
    alternates: alternatesFor("/commencer", locale),
  };
}

export default function CommencerLayout({ children }: { children: ReactNode }) {
  return children;
}
