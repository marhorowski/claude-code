"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/AppContext";
import { PersonPicker, usePersonDefault } from "@/components/PersonPicker";
import { Card, fromFormValues, MonthPicker, Notice, NumberField, PageTitle, toFormValues } from "@/components/ui";
import { AGENCY_FIELDS, AGENCY_KEYS, MONTHLY_KEYS, MONTHLY_SECTIONS } from "@/lib/fields";
import { MONTHS_PL } from "@/lib/dates";
import { formatPLN } from "@/lib/format";

export default function MonthPage() {
  const { isLeader } = useApp();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [person, setPerson] = useState("");
  usePersonDefault(person, setPerson);

  const [form, setForm] = useState<Record<string, string>>(toFormValues(undefined, MONTHLY_KEYS));
  const [agency, setAgency] = useState<Record<string, string>>(toFormValues(undefined, AGENCY_KEYS));
  const [notes, setNotes] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [status, setStatus] = useState<{ kind: "ok" | "error" | "info"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!person) return;
    setStatus(null);
    fetch(`/api/monthly?year=${year}&month=${month}&userId=${person}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setForm(toFormValues(d?.values, MONTHLY_KEYS));
        setNotes(d?.notes ?? "");
        setUpdatedAt(d?.updatedAt ?? null);
      });
  }, [year, month, person]);

  useEffect(() => {
    if (!isLeader) return;
    fetch(`/api/agency?year=${year}&month=${month}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setAgency(toFormValues(d?.values, AGENCY_KEYS)));
  }, [year, month, isLeader]);

  async function fillFromWeeks() {
    const d = await fetch(`/api/monthly/from-weeks?year=${year}&month=${month}&userId=${person}`).then((r) => r.json());
    if (!d.weeks) return setStatus({ kind: "info", text: "Brak wpisów tygodniowych w tym miesiącu." });
    const next = { ...form };
    let filled = 0;
    for (const [k, v] of Object.entries(d.values as Record<string, number | null>)) {
      if (v !== null && next[k] === "") {
        next[k] = String(v).replace(".", ",");
        filled++;
      }
    }
    setForm(next);
    setStatus({ kind: "info", text: `Uzupełniono ${filled} pól z ${d.weeks} tyg. (tylko puste pola). Sprawdź i zapisz.` });
  }

  async function save() {
    setSaving(true);
    setStatus(null);
    const reqs = [
      fetch("/api/monthly", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month, userId: person, values: fromFormValues(form), notes }),
      }),
    ];
    if (isLeader) {
      reqs.push(fetch("/api/agency", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month, values: fromFormValues(agency) }),
      }));
    }
    const res = await Promise.all(reqs);
    setSaving(false);
    const failed = res.find((r) => !r.ok);
    if (failed) return setStatus({ kind: "error", text: (await failed.json().catch(() => ({}))).error ?? "Nie udało się zapisać." });
    const d = await res[0].json();
    setUpdatedAt(d.updatedAt);
    setStatus({ kind: "ok", text: "Zapisano formularz miesięczny." });
  }

  // Bilans MRR: początek + nowi + expansion − obniżki − churn powinien dać MRR na koniec
  const v = fromFormValues(form);
  const expectedEnd = v.mrrStart === null ? null : v.mrrStart + (v.newMrr ?? 0) + (v.expansionMrr ?? 0) - (v.downgradeMrr ?? 0) - (v.churnMrr ?? 0);
  const diff = expectedEnd !== null && v.mrrEnd !== null ? v.mrrEnd - expectedEnd : null;

  return (
    <div className="space-y-6">
      <PageTitle title="Formularz miesięczny" subtitle={`Pełny zestaw danych pod 36 KPI · ${MONTHS_PL[month - 1]} ${year}`}>
        <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
      </PageTitle>

      <div className="flex flex-wrap items-center gap-3">
        <PersonPicker value={person} onChange={setPerson} />
        <button className="btn-ghost" onClick={fillFromWeeks} disabled={!person}>Uzupełnij z tygodni</button>
        {updatedAt && <span className="text-xs" style={{ color: "var(--text-muted)" }}>Ostatni zapis: {new Date(updatedAt).toLocaleString("pl-PL")}</span>}
      </div>

      {MONTHLY_SECTIONS.map((s) => (
        <Card key={s.id} title={s.title} description={s.description}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {s.fields.map((f) => (
              <NumberField key={f.key} label={f.label} hint={f.hint} unit={f.unit} int={f.int} value={form[f.key] ?? ""} onChange={(val) => setForm({ ...form, [f.key]: val })} />
            ))}
          </div>
          {s.id === "baza" && diff !== null && Math.abs(diff) >= 1 && (
            <div className="mt-4">
              <Notice kind="info">
                Bilans MRR się nie zgadza: początek + nowi + expansion − obniżki − churn = {formatPLN(expectedEnd!)}, a MRR na koniec = {formatPLN(v.mrrEnd!)} (różnica {formatPLN(diff)}).
              </Notice>
            </div>
          )}
        </Card>
      ))}

      {isLeader && (
        <Card title="Dane agencji (lider)" description="Wspólne dla całej agencji — potrzebne do LTV:CAC i Referral Rate. CAC i marża przechodzą na kolejne miesiące, dopóki ich nie zmienisz.">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {AGENCY_FIELDS.map((f) => (
              <NumberField key={f.key} label={f.label} hint={f.hint} unit={f.unit} int={f.int} value={agency[f.key] ?? ""} onChange={(val) => setAgency({ ...agency, [f.key]: val })} />
            ))}
          </div>
        </Card>
      )}

      <Card title="Notatki">
        <textarea className="input-dark" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Co ruszyło KPI w tym miesiącu, ryzyka, plan na kolejny" />
      </Card>

      <div className="flex flex-wrap items-center gap-3 sticky bottom-4">
        <button className="btn-neon" onClick={save} disabled={saving || !person}>{saving ? "Zapisywanie…" : "Zapisz miesiąc"}</button>
        {status && <Notice kind={status.kind}>{status.text}</Notice>}
      </div>
    </div>
  );
}
