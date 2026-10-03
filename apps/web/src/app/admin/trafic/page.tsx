"use client";

import { useSyncExternalStore } from "react";
import { useAdminData } from "@/components/admin/AdminContext";
import { DailyChart } from "@/components/admin/DailyChart";
import { HourChart } from "@/components/admin/HourChart";
import { BarTable, Card, DataState, Kpi, PageTitle } from "@/components/admin/ui";
import { percent, trafficLabel } from "@/components/admin/admin-labels";
import type { Count, Traffic } from "@/lib/api/admin";
import { NO_TRACK_KEY } from "@/lib/traffic";

function countRows(counts: Count[]) {
  return counts.map((count) => ({ key: count.key, label: trafficLabel(count.key), value: count.count }));
}

const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

function readExcluded(): boolean {
  try {
    return window.localStorage.getItem(NO_TRACK_KEY) === "1";
  } catch {
    return false;
  }
}

// Lets the owner keep their own tests out of the numbers, for this browser only.
function ExcludeMe() {
  const excluded = useSyncExternalStore(subscribe, readExcluded, () => false);
  function toggle() {
    try {
      if (excluded) window.localStorage.removeItem(NO_TRACK_KEY);
      else window.localStorage.setItem(NO_TRACK_KEY, "1");
      listeners.forEach((listener) => listener());
    } catch {
      // storage blocked: nothing to remember
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-3 text-small text-text-secondary">
      <span>{excluded ? "Tes visites depuis ce navigateur ne sont pas comptées." : "Tes visites depuis ce navigateur sont comptées."}</span>
      <button type="button" onClick={toggle} className="rounded-lg border border-border px-3 py-1.5 font-medium text-text-primary">
        {excluded ? "Recompter mes visites" : "Ne pas compter mes visites"}
      </button>
    </div>
  );
}

export default function AdminTrafficPage() {
  const data = useAdminData<Traffic>("/admin/traffic");
  return (
    <div className="flex flex-col gap-6">
      <PageTitle>Trafic</PageTitle>
      <ExcludeMe />
      <DataState data={data}>
        {(traffic) => (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              <Kpi label="Visiteurs uniques" value={String(traffic.kpis.visitors)} />
              <Kpi label="Visites" value={String(traffic.kpis.visits)} hint="Un onglet ouvert = une visite" />
              <Kpi label="Pages vues" value={String(traffic.kpis.pageViews)} />
              <Kpi label="Pages par visite" value={traffic.kpis.pagesPerVisit.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} />
              <Kpi
                label="Nouveaux visiteurs"
                value={String(traffic.kpis.newVisitors)}
                hint={traffic.kpis.visitors ? percent(traffic.kpis.newVisitors / traffic.kpis.visitors) : undefined}
              />
            </div>
            <Card title="Visiteurs par jour">
              <DailyChart data={traffic.daily.map((day) => ({ date: day.date, value: day.visitors }))} label="Visiteurs" />
            </Card>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card title="Pages vues par jour">
                <DailyChart data={traffic.daily.map((day) => ({ date: day.date, value: day.pageViews }))} label="Pages vues" />
              </Card>
              <Card title="Affluence par heure (heure du Bénin)">
                <HourChart data={traffic.hours} />
              </Card>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card title="Pages les plus vues">
                <BarTable
                  valueLabel="Vues"
                  extra="Visiteurs"
                  rows={traffic.pages.map((page) => ({
                    key: page.key,
                    label: page.key,
                    value: page.views,
                    extra: `${page.visitors} visiteur${page.visitors > 1 ? "s" : ""}`,
                  }))}
                />
              </Card>
              <Card title="Sources (visites)">
                <BarTable rows={countRows(traffic.sources)} valueLabel="Visites" />
              </Card>
              <Card title="Appareils (visites)">
                <BarTable rows={countRows(traffic.devices)} valueLabel="Visites" />
              </Card>
              <Card title="Langues (visites)">
                <BarTable rows={countRows(traffic.locales)} valueLabel="Visites" />
              </Card>
              <Card title="Pays estimé (visites)">
                <BarTable rows={countRows(traffic.countries)} valueLabel="Visites" />
                <p className="text-micro text-text-secondary">
                  Déduit du fuseau horaire du navigateur, sans adresse IP : approximatif (Bénin, Togo et Nigeria partagent
                  presque la même heure, mais pas le même nom de fuseau).
                </p>
              </Card>
            </div>
            <p className="text-micro text-text-secondary">
              Le filtre « type de business » ne s&apos;applique pas au trafic ; langue et pays oui. Ton admin n&apos;est jamais compté.
            </p>
          </>
        )}
      </DataState>
    </div>
  );
}
