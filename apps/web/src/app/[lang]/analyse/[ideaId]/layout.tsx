import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getI18n } from "@/i18n/server";

// Analyses are private: reachable only with the idea's access token.
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.pages.analysisTitle, robots: { index: false, follow: false } };
}

export default function AnalyseLayout({ children }: { children: ReactNode }) {
  return children;
}
