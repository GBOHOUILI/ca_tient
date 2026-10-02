"use client";

import { useAdminData } from "@/components/admin/AdminContext";
import { DailyChart } from "@/components/admin/DailyChart";
import { Card, DataState, Kpi, PageTitle } from "@/components/admin/ui";
import { percent } from "@/components/admin/admin-labels";
import type { Overview } from "@/lib/api/admin";
import { formatAmount } from "@/lib/format";

export default function AdminOverviewPage() {
  const data = useAdminData<Overview>("/admin/overview");
  return (
    <div className="flex flex-col gap-6">
      <PageTitle>Vue d&apos;ensemble</PageTitle>
      <DataState data={data}>
        {({ kpis, daily }) => (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <Kpi label="Visites (sessions)" value={String(kpis.visits)} hint="Tous types et pays confondus" />
              <Kpi label="Idées testées" value={String(kpis.ideas)} />
              <Kpi label="Paiements confirmés" value={String(kpis.paidIdeas)} />
              <Kpi label="Chiffre d'affaires" value={formatAmount(kpis.revenue, "XOF")} />
              <Kpi label="Aperçu → paiement" value={percent(kpis.previewToPaidRate)} />
              <Kpi label="Idées qui tiennent" value={percent(kpis.holdsShare)} hint="Résultat mensuel positif selon le moteur" />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card title="Idées testées par jour">
                <DailyChart data={daily.map((day) => ({ date: day.date, value: day.ideas }))} label="Idées testées" />
              </Card>
              <Card title="Paiements confirmés par jour">
                <DailyChart data={daily.map((day) => ({ date: day.date, value: day.payments }))} label="Paiements confirmés" />
              </Card>
            </div>
          </>
        )}
      </DataState>
    </div>
  );
}
