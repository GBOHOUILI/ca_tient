import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // Analyses are private (token-protected) and the dashboard is internal: never indexed.
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/analyse/", "/en/analyse/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
