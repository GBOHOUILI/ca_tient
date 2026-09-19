import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { themeInitScript } from "@/components/theme/theme-script";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ça tient ?",
  description: "Teste les chiffres de ton idée de business avant d'investir ton argent.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const isDark = cookieStore.get("theme")?.value !== "light";

  return (
    <html
      lang="fr"
      className={`${inter.variable} ${isDark ? "dark" : ""} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-bg text-text-primary font-sans">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
