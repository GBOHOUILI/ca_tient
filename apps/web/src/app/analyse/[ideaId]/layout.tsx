import type { Metadata } from "next";
import type { ReactNode } from "react";

// Analyses are private: reachable only with the idea's access token.
export const metadata: Metadata = {
  title: "Mon analyse",
  robots: { index: false, follow: false },
};

export default function AnalyseLayout({ children }: { children: ReactNode }) {
  return children;
}
