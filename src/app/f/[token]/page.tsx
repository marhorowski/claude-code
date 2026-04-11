"use client";

import { useState, useEffect } from "react";

function toDateInput(d: Date) {
  return d.toISOString().split("T")[0];
}

interface TokenInfo {
  clientId: string;
  clientName: string;
  label: string;
  userId: string | null;
}

export default function PublicFormPage({ params }: { params: { token: string } }) {
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [date, setDate] = useState(toDateInput(new Date()));
  const [form, setForm] = useState({
    plannedMeetings: "",
    attendedMeetings: "",
    closings: "",
    revenue: "",
    callsMade: "",
    meetingsBooked: "",
    vslMeetingsBooked: "",
    dailyLeads: "",
    dailyAdSpend: "",
    notes: "",
  });

  useEffect(() => {
    fetch(`/api/public-forms/${params.token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setTokenInfo(data);
      })
      .catch(() => setError("Błąd ładowania formularza"))
      .finally(() => setLoading(false));
  }, [params.token]);

  const n = (v: string) => (v !== "" ? parseFloat(v) : null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!tokenInfo) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/public-forms/${params.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          plannedMeetings: n(form.plannedMeetings),
          attendedMeetings: n(form.attendedMeetings),
          closings: n(form.closings),
          revenue: n(form.revenue),
          callsMade: n(form.callsMade),
          meetingsBooked: n(form.meetingsBooked),
          vslMeetingsBooked: n(form.vslMeetingsBooked),
          dailyLeads: n(form.dailyLeads),
          dailyAdSpend: n(form.dailyAdSpend),
          notes: form.notes || null,
        }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Błąd zapisu");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (err: any) {
      setError(err.message || "Błąd zapisu");
      setTimeout(() => setError(""), 4000);
    }
    setSaving(false);
  }

  const INP = "w-full text-sm px-3 py-2.5 rounded-lg outline-none transition-colors";
  const inpStyle = {
    background: "#111",
    border: "1px solid #222",
    color: "#e5e5e5",
  };
  const inpFocusStyle = "focus:border-[#00ff88]";
  const LBL = "block text-xs mb-1.5 text-[#666]";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#080808" }}>
        <div style={{ color: "#555" }}>Ładowanie...</div>
      </div>
    );
  }

  if (!tokenInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#080808" }}>
        <div className="text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <div className="text-white font-semibold">Nieprawidłowy link</div>
          <div className="text-sm mt-2" style={{ color: "#555" }}>
            Ten formularz nie istnieje lub wygasł.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: "#080808" }}>
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl text-sm font-black mb-4"
            style={{ background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.3)", color: "#00ff88" }}
          >
            KPI
          </div>
          <div className="text-white font-bold text-xl">{tokenInfo.clientName}</div>
          {tokenInfo.label && (
            <div className="text-sm mt-1" style={{ color: "#555" }}>{tokenInfo.label}</div>
          )}
        </div>

        {/* Messages */}
        {saved && (
          <div
            className="mb-4 px-4 py-3 rounded-xl text-sm font-medium text-center"
            style={{ background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.3)", color: "#00ff88" }}
          >
            ✓ Dane zapisane pomyślnie!
          </div>
        )}
        {error && (
          <div
            className="mb-4 px-4 py-3 rounded-xl text-sm font-medium text-center"
            style={{ background: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.3)", color: "#ff4444" }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={submit} className="space-y-6">
          {/* Date */}
          <div
            className="p-5 rounded-2xl space-y-4"
            style={{ background: "#0f0f0f", border: "1px solid #1a1a1a" }}
          >
            <div>
              <label className={LBL}>Data *</label>
              <input
                type="date"
                required
                value={date}
                max={toDateInput(new Date())}
                onChange={(e) => setDate(e.target.value)}
                className={`${INP} ${inpFocusStyle}`}
                style={inpStyle}
              />
            </div>
          </div>

          {/* Closing */}
          <div
            className="p-5 rounded-2xl space-y-4"
            style={{ background: "#0f0f0f", border: "1px solid #1a1a1a" }}
          >
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#00ff88" }}>
              Closing
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LBL}>Zaplanowane spotkania</label>
                <input
                  type="number" min="0"
                  value={form.plannedMeetings}
                  onChange={(e) => setForm((p) => ({ ...p, plannedMeetings: e.target.value }))}
                  className={`${INP} ${inpFocusStyle}`} style={inpStyle} placeholder="0"
                />
              </div>
              <div>
                <label className={LBL}>Odbyłe spotkania</label>
                <input
                  type="number" min="0"
                  value={form.attendedMeetings}
                  onChange={(e) => setForm((p) => ({ ...p, attendedMeetings: e.target.value }))}
                  className={`${INP} ${inpFocusStyle}`} style={inpStyle} placeholder="0"
                />
              </div>
              <div>
                <label className={LBL}>Zamknięcia</label>
                <input
                  type="number" min="0"
                  value={form.closings}
                  onChange={(e) => setForm((p) => ({ ...p, closings: e.target.value }))}
                  className={`${INP} ${inpFocusStyle}`} style={inpStyle} placeholder="0"
                />
              </div>
              <div>
                <label className={LBL}>Przychód (PLN)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={form.revenue}
                  onChange={(e) => setForm((p) => ({ ...p, revenue: e.target.value }))}
                  className={`${INP} ${inpFocusStyle}`} style={inpStyle} placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Setting */}
          <div
            className="p-5 rounded-2xl space-y-4"
            style={{ background: "#0f0f0f", border: "1px solid #1a1a1a" }}
          >
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#00ff88" }}>
              Setting
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LBL}>Wykonane telefony</label>
                <input
                  type="number" min="0"
                  value={form.callsMade}
                  onChange={(e) => setForm((p) => ({ ...p, callsMade: e.target.value }))}
                  className={`${INP} ${inpFocusStyle}`} style={inpStyle} placeholder="0"
                />
              </div>
              <div>
                <label className={LBL}>Umówione spotkania</label>
                <input
                  type="number" min="0"
                  value={form.meetingsBooked}
                  onChange={(e) => setForm((p) => ({ ...p, meetingsBooked: e.target.value }))}
                  className={`${INP} ${inpFocusStyle}`} style={inpStyle} placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Marketing */}
          <div
            className="p-5 rounded-2xl space-y-4"
            style={{ background: "#0f0f0f", border: "1px solid #1a1a1a" }}
          >
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#00ff88" }}>
              Marketing
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LBL}>Zapisy VSL</label>
                <input
                  type="number" min="0"
                  value={form.vslMeetingsBooked}
                  onChange={(e) => setForm((p) => ({ ...p, vslMeetingsBooked: e.target.value }))}
                  className={`${INP} ${inpFocusStyle}`} style={inpStyle} placeholder="0"
                />
              </div>
              <div>
                <label className={LBL}>Leady dzienne</label>
                <input
                  type="number" min="0"
                  value={form.dailyLeads}
                  onChange={(e) => setForm((p) => ({ ...p, dailyLeads: e.target.value }))}
                  className={`${INP} ${inpFocusStyle}`} style={inpStyle} placeholder="0"
                />
              </div>
              <div className="col-span-2">
                <label className={LBL}>Ad Spend dzienny (PLN)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={form.dailyAdSpend}
                  onChange={(e) => setForm((p) => ({ ...p, dailyAdSpend: e.target.value }))}
                  className={`${INP} ${inpFocusStyle}`} style={inpStyle} placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div
            className="p-5 rounded-2xl"
            style={{ background: "#0f0f0f", border: "1px solid #1a1a1a" }}
          >
            <label className={LBL}>Notatki (opcjonalnie)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={3}
              className={`${INP} ${inpFocusStyle} resize-none`}
              style={inpStyle}
              placeholder="Dodatkowe informacje..."
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
            style={{
              background: saving ? "rgba(0,255,136,0.1)" : "rgba(0,255,136,0.15)",
              border: "1px solid rgba(0,255,136,0.4)",
              color: "#00ff88",
            }}
          >
            {saving ? "Zapisywanie..." : "Zapisz dane"}
          </button>
        </form>

        <div className="mt-8 text-center text-xs" style={{ color: "#333" }}>
          Sales KPI Dashboard
        </div>
      </div>
    </div>
  );
}
