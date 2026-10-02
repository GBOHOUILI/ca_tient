"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-200 ${
        scrolled ? "border-border bg-surface/60 backdrop-blur-md" : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-h4 font-bold">
          <span className="bg-gradient-to-r from-accent-emerald to-accent-cyan bg-clip-text text-transparent">
            Ça tient ?
          </span>
        </Link>
        <nav aria-label="Navigation principale" className="flex items-center gap-3 sm:gap-4">
          <Link href="/retrouver" className="text-small font-medium text-text-secondary hover:text-text-primary">
            <span className="sm:hidden">Retrouver</span>
            <span className="hidden sm:inline">Retrouver mon analyse</span>
          </Link>
          <Link
            href="/commencer"
            className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-3 py-2 text-small font-semibold text-white sm:px-4"
          >
            Tester mon idée
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
