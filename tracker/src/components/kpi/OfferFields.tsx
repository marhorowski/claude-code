"use client";

import { useState } from "react";
import { parseNumber } from "@/lib/entries";
import { COST_KINDS, maxCac, type CostKind, type Offer } from "@/lib/kpi";
import { formatValue } from "@/lib/format";

type Row = { id: number; name: string; kind: CostKind; value: string };
const text = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n).replace(".", ","));
const toNum = (s: string) => {
  const n = parseNumber(s);
  return Number.isNaN(n) ? 0 : n;
};

/** Pola ustawień oferty z listą innych kosztów i maksymalnym CAC liczonym na bieżąco. */
export function OfferFields({ offer, readOnly = false }: { offer: Offer | null; readOnly?: boolean }) {
  const [price, setPrice] = useState(text(offer?.price));
  const [closer, setCloser] = useState(text(offer?.closerPct));
  const [setter, setSetter] = useState(text(offer?.setterPct));
  const [rows, setRows] = useState<Row[]>((offer?.costs ?? []).map((c, i) => ({ id: i, name: c.name, kind: c.kind, value: text(c.value) })));
  const update = (id: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const limit = maxCac({
    price: price.trim() ? toNum(price) : null,
    closerPct: toNum(closer),
    setterPct: toNum(setter),
    costs: rows.map((r) => ({ name: r.name, kind: r.kind, value: toNum(r.value) })),
  });

  const numberInput = (name: string, label: string, value: string, set: (v: string) => void, suffix: string) => (
    <label className="block">
      <span className="label">{label}</span>
      <span className="relative mt-1 block">
        <input name={name} inputMode="decimal" value={value} onChange={(e) => set(e.target.value)} disabled={readOnly} className="input mt-0 pr-12 tnum" placeholder="0" />
        <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-[13px] text-muted">{suffix}</span>
      </span>
    </label>
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        {numberInput("price", "Cena oferty netto", price, setPrice, "zł")}
        {numberInput("closerPct", "Prowizja closera", closer, setCloser, "%")}
        {numberInput("setterPct", "Prowizja settera", setter, setSetter, "%")}
      </div>
      <p className="-mt-2 text-[12.5px] text-muted">Prowizje liczone od całego przychodu (pierwsze spotkania + follow-upy).</p>

      <div>
        <p className="label">Inne koszty</p>
        <p className="mb-2 text-[12.5px] text-muted">Np. platforma, księgowość, obsługa klienta. Koszty miesięczne dzielimy proporcjonalnie na dni okresu.</p>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_110px_150px_auto]">
              <input name="costName" value={r.name} onChange={(e) => update(r.id, { name: e.target.value })} disabled={readOnly} placeholder="Nazwa kosztu" aria-label="Nazwa kosztu" className="input mt-0 col-span-2 sm:col-span-1" />
              <input name="costValue" inputMode="decimal" value={r.value} onChange={(e) => update(r.id, { value: e.target.value })} disabled={readOnly} placeholder="0" aria-label="Wartość" className="input mt-0 tnum" />
              <select name="costKind" value={r.kind} onChange={(e) => update(r.id, { kind: e.target.value as CostKind })} disabled={readOnly} aria-label="Rodzaj kosztu" className="input mt-0">
                {COST_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
              </select>
              {!readOnly && (
                <button type="button" onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))} className="rounded-xl px-3 text-[13px] text-muted hover:bg-soft hover:text-down" aria-label={`Usuń koszt ${r.name}`}>
                  Usuń
                </button>
              )}
            </div>
          ))}
          {!rows.length && <p className="text-[13px] text-muted">Brak innych kosztów.</p>}
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => setRows((rs) => [...rs, { id: Math.max(0, ...rs.map((x) => x.id)) + 1, name: "", kind: "monthly", value: "" }])}
            className="mt-3 rounded-xl border border-line-strong px-4 py-2 text-[13px] font-semibold hover:bg-soft"
          >
            + Dodaj koszt
          </button>
        )}
      </div>

      <div className="rounded-xl bg-soft/70 px-4 py-3">
        <p className="text-[13px] text-ink-2">Maksymalny CAC (sprzedaż na zero)</p>
        <p className="tnum font-display text-[22px] font-extrabold text-brown">{formatValue(limit, "PLN")}</p>
        <p className="text-[12px] text-muted">Cena × (1 − prowizje − koszty %) − koszty na sprzedaż. Tyle maksymalnie może kosztować reklama na jednego klienta.</p>
      </div>
    </div>
  );
}
