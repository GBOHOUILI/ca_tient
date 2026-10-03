import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Tester mon idée",
  description:
    "Décris ton idée, vérifie les chiffres proposés et découvre gratuitement si ton business peut être rentable.",
  alternates: { canonical: "/commencer" },
};

export default function CommencerLayout({ children }: { children: ReactNode }) {
  return children;
}
