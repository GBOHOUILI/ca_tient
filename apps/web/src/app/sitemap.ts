import type { MetadataRoute } from "next";
import { localizedPath } from "@/i18n/locale-route";
import { LOCALES } from "@/i18n/locales";
import { SITE_URL } from "@/lib/site";

const PAGES = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/commencer", changeFrequency: "monthly", priority: 0.8 },
  { path: "/confidentialite", changeFrequency: "yearly", priority: 0.3 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.flatMap((page) =>
    LOCALES.map((locale) => ({
      url: `${SITE_URL}${localizedPath(page.path, locale)}`,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: {
        languages: Object.fromEntries(LOCALES.map((other) => [other, `${SITE_URL}${localizedPath(page.path, other)}`])),
      },
    })),
  );
}
