"use client";

import { useState, useEffect } from "react";

function toDateInput(d: Date) {
  return d.toISOString().split("T")[0];
}

type Dept = "sprzedaz" | "setting" | "marketing";

interface TokenInfo {
  clientId: string;
  clientName: string;
  label: string;
  userId: string | null;
  users: Array<{ id: string; name: string; role: string }>;
}

const EMPTY_FORM = {
  // Sprzedaż (Closing)
  plannedMeetings: "",
  attendedMeetings: "",
  closings: "",
  revenue: "",
  callsReceived: "",
  followUpCount: "",
  unqualifiedMeetings: "",
  meetingFollowUps: "",
  // Setting
  callsMade: "",
  meetingsBooked: "",
  // Marketing
  vslMeetingsBooked: "",
  dailyLeads: "",
  dailyAdSpend: "",
  dailyClicks: "",
  dailyImpressions: "",
  // Common
  notes: "",
};

export default function PublicFormPage({ params }: { params: { token: string } }) {
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [date, setDate] = useState(toDateInput(new Date()));
  const [dept, setDept] = useState<Dept>("sprzedaz");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [form, setForm] = useState({ ...EMPTY_FORM });

  useEffect(() => {
    fetch(`/api/public-forms/${params.token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else {
          setTokenInfo(data);
          // Pre-select user if token is assigned
          if (data.userId) setSelectedUserId(data.userId);
        }
      })
      .catch(() => setError("Błąd ładowania formularza"))
      .finally(() => setLoading(false));
  }, [params.token]);

  const n = (v: string) => (v !== "" ? parseFloat(v) : null);
  const ni = (v: string) => (v !== "" ? parseInt(v) : null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!tokenInfo) return;
    if (!tokenInfo.userId && !selectedUserId) {
      setError("Wybierz użytkownika przed zapisem");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload: any = {
        date,
        selectedUserId: tokenInfo.userId ? undefined : selectedUserId,
        notes: form.notes || null,
      };

      if (dept === "sprzedaz") {
        payload.plannedMeetings = ni(form.plannedMeetings);
        payload.attendedMeetings = ni(form.attendedMeetings);
        payload.closings = ni(form.closings);
        payload.revenue = n(form.revenue);
        payload.callsReceived = ni(form.callsReceived);
        payload.followUpCount = ni(form.followUpCount);
        payload.unqualifiedMeetings = ni(form.unqualifiedMeetings);
        payload.meetingFollowUps = ni(form.meetingFollowUps);
      } else if (dept === "setting") {
        payload.callsMade = ni(form.callsMade);
        payload.meetingsBooked = ni(form.meetingsBooked);
        payload.callsReceived = ni(form.callsReceived);
        payload.followUpCount = ni(form.followUpCount);
      } else if (dept === "marketing") {
        payload.vslMeetingsBooked = ni(form.vslMeetingsBooked);
        payload.dailyLeads = ni(form.dailyLeads);
        payload.dailyAdSpend = n(form.dailyAdSpend);
        payload.dailyClicks = ni(form.dailyClicks);
        payload.dailyImpressions = ni(form.dailyImpressions);
        if (form.dailyClicks && form.dailyImpressions) {
          payload.dailyCtr = (parseInt(form.dailyClicks) / parseInt(form.dailyImpressions)) * 100;
        }
      }

      const res = await fetch(`/api/public-forms/${params.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Błąd zapisu");
      }
      setSaved(true);
      setForm({ ...EMPTY_FORM });
      setTimeout(() => setSaved(false), 4000);
    } catch (err: any) {
      setError(err.message || "Błąd zapisu");
      setTimeout(() => setError(""), 5000);
    }
    setSaving(false);
  }

  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const INP = "w-full text-sm px-3 py-2.5 rounded-lg outline-none";
  const inpStyle = { background: "#111", border: "1px solid #222", color: "#e5e5e5" };
  const LBL = "block text-xs mb-1.5 text-[#666]";
  const CARD = "p-5 rounded-2xl space-y-4";
  const cardStyle = { background: "#0f0f0f", border: "1px solid #1a1a1a" };

  const deptOptions: Array<{ value: Dept; label: string; color: string }> = [
    { value: "sprzedaz", label: "Sprzedaż (Closing)", color: "#00ff88" },
    { value: "setting", label: "Setting", color: "#00d4ff" },
    { value: "marketing", label: "Marketing", color: "#ff9922" },
  ];

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
          <div className="text-sm mt-2" style={{ color: "#555" }}>Ten formularz nie istnieje lub wygasł.</div>
        </div>
      </div>
    );
  }

  const activeColor = deptOptions.find((d) => d.value === dept)?.color ?? "#00ff88";

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: "#080808" }}>
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="mb-8 text-center">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl text-sm font-black mb-4"
            style={{ background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.3)", color: "#00ff88" }}
          >KPI</div>
          <div className="text-white font-bold text-xl">{tokenInfo.clientName}</div>
          {tokenInfo.label && <div className="text-sm mt-1" style={{ color: "#555" }}>{tokenInfo.label}</div>}
        </div>

        {/* Messages */}
        {saved && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium text-center"
            style={{ background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.3)", color: "#00ff88" }}>
            ✓ Dane zapisane pomyślnie!
          </div>
        )}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium text-center"
            style={{ background: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.3)", color: "#ff4444" }}>
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">

          {/* Date */}
          <div className={CARD} style={cardStyle}>
            <div>
              <label className={LBL}>Data *</label>
              <input type="date" required value={date} max={toDateInput(new Date())}
                onChange={(e) => setDate(e.target.value)}
                className={INP} style={inpStyle} />
            </div>
          </div>

          {/* Department selector */}
          <div className={CARD} style={cardStyle}>
            <div>
              <label className={LBL}>Dział *</label>
              <div className="flex gap-2">
                {deptOptions.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDept(d.value)}
                    className="flex-1 py-2.5 rounded-lg text-xs font-bold transition-all"
                    style={dept === d.value
                      ? { background: `${d.color}22`, border: `1px solid ${d.color}66`, color: d.color }
                      : { background: "#111", border: "1px solid #222", color: "#555" }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Closer picker — only when token has no fixed user */}
            {!tokenInfo.userId && (
              <div>
                <label className={LBL}>Użytkownik *</label>
                <select
                  required
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className={INP}
                  style={{ ...inpStyle, cursor: "pointer" }}
                >
                  <option value="">— wybierz osobę —</option>
                  {tokenInfo.users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* === SPRZEDAŻ === */}
          {dept === "sprzedaz" && (
            <div className={CARD} style={{ ...cardStyle, borderColor: "#00ff8822" }}>
              <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#00ff88" }}>
                Closing / Sprzedaż
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LBL}>Zaplanowane spotkania</label>
                  <input type="number" min="0" value={form.plannedMeetings} onChange={set("plannedMeetings")} className={INP} style={inpStyle} placeholder="0" />
                </div>
                <div>
                  <label className={LBL}>Odbyłe spotkania</label>
                  <input type="number" min="0" value={form.attendedMeetings} onChange={set("attendedMeetings")} className={INP} style={inpStyle} placeholder="0" />
                </div>
                <div>
                  <label className={LBL}>Zamknięcia (sprzedaże)</label>
                  <input type="number" min="0" value={form.closings} onChange={set("closings")} className={INP} style={inpStyle} placeholder="0" />
                </div>
                <div>
                  <label className={LBL}>Przychód (PLN)</label>
                  <input type="number" min="0" step="0.01" value={form.revenue} onChange={set("revenue")} className={INP} style={inpStyle} placeholder="0.00" />
                </div>
                <div>
                  <label className={LBL}>Odebrane telefony</label>
                  <input type="number" min="0" value={form.callsReceived} onChange={set("callsReceived")} className={INP} style={inpStyle} placeholder="0" />
                </div>
                <div>
                  <label className={LBL}>Follow-upy wykonane</label>
                  <input type="number" min="0" value={form.followUpCount} onChange={set("followUpCount")} className={INP} style={inpStyle} placeholder="0" />
                </div>
                <div>
                  <label className={LBL}>Spotkania niekwalifikowane</label>
                  <input type="number" min="0" value={form.unqualifiedMeetings} onChange={set("unqualifiedMeetings")} className={INP} style={inpStyle} placeholder="0" />
                </div>
                <div>
                  <label className={LBL}>Follow-upy po spotkaniach</label>
                  <input type="number" min="0" value={form.meetingFollowUps} onChange={set("meetingFollowUps")} className={INP} style={inpStyle} placeholder="0" />
                </div>
              </div>
            </div>
          )}

          {/* === SETTING === */}
          {dept === "setting" && (
            <div className={CARD} style={{ ...cardStyle, borderColor: "#00d4ff22" }}>
              <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#00d4ff" }}>
                Setting
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LBL}>Wykonane telefony</label>
                  <input type="number" min="0" value={form.callsMade} onChange={set("callsMade")} className={INP} style={inpStyle} placeholder="0" />
                </div>
                <div>
                  <label className={LBL}>Odebrane telefony</label>
                  <input type="number" min="0" value={form.callsReceived} onChange={set("callsReceived")} className={INP} style={inpStyle} placeholder="0" />
                </div>
                <div>
                  <label className={LBL}>Umówione spotkania</label>
                  <input type="number" min="0" value={form.meetingsBooked} onChange={set("meetingsBooked")} className={INP} style={inpStyle} placeholder="0" />
                </div>
                <div>
                  <label className={LBL}>Follow-upy</label>
                  <input type="number" min="0" value={form.followUpCount} onChange={set("followUpCount")} className={INP} style={inpStyle} placeholder="0" />
                </div>
              </div>
            </div>
          )}

          {/* === MARKETING === */}
          {dept === "marketing" && (
            <div className={CARD} style={{ ...cardStyle, borderColor: "#ff992222" }}>
              <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#ff9922" }}>
                Marketing
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LBL}>Leady dzienne</label>
                  <input type="number" min="0" value={form.dailyLeads} onChange={set("dailyLeads")} className={INP} style={inpStyle} placeholder="0" />
                </div>
                <div>
                  <label className={LBL}>Zapisy VSL</label>
                  <input type="number" min="0" value={form.vslMeetingsBooked} onChange={set("vslMeetingsBooked")} className={INP} style={inpStyle} placeholder="0" />
                </div>
                <div className="col-span-2">
                  <label className={LBL}>Ad Spend dzienny (PLN)</label>
                  <input type="number" min="0" step="0.01" value={form.dailyAdSpend} onChange={set("dailyAdSpend")} className={INP} style={inpStyle} placeholder="0.00" />
                </div>
                <div>
                  <label className={LBL}>Kliknięcia w reklamę</label>
                  <input type="number" min="0" value={form.dailyClicks} onChange={set("dailyClicks")} className={INP} style={inpStyle} placeholder="0" />
                </div>
                <div>
                  <label className={LBL}>Wyświetlenia reklamy</label>
                  <input type="number" min="0" value={form.dailyImpressions} onChange={set("dailyImpressions")} className={INP} style={inpStyle} placeholder="0" />
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className={CARD} style={cardStyle}>
            <label className={LBL}>Notatki (opcjonalnie)</label>
            <textarea value={form.notes} onChange={set("notes")} rows={2}
              className={`${INP} resize-none`} style={inpStyle} placeholder="Dodatkowe informacje..." />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
            style={{
              background: `${activeColor}18`,
              border: `1px solid ${activeColor}55`,
              color: activeColor,
            }}
          >
            {saving ? "Zapisywanie..." : "Zapisz dane"}
          </button>
        </form>

        <div className="mt-8 text-center text-xs" style={{ color: "#333" }}>Sales KPI Dashboard</div>
      </div>
    </div>
  );
}
