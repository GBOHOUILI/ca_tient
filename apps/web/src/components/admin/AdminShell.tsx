"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { COUNTRY_OPTIONS } from "@/components/wizard/profile-options";
import type { AdminFilters, AdminPeriod } from "@/lib/api/admin";
import { AdminContext } from "./AdminContext";
import { BUSINESS_MODEL_OPTIONS } from "@/lib/business-models";

const KEY_STORAGE = "ca-tient:admin-key";

const NAV = [
  { href: "/admin", label: "Vue d'ensemble" },
  { href: "/admin/marche", label: "Marché" },
  { href: "/admin/conversion", label: "Conversion" },
  { href: "/admin/revenus", label: "Revenus" },
  { href: "/admin/idees", label: "Idées" },
  { href: "/admin/avis", label: "Avis" },
];

const PERIODS: { value: AdminPeriod; label: string }[] = [
  { value: "7d", label: "7 jours" },
  { value: "30d", label: "30 jours" },
  { value: "90d", label: "90 jours" },
  { value: "all", label: "Depuis le début" },
];

const selectClass = "rounded-lg border border-border bg-surface px-3 py-2 text-small text-text-primary";

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [adminKey, setAdminKey] = useState("");
  const [ready, setReady] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [gateMessage, setGateMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState<AdminFilters>({ period: "30d", businessModel: "", country: "", locale: "" });

  // sessionStorage only exists in the browser: read after mount.
  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        setAdminKey(window.sessionStorage.getItem(KEY_STORAGE) ?? "");
      } catch {
        // storage blocked: the key is asked each time
      }
      setReady(true);
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  const logout = useCallback((message?: string) => {
    try {
      window.sessionStorage.removeItem(KEY_STORAGE);
    } catch {
      // nothing stored
    }
    setAdminKey("");
    setGateMessage(message ?? null);
  }, []);

  const context = useMemo(() => ({ adminKey, filters, setFilters, logout }), [adminKey, filters, logout]);

  function submitKey(event: FormEvent) {
    event.preventDefault();
    const key = keyInput.trim();
    try {
      window.sessionStorage.setItem(KEY_STORAGE, key);
    } catch {
      // kept in memory only
    }
    setGateMessage(null);
    setKeyInput("");
    setAdminKey(key);
  }

  if (!ready) return null;

  if (!adminKey) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-16">
        <h1 className="text-h2-mobile font-semibold md:text-h2">Administration</h1>
        <form onSubmit={submitKey} className="flex flex-col gap-3">
          <input
            type="password"
            value={keyInput}
            onChange={(event) => setKeyInput(event.target.value)}
            placeholder="Clé d'administration"
            autoComplete="off"
            className="rounded-lg border border-border bg-surface p-3 text-body text-text-primary focus:border-accent-emerald focus:outline-none"
          />
          {gateMessage ? <p className="text-small text-error">{gateMessage}</p> : null}
          <button
            type="submit"
            disabled={keyInput.trim().length === 0}
            className="rounded-lg bg-gradient-to-r from-accent-emerald to-accent-cyan px-6 py-3 text-body font-semibold text-white disabled:opacity-40"
          >
            Entrer
          </button>
        </form>
      </div>
    );
  }

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <AdminContext.Provider value={context}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:flex-row md:px-6">
        <nav aria-label="Sections du dashboard" className="md:w-52 md:shrink-0">
          <ul className="flex gap-2 overflow-x-auto md:flex-col">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block whitespace-nowrap rounded-lg px-3 py-2 text-small font-medium ${
                    isActive(item.href) ? "bg-surface text-text-primary" : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => logout()} className="mt-4 hidden px-3 text-small text-text-secondary md:block">
            Se déconnecter
          </button>
        </nav>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <select
              aria-label="Période"
              value={filters.period}
              onChange={(event) => setFilters({ ...filters, period: event.target.value as AdminPeriod })}
              className={selectClass}
            >
              {PERIODS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Type de business"
              value={filters.businessModel}
              onChange={(event) => setFilters({ ...filters, businessModel: event.target.value })}
              className={selectClass}
            >
              <option value="">Tous les types</option>
              {BUSINESS_MODEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Pays"
              value={filters.country}
              onChange={(event) => setFilters({ ...filters, country: event.target.value })}
              className={selectClass}
            >
              <option value="">Tous les pays</option>
              {COUNTRY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Langue"
              value={filters.locale}
              onChange={(event) => setFilters({ ...filters, locale: event.target.value })}
              className={selectClass}
            >
              <option value="">Toutes les langues</option>
              <option value="fr">Français</option>
              <option value="en">Anglais</option>
            </select>
            <button type="button" onClick={() => logout()} className="text-small text-text-secondary md:hidden">
              Se déconnecter
            </button>
          </div>
          {children}
        </div>
      </div>
    </AdminContext.Provider>
  );
}
