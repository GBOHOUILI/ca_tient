"use client";

import { useEffect } from "react";
import { trackEvent, type AnalyticsEventType } from "@/lib/analytics";

// Renders nothing; reports one event when mounted. Duplicates (StrictMode, reloads) are
// harmless: the stats count distinct sessions and ideas.
export function TrackEvent({ type, ideaId }: { type: AnalyticsEventType; ideaId?: string }) {
  useEffect(() => {
    trackEvent(type, ideaId);
  }, [type, ideaId]);
  return null;
}
