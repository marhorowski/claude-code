"use client";

import { useState, useEffect, useCallback } from "react";
import { useClient } from "../layout";
import { useSession } from "next-auth/react";
import { getMonthName } from "@/lib/utils";

interface MonthlyFormData {
  month: number;
  year: number;
  targetRevenue: number | null;
}

interface SalesSettings {
  dealSize: number;
  leadToMeetingRate: number;
}

interface KpiTarget {
  code: string;
  target: number;
  period: string;
}

function getNextMonths(n: number): { month: number; year: number }[] {
  const result = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    let m = now.getMonth() + 1 + i;
    let y = now.getFullYear();
    if (m > 12) { m -= 12; y++; }
    result.push({ month: m, year: y });
  }
  return result;
}

interface Computed {
  closings: number | null;
  attended: number | null;
  planned: number | null;
  calls: number | null;
  weeklyRevenue: number;
  dailyRevenue: number;
  weeklyClosings: number | null;
  dailyClosings: number | null;
}

function computeTargets(revenue: number, dealSize: number, cp: number, sur: number, ltm: number): Computed | null {
  if (!revenue) return null;
  const closings = dealSize > 0 ? Math.ceil(revenue / dealSize) : null;
  const attended = closings && cp > 0 ? Math.ceil(closings / (cp / 100)) : null;
  const planned = attended && sur > 0 ? Math.ceil(attended / (sur / 100)) : null;
  const calls = planned && ltm > 0 ? Math.ceil(planned / (ltm / 100)) : null;
  const weeklyRevenue = revenue / 4.33;
  const dailyRevenue = revenue / 22;
  const weeklyClosings = closings ? Math.ceil(closings / 4.33) : null;
  const dailyClosings = closings ? Math.ceil(closings / 22) : null;
  return { closings, attended, planned, calls, weeklyRevenue, dailyRevenue, weeklyClosings, dailyClosings };
}

