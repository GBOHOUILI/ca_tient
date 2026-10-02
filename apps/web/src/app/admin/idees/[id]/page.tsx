"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAdmin } from "@/components/admin/AdminContext";
import { Card, PageTitle } from "@/components/admin/ui";
import { EVENT_LABELS, PAYMENT_STATUS_LABELS, label, shortDate } from "@/components/admin/admin-labels";
import { CANVAS_LABELS } from "@/components/analyse/report-copy";
import { AdminKeyRejectedError, AdminNotFoundError, adminGet, type IdeaDetail } from "@/lib/api/admin";
import { formatAmount } from "@/lib/format";

function Row({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-t border-border py-2 first:border-t-0">
      <dt className="text-text-secondary">{name}</dt>
      <dd className="text-right tabular-nums">{children}</dd>
    </div>
  );
}

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; detail: IdeaDetail };

export default function AdminIdeaPage() {
  const { id } = useParams<{ id: string }>();
  const { adminKey, logout } = useAdmin();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    adminGet<IdeaDetail>(adminKey, `/admin/ideas/${encodeURIComponent(id)}`)
      .then((detail) => {
        if (!cancelled) setState({ status: "ready", detail });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof AdminKeyRejectedError) logout("Cle incorrecte.");
        else setState({ status: "error", message: error instanceof AdminNotFoundError ? "Idee introuvable." : "Donnees indisponibles." });
      });
    return () => {
      cancelled = true;
    };
  }, [adminKey, id, logout]);

  if (state.status === "loading") return <p className="text-body text-text-secondary">Chargement...</p>;
  if (state.status === "error") return <p className="text-body text-error">{state.message}</p>;

  const detail = state.detail;
  const money = (value: number) => formatAmount(value, detail.idea.currency);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/idees" className="text-small text-text-secondary">
        ← Toutes les idees
      </Link>
      <div>
        <PageTitle>{label(detail.idea.businessModel)}</PageTitle>
        <p className="mt-1 text-small text-text-secondary">
          Creee le {shortDate(detail.idea.createdAt)} · {detail.idea.paidAt ? `payee le ${shortDate(detail.idea.paidAt)}` : "non payee"}
          {detail.recoveries > 0 ? ` · retrouvee ${detail.recoveries} fois par code` : ""}
        </p>
      </div>
      <Card title="Description">
        <p className="whitespace-pre-wrap text-body">{detail.idea.rawDescription}</p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Hypotheses et resultats (par mois)">
          {detail.hypotheses ? (
            <dl className="text-small">
              <Row name="Prix de vente">{money(detail.hypotheses.price)}</Row>
              <Row name="Ventes">{detail.hypotheses.volume}</Row>
              <Row name="Cout par unite">{money(detail.hypotheses.variableCostPerUnit)}</Row>
              <Row name="Charges fixes">{money(detail.hypotheses.fixedCosts)}</Row>
              {detail.result ? (
                <>
                  <Row name="Chiffre d'affaires">{money(detail.result.revenue)}</Row>
                  <Row name="Marge brute">{money(detail.result.grossMargin)}</Row>
                  <Row name="Resultat estime">
                    <span className={detail.result.estimatedResult >= 0 ? "text-success" : "text-error"}>
                      {money(detail.result.estimatedResult)} · {detail.result.estimatedResult >= 0 ? "Tient" : "Ne tient pas"}
                    </span>
                  </Row>
                  <Row name="Seuil de rentabilite">
                    {detail.breakEven?.reachable ? `${detail.breakEven.volumeUnits} ventes` : "Inatteignable"}
                  </Row>
                </>
              ) : null}
            </dl>
          ) : (
            <p className="text-small text-text-secondary">Hypotheses incompletes.</p>
          )}
        </Card>

        <Card title="Profil et source">
          <dl className="text-small">
            <Row name="Pays">{label(detail.profile?.country)}</Row>
            <Row name="Ville">{detail.profile?.city || "Non renseigne"}</Row>
            <Row name="Profil">{label(detail.profile?.profile)}</Row>
            <Row name="Avancement">{label(detail.profile?.stage)}</Row>
            <Row name="Source declaree">{label(detail.profile?.heardFrom)}</Row>
            <Row name="Campagne">
              {[detail.acquisition.utmSource, detail.acquisition.utmMedium, detail.acquisition.utmCampaign].filter(Boolean).join(" / ") || "—"}
            </Row>
            <Row name="Site d'origine">{detail.acquisition.referrerHost ?? "—"}</Row>
            <Row name="Contact">
              {detail.profile?.contact ? (
                <span>
                  {detail.profile.contact}
                  {detail.profile.consentAt ? (
                    <span className="block text-micro text-text-secondary">consentement le {shortDate(detail.profile.consentAt)}</span>
                  ) : null}
                </span>
              ) : (
                "—"
              )}
            </Row>
          </dl>
        </Card>
      </div>

      {detail.capital ? (
        <Card title="Capital">
          <dl className="text-small">
            <Row name="Depenses de depart">{money(detail.capital.need.startupCosts)}</Row>
            <Row name="Reserve (3 mois)">{money(detail.capital.need.cashReserve)}</Row>
            <Row name="Capital necessaire">{money(detail.capital.need.capitalNeeded)}</Row>
            <Row name="Capital disponible">{money(detail.capital.plan.availableCapital)}</Row>
            <Row name="Besoin de financement">{money(detail.capital.need.financingGap)}</Row>
          </dl>
        </Card>
      ) : null}

      {Object.keys(detail.canvas).length > 0 ? (
        <Card title="Business model">
          <div className="grid gap-3 md:grid-cols-2">
            {Object.entries(detail.canvas).map(([key, text]) => (
              <div key={key} className="rounded-lg border border-border bg-bg p-3">
                <h3 className="text-small font-semibold text-text-secondary">
                  {CANVAS_LABELS[key as keyof typeof CANVAS_LABELS] ?? key}
                </h3>
                <p className="mt-1 text-small">{text}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Paiements">
          {detail.payments.length === 0 ? (
            <p className="text-small text-text-secondary">Aucun paiement.</p>
          ) : (
            <dl className="text-small">
              {detail.payments.map((payment, index) => (
                <Row key={index} name={`${shortDate(payment.createdAt)} · ${payment.provider}`}>
                  {formatAmount(payment.amount, payment.currency)} · {PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
                </Row>
              ))}
            </dl>
          )}
        </Card>
        <Card title="Parcours">
          {detail.events.length === 0 ? (
            <p className="text-small text-text-secondary">Aucun evenement rattache a cette idee.</p>
          ) : (
            <dl className="text-small">
              {detail.events.map((event, index) => (
                <Row key={index} name={EVENT_LABELS[event.type] ?? event.type}>
                  {new Date(event.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                </Row>
              ))}
            </dl>
          )}
        </Card>
      </div>
    </div>
  );
}
