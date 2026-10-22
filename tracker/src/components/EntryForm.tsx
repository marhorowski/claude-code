"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AREAS, getArea, type Area } from "@/lib/fields";
import { crossesMonth } from "@/lib/periods";
import type { ActionResult } from "@/app/actions";

export interface EntryFormInitial {
  area: Area;
  dateFrom: string;
  dateTo: string;
  values: Record<string, number>;
  notes: string | null;
}

interface Props {
  onSubmit: (form: Record<string, string>) => Promise<ActionResult>;
  initial?: EntryFormInitial;
  /** Edycja istniejącego wpisu: obszar zablokowany, po zapisie powrót. */
  lockArea?: boolean;
  defaultArea?: Area;
  afterSaveHref?: string;
}

function today() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toStrings(values?: Record<string, number>) {
  return Object.fromEntries(Object.entries(values ?? {}).map(([k, v]) => [k, String(v).replace(".", ",")]));
}

export function EntryForm({ onSubmit, initial, lockArea, defaultArea, afterSaveHref }: Props) {
  const router = useRouter();
  const [area, setArea] = useState<Area>(initial?.area ?? defaultArea ?? "marketing");
  const [dateFrom, setDateFrom] = useState(initial?.dateFrom ?? today());
  const [dateTo, setDateTo] = useState(initial?.dateTo ?? initial?.dateFrom ?? today());
  const [isRange, setIsRange] = useState(Boolean(initial && initial.dateFrom !== initial.dateTo));
  const [values, setValues] = useState<Record<string, string>>(toStrings(initial?.values));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  const def = getArea(area)!;
  const effectiveTo = isRange ? dateTo : dateFrom;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const form: Record<string, string> = { area, dateFrom, dateTo: effectiveTo, notes };
    for (const f of def.fields) form[f.key] = values[f.key] ?? "";
    startTransition(async () => {
      const res = await onSubmit(form);
      setResult(res);
      if (!res.ok) return;
      if (afterSaveHref) {
        router.push(afterSaveHref);
        router.refresh();
      } else {
        setValues({});
        setNotes("");
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {!lockArea && (
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-soft p-1">
          {AREAS.map((a) => (
            <button
              key={a.key}
              type="button"
              onClick={() => { setArea(a.key); setResult(null); }}
              className={`rounded-lg px-2 py-2 text-sm font-medium transition ${area === a.key ? "bg-card text-ink shadow-card" : "text-muted hover:text-ink"}`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}

      <fieldset className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="label">{isRange ? "Data od" : "Data"}</span>
            <input type="date" required value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input" />
          </label>
          {isRange && (
            <label className="block">
              <span className="label">Data do</span>
              <input type="date" required min={dateFrom} value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input" />
            </label>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input
            type="checkbox"
            checked={isRange}
            onChange={(e) => { setIsRange(e.target.checked); if (e.target.checked && dateTo < dateFrom) setDateTo(dateFrom); }}
            className="h-4 w-4 rounded border-line-strong"
          />
          Wpis zbiorczy za zakres dat
        </label>
        {isRange && crossesMonth(dateFrom, effectiveTo) && (
          <p className="rounded-lg bg-soft px-3 py-2 text-sm text-ink-2">
            Zakres obejmuje dwa miesiące. Cały wpis policzy się do miesiąca daty „do”. Dla dokładniejszych podsumowań wyślij dwa osobne wpisy, po jednym na miesiąc.
          </p>
        )}
      </fieldset>

      <fieldset className="space-y-4">
        {def.fields.map((f) => (
          <label key={f.key} className="block">
            <span className="label">
              {f.label} <span className="font-normal text-muted">({f.unit === "PLN" ? "zł" : "szt."})</span>
            </span>
            {f.hint && <span className="block text-xs text-muted">{f.hint}</span>}
            <input
              inputMode={f.unit === "PLN" ? "decimal" : "numeric"}
              required
              placeholder="0"
              value={values[f.key] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              className="input"
            />
          </label>
        ))}
        <label className="block">
          <span className="label">Uwagi <span className="font-normal text-muted">(opcjonalnie)</span></span>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="input" />
        </label>
      </fieldset>

      {result && (
        <div className={`rounded-lg px-3 py-2 text-sm ${result.ok ? "bg-up/10 text-up" : "bg-down/10 text-down"}`}>
          {result.ok ? result.message : <ul className="list-disc space-y-1 pl-4">{result.errors.map((e) => <li key={e}>{e}</li>)}</ul>}
        </div>
      )}

      <button type="submit" disabled={pending} className="w-full rounded-xl bg-accent px-4 py-3 font-medium text-on-accent hover:bg-accent/90 disabled:opacity-60">
        {pending ? "Zapisywanie…" : "Wyślij"}
      </button>
    </form>
  );
}