const formatPLN = (v: number) =>
  v.toLocaleString("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 });

export default function CelePage() {
  const { selectedClientId } = useClient();
  const { data: session } = useSession();

  const months = getNextMonths(3);
  const [monthForms, setMonthForms] = useState<Record<string, string>>({});
  const [savedForms, setSavedForms] = useState<MonthlyFormData[]>([]);
  const [settings, setSettings] = useState<SalesSettings>({ dealSize: 0, leadToMeetingRate: 0 });
  const [kpiTargets, setKpiTargets] = useState<KpiTarget[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const showMsg = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3500);
  };

  const fetchData = useCallback(async () => {
    if (!selectedClientId) return;
    setLoading(true);
    try {
      const [mf, ss, kt] = await Promise.all([
        fetch(`/api/monthly?clientId=${selectedClientId}`).then(r => r.json()),
        fetch(`/api/sales-settings?clientId=${selectedClientId}`).then(r => r.json()),
        fetch(`/api/kpi-targets?clientId=${selectedClientId}&period=WEEKLY`).then(r => r.json()),
      ]);
      setSavedForms(Array.isArray(mf) ? mf : []);
      if (ss && !ss.error) setSettings(ss);
      setKpiTargets(Array.isArray(kt) ? kt : []);
    } catch {}
    setLoading(false);
  }, [selectedClientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Initialize form values from saved data
  useEffect(() => {
    const init: Record<string, string> = {};
    for (const { month, year } of months) {
      const key = `${month}-${year}`;
      const saved = savedForms.find(f => f.month === month && f.year === year);
      if (saved?.targetRevenue != null) {
        init[key] = saved.targetRevenue.toString();
      }
    }
    setMonthForms(prev => {
      const merged: Record<string, string> = { ...init };
      for (const { month, year } of months) {
        const key = `${month}-${year}`;
        if (prev[key] !== undefined) merged[key] = prev[key];
      }
      return merged;
    });
  }, [savedForms]); // eslint-disable-line react-hooks/exhaustive-deps

  const cp = kpiTargets.find(t => t.code === "CP")?.target ?? 0;
  const sur = kpiTargets.find(t => t.code === "SUR")?.target ?? 0;

  const saveMonth = async (month: number, year: number) => {
    const key = `${month}-${year}`;
    const rev = parseFloat(monthForms[key]) || 0;
    setSaving(prev => ({ ...prev, [key]: true }));
    try {
      const res = await fetch("/api/monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: selectedClientId, month, year, targetRevenue: rev }),
      });
      if (!res.ok) throw new Error();
      showMsg(`Zapisano cel na ${getMonthName(month)} ${year}`, true);
      fetchData();
    } catch {
      showMsg("Błąd zapisu", false);
    }
    setSaving(prev => ({ ...prev, [key]: false }));
  };

  const isAdminOrLider = session?.user?.role === "ADMIN" || session?.user?.role === "LIDER";
  const hasSettings = settings.dealSize > 0;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-pulse text-sm" style={{ color: "var(--text-muted)" }}>Ładowanie...</div>
    </div>
  );

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Cele</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Ustaw cele przychodowe na kolejne 3 miesiące — reszta liczy się automatycznie
          </p>
        </div>
        {msg && (
          <div className="text-sm px-4 py-2 rounded-lg"
            style={{
              background: msg.ok ? "rgba(0,255,136,0.08)" : "rgba(255,85,85,0.08)",
              border: `1px solid ${msg.ok ? "var(--neon-border)" : "rgba(255,85,85,0.3)"}`,
              color: msg.ok ? "var(--neon)" : "var(--red)",
            }}>
            {msg.text}
          </div>
        )}
      </div>

      {/* Warning: no settings */}
      {!hasSettings && isAdminOrLider && (
        <div className="px-4 py-3 rounded-xl text-sm"
          style={{ background: "rgba(255,153,34,0.07)", border: "1px solid rgba(255,153,34,0.3)", color: "var(--orange)" }}>
          Aby obliczać cele, ustaw <strong>Deal Size</strong> w Ustawienia → Parametry sprzedaży.
        </div>
      )}

      {/* Parameters info bar */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 px-4 py-3 rounded-xl text-xs"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-card)" }}>
        <span style={{ color: "var(--text-muted)" }}>Parametry obliczeń:</span>
        <span style={{ color: "var(--text-secondary)" }}>
          Deal size:{" "}
          <strong style={{ color: hasSettings ? "var(--neon)" : "var(--text-muted)" }}>
            {hasSettings ? formatPLN(settings.dealSize) : "nie ustawiono"}
          </strong>
        </span>
        {cp > 0 && (
          <span style={{ color: "var(--text-secondary)" }}>
            Closing % target: <strong style={{ color: "var(--neon)" }}>{cp}%</strong>
          </span>
        )}
        {sur > 0 && (
          <span style={{ color: "var(--text-secondary)" }}>
            Show Up Rate target: <strong style={{ color: "var(--neon)" }}>{sur}%</strong>
          </span>
        )}
        {settings.leadToMeetingRate > 0 && (
          <span style={{ color: "var(--text-secondary)" }}>
            Lead→Meeting: <strong style={{ color: "var(--neon)" }}>{settings.leadToMeetingRate}%</strong>
          </span>
        )}
        {!cp && !sur && (
          <span style={{ color: "var(--text-muted)" }}>
            Ustaw cele CP i SUR w Ustawienia → Cele KPI
          </span>
        )}
      </div>

      {/* Monthly goal cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {months.map(({ month, year }) => {
          const key = `${month}-${year}`;
          const revenue = parseFloat(monthForms[key] ?? "") || 0;
          const computed = computeTargets(revenue, settings.dealSize, cp, sur, settings.leadToMeetingRate);
          const isSavingThis = saving[key];
          const savedRev = savedForms.find(f => f.month === month && f.year === year)?.targetRevenue ?? 0;
          const hasChanged = revenue !== savedRev;

          return (
            <div key={key}
              style={{
                background: "var(--bg-card)",
                border: `1px solid ${hasChanged && revenue > 0 ? "var(--neon-border)" : "var(--border-card)"}`,
                borderRadius: "1rem",
                overflow: "hidden",
                transition: "border-color 0.2s",
              }}>
              {/* Month header */}
              <div style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--border-card)", padding: "1rem 1.25rem" }}>
                <div className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                  {getMonthName(month)} {year}
                </div>
                {savedRev > 0 && (
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    Zapisany cel: {formatPLN(savedRev)}
                  </div>
                )}
              </div>

              <div style={{ padding: "1.25rem" }}>
                {/* Revenue input */}
                <div className="mb-4">
                  <label className="lbl">Cel przychodowy (PLN)</label>
                  {isAdminOrLider ? (
                    <input
                      type="number"
                      min="0"
                      placeholder="np. 100 000"
                      className="w-full text-sm px-3 py-2.5 rounded-lg"
                      style={{
                        background: "var(--bg-input)",
                        border: `1px solid ${hasChanged && revenue > 0 ? "var(--neon-border)" : "var(--border-card)"}`,
                        color: "var(--text-primary)",
                        outline: "none",
                      }}
                      value={monthForms[key] ?? ""}
                      onChange={e => setMonthForms(prev => ({ ...prev, [key]: e.target.value }))}
                    />
                  ) : (
                    <div className="text-2xl font-black" style={{ color: revenue > 0 ? "var(--neon)" : "var(--text-muted)" }}>
                      {revenue > 0 ? formatPLN(revenue) : "—"}
                    </div>
                  )}
                </div>

                {/* Computed targets */}
                {computed ? (
                  <div className="space-y-2 border-t pt-4" style={{ borderColor: "var(--border-card)" }}>
                    <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
                      Obliczone cele
                    </div>
                    {(
                      [
                        { label: "Przychód / tydzień", value: formatPLN(computed.weeklyRevenue) },
                        { label: "Przychód / dzień", value: formatPLN(computed.dailyRevenue) },
                        computed.closings !== null
                          ? { label: "Zamknięcia / mies.", value: `${computed.closings} szt.`, highlight: true }
                          : null,
                        computed.weeklyClosings !== null
                          ? { label: "Zamknięcia / tydz.", value: `${computed.weeklyClosings} szt.` }
                          : null,
                        computed.attended !== null
                          ? { label: "Odbyte spotkania / mies.", value: `${computed.attended} szt.` }
                          : null,
                        computed.planned !== null
                          ? { label: "Planowane spotkania / mies.", value: `${computed.planned} szt.` }
                          : null,
                        computed.calls !== null
                          ? { label: "Telefony / mies.", value: `${computed.calls} szt.` }
                          : null,
                      ] as Array<{ label: string; value: string; highlight?: boolean } | null>
                    )
                      .filter(Boolean)
                      .map(row => row && (
                        <div key={row.label} className="flex items-center justify-between">
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{row.label}</span>
                          <span
                            className="text-xs font-bold"
                            style={{ color: row.highlight ? "var(--neon)" : "var(--text-primary)" }}
                          >
                            {row.value}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-xs text-center py-6" style={{ color: "var(--text-muted)" }}>
                    Wpisz cel przychodowy aby zobaczyć obliczone wartości
                  </div>
                )}

                {/* Save button */}
                {isAdminOrLider && (
                  <button
                    onClick={() => saveMonth(month, year)}
                    disabled={isSavingThis || revenue === 0}
                    className="w-full mt-5 text-sm font-semibold py-2.5 rounded-lg transition-all"
                    style={{
                      background: hasChanged && revenue > 0 ? "var(--neon)" : "var(--bg-elevated)",
                      color: hasChanged && revenue > 0 ? "#000" : "var(--text-muted)",
                      border: `1px solid ${hasChanged && revenue > 0 ? "transparent" : "var(--border-card)"}`,
                      opacity: isSavingThis ? 0.7 : 1,
                      cursor: isSavingThis || revenue === 0 ? "not-allowed" : "pointer",
                    }}
                  >
                    {isSavingThis ? "Zapisywanie..." : hasChanged ? "Zapisz cel" : "Zapisano"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Calculation legend */}
      <div className="text-xs px-4 py-3 rounded-xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-card)", color: "var(--text-muted)", lineHeight: "1.7" }}>
        <strong style={{ color: "var(--text-secondary)" }}>Jak liczymy:</strong>{" "}
        Zamknięcia = Przychód ÷ Deal Size &nbsp;·&nbsp;
        Odbyte spotkania = Zamknięcia ÷ Closing % &nbsp;·&nbsp;
        Planowane spotkania = Odbyte ÷ Show Up Rate &nbsp;·&nbsp;
        Telefony = Planowane spotkania ÷ Lead→Meeting Rate &nbsp;·&nbsp;
        Dni robocze: 22/mies., tygodnie: 4,33/mies.
      </div>
    </div>
  );
}
