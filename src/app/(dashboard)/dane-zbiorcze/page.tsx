"use client";

import { useState, useEffect, useCallback } from "react";
import { useClient } from "../layout";
import { useSession } from "next-auth/react";

interface DailyRow {
  id: string;
  userId: string;
  date: string;
  plannedMeetings: number | null;
  attendedMeetings: number | null;
  closings: number | null;
  revenue: number | null;
  callsMade: number | null;
  meetingsBooked: number | null;
  vslMeetingsBooked: number | null;
  dailyLeads: number | null;
  dailyAdSpend: number | null;
  notes: string | null;
  user: { id: string; name: string; role: string };
}

interface EditState {
  plannedMeetings: string;
  attendedMeetings: string;
  closings: string;
  revenue: string;
  callsMade: string;
  meetingsBooked: string;
  vslMeetingsBooked: string;
  dailyLeads: string;
  dailyAdSpend: string;
  notes: string;
}

function n(v: number | null) {
  if (v === null) return "—";
  return v.toLocaleString("pl-PL");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function rowToEdit(row: DailyRow): EditState {
  return {
    plannedMeetings: row.plannedMeetings?.toString() ?? "",
    attendedMeetings: row.attendedMeetings?.toString() ?? "",
    closings: row.closings?.toString() ?? "",
    revenue: row.revenue?.toString() ?? "",
    callsMade: row.callsMade?.toString() ?? "",
    meetingsBooked: row.meetingsBooked?.toString() ?? "",
    vslMeetingsBooked: row.vslMeetingsBooked?.toString() ?? "",
    dailyLeads: row.dailyLeads?.toString() ?? "",
    dailyAdSpend: row.dailyAdSpend?.toString() ?? "",
    notes: row.notes ?? "",
  };
}

const ROLE_COLORS: Record<string, string> = {
  CLOSER: "#00ff88",
  SETTER: "#3b82f6",
  LIDER: "#a855f7",
  ADMIN: "#f59e0b",
};

export default function DaneZbiorcze() {
  const { selectedClientId } = useClient();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "LIDER";

  const [rows, setRows] = useState<DailyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  const showMsg = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3000);
  };

  const fetchData = useCallback(() => {
    if (!selectedClientId) return;
    setLoading(true);
    fetch(`/api/daily?clientId=${selectedClientId}`)
      .then((r) => r.json())
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedClientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function startEdit(row: DailyRow) {
    setEditingId(row.id);
    setEditState(rowToEdit(row));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditState(null);
  }

  async function saveEdit(row: DailyRow) {
    if (!editState) return;
    setSaving(true);
    const p = (v: string) => (v !== "" ? parseFloat(v) : null);
    try {
      const res = await fetch("/api/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          targetUserId: row.userId,
          date: row.date,
          plannedMeetings: p(editState.plannedMeetings),
          attendedMeetings: p(editState.attendedMeetings),
          closings: p(editState.closings),
          revenue: p(editState.revenue),
          callsMade: p(editState.callsMade),
          meetingsBooked: p(editState.meetingsBooked),
          vslMeetingsBooked: p(editState.vslMeetingsBooked),
          dailyLeads: p(editState.dailyLeads),
          dailyAdSpend: p(editState.dailyAdSpend),
          notes: editState.notes || null,
        }),
      });
      if (!res.ok) throw new Error();
      showMsg("Zapisano ✓", true);
      setEditingId(null);
      setEditState(null);
      fetchData();
    } catch {
      showMsg("Błąd zapisu", false);
    }
    setSaving(false);
  }

  function exportCSV() {
    const headers = [
      "Data", "Osoba", "Rola",
      "Plan. spotkania", "Odbyłe spotkania", "Zamknięcia", "Przychód",
      "Telefony", "Um. spotkania", "VSL", "Leady", "Ad Spend", "Notatki"
    ];
    const csvRows = filtered.map((r) => [
      formatDate(r.date),
      r.user.name,
      r.user.role,
      r.plannedMeetings ?? "",
      r.attendedMeetings ?? "",
      r.closings ?? "",
      r.revenue ?? "",
      r.callsMade ?? "",
      r.meetingsBooked ?? "",
      r.vslMeetingsBooked ?? "",
      r.dailyLeads ?? "",
      r.dailyAdSpend ?? "",
      `"${(r.notes ?? "").replace(/"/g, '""')}"`
    ].join(";"));
    const csv = [headers.join(";"), ...csvRows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dane_dzienne_${selectedClientId}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = rows.filter((r) => {
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo && r.date > dateTo + "T23:59:59") return false;
    if (roleFilter !== "ALL" && r.user.role !== roleFilter) return false;
    return true;
  });

  const INP_CELL = "w-full text-xs px-2 py-1 rounded-md outline-none";
  const inpStyle = { background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#e5e5e5" };

  return (
    <div className="space-y-5 fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Dane zbiorcze</h1>
        <div className="flex items-center gap-2">
          {msg && (
            <span
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={msg.ok
                ? { background: "rgba(0,255,136,0.1)", color: "#00ff88", border: "1px solid rgba(0,255,136,0.3)" }
                : { background: "rgba(255,68,68,0.1)", color: "#ff4444", border: "1px solid rgba(255,68,68,0.3)" }
              }
            >
              {msg.text}
            </span>
          )}
          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
            style={{ background: "#111", border: "1px solid #222", color: "#888" }}
          >
            ↓ Eksport CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div
        className="flex flex-wrap items-center gap-3 p-4 rounded-xl"
        style={{ background: "#0f0f0f", border: "1px solid #1a1a1a" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "#555" }}>Od</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="text-sm px-2 py-1.5 rounded-lg outline-none"
            style={{ background: "#111", border: "1px solid #222", color: "#e5e5e5" }}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "#555" }}>Do</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="text-sm px-2 py-1.5 rounded-lg outline-none"
            style={{ background: "#111", border: "1px solid #222", color: "#e5e5e5" }}
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="text-sm px-2 py-1.5 rounded-lg outline-none"
          style={{ background: "#111", border: "1px solid #222", color: "#e5e5e5" }}
        >
          <option value="ALL">Wszyscy</option>
          <option value="CLOSER">Closerzy</option>
          <option value="SETTER">Setterzy</option>
          <option value="LIDER">Liderzy</option>
        </select>
        {(dateFrom || dateTo || roleFilter !== "ALL") && (
          <button
            onClick={() => { setDateFrom(""); setDateTo(""); setRoleFilter("ALL"); }}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: "#555", background: "#111", border: "1px solid #1a1a1a" }}
          >
            Wyczyść filtry
          </button>
        )}
        <span className="ml-auto text-xs" style={{ color: "#444" }}>
          {filtered.length} {filtered.length === 1 ? "wiersz" : "wierszy"}
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16" style={{ color: "#444" }}>Ładowanie...</div>
      ) : filtered.length === 0 ? (
        <div
          className="text-center py-16 rounded-xl"
          style={{ background: "#0f0f0f", border: "1px solid #1a1a1a" }}
        >
          <div className="text-3xl mb-2">📊</div>
          <div className="text-sm" style={{ color: "#555" }}>Brak danych dla wybranych filtrów</div>
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid #1a1a1a" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "#0a0a0a", borderBottom: "1px solid #1a1a1a" }}>
                  <th className="px-3 py-2.5 text-left font-semibold" style={{ color: "#555" }}>Data</th>
                  <th className="px-3 py-2.5 text-left font-semibold" style={{ color: "#555" }}>Osoba</th>
                  <th className="px-3 py-2.5 text-center font-semibold" style={{ color: "#555" }}>Plan</th>
                  <th className="px-3 py-2.5 text-center font-semibold" style={{ color: "#555" }}>Odbyłe</th>
                  <th className="px-3 py-2.5 text-center font-semibold" style={{ color: "#555" }}>Zamk.</th>
                  <th className="px-3 py-2.5 text-center font-semibold" style={{ color: "#555" }}>Przychód</th>
                  <th className="px-3 py-2.5 text-center font-semibold" style={{ color: "#555" }}>Tel.</th>
                  <th className="px-3 py-2.5 text-center font-semibold" style={{ color: "#555" }}>Um. sp.</th>
                  <th className="px-3 py-2.5 text-center font-semibold" style={{ color: "#555" }}>VSL</th>
                  <th className="px-3 py-2.5 text-center font-semibold" style={{ color: "#555" }}>Leady</th>
                  <th className="px-3 py-2.5 text-center font-semibold" style={{ color: "#555" }}>Ad Spend</th>
                  {isAdmin && <th className="px-3 py-2.5 text-right font-semibold" style={{ color: "#555" }}>Akcja</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const isEditing = editingId === row.id;
                  const roleColor = ROLE_COLORS[row.user.role] || "#888";
                  return (
                    <tr
                      key={row.id}
                      style={{
                        borderBottom: "1px solid #111",
                        background: isEditing ? "#111" : "transparent",
                      }}
                    >
                      <td className="px-3 py-2 whitespace-nowrap" style={{ color: "#888" }}>
                        {formatDate(row.date)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ background: roleColor }}
                          />
                          <span className="font-medium text-white whitespace-nowrap">{row.user.name}</span>
                        </div>
                      </td>

                      {isEditing && editState ? (
                        <>
                          {(["plannedMeetings", "attendedMeetings", "closings", "revenue", "callsMade", "meetingsBooked", "vslMeetingsBooked", "dailyLeads", "dailyAdSpend"] as const).map((field) => (
                            <td key={field} className="px-2 py-1.5">
                              <input
                                type="number" min="0" step={field === "revenue" || field === "dailyAdSpend" ? "0.01" : "1"}
                                value={editState[field]}
                                onChange={(e) => setEditState((p) => p ? { ...p, [field]: e.target.value } : p)}
                                className={INP_CELL}
                                style={inpStyle}
                                placeholder="—"
                              />
                            </td>
                          ))}
                          {isAdmin && (
                            <td className="px-2 py-1.5 whitespace-nowrap text-right">
                              <button
                                onClick={() => saveEdit(row)}
                                disabled={saving}
                                className="text-xs px-2.5 py-1 rounded-lg mr-1 font-medium transition-colors"
                                style={{ background: "rgba(0,255,136,0.1)", color: "#00ff88", border: "1px solid rgba(0,255,136,0.3)" }}
                              >
                                {saving ? "..." : "Zapisz"}
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="text-xs px-2.5 py-1 rounded-lg transition-colors"
                                style={{ color: "#555", background: "#1a1a1a" }}
                              >
                                Anuluj
                              </button>
                            </td>
                          )}
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-2 text-center" style={{ color: "#888" }}>{n(row.plannedMeetings)}</td>
                          <td className="px-3 py-2 text-center" style={{ color: "#888" }}>{n(row.attendedMeetings)}</td>
                          <td className="px-3 py-2 text-center font-semibold" style={{ color: row.closings ? "#00ff88" : "#555" }}>{n(row.closings)}</td>
                          <td className="px-3 py-2 text-center font-semibold" style={{ color: row.revenue ? "#00ff88" : "#555" }}>
                            {row.revenue !== null ? `${row.revenue.toLocaleString("pl-PL")} PLN` : "—"}
                          </td>
                          <td className="px-3 py-2 text-center" style={{ color: "#888" }}>{n(row.callsMade)}</td>
                          <td className="px-3 py-2 text-center" style={{ color: "#888" }}>{n(row.meetingsBooked)}</td>
                          <td className="px-3 py-2 text-center" style={{ color: "#888" }}>{n(row.vslMeetingsBooked)}</td>
                          <td className="px-3 py-2 text-center" style={{ color: "#888" }}>{n(row.dailyLeads)}</td>
                          <td className="px-3 py-2 text-center" style={{ color: "#888" }}>
                            {row.dailyAdSpend !== null ? `${row.dailyAdSpend.toLocaleString("pl-PL")} PLN` : "—"}
                          </td>
                          {isAdmin && (
                            <td className="px-3 py-2 text-right">
                              <button
                                onClick={() => startEdit(row)}
                                className="text-xs px-2.5 py-1 rounded-lg transition-colors"
                                style={{ color: "#555", background: "#111", border: "1px solid #1a1a1a" }}
                              >
                                Edytuj
                              </button>
                            </td>
                          )}
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
