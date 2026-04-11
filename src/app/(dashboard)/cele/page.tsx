"use client";

import { useState, useEffect, useCallback } from "react";
import { useClient } from "../layout";
import { useSession } from "next-auth/react";

interface KpiTarget {
  id: string;
  code: string;
  label: string;
  target: number;
  unit: string;
  period: string;
  lowerIsBetter: boolean;
  visible: boolean;
}

type Period = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY";

const PERIOD_LABELS: Record<Period, string> = {
  DAILY: "Dzienne",
  WEEKLY: "Tygodniowe",
  MONTHLY: "Miesięczne",
  QUARTERLY: "Kwartalne",
};

const PERIOD_DESC: Record<Period, string> = {
  DAILY: "Cele na jeden dzień pracy",
  WEEKLY: "Cele na tydzień (poniedziałek–piątek)",
  MONTHLY: "Cele miesięczne",
  QUARTERLY: "Cele kwartalne",
};

export default function CelePage() {
  const { selectedClientId } = useClient();
  const { data: session } = useSession();
  const [targets, setTargets] = useState<KpiTarget[]>([]);
  const [period, setPeriod] = useState<Period>("DAILY");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initing, setIniting] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});

  const showMsg = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3500);
  };

  const fetchTargets = useCallback(async () => {
    if (!selectedClientId) return;
    setLoading(true);
    try {
      const data = await fetch(`/api/kpi-targets?clientId=${selectedClientId}`).then(r => r.json());
      setTargets(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  }, [selectedClientId]);

  useEffect(() => { fetchTargets(); }, [fetchTargets]);

  const periodTargets = targets.filter(t => t.period === period);
  const hasChanges = periodTargets.some(t => edits[t.id] !== undefined && edits[t.id] !== t.target.toString());

  const handleEdit = (id: string, val: string) => {
    setEdits(prev => ({ ...prev, [id]: val }));
  };

  const saveTargets = async () => {
    const toUpdate = periodTargets
      .filter(t => edits[t.id] !== undefined && edits[t.id] !== t.target.toString())
      .map(t => ({ id: t.id, target: parseFloat(edits[t.id]) || 0 }));

    if (toUpdate.length === 0) { showMsg("Brak zmian do zapisania", false); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/kpi-targets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targets: toUpdate }),
      });
      if (!res.ok) throw new Error("Błąd zapisu");
      setEdits({});
      showMsg(`Zapisano ${toUpdate.length} cel${toUpdate.length === 1 ? "" : "e"}!`, true);
      fetchTargets();
    } catch (e: any) { showMsg(e.message, false); }
    setSaving(false);
  };

  const initTargets = async () => {
    if (!selectedClientId) return;
    setIniting(true);
    try {
      const res = await fetch("/api/kpi-targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: selectedClientId, defaults: true }),
      });
      if (!res.ok) throw new Error("Błąd inicjalizacji");
      const created = await res.json();
      showMsg(`Zainicjowano ${created.length} domyślnych celów!`, true);
      fetchTargets();
    } catch (e: any) { showMsg(e.message, false); }
    setIniting(false);
  };

  const isAdminOrLider = session?.user?.role === "ADMIN" || session?.user?.role === "LIDER";

  const cardStyle = {
    background: "var(--bg-card)",
    border: "1px solid var(--border-card)",
    borderRadius: "1rem",
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Cele</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Zarządzaj celami dziennymi, tygodniowymi, miesięcznymi i kwartalnymi
          </p>
        </div>
        <div className="flex items-center gap-3">
          {msg && (
            <div
              className="text-sm px-4 py-2 rounded-lg"
              style={{
                background: msg.ok ? "rgba(0,255,136,0.08)" : "rgba(255,85,85,0.08)",
                border: `1px solid ${msg.ok ? "var(--neon-border)" : "rgba(255,85,85,0.3)"}`,
                color: msg.ok ? "var(--neon)" : "var(--red)",
              }}
            >
              {msg.text}
            </div>
          )}
          {isAdminOrLider && targets.length === 0 && !loading && (
            <button
              onClick={initTargets}
              disabled={initing}
              className="text-sm font-semibold px-4 py-2 rounded-lg transition-all"
              style={{
                background: "var(--neon-dim)",
                border: "1px solid var(--neon-border)",
                color: "var(--neon)",
                opacity: initing ? 0.7 : 1,
              }}
            >
              {initing ? "Inicjowanie..." : "Inicjuj domyślne cele"}
            </button>
          )}
          {isAdminOrLider && targets.length > 0 && (
            <button
              onClick={initTargets}
              disabled={initing}
              className="text-sm px-3 py-2 rounded-lg transition-all"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-card)",
                color: "var(--text-muted)",
                opacity: initing ? 0.7 : 1,
              }}
              title="Dodaj brakujące domyślne cele"
            >
              {initing ? "..." : "+ Uzupełnij defaults"}
            </button>
          )}
        </div>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-card)" }}>
        {(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY"] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => { setPeriod(p); setEdits({}); }}
            className="flex-1 text-sm font-medium px-4 py-2 rounded-lg transition-all"
            style={
              period === p
                ? { background: "var(--neon-dim)", color: "var(--neon)", border: "1px solid var(--neon-border)" }
                : { color: "var(--text-muted)", border: "1px solid transparent" }
            }
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Period description */}
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{PERIOD_DESC[period]}</p>

      {/* Targets table */}
      <div style={cardStyle} className="overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            <div className="animate-pulse">Ładowanie celów...</div>
          </div>
        ) : periodTargets.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-4xl mb-3" style={{ opacity: 0.3 }}>◎</div>
            <div className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Brak celów dla tego okresu</div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              {isAdminOrLider
                ? 'Kliknij "Inicjuj domyślne cele" aby dodać standardowe cele'
                : "Administrator jeszcze nie skonfigurował celów dla tego okresu"}
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-card)" }}>
                <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                  KPI
                </th>
                <th className="text-center px-4 py-3.5 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                  Jednostka
                </th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                  Cel
                </th>
              </tr>
            </thead>
            <tbody>
              {periodTargets.map((t, i) => {
                const isEdited = edits[t.id] !== undefined && edits[t.id] !== t.target.toString();
                return (
                  <tr
                    key={t.id}
                    style={{
                      borderBottom: i < periodTargets.length - 1 ? "1px solid var(--border-card)" : "none",
                      background: isEdited ? "rgba(0,255,136,0.03)" : "transparent",
                    }}
                  >
                    <td className="px-5 py-3.5">
                      <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{t.label}</div>
                      <div className="text-xs mt-0.5 font-mono" style={{ color: "var(--text-muted)" }}>{t.code}</div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", border: "1px solid var(--border-card)" }}
                      >
                        {t.unit}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {isAdminOrLider ? (
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className="text-sm text-right px-3 py-1.5 rounded-lg w-28"
                          style={{
                            background: isEdited ? "rgba(0,255,136,0.06)" : "var(--bg-input)",
                            border: isEdited ? "1px solid var(--neon-border)" : "1px solid var(--border-card)",
                            color: isEdited ? "var(--neon)" : "var(--text-primary)",
                            outline: "none",
                          }}
                          value={edits[t.id] !== undefined ? edits[t.id] : t.target.toString()}
                          onChange={e => handleEdit(t.id, e.target.value)}
                        />
                      ) : (
                        <span className="text-sm font-bold" style={{ color: "var(--neon)" }}>
                          {t.target.toLocaleString("pl-PL")} {t.unit}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Save button */}
      {isAdminOrLider && periodTargets.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            {hasChanges ? (
              <span style={{ color: "var(--neon)" }}>Masz niezapisane zmiany</span>
            ) : (
              "Edytuj wartości bezpośrednio w tabeli, następnie zapisz"
            )}
          </div>
          <button
            onClick={saveTargets}
            disabled={saving || !hasChanges}
            className="text-sm font-semibold px-6 py-2.5 rounded-lg transition-all"
            style={{
              background: hasChanges ? "var(--neon)" : "var(--bg-elevated)",
              color: hasChanges ? "#000" : "var(--text-muted)",
              border: `1px solid ${hasChanges ? "transparent" : "var(--border-card)"}`,
              cursor: saving || !hasChanges ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Zapisywanie..." : "Zapisz cele"}
          </button>
        </div>
      )}
    </div>
  );
}
