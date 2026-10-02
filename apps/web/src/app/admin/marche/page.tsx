"use client";

import { useState } from "react";
import { useAdminData } from "@/components/admin/AdminContext";
import { BarTable, Card, DataState, PageTitle } from "@/components/admin/ui";
import { label, percent } from "@/components/admin/admin-labels";
import type { Count, Market } from "@/lib/api/admin";
import { SUPPORTED_CURRENCIES } from "financial-engine";
import { formatAmount } from "@/lib/format";

function rows(counts: Count[]) {
  return counts.map((count) => ({ key: count.key, label: label(count.key), value: count.count }));
}

export default function AdminMarketPage() {
  const [currency, setCurrency] = useState("XOF");
  const data = useAdminData<Market>("/admin/market", { currency });
  const amount = (value: number | null) => (value === null ? "—" : formatAmount(value, currency));

  return (
    <div className="flex flex-col gap-6">
      <PageTitle>Marché</PageTitle>
      <DataState data={data}>
        {(market) => (
          <>
            <p className="text-small text-text-secondary">{market.total} idées sur la période.</p>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card title="Types de business">
                <BarTable rows={rows(market.byBusinessModel)} valueLabel="Idées" />
              </Card>
              <Card title="Pays">
                <BarTable rows={rows(market.byCountry)} valueLabel="Idées" />
              </Card>
              <Card title="Profils">
                <BarTable rows={rows(market.byProfile)} valueLabel="Idées" />
              </Card>
              <Card title="Avancement du projet">
                <BarTable rows={rows(market.byStage)} valueLabel="Idées" />
              </Card>
            </div>
            <Card
              title="Chiffres types par type de business (médianes, par mois)"
              action={
                <select
                  aria-label="Devise des montants"
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                  className="rounded-lg border border-border bg-bg px-2 py-1 text-small"
                >
                  {SUPPORTED_CURRENCIES.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-small">
                  <thead>
                    <tr className="text-left text-text-secondary">
                      <th className="py-2 font-medium">Type</th>
                      <th className="py-2 text-right font-medium">Idées</th>
                      <th className="py-2 text-right font-medium">Prix</th>
                      <th className="py-2 text-right font-medium">Ventes</th>
                      <th className="py-2 text-right font-medium">Charges fixes</th>
                      <th className="py-2 text-right font-medium">Tiennent</th>
                      <th className="py-2 text-right font-medium">Capital nécessaire</th>
                      <th className="py-2 text-right font-medium">Besoin de financement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {market.perBusinessModel.map((row) => (
                      <tr key={row.key} className="border-t border-border tabular-nums">
                        <td className="py-2">{label(row.key)}</td>
                        <td className="py-2 text-right">{row.count}</td>
                        <td className="py-2 text-right">{amount(row.medianPrice)}</td>
                        <td className="py-2 text-right">{row.medianVolume ?? "—"}</td>
                        <td className="py-2 text-right">{amount(row.medianFixedCosts)}</td>
                        <td className="py-2 text-right">{percent(row.holdsShare)}</td>
                        <td className="py-2 text-right">{amount(row.medianCapitalNeeded)}</td>
                        <td className="py-2 text-right">
                          {amount(row.medianFinancingGap)} <span className="text-text-secondary">({row.withCapital})</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-micro text-text-secondary">
                Montants calculés uniquement sur les idées en {currency} ({market.currencies.map((c) => `${c.key} : ${c.count}`).join(", ") || "aucune"}).
                Entre parenthèses : nombre d&apos;idées ayant saisi leur capital. « Tiennent » porte sur toutes les devises.
              </p>
            </Card>
          </>
        )}
      </DataState>
    </div>
  );
}
