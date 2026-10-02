"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { AdminKeyRejectedError, StatsDisabledError } from "@/lib/analytics";
import { adminGet, filterParams, type AdminFilters } from "@/lib/admin-api";

export interface AdminContextValue {
  adminKey: string;
  filters: AdminFilters;
  setFilters: (filters: AdminFilters) => void;
  logout: (message?: string) => void;
}

export const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin(): AdminContextValue {
  const value = useContext(AdminContext);
  if (!value) throw new Error("useAdmin must be used inside AdminShell");
  return value;
}

export type AdminData<T> = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: T };

// Loads one admin endpoint with the shared filters; a rejected key sends the user back to the gate.
export function useAdminData<T>(path: string, extra: Record<string, string | number | undefined> = {}): AdminData<T> {
  const { adminKey, filters, logout } = useAdmin();
  const [state, setState] = useState<AdminData<T>>({ status: "loading" });
  const extraKey = JSON.stringify(extra);

  useEffect(() => {
    let cancelled = false;
    adminGet<T>(adminKey, path, { ...filterParams(filters), ...(JSON.parse(extraKey) as Record<string, string>) })
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof AdminKeyRejectedError) {
          logout("Cle incorrecte.");
        } else if (error instanceof StatsDisabledError) {
          setState({ status: "error", message: "Dashboard desactive : ADMIN_KEY n'est pas configuree sur l'API." });
        } else {
          setState({ status: "error", message: "Donnees indisponibles pour le moment." });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [adminKey, filters, path, extraKey, logout]);

  return state;
}
