"use client";

import Link from "next/link";
import { useState } from "react";
import { useAdmin, useAdminData } from "@/components/admin/AdminContext";
import { Card, DataState, PageTitle } from "@/components/admin/ui";
import { label, shortDate } from "@/components/admin/admin-labels";
import { downloadContactsCsv, type IdeaList } from "@/lib/admin-api";

export default function AdminIdeasPage() {
  const { adminKey } = useAdmin();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [paid, setPaid] = useState("");
  const [exportError, setExportError] = useState<string | null>(null);
  const data = useAdminData<IdeaList>("/admin/ideas", { page, search, paid });

  async function exportContacts() {
    setExportError(null);
    try {
      await downloadContactsCsv(adminKey);
    } catch {
      setExportError("L'export a echoue.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle>Idees</PageTitle>
        <button
          type="button"
          onClick={() => void exportContacts()}
          className="rounded-lg border border-border px-4 py-2 text-small font-medium text-text-primary"
        >
          Exporter les contacts (CSV)
        </button>
      </div>
      {exportError ? <p className="text-small text-error">{exportError}</p> : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setSearch(searchInput.trim());
        }}
        className="flex flex-wrap gap-3"
      >
        <input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Rechercher dans les descriptions"
          maxLength={100}
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-small text-text-primary"
        />
        <select
          aria-label="Paiement"
          value={paid}
          onChange={(event) => {
            setPage(1);
            setPaid(event.target.value);
          }}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-small text-text-primary"
        >
          <option value="">Payees et non payees</option>
          <option value="true">Payees</option>
          <option value="false">Non payees</option>
        </select>
        <button type="submit" className="rounded-lg border border-border px-4 py-2 text-small font-medium">
          Rechercher
        </button>
      </form>

      <DataState data={data}>
        {(list) => (
          <Card title={`${list.total} idee${list.total > 1 ? "s" : ""}`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-small">
                <thead>
                  <tr className="text-left text-text-secondary">
                    <th className="py-2 font-medium">Date</th>
                    <th className="py-2 font-medium">Type</th>
                    <th className="py-2 font-medium">Pays</th>
                    <th className="py-2 font-medium">Description</th>
                    <th className="py-2 font-medium">Verdict</th>
                    <th className="py-2 font-medium">Paiement</th>
                    <th className="py-2 font-medium">Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((item) => (
                    <tr key={item.id} className="border-t border-border align-top">
                      <td className="whitespace-nowrap py-2 tabular-nums">{shortDate(item.createdAt)}</td>
                      <td className="py-2">{label(item.businessModel)}</td>
                      <td className="py-2">{label(item.country)}</td>
                      <td className="py-2">
                        <Link href={`/admin/idees/${item.id}`} className="text-text-primary underline underline-offset-4">
                          {item.excerpt || "(sans description)"}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap py-2">
                        {item.holds === null ? "—" : item.holds ? "Tient" : "Ne tient pas"}
                      </td>
                      <td className="py-2">{item.paid ? "Payee" : "—"}</td>
                      <td className="py-2">{item.hasContact ? "Oui" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between text-small">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="rounded-lg border border-border px-3 py-1 disabled:opacity-40"
              >
                Precedent
              </button>
              <span className="tabular-nums text-text-secondary">
                Page {list.page} / {Math.max(1, Math.ceil(list.total / list.pageSize))}
              </span>
              <button
                type="button"
                disabled={list.page * list.pageSize >= list.total}
                onClick={() => setPage(page + 1)}
                className="rounded-lg border border-border px-3 py-1 disabled:opacity-40"
              >
                Suivant
              </button>
            </div>
          </Card>
        )}
      </DataState>
    </div>
  );
}
