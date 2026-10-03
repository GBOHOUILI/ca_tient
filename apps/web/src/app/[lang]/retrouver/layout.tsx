import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Retrouver mon analyse",
  robots: { index: false, follow: true },
};

export default function RetrouverLayout({ children }: { children: ReactNode }) {
  return children;
}
