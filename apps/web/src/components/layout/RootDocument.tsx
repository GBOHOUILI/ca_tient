import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { themeInitScript } from "@/components/theme/theme-script";
import "@/app/globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Shared <html> shell of the two root layouts (public pages per language, admin).
export async function RootDocument({ lang, children }: { lang: string; children: ReactNode }) {
  const cookieStore = await cookies();
  const isDark = cookieStore.get("theme")?.value !== "light";

  return (
    <html lang={lang} className={`${inter.variable} ${isDark ? "dark" : ""} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-bg text-text-primary font-sans">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {children}
      </body>
    </html>
  );
}
