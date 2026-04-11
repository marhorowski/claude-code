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

interface AiSuggestion {
  kpiCode: string;
  title: string;
  description: string;
  actions: string[];
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
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);

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

  async function generateAiSuggestions() {
    if (!selectedClientId) return;
    setAiLoading(true);
    setShowAiPanel(true);
    try {
      const res = await fetch("/api/ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: selectedClientId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Błąd AI");
      setAiSuggestions(data.suggestions || []);
    } catch (err: any) {
      setToast({ msg: err.message || "Błąd generowania propozycji AI", type: "error" });
      setShowAiPanel(false);
    }
    setAiLoading(false);
  }

  async function saveAiSuggestion(s: AiSuggestion) {
    try {
      const res = await fetch("/api/bottlenecks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          kpiCode: s.kpiCode,
          title: s.title,
          description: s.description,
          actions: s.actions,
        }),
      });
      if (!res.ok) throw new Error();
      setToast({ msg: "Bottleneck zapisany ✓", type: "success" });
      setAiSuggestions(prev => prev.filter(x => x.title !== s.title));
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
        <h1 className="text-2xl font-bold flex-1" style={{ color: "var(--text-primary)" }}>🚨 Bottlenecki</h1>

        <div className="flex gap-1 rounded-xl p-1" style={{ background: "var(--bg-input)", border: "1px solid var(--border-card)" }}>
          {(["ACTIVE", "IN_PROGRESS", "RESOLVED", "ALL"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === s ? "" : "hover:text-white"
              }`}
              style={filterStatus === s
                ? { background: "var(--neon)", color: "#000" }
                : { color: "var(--text-muted)" }
              }
            >
              {s === "ALL" ? "Wszystkie" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={generateAiSuggestions}
              disabled={aiLoading}
              className="text-sm font-medium rounded-xl px-4 py-2 transition-colors flex items-center gap-2 disabled:opacity-50"
              style={{ background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.3)", color: "#00ff88" }}
            >
              {aiLoading ? (
                <span className="animate-pulse">Analizuję...</span>
              ) : (
                <>✦ Generuj z AI</>
              )}
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-[#111] border border-[#222] text-[#888] hover:text-white text-sm font-medium rounded-xl px-4 py-2 transition-colors"
            >
              + Dodaj ręcznie
            </button>
          </div>
        )}
      </div>

      {/* AI Suggestions Panel */}
      {showAiPanel && (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(0,255,136,0.25)", background: "#0a0a0a" }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(0,255,136,0.15)" }}>
            <div>
              <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>✦ Propozycje AI</span>
              <span className="ml-2 text-xs" style={{ color: "#555" }}>na podstawie danych z ostatnich 28 dni</span>
            </div>
            <button onClick={() => setShowAiPanel(false)} className="text-xs" style={{ color: "#444" }}>✕ Zamknij</button>
          </div>
          {aiLoading ? (
            <div className="p-10 text-center">
              <div className="text-2xl mb-2 animate-pulse">✦</div>
              <div className="text-sm" style={{ color: "#555" }}>Analizuję dane KPI...</div>
            </div>
          ) : aiSuggestions.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-2xl mb-2">✅</div>
              <div className="text-sm font-medium" style={{ color: "#00ff88" }}>Wszystkie KPI wyglądają dobrze!</div>
              <div className="text-xs mt-1" style={{ color: "#444" }}>AI nie wykryło krytycznych problemów</div>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "#1a1a1a" }}>
              {aiSuggestions.map((s, i) => (
                <div key={i} className="p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ background: "rgba(0,255,136,0.1)", color: "#00ff88", border: "1px solid rgba(0,255,136,0.2)" }}>{s.kpiCode}</span>
                        <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{s.title}</span>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: "#777" }}>{s.description}</p>
                    </div>
                    <button
                      onClick={() => saveAiSuggestion(s)}
                      className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      style={{ background: "rgba(0,255,136,0.12)", color: "#00ff88", border: "1px solid rgba(0,255,136,0.3)" }}
                    >
                      + Zapisz
                    </button>
                  </div>
                  <div className="space-y-1">
                    {s.actions.map((action, j) => (
                      <div key={j} className="flex items-start gap-2 text-xs">
                        <span className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center mt-0.5 font-bold" style={{ background: "rgba(0,255,136,0.1)", color: "#00ff88", fontSize: "9px" }}>{j + 1}</span>
                        <span style={{ color: "#aaa" }}>{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add form */}
      {isAdmin && showAddForm && (
        <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
          <h2 className="font-bold mb-5" style={{ color: "var(--text-primary)" }}>Dodaj bottleneck</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Kod KPI *</label>
              <input
                value={newKpiCode}
                onChange={(e) => setNewKpiCode(e.target.value.toUpperCase())}
                placeholder="np. SUR, CP, ENGE"
                className="w-full rounded-xl px-3 py-2 text-sm"
                style={{ background: "var(--bg-input)", border: "1px solid var(--border-card)", color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Tytuł *</label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Krótki opis problemu"
                className="w-full rounded-xl px-3 py-2 text-sm"
                style={{ background: "var(--bg-input)", border: "1px solid var(--border-card)", color: "var(--text-primary)" }}
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Opis problemu *</label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl px-3 py-2 text-sm resize-none"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border-card)", color: "var(--text-primary)" }}
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Akcje naprawcze (do 3)</label>
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
                  className="w-full rounded-xl px-3 py-2 text-sm"
                  style={{ background: "var(--bg-input)", border: "1px solid var(--border-card)", color: "var(--text-primary)" }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={addBottleneck}
              className="font-semibold rounded-xl px-5 py-2.5 text-sm"
              style={{ background: "var(--neon)", color: "#000" }}
            >
              Dodaj
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-sm px-4 py-2.5"
              style={{ color: "var(--text-muted)" }}
            >
              Anuluj
            </button>
          </div>
        </div>
      )}

      {/* Bottleneck cards */}
      {loading ? (
        <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>Ładowanie...</div>
      ) : bottlenecks.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
          <div className="text-4xl mb-3">✅</div>
          <div className="font-medium" style={{ color: "var(--text-primary)" }}>Brak aktywnych bottlenecków</div>
          <div className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Wszystkie KPI są pod kontrolą!</div>
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
                className={`rounded-2xl overflow-hidden transition-all ${
                  b.status === "ACTIVE"
                    ? "border-red-500/30"
                    : b.status === "IN_PROGRESS"
                    ? "border-orange-500/30"
                    : "border-green-500/30"
                }`}
                style={{
                  background: "var(--bg-card)",
                  border: b.status === "ACTIVE"
                    ? "1px solid rgba(239,68,68,0.3)"
                    : b.status === "IN_PROGRESS"
                    ? "1px solid rgba(249,115,22,0.3)"
                    : "1px solid rgba(34,197,94,0.3)",
                }}
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
                      <span className="text-xs font-bold uppercase" style={{ color: "var(--text-muted)" }}>{b.kpiCode}</span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-lg border ${STATUS_COLORS[b.status]}`}
                      >
                        {STATUS_LABELS[b.status]}
                      </span>
                      {b.isAuto && (
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>auto</span>
                      )}
                    </div>
                    <div className="font-semibold" style={{ color: "var(--text-primary)" }}>{b.title}</div>
                  </div>
                  <svg
                    className={`w-5 h-5 mt-0.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    style={{ color: "var(--text-muted)" }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {isOpen && (
                  <div className="px-5 pb-5" style={{ borderTop: "1px solid var(--border-card)" }}>
                    <p className="text-sm mt-4 mb-4 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      {b.description}
                    </p>

                    {actions.length > 0 && (
                      <div className="mb-4">
                        <div className="text-xs font-semibold uppercase mb-2" style={{ color: "var(--text-muted)" }}>
                          Akcje naprawcze:
                        </div>
                        <ol className="space-y-2">
                          {actions.map((action, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <span className="w-5 h-5 bg-indigo-500/20 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5" style={{ color: "var(--neon)" }}>
                                {i + 1}
                              </span>
                              <span style={{ color: "var(--text-secondary)" }}>{action}</span>
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

                    <div className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
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
