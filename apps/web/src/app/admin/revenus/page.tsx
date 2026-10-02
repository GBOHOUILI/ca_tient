"use client";

import { useAdminData } from "@/components/admin/AdminContext";
import { DailyChart } from "@/components/admin/DailyChart";
import { BarTable, Card, DataState, Kpi, PageTitle } from "@/components/admin/ui";
import type { Revenue } from "@/lib/admin-api";
import { formatAmount } from "@/lib/format";

const xof = (value: number) => formatAmount(value, "XOF");

export default function AdminRevenuePage() {
  const data = useAdminData<Revenue>("/admin/revenue");
  return (
    <div className="flex flex-col gap-6">
      <PageTitle>Revenus</PageTitle>
      <DataState data={data}>
        {(revenue) => (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <Kpi label="Chiffre d'affaires" value={xof(revenue.total)} />
              <Kpi label="Approuves" value={String(revenue.approved)} />
              <Kpi label="Refuses" value={String(revenue.declined)} />
              <Kpi label="Annules" value={String(revenue.canceled)} />
              <Kpi label="En attente" value={String(revenue.pending)} />
            </div>
            <Card title="Chiffre d'affaires par jour">
              <DailyChart data={revenue.daily.map((day) => ({ date: day.date, value: day.revenue }))} label="Chiffre d'affaires" format={xof} />
            </Card>
            <Card title="Chiffre d'affaires par semaine (du lundi)">
              <BarTable
                valueLabel="Chiffre d'affaires"
                rows={revenue.weekly.map((week) => ({
                  key: week.weekStart,
                  label: new Date(`${week.weekStart}T00:00:00Z`).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", timeZone: "UTC" }),
                  value: week.revenue,
                  display: xof(week.revenue),
                }))}
              />
            </Card>
          </>
        )}
      </DataState>
    </div>
  );
}
