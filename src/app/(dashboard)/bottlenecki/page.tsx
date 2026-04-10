"use client";

import { useState, useEffect, useCallback } from "react";
import { useClient } from "../layout";
import { useSession } from "next-auth/react";
import { Toast } from "@/components/ui/Toast";

interface Bottleneck {
  id: string;
  kpiCode: string;
  title: string;
  description: string;
  actions: string;
  status: "ACTIVE" | "IN_PROGRESS" | "RESOLVED";
  isAuto: boolean;
  createdAt: string;
  resolvedAt: string | null;
}

const STATUS_LABELS = {
  ACTIVE: "Aktywny",
  IN_PROGRESS: "W toku",
  RESOLVED: "Naprawiony",
};

const STATUS_COLORS = {
  ACTIVE: "bg-red-500/20 text-red-400 border-red-500/30",
  IN_PROGRESS: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  RESOLVED: "bg-green-500/20 text-green-400 border-green-500/30",
};

export default function BottleneckiPage() {
  const { selectedClientId } = useClient();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("ACTIVE");

  // Add form state
  const [newKpiCode, setNewKpiCode] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newActions, setNewActions] = useState(["", "", ""]);

  const fetchData = useCallback(() => {
    if (!selectedClientId) return;
    setLoading(true);
    const params = filterStatus !== "ALL" ? `&status=${filterStatus}` : "";
    fetch(`/api/bottlenecks?clientId=${selectedClientId}${params}`)
      .then((r) => r.json())
      .then((data: Bottleneck[]) => setBottlenecks(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedClientId, filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function updateStatus(id: string, status: string) {
    try {
      const res = await fetch("/api/bottlenecks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error();
      setToast({ msg: "Status zaktualizowany ✓", type: "success" });
      fetchData();
    } catch {
      setToast({ msg: "Błąd aktualizacji", type: "error" });
    }
  }

  async function addBottleneck() {
    if (!newKpiCode || !newTitle || !newDescription) {
      setToast({ msg: "Wypełnij wszystkie wymagane pola", type: "error" });
      return;
    }
    const filledActions = newActions.filter((a) => a.trim());
    if (filledActions.length === 0) {
      setToast({ msg: "Dodaj przynajmniej jedną akcję", type: "error" });
      return;
    }

    try {
      const res = await fetch("/api/bottlenecks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          kpiCode: newKpiCode,
          title: newTitle,
          description: newDescription,
          actions: filledActions,
        }),
      });
      if (!res.ok) throw new Error();
      setToast({ msg: "Bottleneck dodany ✓", type: "success" });
      setShowAddForm(false);
      setNewKpiCode("");
      setNewTitle("");
      setNewDescription("");
      setNewActions(["", "", ""]);
      fetchData();
    } catch {
      setToast({ msg: "Błąd zapisu", type: "error" });
    }
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const kpiCodeIcon: Record<string, string> = {
    SUR: "📉",
    CP: "💼",
    ENGE: "📸",
    ROAS: "💰",
    CAC: "💸",
    LTS: "🎯",
    CPL: "📊",
  };

  return (
    <div className="space-y-6 fade-in">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-white flex-1">🚨 Bottlenecki</h1>

        <div className="flex gap-1 bg-[#0F172A] rounded-xl p-1 border border-[#334155]">
          {(["ACTIVE", "IN_PROGRESS", "RESOLVED", "ALL"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === s ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {s === "ALL" ? "Wszystkie" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/30 text-sm font-medium rounded-xl px-4 py-2 transition-colors"
          >
            + Dodaj bottleneck
          </button>
        )}
      </div>

      {/* Add form */}
      {isAdmin && showAddForm && (
        <div className="bg-[#1E293B] border border-indigo-500/30 rounded-2xl p-6">
          <h2 className="font-bold text-white mb-5">Dodaj bottleneck</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Kod KPI *</label>
              <input
                value={newKpiCode}
                onChange={(e) => setNewKpiCode(e.target.value.toUpperCase())}
                placeholder="np. SUR, CP, ENGE"
                className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Tytuł *</label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Krótki opis problemu"
                className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-2 text-white text-sm"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs text-slate-400 mb-1">Opis problemu *</label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={3}
              className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-2 text-white text-sm resize-none"
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs text-slate-400 mb-1">Akcje naprawcze (do 3)</label>
            <div className="space-y-2">
              {newActions.map((action, i) => (
                <input
                  key={i}
                  value={action}
                  onChange={(e) => {
                    const next = [...newActions];
                    next[i] = e.target.value;
                    setNewActions(next);
                  }}
                  placeholder={`Akcja ${i + 1}`}
                  className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-2 text-white text-sm"
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={addBottleneck}
              className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl px-5 py-2.5 text-sm"
            >
              Dodaj
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-white text-sm px-4 py-2.5"
            >
              Anuluj
            </button>
          </div>
        </div>
      )}

      {/* Bottleneck cards */}
      {loading ? (
        <div className="text-center text-slate-400 py-12">Ładowanie...</div>
      ) : bottlenecks.length === 0 ? (
        <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-12 text-center">
          <div className="text-4xl mb-3">✅</div>
          <div className="text-white font-medium">Brak aktywnych bottlenecków</div>
          <div className="text-slate-400 text-sm mt-1">Wszystkie KPI są pod kontrolą!</div>
        </div>
      ) : (
        <div className="space-y-4">
          {bottlenecks.map((b) => {
            const isOpen = expanded.has(b.id);
            let actions: string[] = [];
            try {
              actions = JSON.parse(b.actions);
            } catch {}

            return (
              <div
                key={b.id}
                className={`bg-[#1E293B] border rounded-2xl overflow-hidden transition-all ${
                  b.status === "ACTIVE"
                    ? "border-red-500/30"
                    : b.status === "IN_PROGRESS"
                    ? "border-orange-500/30"
                    : "border-green-500/30"
                }`}
              >
                <div
                  className="flex items-start gap-4 p-5 cursor-pointer"
                  onClick={() => toggleExpand(b.id)}
                >
                  <span className="text-2xl mt-0.5">
                    {kpiCodeIcon[b.kpiCode] || "⚠️"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-400 uppercase">{b.kpiCode}</span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-lg border ${STATUS_COLORS[b.status]}`}
                      >
                        {STATUS_LABELS[b.status]}
                      </span>
                      {b.isAuto && (
                        <span className="text-xs text-slate-500">auto</span>
                      )}
                    </div>
                    <div className="text-white font-semibold">{b.title}</div>
                  </div>
                  <svg
                    className={`w-5 h-5 text-slate-400 mt-0.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {isOpen && (
                  <div className="px-5 pb-5 border-t border-[#334155]">
                    <p className="text-slate-300 text-sm mt-4 mb-4 leading-relaxed">
                      {b.description}
                    </p>

                    {actions.length > 0 && (
                      <div className="mb-4">
                        <div className="text-xs text-slate-400 font-semibold uppercase mb-2">
                          Akcje naprawcze:
                        </div>
                        <ol className="space-y-2">
                          {actions.map((action, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <span className="w-5 h-5 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                                {i + 1}
                              </span>
                              <span className="text-slate-300">{action}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Status buttons */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      {b.status !== "IN_PROGRESS" && b.status !== "RESOLVED" && (
                        <button
                          onClick={() => updateStatus(b.id, "IN_PROGRESS")}
                          className="bg-orange-500/20 border border-orange-500/40 text-orange-400 hover:bg-orange-500/30 text-xs font-semibold rounded-xl px-3 py-1.5 transition-colors"
                        >
                          Oznacz jako W TOKU
                        </button>
                      )}
                      {b.status !== "RESOLVED" && (
                        <button
                          onClick={() => updateStatus(b.id, "RESOLVED")}
                          className="bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30 text-xs font-semibold rounded-xl px-3 py-1.5 transition-colors"
                        >
                          Oznacz jako Naprawiony ✓
                        </button>
                      )}
                      {b.status === "RESOLVED" && (
                        <button
                          onClick={() => updateStatus(b.id, "ACTIVE")}
                          className="bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 text-xs font-semibold rounded-xl px-3 py-1.5 transition-colors"
                        >
                          Wróć do aktywnych
                        </button>
                      )}
                    </div>

                    <div className="mt-3 text-xs text-slate-500">
                      Dodany: {new Date(b.createdAt).toLocaleDateString("pl-PL")}
                      {b.resolvedAt && ` · Naprawiony: ${new Date(b.resolvedAt).toLocaleDateString("pl-PL")}`}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
