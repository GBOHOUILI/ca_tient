import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.pages.recoverTitle, robots: { index: false, follow: true } };
}

export default function RetrouverLayout({ children }: { children: ReactNode }) {
  return children;
}
