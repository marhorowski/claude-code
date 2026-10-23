"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/AppContext";
import { MonthPicker, PageTitle } from "@/components/ui";
import { KEY_KPI_ORDER, KPI_BY_CODE } from "@/lib/kpis";
import { MONTHS_PL } from "@/lib/dates";
import { statusColor } from "@/lib/grading";
import type { KpiResult } from "@/lib/report";
import { formatKpi } from "@/lib/format";

const COLUMNS = [...KEY_KPI_ORDER, "CLIENTS_PER_CSM", "CALL_COVERAGE", "OFFER_CONV"];

interface Row { user: { id: string; name: string; role: string; fte: number }; filled: boolean; results: KpiResult[] }

function Cell({ r }: { r?: KpiResult }) {
  return (
    <td className="text-right whitespace-nowrap" style={{ color: r ? statusColor(r.status) : "var(--text-muted)", fontWeight: 700 }}>
      {r ? formatKpi(r.value, r.unit, r.decimals) : "—"}
    </td>
  );
}

export default function TeamPage() {
  const { isLeader } = useApp();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<{ rows: Row[]; team: KpiResult[] } | null>(null);

  useEffect(() => {
    if (!isLeader) return;
    setData(null);
    fetch(`/api/team?year=${year}&month=${month}`).then((r) => (r.ok ? r.json() : null)).then(setData);
  }, [year, month, isLeader]);

  if (!isLeader) return <p style={{ color: "var(--text-muted)" }}>Ten widok jest dostępny dla lidera CSM.</p>;

  const pick = (list: KpiResult[], code: string) => list.find((r) => r.code === code);

  return (
    <div className="space-y-6">
      <PageTitle title="Zespół CSM" subtitle={`Porównanie portfeli · ${MONTHS_PL[month - 1]} ${year}`}>
        <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
      </PageTitle>

      {!data ? (
        <div style={{ color: "var(--text-muted)" }}>Ładowanie…</div>
      ) : (
        <section className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="kpi-table w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left">CSM</th>
                  <th className="text-right">Etat</th>
                  {COLUMNS.map((c) => <th key={c} className="text-right">{KPI_BY_CODE[c].label}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.user.id}>
                    <td>
                      <div style={{ color: "var(--text-primary)", fontWeight: 600 }}>{row.user.name}</div>
                      {!row.filled && <div className="text-xs" style={{ color: "var(--orange)" }}>brak formularza miesięcznego</div>}
                    </td>
                    <td className="text-right" style={{ color: "var(--text-secondary)" }}>{row.user.fte.toLocaleString("pl-PL")}</td>
                    {COLUMNS.map((c) => <Cell key={c} r={pick(row.results, c)} />)}
                  </tr>
                ))}
                <tr>
                  <td style={{ color: "var(--neon)", fontWeight: 800 }}>Cały zespół</td>
                  <td />
                  {COLUMNS.map((c) => <Cell key={c} r={pick(data.team, c)} />)}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Kolory wg progów gradingu. NPS per CSM liczy się z odpowiedzi na linki przypisane do danego CSM.
      </p>
    </div>
  );
}
