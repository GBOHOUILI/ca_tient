"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

// Mobile menu entries: new features get their link here.
const MENU_LINKS = [
  { href: "/commencer", label: "Tester mon idée" },
  { href: "/retrouver", label: "Retrouver mon analyse" },
  { href: "/#tarif", label: "Tarif" },
  { href: "/#faq", label: "Questions fréquentes" },
  { href: "/confidentialite", label: "Confidentialité" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const solid = scrolled || menuOpen;

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-200 ${
        solid ? "border-border bg-surface/60 backdrop-blur-md" : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" onClick={() => setMenuOpen(false)} className="text-h4 font-bold">
          <span className="bg-gradient-to-r from-accent-emerald to-accent-cyan bg-clip-text text-transparent">
            Ça tient ?
          </span>
        </Link>
        <nav aria-label="Navigation principale" className="hidden items-center gap-4 sm:flex">
          <Link href="/retrouver" className="text-small font-medium text-text-secondary hover:text-text-primary">
            Retrouver mon analyse
          </Link>
          <Link
            href="/commencer"
            className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-4 py-2 text-small font-semibold text-white"
          >
            Tester mon idée
          </Link>
          <ThemeToggle />
        </nav>
        <div className="flex items-center gap-2 sm:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="menu-mobile"
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-secondary hover:text-text-primary"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
              {menuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>
      {menuOpen ? (
        <nav id="menu-mobile" aria-label="Menu" className="border-t border-border bg-bg px-4 pb-4 sm:hidden">
          <ul className="flex flex-col">
            {MENU_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block border-b border-border py-4 text-body font-medium text-text-primary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
