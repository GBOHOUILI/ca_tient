"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { trackPageView } from "@/lib/traffic";

// One page view per path change. Mounted after AcquisitionCapture so the first view carries its source.
export function PageViewTracker() {
  const { locale } = useI18n();
  const pathname = usePathname();

  useEffect(() => {
    trackPageView(pathname, locale);
  }, [pathname, locale]);

  return null;
}
