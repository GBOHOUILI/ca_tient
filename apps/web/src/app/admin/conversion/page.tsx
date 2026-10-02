"use client";

import { useAdminData } from "@/components/admin/AdminContext";
import { BarTable, Card, DataState, PageTitle } from "@/components/admin/ui";
import { label, percent } from "@/components/admin/admin-labels";
import type { Conversion, ConversionRow } from "@/lib/admin-api";

const STEP_LABELS: Record<string, string> = {
  landing_view: "Visites (sessions)",
  test_started: "Tests demarres (sessions)",
  preview: "Apercus generes",
  offer_viewed: "Offre vue",
  payment_initiated: "Paiements inities",
  payment_confirmed: "Paiements confirmes",
  what_if_used: "\"Et si ?\" utilise",
  report_viewed: "Rapports consultes",
};

function conversionRows(rows: ConversionRow[]) {
  return rows.map((row) => ({
    key: row.key,
    label: label(row.key),
    value: row.rate,
    display: percent(row.rate),
    extra: `${row.paid} / ${row.ideas}`,
  }));
}

export default function AdminConversionPage() {
  const data = useAdminData<Conversion>("/admin/conversion");
  return (
    <div className="flex flex-col gap-6">
      <PageTitle>Conversion</PageTitle>
      <DataState data={data}>
        {(conversion) => {
          const steps = conversion.funnel.steps;
          return (
            <>
              <Card title="Funnel (periode seulement)">
                <BarTable
                  valueLabel="Nombre"
                  extra="Passage"
                  rows={steps.map((step, index) => {
                    const previous = steps[index - 1]?.count;
                    return {
                      key: step.key,
                      label: STEP_LABELS[step.key] ?? step.key,
                      value: step.count,
                      extra: previous === undefined ? "" : previous === 0 ? "—" : percent(step.count / previous),
                    };
                  })}
                />
                <p className="text-micro text-text-secondary">
                  Rapports imprimes : {conversion.funnel.reportPrinted} · Analyses retrouvees par code : {conversion.funnel.recoveries}.
                  Les filtres type/pays ne s&apos;appliquent pas au funnel (les visites ne portent ni type ni pays).
                </p>
              </Card>
              <div className="grid gap-4 lg:grid-cols-2">
                <Card title="Taux de paiement par type de business">
                  <BarTable rows={conversionRows(conversion.byBusinessModel)} valueLabel="Taux" extra="Payes / idees" />
                </Card>
                <Card title="Par source declaree">
                  <BarTable rows={conversionRows(conversion.byHeardFrom)} valueLabel="Taux" extra="Payes / idees" />
                </Card>
                <Card title="Par campagne (utm_source)">
                  <BarTable rows={conversionRows(conversion.byUtmSource)} valueLabel="Taux" extra="Payes / idees" />
                </Card>
                <Card title="Par pays">
                  <BarTable rows={conversionRows(conversion.byCountry)} valueLabel="Taux" extra="Payes / idees" />
                </Card>
              </div>
            </>
          );
        }}
      </DataState>
    </div>
  );
}
