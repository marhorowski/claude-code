"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/AppContext";
import { KpiCard, MonthPicker, PageTitle } from "@/components/ui";
import { TrendChart } from "@/components/TrendChart";
import { AREAS, KEY_KPI_ORDER } from "@/lib/kpis";
import { MONTHS_PL } from "@/lib/dates";
import type { KpiResult } from "@/lib/report";
import { formatKpi } from "@/lib/format";

export default function DashboardPage() {
  const { scope, scopeName } = useApp();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [results, setResults] = useState<KpiResult[] | null>(null);
  const [previous, setPrevious] = useState<KpiResult[]>([]);

  useEffect(() => {
    setResults(null);
    fetch(`/api/report?period=month&year=${year}&month=${month}&scope=${scope}`)
      .then((r) => (r.ok ? r.json() : { results: [], previous: [] }))
      .then((d) => {
        setResults(d.results);
        setPrevious(d.previous ?? []);
      })
      .catch(() => setResults([]));
  }, [year, month, scope]);

  const by = Object.fromEntries((results ?? []).map((r) => [r.code, r]));
  const prev = Object.fromEntries(previous.map((r) => [r.code, r.value]));
  const flags = (results ?? []).filter((r) => r.status === "RED");
  const hasData = (results ?? []).some((r) => r.status !== "NONE");

  return (
    <div className="space-y-6">
      <PageTitle title="Dashboard CSM" subtitle={`${scopeName} · ${MONTHS_PL[month - 1]} ${year}`}>
        <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
      </PageTitle>

      {results === null ? (
        <div style={{ color: "var(--text-muted)" }}>Ładowanie…</div>
      ) : (
        <>
          {!hasData && (
            <div className="card p-5 text-sm" style={{ color: "var(--text-secondary)" }}>
              Brak danych za ten miesiąc. Uzupełnij <Link href="/miesiac" style={{ color: "var(--neon)" }}>formularz miesięczny</Link> albo{" "}
              <Link href="/tydzien" style={{ color: "var(--neon)" }}>tygodniowy</Link>.
            </div>
          )}

          <section>
            <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-label)" }}>KPI kluczowe · raport dla zarządu</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {KEY_KPI_ORDER.map((c) => by[c] && <KpiCard key={c} r={by[c]} previous={prev[c]} />)}
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2">
              <TrendChart year={year} month={month} scope={scope} target={(c) => by[c]?.target ?? 0} />
            </div>
            <section className="card p-5">
              <h2 className="font-bold text-sm mb-3" style={{ color: "var(--text-primary)" }}>Red flagi ({flags.length})</h2>
              {flags.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Brak KPI poniżej progu czerwonego.</p>
              ) : (
                <ul className="space-y-2">
                  {flags.map((r) => (
                    <li key={r.code} className="flex items-center justify-between gap-2 text-sm">
                      <span style={{ color: "var(--text-secondary)" }}>{r.label}</span>
                      <span style={{ color: "var(--red)", fontWeight: 700 }}>{formatKpi(r.value, r.unit, r.decimals)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {AREAS.map((area) => {
            const items = (results ?? []).filter((r) => r.area === area.id && !r.key);
            if (items.length === 0) return null;
            return (
              <section key={area.id}>
                <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-label)" }}>{area.title}</h2>
                <p className="text-xs mt-1 mb-3" style={{ color: "var(--text-muted)" }}>{area.description}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {items.map((r) => <KpiCard key={r.code} r={r} previous={prev[r.code]} compact />)}
                </div>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
