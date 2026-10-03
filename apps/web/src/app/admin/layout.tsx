import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { RootDocument } from "@/components/layout/RootDocument";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Administration", template: `%s — ${SITE_NAME}` },
  robots: { index: false, follow: false },
};

// Root layout of its own: the admin stays in French, outside the [lang] segment.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RootDocument lang="fr">
      <AdminShell>{children}</AdminShell>
    </RootDocument>
  );
}
