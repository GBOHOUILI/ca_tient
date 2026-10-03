import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { AcquisitionCapture } from "@/components/analytics/AcquisitionCapture";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { RootDocument } from "@/components/layout/RootDocument";
import { I18nProvider } from "@/i18n/I18nProvider";
import { getI18n } from "@/i18n/server";
import { hasLocale, LOCALES } from "@/i18n/locales";
import { PUBLISHER, SITE_NAME, SITE_URL } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const { t, href } = await getI18n();
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t.meta.title, template: `%s — ${SITE_NAME}` },
    description: t.meta.description,
    applicationName: SITE_NAME,
    publisher: PUBLISHER.name,
    authors: [{ name: PUBLISHER.name, url: PUBLISHER.url }],
    openGraph: {
      type: "website",
      locale: t.meta.ogLocale,
      siteName: SITE_NAME,
      url: href("/"),
      title: t.meta.title,
      description: t.meta.description,
    },
    twitter: { card: "summary_large_image", title: t.meta.title, description: t.meta.description },
    // Amounts like "1 000 F CFA" must not be turned into phone links on mobile.
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
  ],
};

export default async function LangLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  return (
    <RootDocument lang={lang}>
      <I18nProvider locale={lang}>
        <AcquisitionCapture />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </I18nProvider>
    </RootDocument>
  );
}
