"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useClient } from "../layout";
import { useSession } from "next-auth/react";

interface TeamMember { id: string; name: string; role: string }
interface DailyFormData {
  id: string; userId: string; date: string;
  plannedMeetings: number | null; attendedMeetings: number | null;
  closings: number | null; revenue: number | null;
  callsMade: number | null; meetingsBooked: number | null;
  vslMeetingsBooked: number | null; dailyLeads: number | null;
  dailyAdSpend: number | null; dailyClicks: number | null;
  dailyImpressions: number | null; dailyCtr: number | null;
  callsReceived: number | null; followUpCount: number | null;
  unqualifiedMeetings: number | null; meetingFollowUps: number | null;
  notes: string | null;
  user: { id: string; name: string; role: string };
}
interface SalesSettings { dealSize: number }

type Tab = "sprzedaz" | "setting" | "marketing";

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function toDateInput(d: Date) { return d.toISOString().split("T")[0]; }

const INP = "w-full text-sm px-3 py-2.5 rounded-lg";
const LBL = "lbl";

export default function DanePage() {
  const { selectedClientId } = useClient();
  const { data: session } = useSession();
  const [now] = useState(() => new Date());

  const [tab, setTab] = useState<Tab>("sprzedaz");
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [daily, setDaily] = useState<DailyFormData[]>([]);
  const [settings, setSettings] = useState<SalesSettings>({ dealSize: 0 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Closing / sales form
  const [cPersonId, setCPersonId] = useState("");
  const [cDate, setCDate] = useState(toDateInput(now));
  const [cForm, setCForm] = useState({
    closings: "", revenue: "",
    meetingsBooked: "", attendedMeetings: "",
    unqualifiedMeetings: "", meetingFollowUps: "", notes: "",
  });
  const [revSuggested, setRevSuggested] = useState(false);

  // Setting form
  const [sPersonId, setSPersonId] = useState("");
  const [sDate, setSDate] = useState(toDateInput(now));
  const [sForm, setSForm] = useState({
    callsMade: "", callsReceived: "",
    meetingsBooked: "", followUpCount: "", notes: "",
  });

  // Marketing form
  const [mktDate, setMktDate] = useState(toDateInput(now));
  const [mktForm, setMktForm] = useState({
    dailyAdSpend: "", dailyClicks: "", dailyLeads: "",
    vslMeetingsBooked: "", dailyImpressions: "",
  });

  const showMsg = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3500);
  };

  const fetchAll = useCallback(async () => {
    if (!selectedClientId) return;
    setLoading(true);
    try {
      const [t, d, ss] = await Promise.all([
        fetch(`/api/team?clientId=${selectedClientId}`).then(r => r.json()),
        fetch(`/api/daily?clientId=${selectedClientId}`).then(r => r.json()),
        fetch(`/api/sales-settings?clientId=${selectedClientId}`).then(r => r.json()),
      ]);
      setTeam(Array.isArray(t) ? t : []);
      setDaily(Array.isArray(d) ? d : []);
      if (ss && !ss.error) setSettings(ss);
    } catch {}
    setLoading(false);
  }, [selectedClientId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-fill closing form when person/date changes
  useEffect(() => {
    if (!cPersonId || !cDate) {
      setCForm({ closings: "", revenue: "", meetingsBooked: "", attendedMeetings: "", unqualifiedMeetings: "", meetingFollowUps: "", notes: "" });
      setRevSuggested(false);
      return;
    }
    const ex = daily.find(f => f.userId === cPersonId && isSameDay(new Date(f.date), new Date(cDate)));
    if (ex) {
      setCForm({
        closings: ex.closings?.toString() ?? "",
        revenue: ex.revenue?.toString() ?? "",
        meetingsBooked: ex.meetingsBooked?.toString() ?? "",
        attendedMeetings: ex.attendedMeetings?.toString() ?? "",
        unqualifiedMeetings: ex.unqualifiedMeetings?.toString() ?? "",
        meetingFollowUps: ex.meetingFollowUps?.toString() ?? "",
        notes: ex.notes ?? "",
      });
      setRevSuggested(false);
    } else {
      setCForm({ closings: "", revenue: "", meetingsBooked: "", attendedMeetings: "", unqualifiedMeetings: "", meetingFollowUps: "", notes: "" });
      setRevSuggested(false);
    }
  }, [cPersonId, cDate, daily]);

  // Auto-suggest revenue when closings changes
  useEffect(() => {
    if (settings.dealSize > 0 && cForm.closings && !revSuggested) {
      const suggested = +cForm.closings * settings.dealSize;
      if (suggested > 0) {
        setCForm(prev => ({ ...prev, revenue: suggested.toString() }));
        setRevSuggested(true);
      }
    }
    if (!cForm.closings) setRevSuggested(false);
  }, [cForm.closings, settings.dealSize]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fill setting form when person/date changes
  useEffect(() => {
    if (!sPersonId || !sDate) {
      setSForm({ callsMade: "", callsReceived: "", meetingsBooked: "", followUpCount: "", notes: "" });
      return;
    }
    const ex = daily.find(f => f.userId === sPersonId && isSameDay(new Date(f.date), new Date(sDate)));
    if (ex) {
      setSForm({
        callsMade: ex.callsMade?.toString() ?? "",
        callsReceived: ex.callsReceived?.toString() ?? "",
        meetingsBooked: ex.meetingsBooked?.toString() ?? "",
        followUpCount: ex.followUpCount?.toString() ?? "",
        notes: ex.notes ?? "",
      });
    } else {
      setSForm({ callsMade: "", callsReceived: "", meetingsBooked: "", followUpCount: "", notes: "" });
    }
  }, [sPersonId, sDate, daily]);

  // Auto-fill marketing form
  useEffect(() => {
    const ex = daily.find(f =>
      isSameDay(new Date(f.date), new Date(mktDate)) &&
      (f.dailyLeads !== null || f.vslMeetingsBooked !== null || f.dailyAdSpend !== null)
    );
    if (ex) {
      setMktForm({
        dailyAdSpend: ex.dailyAdSpend?.toString() ?? "",
        dailyClicks: ex.dailyClicks?.toString() ?? "",
        dailyLeads: ex.dailyLeads?.toString() ?? "",
        vslMeetingsBooked: ex.vslMeetingsBooked?.toString() ?? "",
        dailyImpressions: ex.dailyImpressions?.toString() ?? "",
      });
    } else {
      setMktForm({ dailyAdSpend: "", dailyClicks: "", dailyLeads: "", vslMeetingsBooked: "", dailyImpressions: "" });
    }
  }, [mktDate, daily]);

  const post = async (url: string, body: object) => {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Błąd zapisu"); }
    return res.json();
  };

  const saveClosing = async () => {
    if (!cPersonId || !cDate || !selectedClientId) return;
    setSaving(true);
    try {
      await post("/api/daily", {
        clientId: selectedClientId, targetUserId: cPersonId, date: cDate,
        closings: cForm.closings ? +cForm.closings : null,
        revenue: cForm.revenue ? +cForm.revenue : null,
        meetingsBooked: cForm.meetingsBooked ? +cForm.meetingsBooked : null,
        attendedMeetings: cForm.attendedMeetings ? +cForm.attendedMeetings : null,
        unqualifiedMeetings: cForm.unqualifiedMeetings ? +cForm.unqualifiedMeetings : null,
        meetingFollowUps: cForm.meetingFollowUps ? +cForm.meetingFollowUps : null,
        notes: cForm.notes || null,
      });
      showMsg("Zapisano dane sprzedaży!", true);
      fetchAll();
    } catch (e: any) { showMsg(e.message, false); }
    setSaving(false);
  };

  const saveSetting = async () => {
    if (!sPersonId || !sDate || !selectedClientId) return;
    setSaving(true);
    try {
      await post("/api/daily", {
        clientId: selectedClientId, targetUserId: sPersonId, date: sDate,
        callsMade: sForm.callsMade ? +sForm.callsMade : null,
        callsReceived: sForm.callsReceived ? +sForm.callsReceived : null,
        meetingsBooked: sForm.meetingsBooked ? +sForm.meetingsBooked : null,
        followUpCount: sForm.followUpCount ? +sForm.followUpCount : null,
        notes: sForm.notes || null,
      });
      showMsg("Zapisano dane settingu!", true);
      fetchAll();
    } catch (e: any) { showMsg(e.message, false); }
    setSaving(false);
  };

  const saveMkt = async () => {
    if (!mktDate || !selectedClientId) return;
    setSaving(true);
    try {
      const autoCtrl =
        mktForm.dailyClicks && mktForm.dailyImpressions
          ? (+mktForm.dailyClicks / +mktForm.dailyImpressions) * 100
          : null;
      await post("/api/daily", {
        clientId: selectedClientId, date: mktDate,
        dailyAdSpend: mktForm.dailyAdSpend ? +mktForm.dailyAdSpend : null,
        dailyClicks: mktForm.dailyClicks ? +mktForm.dailyClicks : null,
        dailyLeads: mktForm.dailyLeads ? +mktForm.dailyLeads : null,
        vslMeetingsBooked: mktForm.vslMeetingsBooked ? +mktForm.vslMeetingsBooked : null,
        dailyImpressions: mktForm.dailyImpressions ? +mktForm.dailyImpressions : null,
        dailyCtr: autoCtrl,
      });
      showMsg("Zapisano dane marketingowe!", true);
      fetchAll();
    } catch (e: any) { showMsg(e.message, false); }
    setSaving(false);
  };

  const closers = useMemo(() => team.filter(m => m.role === "CLOSER"), [team]);
  const setters = useMemo(() => team.filter(m => m.role === "SETTER"), [team]);

  // Missing data for last 14 days
  const missingClosers = useMemo(() => {
    const out: { person: TeamMember; date: string }[] = [];
    for (let i = 1; i <= 14; i++) {
      const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(12, 0, 0, 0);
      if (d.getDay() === 0 || d.getDay() === 6) continue; // skip weekends
      for (const p of closers) {
        if (!daily.some(f => f.userId === p.id && isSameDay(new Date(f.date), d))) {
          out.push({ person: p, date: toDateInput(d) });
        }
      }
    }
    return out.slice(0, 20);
  }, [closers, daily, now]);

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "sprzedaz", label: "Sprzedaż", icon: "◉" },
    { id: "setting", label: "Setting", icon: "◎" },
    { id: "marketing", label: "Marketing", icon: "◈" },
  ];

  const cardStyle = {
    background: "var(--bg-card)",
    border: "1px solid var(--border-card)",
    borderRadius: "1rem",
    padding: "1.5rem",
  };

  const inputStyle = {
    background: "var(--bg-input)",
    border: "1px solid var(--border-card)",
    color: "var(--text-primary)",
    borderRadius: "0.5rem",
  };

  const saveBtnStyle = {
    background: "var(--neon)",
    color: "#000",
    fontWeight: 700,
    fontSize: "0.875rem",
    padding: "0.625rem 1.5rem",
    borderRadius: "0.5rem",
    cursor: saving ? "not-allowed" : "pointer",
    opacity: saving ? 0.7 : 1,
    border: "none",
  };

  return (
    <div className="space-y-6 fade-in max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Wprowadź dane</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Raportowanie dzienne — dane agregują się automatycznie
        </p>
      </div>

      {/* Toast */}
      {msg && (
        <div
          className="px-4 py-3 rounded-xl text-sm font-medium"
          style={{
            background: msg.ok ? "rgba(0,255,136,0.08)" : "rgba(255,85,85,0.08)",
            border: `1px solid ${msg.ok ? "var(--neon-border)" : "rgba(255,85,85,0.3)"}`,
            color: msg.ok ? "var(--neon)" : "var(--red)",
          }}
        >
          {msg.text}
        </div>
      )}

      {/* Tab selector */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-card)" }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 flex items-center justify-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-all"
            style={tab === t.id
              ? { background: "var(--neon-dim)", color: "var(--neon)", border: "1px solid var(--neon-border)" }
              : { color: "var(--text-muted)", border: "1px solid transparent" }
            }
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── SPRZEDAŻ TAB ── */}
      {tab === "sprzedaz" && (
        <div style={cardStyle}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: "var(--text-muted)" }}>
            Raport sprzedażowy (dzienny)
          </div>

          <div className="space-y-4">
            {/* Person */}
            <div>
              <label className={LBL}>Closer</label>
              <select
                className={INP}
                style={inputStyle}
                value={cPersonId}
                onChange={e => setCPersonId(e.target.value)}
              >
                <option value="">— wybierz closera —</option>
                {closers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {closers.length === 0 && (
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Brak closerów w zespole. Dodaj w Ustawieniach.</p>
              )}
            </div>

            {/* Date */}
            <div>
              <label className={LBL}>Data</label>
              <input type="date" className={INP} style={inputStyle} value={cDate} onChange={e => { setCDate(e.target.value); setRevSuggested(false); }} />
            </div>

            <div className="border-t pt-4" style={{ borderColor: "var(--border-card)" }}>
              <div className="grid grid-cols-2 gap-4">
                {/* Closings */}
                <div>
                  <label className={LBL}>Liczba zamknięć</label>
                  <input type="number" min="0" className={INP} style={inputStyle} placeholder="0"
                    value={cForm.closings}
                    onChange={e => { setCForm(p => ({ ...p, closings: e.target.value })); setRevSuggested(false); }}
                  />
                </div>

                {/* Revenue */}
                <div>
                  <label className={LBL}>
                    Przychód (PLN)
                    {revSuggested && settings.dealSize > 0 && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full" style={{ background: "var(--neon-dim)", color: "var(--neon)", border: "1px solid var(--neon-border)" }}>
                        auto
                      </span>
                    )}
                  </label>
                  <input type="number" min="0" className={INP} style={inputStyle}
                    placeholder={settings.dealSize > 0 ? `sugestia: ${settings.dealSize} × zamknięcia` : "0"}
                    value={cForm.revenue}
                    onChange={e => { setCForm(p => ({ ...p, revenue: e.target.value })); setRevSuggested(false); }}
                  />
                </div>

                {/* Meetings booked */}
                <div>
                  <label className={LBL}>Spotkania umówione</label>
                  <input type="number" min="0" className={INP} style={inputStyle} placeholder="0"
                    value={cForm.meetingsBooked}
                    onChange={e => setCForm(p => ({ ...p, meetingsBooked: e.target.value }))}
                  />
                </div>

                {/* Attended */}
                <div>
                  <label className={LBL}>Spotkania odbyte</label>
                  <input type="number" min="0" className={INP} style={inputStyle} placeholder="0"
                    value={cForm.attendedMeetings}
                    onChange={e => setCForm(p => ({ ...p, attendedMeetings: e.target.value }))}
                  />
                </div>

                {/* Unqualified */}
                <div>
                  <label className={LBL}>Spotk. niekwalifikowane</label>
                  <input type="number" min="0" className={INP} style={inputStyle} placeholder="0"
                    value={cForm.unqualifiedMeetings}
                    onChange={e => setCForm(p => ({ ...p, unqualifiedMeetings: e.target.value }))}
                  />
                </div>

                {/* Meeting follow-ups */}
                <div>
                  <label className={LBL}>Follow-upy ze spotkań</label>
                  <input type="number" min="0" className={INP} style={inputStyle} placeholder="0"
                    value={cForm.meetingFollowUps}
                    onChange={e => setCForm(p => ({ ...p, meetingFollowUps: e.target.value }))}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="mt-4">
                <label className={LBL}>Notatki</label>
                <textarea className={INP} style={{ ...inputStyle, resize: "vertical", minHeight: "72px" }} placeholder="opcjonalnie"
                  value={cForm.notes} onChange={e => setCForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={saveClosing} disabled={saving || !cPersonId} style={saveBtnStyle}>
                {saving ? "Zapisywanie..." : "Zapisz"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SETTING TAB ── */}
      {tab === "setting" && (
        <div style={cardStyle}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: "var(--text-muted)" }}>
            Raport settingowy (dzienny)
          </div>

          <div className="space-y-4">
            {/* Person */}
            <div>
              <label className={LBL}>Setter</label>
              <select className={INP} style={inputStyle} value={sPersonId} onChange={e => setSPersonId(e.target.value)}>
                <option value="">— wybierz settera —</option>
                {setters.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {setters.length === 0 && (
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Brak setterów w zespole. Dodaj w Ustawieniach.</p>
              )}
            </div>

            {/* Date */}
            <div>
              <label className={LBL}>Data</label>
              <input type="date" className={INP} style={inputStyle} value={sDate} onChange={e => setSDate(e.target.value)} />
            </div>

            <div className="border-t pt-4" style={{ borderColor: "var(--border-card)" }}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LBL}>Wykonane telefony</label>
                  <input type="number" min="0" className={INP} style={inputStyle} placeholder="0"
                    value={sForm.callsMade} onChange={e => setSForm(p => ({ ...p, callsMade: e.target.value }))} />
                </div>
                <div>
                  <label className={LBL}>Odebrane telefony</label>
                  <input type="number" min="0" className={INP} style={inputStyle} placeholder="0"
                    value={sForm.callsReceived} onChange={e => setSForm(p => ({ ...p, callsReceived: e.target.value }))} />
                </div>
                <div>
                  <label className={LBL}>Umówione spotkania</label>
                  <input type="number" min="0" className={INP} style={inputStyle} placeholder="0"
                    value={sForm.meetingsBooked} onChange={e => setSForm(p => ({ ...p, meetingsBooked: e.target.value }))} />
                </div>
                <div>
                  <label className={LBL}>Follow-upy z telefonów</label>
                  <input type="number" min="0" className={INP} style={inputStyle} placeholder="0"
                    value={sForm.followUpCount} onChange={e => setSForm(p => ({ ...p, followUpCount: e.target.value }))} />
                </div>
              </div>

              <div className="mt-4">
                <label className={LBL}>Notatki</label>
                <textarea className={INP} style={{ ...inputStyle, resize: "vertical", minHeight: "72px" }} placeholder="opcjonalnie"
                  value={sForm.notes} onChange={e => setSForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={saveSetting} disabled={saving || !sPersonId} style={saveBtnStyle}>
                {saving ? "Zapisywanie..." : "Zapisz"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MARKETING TAB ── */}
      {tab === "marketing" && (
        <div style={cardStyle}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: "var(--text-muted)" }}>
            Raport marketingowy (dzienny)
          </div>

          <div className="space-y-4">
            {/* Date */}
            <div>
              <label className={LBL}>Data</label>
              <input type="date" className={INP} style={inputStyle} value={mktDate} onChange={e => setMktDate(e.target.value)} />
            </div>

            <div className="border-t pt-4" style={{ borderColor: "var(--border-card)" }}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LBL}>Ad Spend (PLN)</label>
                  <input type="number" min="0" className={INP} style={inputStyle} placeholder="0.00"
                    value={mktForm.dailyAdSpend} onChange={e => setMktForm(p => ({ ...p, dailyAdSpend: e.target.value }))} />
                </div>
                <div>
                  <label className={LBL}>Kliknięcia</label>
                  <input type="number" min="0" className={INP} style={inputStyle} placeholder="0"
                    value={mktForm.dailyClicks} onChange={e => setMktForm(p => ({ ...p, dailyClicks: e.target.value }))} />
                </div>
                <div>
                  <label className={LBL}>Leady</label>
                  <input type="number" min="0" className={INP} style={inputStyle} placeholder="0"
                    value={mktForm.dailyLeads} onChange={e => setMktForm(p => ({ ...p, dailyLeads: e.target.value }))} />
                </div>
                <div>
                  <label className={LBL}>Spotkania z VSL</label>
                  <input type="number" min="0" className={INP} style={inputStyle} placeholder="0"
                    value={mktForm.vslMeetingsBooked} onChange={e => setMktForm(p => ({ ...p, vslMeetingsBooked: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className={LBL}>Wyświetlenia reklamy</label>
                  <input type="number" min="0" className={INP} style={inputStyle} placeholder="0"
                    value={mktForm.dailyImpressions} onChange={e => setMktForm(p => ({ ...p, dailyImpressions: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={saveMkt} disabled={saving} style={saveBtnStyle}>
                {saving ? "Zapisywanie..." : "Zapisz"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Missing data panel — only for sprzedaz tab */}
      {tab === "sprzedaz" && missingClosers.length > 0 && (
        <div style={{ ...cardStyle, background: "rgba(255,85,85,0.04)", border: "1px solid rgba(255,85,85,0.18)" }}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--red)" }}>
            Brakujące dane (14 dni)
          </div>
          <div className="space-y-1.5">
            {missingClosers.slice(0, 10).map((m, i) => (
              <button
                key={i}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-all"
                style={{ background: "rgba(255,85,85,0.06)", border: "1px solid rgba(255,85,85,0.12)" }}
                onClick={() => { setCPersonId(m.person.id); setCDate(m.date); setTab("sprzedaz"); }}
              >
                <span style={{ color: "var(--text-primary)" }}>{m.person.name}</span>
                <span style={{ color: "var(--red)" }}>{m.date}</span>
              </button>
            ))}
            {missingClosers.length > 10 && (
              <div className="text-xs text-center pt-1" style={{ color: "var(--text-muted)" }}>
                +{missingClosers.length - 10} więcej
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
