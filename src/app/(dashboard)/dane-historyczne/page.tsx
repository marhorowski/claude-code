"use client";

import { useState, useEffect, useCallback } from "react";
import { useClient } from "../layout";
import { useSession } from "next-auth/react";
import { Toast } from "@/components/ui/Toast";
import { getMonthName } from "@/lib/utils";

interface HistoricalEntry {
  month: number;
  year: number;
  histRevenue: string;
  histLeads: string;
  histBooked: string;
  histAttended: string;
  histClosings: string;
  histAdSpend: string;
  histSur: string;
  histCp: string;
  targetRevenue: string;
  notes: string;
}

interface MonthlyRecord {
  month: number;
  year: number;
  histRevenue: number | null;
  histLeads: number | null;
  histBooked: number | null;
  histAttended: number | null;
  histClosings: number | null;
  histAdSpend: number | null;
  histSur: number | null;
  histCp: number | null;
  targetRevenue: number | null;
  notes: string | null;
}

const EMPTY: HistoricalEntry = {
  month: 0, year: 0,
  histRevenue: "", histLeads: "", histBooked: "", histAttended: "",
  histClosings: "", histAdSpend: "", histSur: "", histCp: "",
  targetRevenue: "", notes: "",
};

function toEntry(r: MonthlyRecord): HistoricalEntry {
  return {
    month: r.month, year: r.year,
    histRevenue: r.histRevenue != null ? String(r.histRevenue) : "",
    histLeads: r.histLeads != null ? String(r.histLeads) : "",
    histBooked: r.histBooked != null ? String(r.histBooked) : "",
    histAttended: r.histAttended != null ? String(r.histAttended) : "",
    histClosings: r.histClosings != null ? String(r.histClosings) : "",
    histAdSpend: r.histAdSpend != null ? String(r.histAdSpend) : "",
    histSur: r.histSur != null ? String(r.histSur) : "",
    histCp: r.histCp != null ? String(r.histCp) : "",
    targetRevenue: r.targetRevenue != null ? String(r.targetRevenue) : "",
    notes: r.notes ?? "",
  };
}

