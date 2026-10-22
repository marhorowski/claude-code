"use client";

import { useState, useEffect } from "react";
import { DatePicker } from "@/components/ui/DatePicker";

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
  // Sprzedaż
  plannedMeetings: "",
  attendedMeetings: "",
  cancelledMeetings: "",
  postponedMeetings: "",
  noShows: "",
  closings: "",
  revenue: "",
  followUpsDone: "",
  followUpClosings: "",
  followUpRevenue: "",
  // Setting
  callsMade: "",
  conductedCalls: "",
  meetingsBooked: "",
  // Marketing
  dailyAdSpend: "",
  dailyImpressions: "",
  dailyClicks: "",
  dailyLeads: "",
  optinConversion: "",
  vslMeetingsBooked: "",
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
        payload.cancelledMeetings = ni(form.cancelledMeetings);
        payload.postponedMeetings = ni(form.postponedMeetings);
        payload.noShows = ni(form.noShows);
        payload.closings = ni(form.closings);
        payload.revenue = n(form.revenue);
        payload.followUpsDone = ni(form.followUpsDone);
        payload.followUpClosings = ni(form.followUpClosings);
        payload.followUpRevenue = n(form.followUpRevenue);
      } else if (dept === "setting") {
        payload.callsMade = ni(form.callsMade);
        payload.conductedCalls = ni(form.conductedCalls);
        payload.meetingsBooked = ni(form.meetingsBooked);
      } else if (dept === "marketing") {
        payload.dailyAdSpend = n(form.dailyAdSpend);
        payload.dailyImpressions = ni(form.dailyImpressions);
        payload.dailyClicks = ni(form.dailyClicks);
        payload.dailyLeads = ni(form.dailyLeads);
        payload.optinConversion = n(form.optinConversion);
        payload.vslMeetingsBooked = ni(form.vslMeetingsBooked);
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
  const SEC = "text-xs font-semibold uppercase tracking-wider mb-3";

  const deptOptions: Array<{ value: Dept; label: string; color: string }> = [
    { value: "sprzedaz", label: "Sprzedaż", color: "#00ff88" },
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

          {/* Date + user */}
          <div className={CARD} style={cardStyle}>
            <div>
              <label className={LBL}>Data *</label>
              <DatePicker value={date} onChange={setDate} max={toDateInput(new Date())} required
                variant="dark" className={INP} style={inpStyle} />
            </div>
            <div>
              <label className={LBL}>Użytkownik *</label>
              {tokenInfo.users.length > 0 ? (
                <select required value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}
                  className={INP} style={{ ...inpStyle, cursor: "pointer" }}>
                  <option value="">— wybierz osobę —</option>
                  {tokenInfo.users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              ) : (
                <div className={INP} style={{ ...inpStyle, opacity: 0.5 }}>Brak użytkowników przypisanych do klienta</div>
              )}
            </div>
          </div>

          {/* Dept selector */}
          <div className={CARD} style={cardStyle}>
            <label className={LBL}>Dział *</label>
            <div className="flex gap-2">
              {deptOptions.map((d) => (
                <button key={d.value} type="button" onClick={() => setDept(d.value)}
                  className="flex-1 py-2.5 rounded-lg text-xs font-bold transition-all"
                  style={dept === d.value
                    ? { background: `${d.color}22`, border: `1px solid ${d.color}66`, color: d.color }
                    : { background: "#111", border: "1px solid #222", color: "#555" }}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* === SPRZEDAŻ === */}
          {dept === "sprzedaz" && (
            <div className={CARD} style={{ ...cardStyle, borderColor: "#00ff8822" }}>
              <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#00ff88" }}>
                Sprzedaż / Closing
              </h2>

              <div>
                <p className={SEC} style={{ color: "#00ff8888" }}>Spotkania dzisiaj</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LBL}>Zaplanowane (pierwsze)</label>
                    <input type="number" min="0" value={form.plannedMeetings} onChange={set("plannedMeetings")} className={INP} style={inpStyle} placeholder="0" />
                  </div>
                  <div>
                    <label className={LBL}>Odbyte</label>
                    <input type="number" min="0" value={form.attendedMeetings} onChange={set("attendedMeetings")} className={INP} style={inpStyle} placeholder="0" />
                  </div>
                  <div>
                    <label className={LBL}>Odwołane</label>
                    <input type="number" min="0" value={form.cancelledMeetings} onChange={set("cancelledMeetings")} className={INP} style={inpStyle} placeholder="0" />
                  </div>
                  <div>
                    <label className={LBL}>Przełożone</label>
                    <input type="number" min="0" value={form.postponedMeetings} onChange={set("postponedMeetings")} className={INP} style={inpStyle} placeholder="0" />
                  </div>
                  <div>
                    <label className={LBL}>No show</label>
                    <input type="number" min="0" value={form.noShows} onChange={set("noShows")} className={INP} style={inpStyle} placeholder="0" />
                  </div>
                  <div>
                    <label className={LBL}>Domknięte sprzedaże</label>
                    <input type="number" min="0" value={form.closings} onChange={set("closings")} className={INP} style={inpStyle} placeholder="0" />
                  </div>
                  <div className="col-span-2">
                    <label className={LBL}>Przychód zakontraktowany netto (PLN)</label>
                    <input type="number" min="0" step="0.01" value={form.revenue} onChange={set("revenue")} className={INP} style={inpStyle} placeholder="0.00" />
                  </div>
                </div>
              </div>

              <div>
                <p className={SEC} style={{ color: "#00ff8888" }}>Follow-upy</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LBL}>Follow-upy odbyte dzisiaj</label>
                    <input type="number" min="0" value={form.followUpsDone} onChange={set("followUpsDone")} className={INP} style={inpStyle} placeholder="0" />
                  </div>
                  <div>
                    <label className={LBL}>Domknięcia z follow-upów</label>
                    <input type="number" min="0" value={form.followUpClosings} onChange={set("followUpClosings")} className={INP} style={inpStyle} placeholder="0" />
                  </div>
                  <div className="col-span-2">
                    <label className={LBL}>Przychód z follow-upów (PLN)</label>
                    <input type="number" min="0" value={form.followUpRevenue} onChange={set("followUpRevenue")} className={INP} style={inpStyle} placeholder="0" />
                  </div>
                </div>
                {(form.revenue || form.followUpRevenue) && (
                  <div className="flex justify-between items-center mt-3 px-3 py-2 rounded-lg text-sm" style={{ background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.15)" }}>
                    <span style={{ color: "#aaa" }}>Łączny przychód zakontraktowany netto</span>
                    <span style={{ color: "#00ff88", fontWeight: 700 }}>
                      {((form.revenue ? +form.revenue : 0) + (form.followUpRevenue ? +form.followUpRevenue : 0)).toLocaleString("pl-PL")} PLN
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* === SETTING === */}
          {dept === "setting" && (
            <div className={CARD} style={{ ...cardStyle, borderColor: "#00d4ff22" }}>
              <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#00d4ff" }}>
                Setting
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LBL}>Wykonane telefony</label>
                  <input type="number" min="0" value={form.callsMade} onChange={set("callsMade")} className={INP} style={inpStyle} placeholder="0" />
                </div>
                <div>
                  <label className={LBL}>Przeprowadzone rozmowy</label>
                  <input type="number" min="0" value={form.conductedCalls} onChange={set("conductedCalls")} className={INP} style={inpStyle} placeholder="0" />
                </div>
                <div className="col-span-2">
                  <label className={LBL}>Umówione spotkania</label>
                  <input type="number" min="0" value={form.meetingsBooked} onChange={set("meetingsBooked")} className={INP} style={inpStyle} placeholder="0" />
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
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={LBL}>Wydatek na reklamy (PLN)</label>
                  <input type="number" min="0" step="0.01" value={form.dailyAdSpend} onChange={set("dailyAdSpend")} className={INP} style={inpStyle} placeholder="0.00" />
                </div>
                <div>
                  <label className={LBL}>Wyświetlenia</label>
                  <input type="number" min="0" value={form.dailyImpressions} onChange={set("dailyImpressions")} className={INP} style={inpStyle} placeholder="0" />
                </div>
                <div>
                  <label className={LBL}>Unikatowe kliknięcia linku</label>
                  <input type="number" min="0" value={form.dailyClicks} onChange={set("dailyClicks")} className={INP} style={inpStyle} placeholder="0" />
                </div>
                <div>
                  <label className={LBL}>Liczba leadów</label>
                  <input type="number" min="0" value={form.dailyLeads} onChange={set("dailyLeads")} className={INP} style={inpStyle} placeholder="0" />
                </div>
                <div>
                  <label className={LBL}>Konwersja Optin Page (%)</label>
                  <input type="number" min="0" max="100" step="0.01" value={form.optinConversion} onChange={set("optinConversion")} className={INP} style={inpStyle} placeholder="0.00" />
                </div>
                <div className="col-span-2">
                  <label className={LBL}>Umówione rozmowy z marketingu</label>
                  <input type="number" min="0" value={form.vslMeetingsBooked} onChange={set("vslMeetingsBooked")} className={INP} style={inpStyle} placeholder="0" />
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

          <button type="submit" disabled={saving}
            className="w-full py-3.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
            style={{ background: `${activeColor}18`, border: `1px solid ${activeColor}55`, color: activeColor }}>
            {saving ? "Zapisywanie..." : "Zapisz dane"}
          </button>
        </form>

        <div className="mt-8 text-center text-xs" style={{ color: "#333" }}>Sales KPI Dashboard</div>
      </div>
    </div>
  );
}
