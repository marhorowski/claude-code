"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/AppContext";
import { PersonPicker, usePersonDefault } from "@/components/PersonPicker";
import { Card, fromFormValues, KpiCard, Notice, NumberField, PageTitle, toFormValues } from "@/components/ui";
import { WEEKLY_FIELDS, WEEKLY_KEYS } from "@/lib/fields";
import { isoDate, mondayOf, MONTHS_PL, weekLabel } from "@/lib/dates";
import { KPI_BY_CODE, KEY_KPI_ORDER } from "@/lib/kpis";
import { WEEKLY_KPI_CODES, type KpiResult } from "@/lib/report";
import { formatKpi } from "@/lib/format";

interface WeeklyReport {
  weeks: { weekStart: string; label: string; entries: number; values: Record<string, number | null> | null }[];
  mtd: KpiResult[];
  fromMonth: KpiResult[];
}

export default function WeekPage() {
  const { scope, scopeName } = useApp();
  const [monday, setMonday] = useState(() => mondayOf(new Date()));
  const [person, setPerson] = useState("");
  usePersonDefault(person, setPerson);

  const [form, setForm] = useState<Record<string, string>>(toFormValues(undefined, WEEKLY_KEYS));
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [reload, setReload] = useState(0);

  const week = isoDate(monday);
  const year = monday.getUTCFullYear();
  const month = monday.getUTCMonth() + 1;

  useEffect(() => {
    if (!person) return;
    setStatus(null);
    fetch(`/api/weekly?weekStart=${week}&userId=${person}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setForm(toFormValues(d?.values, WEEKLY_KEYS));
        setNotes(d?.notes ?? "");
      });
  }, [week, person]);

  useEffect(() => {
    fetch(`/api/report/weekly?year=${year}&month=${month}&scope=${scope}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setReport);
  }, [year, month, scope, reload]);

  function shift(days: number) {
    const d = new Date(monday);
    d.setUTCDate(d.getUTCDate() + days);
    setMonday(d);
  }

  async function save() {
    setSaving(true);
    setStatus(null);
    const res = await fetch("/api/weekly", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekStart: week, userId: person, values: fromFormValues(form), notes }),
    });
    setSaving(false);
    if (res.ok) {
      setStatus({ kind: "ok", text: "Zapisano tydzień." });
      setReload((n) => n + 1);
    } else {
      setStatus({ kind: "error", text: (await res.json().catch(() => ({}))).error ?? "Nie udało się zapisać." });
    }
  }

  const cards = report ? KEY_KPI_ORDER.map((c) => report.mtd.find((r) => r.code === c) ?? report.fromMonth.find((r) => r.code === c)).filter(Boolean) as KpiResult[] : [];

  return (
    <div className="space-y-6">
      <PageTitle title="Tydzień" subtitle="Krótki formularz pod 8 KPI kluczowych — raport tygodniowy dla zarządu">
        <button className="btn-ghost" onClick={() => shift(-7)}>‹</button>
        <span className="text-sm font-semibold px-2" style={{ color: "var(--neon)" }}>{weekLabel(monday)} {year}</span>
        <button className="btn-ghost" onClick={() => shift(7)}>›</button>
        <button className="btn-ghost" onClick={() => setMonday(mondayOf(new Date()))}>Bieżący</button>
      </PageTitle>

      <Card title={`Dane za tydzień ${weekLabel(monday)}`} description="Wpisuj za swój portfel. Stany (Health Score, CPL) — na dzień wypełnienia." right={<PersonPicker value={person} onChange={setPerson} />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {WEEKLY_FIELDS.map((f) => (
            <NumberField key={f.key} label={f.label} hint={f.hint} unit={f.unit} int={f.int} value={form[f.key] ?? ""} onChange={(v) => setForm({ ...form, [f.key]: v })} />
          ))}
        </div>
        <label className="block mt-4">
          <span className="lbl">Notatki (ryzyka, eskalacje, sukcesy)</span>
          <textarea className="input-dark" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <button className="btn-neon" onClick={save} disabled={saving || !person}>{saving ? "Zapisywanie…" : "Zapisz tydzień"}</button>
          {status && <Notice kind={status.kind}>{status.text}</Notice>}
        </div>
      </Card>

      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-label)" }}>
          KPI kluczowe · {MONTHS_PL[month - 1]} {year} narastająco · {scopeName}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {cards.map((r) => <KpiCard key={r.code} r={r} compact />)}
        </div>
      </section>

      {report && (
        <Card title="Tygodnie miesiąca">
          <div className="overflow-x-auto">
            <table className="kpi-table w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left">Tydzień</th>
                  {WEEKLY_KPI_CODES.map((c) => <th key={c} className="text-right">{KPI_BY_CODE[c].label}</th>)}
                </tr>
              </thead>
              <tbody>
                {report.weeks.map((w) => (
                  <tr key={w.weekStart}>
                    <td style={{ color: "var(--text-secondary)" }}>{w.label}{scope === "team" && w.entries > 0 ? ` · ${w.entries} os.` : ""}</td>
                    {WEEKLY_KPI_CODES.map((c) => (
                      <td key={c} className="text-right" style={{ color: w.values ? "var(--text-primary)" : "var(--text-muted)" }}>
                        {w.values ? formatKpi(w.values[c], KPI_BY_CODE[c].unit, KPI_BY_CODE[c].decimals) : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