export default function DaneHistorycznePage() {
  const { selectedClientId } = useClient();
  const { data: session } = useSession();
  const isAdminOrLider = session?.user?.role === "ADMIN" || session?.user?.role === "LIDER";

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // default: prev month
  const [selectedYear, setSelectedYear] = useState(now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());
  const [form, setForm] = useState<HistoricalEntry>({ ...EMPTY });
  const [existingRecords, setExistingRecords] = useState<MonthlyRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Build month options — all past months up to 3 years
  const monthOptions: Array<{ month: number; year: number }> = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) {
    const maxM = y === now.getFullYear() ? now.getMonth() : 12; // exclude current month
    for (let m = maxM; m >= 1; m--) {
      monthOptions.push({ month: m, year: y });
    }
  }

  const fetchRecord = useCallback(async () => {
    if (!selectedClientId || !selectedMonth || !selectedYear) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/monthly?clientId=${selectedClientId}&month=${selectedMonth}&year=${selectedYear}`);
      const data = await res.json();
      const record: MonthlyRecord | null = Array.isArray(data) ? data[0] ?? null : null;
      setForm(record ? toEntry(record) : { ...EMPTY, month: selectedMonth, year: selectedYear });
    } catch {
      setForm({ ...EMPTY, month: selectedMonth, year: selectedYear });
    }
    setLoading(false);
  }, [selectedClientId, selectedMonth, selectedYear]);

  const fetchAllRecords = useCallback(async () => {
    if (!selectedClientId) return;
    try {
      const res = await fetch(`/api/monthly?clientId=${selectedClientId}`);
      const data = await res.json();
      setExistingRecords(Array.isArray(data) ? data.filter((r: MonthlyRecord) => r.histRevenue != null || r.histLeads != null) : []);
    } catch {
      setExistingRecords([]);
    }
  }, [selectedClientId]);

  useEffect(() => { fetchRecord(); }, [fetchRecord]);
  useEffect(() => { fetchAllRecords(); }, [fetchAllRecords]);

  async function handleSave() {
    if (!selectedClientId || !isAdminOrLider) return;
    setLoading(true);
    try {
      const body = {
        clientId: selectedClientId,
        month: selectedMonth,
        year: selectedYear,
        targetRevenue: form.targetRevenue !== "" ? parseFloat(form.targetRevenue) : null,
        histRevenue: form.histRevenue !== "" ? parseFloat(form.histRevenue) : null,
        histLeads: form.histLeads !== "" ? parseInt(form.histLeads) : null,
        histBooked: form.histBooked !== "" ? parseInt(form.histBooked) : null,
        histAttended: form.histAttended !== "" ? parseInt(form.histAttended) : null,
        histClosings: form.histClosings !== "" ? parseInt(form.histClosings) : null,
        histAdSpend: form.histAdSpend !== "" ? parseFloat(form.histAdSpend) : null,
        histSur: form.histSur !== "" ? parseFloat(form.histSur) : null,
        histCp: form.histCp !== "" ? parseFloat(form.histCp) : null,
        notes: form.notes || null,
      };
      const res = await fetch("/api/monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      setToast({ msg: "Dane historyczne zapisane ✓", type: "success" });
      fetchAllRecords();
    } catch {
      setToast({ msg: "Błąd zapisu", type: "error" });
    }
    setLoading(false);
  }

  const INP = "w-full rounded-xl px-3 py-2 text-sm";
  const INP_STYLE = { background: "var(--bg-input, var(--bg-card))", border: "1px solid var(--border-card)", color: "var(--text-primary)" };
  const LBL = "block text-xs mb-1";

  if (!isAdminOrLider) {
    return (
      <div className="flex items-center justify-center h-64">
        <p style={{ color: "var(--text-muted)" }}>Brak uprawnień do tej sekcji.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Dane historyczne</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Uzupełnij miesięczne wyniki za poprzednie okresy — dane posłużą do porównań i analizy progresu.
        </p>
      </div>

      {/* Month picker + form */}
      <div className="rounded-2xl p-6 space-y-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>Wybierz miesiąc</h2>
          <select
            value={`${selectedMonth}-${selectedYear}`}
            onChange={(e) => {
              const [m, y] = e.target.value.split("-").map(Number);
              setSelectedMonth(m);
              setSelectedYear(y);
            }}
            className="rounded-xl px-3 py-2 text-sm"
            style={INP_STYLE}
          >
            {monthOptions.map((o) => (
              <option key={`${o.month}-${o.year}`} value={`${o.month}-${o.year}`}>
                {getMonthName(o.month)} {o.year}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LBL} style={{ color: "var(--text-muted)" }}>Przychód (PLN)</label>
            <input type="number" min="0" step="100" className={INP} style={INP_STYLE}
              placeholder="np. 120000"
              value={form.histRevenue}
              onChange={e => setForm(f => ({ ...f, histRevenue: e.target.value }))} />
          </div>
          <div>
            <label className={LBL} style={{ color: "var(--text-muted)" }}>Cel przychodowy (PLN)</label>
            <input type="number" min="0" step="100" className={INP} style={INP_STYLE}
              placeholder="np. 150000"
              value={form.targetRevenue}
              onChange={e => setForm(f => ({ ...f, targetRevenue: e.target.value }))} />
          </div>
          <div>
            <label className={LBL} style={{ color: "var(--text-muted)" }}>Leady</label>
            <input type="number" min="0" step="1" className={INP} style={INP_STYLE}
              placeholder="np. 300"
              value={form.histLeads}
              onChange={e => setForm(f => ({ ...f, histLeads: e.target.value }))} />
          </div>
          <div>
            <label className={LBL} style={{ color: "var(--text-muted)" }}>Umówione spotkania</label>
            <input type="number" min="0" step="1" className={INP} style={INP_STYLE}
              placeholder="np. 45"
              value={form.histBooked}
              onChange={e => setForm(f => ({ ...f, histBooked: e.target.value }))} />
          </div>
          <div>
            <label className={LBL} style={{ color: "var(--text-muted)" }}>Odbyłe spotkania</label>
            <input type="number" min="0" step="1" className={INP} style={INP_STYLE}
              placeholder="np. 30"
              value={form.histAttended}
              onChange={e => setForm(f => ({ ...f, histAttended: e.target.value }))} />
          </div>
          <div>
            <label className={LBL} style={{ color: "var(--text-muted)" }}>Zamknięcia</label>
            <input type="number" min="0" step="1" className={INP} style={INP_STYLE}
              placeholder="np. 12"
              value={form.histClosings}
              onChange={e => setForm(f => ({ ...f, histClosings: e.target.value }))} />
          </div>
          <div>
            <label className={LBL} style={{ color: "var(--text-muted)" }}>Ad Spend (PLN)</label>
            <input type="number" min="0" step="100" className={INP} style={INP_STYLE}
              placeholder="np. 8000"
              value={form.histAdSpend}
              onChange={e => setForm(f => ({ ...f, histAdSpend: e.target.value }))} />
          </div>
          <div>
            <label className={LBL} style={{ color: "var(--text-muted)" }}>Show Up Rate (%)</label>
            <input type="number" min="0" max="100" step="0.1" className={INP} style={INP_STYLE}
              placeholder="np. 67"
              value={form.histSur}
              onChange={e => setForm(f => ({ ...f, histSur: e.target.value }))} />
          </div>
          <div>
            <label className={LBL} style={{ color: "var(--text-muted)" }}>Close Rate (%)</label>
            <input type="number" min="0" max="100" step="0.1" className={INP} style={INP_STYLE}
              placeholder="np. 40"
              value={form.histCp}
              onChange={e => setForm(f => ({ ...f, histCp: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <label className={LBL} style={{ color: "var(--text-muted)" }}>Notatki</label>
            <textarea rows={2} className={INP} style={INP_STYLE}
              placeholder="Opcjonalne uwagi o tym miesiącu..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={loading || !selectedMonth}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{ background: "var(--neon)", color: "#000" }}
        >
          {loading ? "Zapisywanie..." : `Zapisz — ${getMonthName(selectedMonth)} ${selectedYear}`}
        </button>
      </div>

      {/* Existing records table */}
      {existingRecords.length > 0 && (
        <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
          <h2 className="font-bold mb-4" style={{ color: "var(--text-primary)" }}>Wprowadzone dane historyczne</h2>
          <div className="overflow-x-auto">
            <table className="w-full kpi-table">
              <thead>
                <tr>
                  <th>Miesiąc</th>
                  <th>Przychód</th>
                  <th>Leady</th>
                  <th>Spotkania</th>
                  <th>Zamknięcia</th>
                  <th>SUR%</th>
                  <th>CP%</th>
                </tr>
              </thead>
              <tbody>
                {existingRecords.map((r) => (
                  <tr
                    key={`${r.year}-${r.month}`}
                    className="cursor-pointer hover:opacity-80"
                    onClick={() => { setSelectedMonth(r.month); setSelectedYear(r.year); }}
                  >
                    <td className="font-medium" style={{ color: "var(--text-secondary)" }}>
                      {getMonthName(r.month)} {r.year}
                    </td>
                    <td style={{ color: "var(--neon)" }}>
                      {r.histRevenue != null ? `${r.histRevenue.toLocaleString("pl-PL")} PLN` : "—"}
                    </td>
                    <td>{r.histLeads ?? "—"}</td>
                    <td>{r.histAttended ?? "—"}</td>
                    <td>{r.histClosings ?? "—"}</td>
                    <td>{r.histSur != null ? `${r.histSur}%` : "—"}</td>
                    <td>{r.histCp != null ? `${r.histCp}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>Kliknij wiersz, aby edytować.</p>
        </div>
      )}
    </div>
  );
}
