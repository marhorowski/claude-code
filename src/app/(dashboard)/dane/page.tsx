"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useClient } from "../layout";
import { useSession } from "next-auth/react";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  calcPickupRate, calcBookingRate,
  calcCPM, calcCTR, calcCPC, calcCPL,
  calcVslBookingRate, calcCostPerCallMarketing,
} from "@/lib/calculations";

interface TeamMember { id: string; name: string; role: string }
interface DailyFormData {
  id: string; userId: string; date: string;
  // Closing
  plannedMeetings: number | null; attendedMeetings: number | null;
  cancelledMeetings: number | null; postponedMeetings: number | null;
  noShows: number | null; closings: number | null; revenue: number | null;
  followUpsDone: number | null; followUpClosings: number | null;
  // Setting
  callsMade: number | null; conductedCalls: number | null; meetingsBooked: number | null;
  // Marketing
  dailyAdSpend: number | null; dailyImpressions: number | null;
  dailyClicks: number | null; dailyLeads: number | null;
  optinConversion: number | null; vslMeetingsBooked: number | null;
  notes: string | null;
  user: { id: string; name: string; role: string };
}
interface SalesSettings { dealSize: number }

type Tab = "sprzedaz" | "setting" | "marketing";

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}
function toDateInput(d: Date) { return d.toISOString().split("T")[0]; }
function fmt(n: number, decimals = 1) { return isNaN(n) || !isFinite(n) ? "—" : n.toFixed(decimals); }

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

  // Closing form
  const [cPersonId, setCPersonId] = useState("");
  const [cDate, setCDate] = useState(toDateInput(now));
  const [cForm, setCForm] = useState({
    plannedMeetings: "", attendedMeetings: "",
    cancelledMeetings: "", postponedMeetings: "", noShows: "",
    closings: "", revenue: "",
    followUpsDone: "", followUpClosings: "",
    notes: "",
  });
  const [revSuggested, setRevSuggested] = useState(false);

  // Setting form
  const [sPersonId, setSPersonId] = useState("");
  const [sDate, setSDate] = useState(toDateInput(now));
  const [sForm, setSForm] = useState({
    callsMade: "", conductedCalls: "", meetingsBooked: "", notes: "",
  });

  // Marketing form
  const [mktDate, setMktDate] = useState(toDateInput(now));
  const [mktForm, setMktForm] = useState({
    dailyAdSpend: "", dailyImpressions: "", dailyClicks: "",
    dailyLeads: "", optinConversion: "", vslMeetingsBooked: "",
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

  // Auto-fill closing form
  useEffect(() => {
    if (!cPersonId || !cDate) {
      setCForm({ plannedMeetings: "", attendedMeetings: "", cancelledMeetings: "", postponedMeetings: "", noShows: "", closings: "", revenue: "", followUpsDone: "", followUpClosings: "", notes: "" });
      setRevSuggested(false);
      return;
    }
    const ex = daily.find(f => f.userId === cPersonId && isSameDay(new Date(f.date), new Date(cDate)));
    if (ex) {
      setCForm({
        plannedMeetings: ex.plannedMeetings?.toString() ?? "",
        attendedMeetings: ex.attendedMeetings?.toString() ?? "",
        cancelledMeetings: ex.cancelledMeetings?.toString() ?? "",
        postponedMeetings: ex.postponedMeetings?.toString() ?? "",
        noShows: ex.noShows?.toString() ?? "",
        closings: ex.closings?.toString() ?? "",
        revenue: ex.revenue?.toString() ?? "",
        followUpsDone: ex.followUpsDone?.toString() ?? "",
        followUpClosings: ex.followUpClosings?.toString() ?? "",
        notes: ex.notes ?? "",
      });
      setRevSuggested(false);
    } else {
      setCForm({ plannedMeetings: "", attendedMeetings: "", cancelledMeetings: "", postponedMeetings: "", noShows: "", closings: "", revenue: "", followUpsDone: "", followUpClosings: "", notes: "" });
      setRevSuggested(false);
    }
  }, [cPersonId, cDate, daily]);

  // Auto-suggest revenue from closings
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

  // Auto-fill setting form
  useEffect(() => {
    if (!sPersonId || !sDate) {
      setSForm({ callsMade: "", conductedCalls: "", meetingsBooked: "", notes: "" });
      return;
    }
    const ex = daily.find(f => f.userId === sPersonId && isSameDay(new Date(f.date), new Date(sDate)));
    if (ex) {
      setSForm({
        callsMade: ex.callsMade?.toString() ?? "",
        conductedCalls: ex.conductedCalls?.toString() ?? "",
        meetingsBooked: ex.meetingsBooked?.toString() ?? "",
        notes: ex.notes ?? "",
      });
    } else {
      setSForm({ callsMade: "", conductedCalls: "", meetingsBooked: "", notes: "" });
    }
  }, [sPersonId, sDate, daily]);

  // Auto-fill marketing form
  useEffect(() => {
    const ex = daily.find(f =>
      isSameDay(new Date(f.date), new Date(mktDate)) &&
      (f.dailyLeads !== null || f.dailyAdSpend !== null || f.vslMeetingsBooked !== null)
    );
    if (ex) {
      setMktForm({
        dailyAdSpend: ex.dailyAdSpend?.toString() ?? "",
        dailyImpressions: ex.dailyImpressions?.toString() ?? "",
        dailyClicks: ex.dailyClicks?.toString() ?? "",
        dailyLeads: ex.dailyLeads?.toString() ?? "",
        optinConversion: ex.optinConversion?.toString() ?? "",
        vslMeetingsBooked: ex.vslMeetingsBooked?.toString() ?? "",
      });
    } else {
      setMktForm({ dailyAdSpend: "", dailyImpressions: "", dailyClicks: "", dailyLeads: "", optinConversion: "", vslMeetingsBooked: "" });
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
        plannedMeetings: cForm.plannedMeetings ? +cForm.plannedMeetings : null,
        attendedMeetings: cForm.attendedMeetings ? +cForm.attendedMeetings : null,
        cancelledMeetings: cForm.cancelledMeetings ? +cForm.cancelledMeetings : null,
        postponedMeetings: cForm.postponedMeetings ? +cForm.postponedMeetings : null,
        noShows: cForm.noShows ? +cForm.noShows : null,
        closings: cForm.closings ? +cForm.closings : null,
        revenue: cForm.revenue ? +cForm.revenue : null,
        followUpsDone: cForm.followUpsDone ? +cForm.followUpsDone : null,
        followUpClosings: cForm.followUpClosings ? +cForm.followUpClosings : null,
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
        conductedCalls: sForm.conductedCalls ? +sForm.conductedCalls : null,
        meetingsBooked: sForm.meetingsBooked ? +sForm.meetingsBooked : null,
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
      await post("/api/daily", {
        clientId: selectedClientId, date: mktDate,
        dailyAdSpend: mktForm.dailyAdSpend ? +mktForm.dailyAdSpend : null,
        dailyImpressions: mktForm.dailyImpressions ? +mktForm.dailyImpressions : null,
        dailyClicks: mktForm.dailyClicks ? +mktForm.dailyClicks : null,
        dailyLeads: mktForm.dailyLeads ? +mktForm.dailyLeads : null,
        optinConversion: mktForm.optinConversion ? +mktForm.optinConversion : null,
        vslMeetingsBooked: mktForm.vslMeetingsBooked ? +mktForm.vslMeetingsBooked : null,
      });
      showMsg("Zapisano dane marketingowe!", true);
      fetchAll();
    } catch (e: any) { showMsg(e.message, false); }
    setSaving(false);
  };

  const closers = useMemo(() => team.filter(m => m.role === "CLOSER"), [team]);
  const setters = useMemo(() => team.filter(m => m.role === "SETTER"), [team]);

  // Calculated setting KPIs
  const pickupRate = sForm.callsMade && sForm.conductedCalls
    ? calcPickupRate(+sForm.conductedCalls, +sForm.callsMade) : null;
  const bookingRate = sForm.callsMade && sForm.meetingsBooked
    ? calcBookingRate(+sForm.meetingsBooked, +sForm.callsMade) : null;

  // Calculated marketing KPIs
  const cpm = mktForm.dailyAdSpend && mktForm.dailyImpressions
    ? calcCPM(+mktForm.dailyAdSpend, +mktForm.dailyImpressions) : null;
  const ctr = mktForm.dailyClicks && mktForm.dailyImpressions
    ? calcCTR(+mktForm.dailyClicks, +mktForm.dailyImpressions) : null;
  const cpc = mktForm.dailyAdSpend && mktForm.dailyClicks
    ? calcCPC(+mktForm.dailyAdSpend, +mktForm.dailyClicks) : null;
  const cpl = mktForm.dailyAdSpend && mktForm.dailyLeads
    ? calcCPL(+mktForm.dailyAdSpend, +mktForm.dailyLeads) : null;
  const vslRate = mktForm.vslMeetingsBooked && mktForm.dailyLeads
    ? calcVslBookingRate(+mktForm.vslMeetingsBooked, +mktForm.dailyLeads) : null;
  const costPerCall = mktForm.dailyAdSpend && mktForm.vslMeetingsBooked
    ? calcCostPerCallMarketing(+mktForm.dailyAdSpend, +mktForm.vslMeetingsBooked) : null;

  // Missing data panel
  const missingClosers = useMemo(() => {
    const out: { person: TeamMember; date: string }[] = [];
    for (let i = 1; i <= 14; i++) {
      const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(12, 0, 0, 0);
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      for (const p of closers) {
        if (!daily.some(f => f.userId === p.id && isSameDay(new Date(f.date), d)))
          out.push({ person: p, date: toDateInput(d) });
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
    background: "var(--bg-card)", border: "1px solid var(--border-card)",
    borderRadius: "1rem", padding: "1.5rem",
  };
  const inputStyle = {
    background: "var(--bg-input)", border: "1px solid var(--border-card)",
    color: "var(--text-primary)", borderRadius: "0.5rem",
  };
  const saveBtnStyle = {
    background: "var(--neon)", color: "#000", fontWeight: 700, fontSize: "0.875rem",
    padding: "0.625rem 1.5rem", borderRadius: "0.5rem",
    cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, border: "none",
  };
  const calcRowStyle = {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "0.5rem 0.75rem", borderRadius: "0.5rem",
    background: "var(--bg-elevated)", border: "1px solid var(--border-card)",
    fontSize: "0.8rem",
  };

  return (
    <div className="space-y-6 fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Wprowadź dane</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Raportowanie dzienne — dane agregują się automatycznie
        </p>
      </div>

      {msg && (
        <div className="px-4 py-3 rounded-xl text-sm font-medium" style={{
          background: msg.ok ? "rgba(0,255,136,0.08)" : "rgba(255,85,85,0.08)",
          border: `1px solid ${msg.ok ? "var(--neon-border)" : "rgba(255,85,85,0.3)"}`,
          color: msg.ok ? "var(--neon)" : "var(--red)",
        }}>
          {msg.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-card)" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 flex items-center justify-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-all"
            style={tab === t.id
              ? { background: "var(--neon-dim)", color: "var(--neon)", border: "1px solid var(--neon-border)" }
              : { color: "var(--text-muted)", border: "1px solid transparent" }
            }
          >
            <span>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── SPRZEDAŻ ── */}
      {tab === "sprzedaz" && (
        <div style={cardStyle}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: "var(--text-muted)" }}>
            Raport sprzedażowy (dzienny)
          </div>

          <div className="space-y-4">
            <div>
              <label className={LBL}>Closer</label>
              <select className={INP} style={inputStyle} value={cPersonId} onChange={e => setCPersonId(e.target.value)}>
                <option value="">— wybierz closera —</option>
                {closers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {closers.length === 0 && (
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Brak closerów. Dodaj w Ustawieniach.</p>
              )}
            </div>

            <div>
              <label className={LBL}>Data</label>
              <DatePicker value={cDate} onChange={v => { setCDate(v); setRevSuggested(false); }} max={new Date().toISOString().split("T")[0]} className={INP} style={inputStyle} />
            </div>

            <div className="border-t pt-4" style={{ borderColor: "var(--border-card)" }}>
              <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>Spotkania</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LBL}>Zaplanowane (pierwsze)</label>
                  <input type="number" min="0" className={INP} style={inputStyle} placeholder="0"
                    value={cForm.plannedMeetings} onChange={e => setCForm(p => ({ ...p, plannedMeetings: e.target.value }))} />
                </div>
                <div>
                  <label className={LBL}>Odbyte</label>
                  <input type="number" min="0" className={INP} style={inputStyle} placeholder="0"
                    value={cForm.attendedMeetings} onChange={e => setCForm(p => ({ ...p, attendedMeetings: e.target.value }))} />
                </div>
                <div>
                  <label className={LBL}>Odwołane</label>
                  <input type="number" min="0" className={INP} style={inputStyle} placeholder="0"
                    value={cForm.cancelledMeetings} onChange={e => setCForm(p => ({ ...p, cancelledMeetings: e.target.value }))} />
                </div>
                <div>
                  <label className={LBL}>Przełożone</label>
                  <input type="number" min="0" className={INP} style={inputStyle} placeholder="0"
                    value={cForm.postponedMeetings} onChange={e => setCForm(p => ({ ...p, postponedMeetings: e.target.value }))} />
                </div>
                <div>
                  <label className={LBL}>No show</label>
                  <input type="number" min="0" className={INP} style={inputStyle} placeholder="0"
                    value={cForm.noShows} onChange={e => setCForm(p => ({ ...p, noShows: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="border-t pt-4" style={{ borderColor: "var(--border-card)" }}>
              <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>Sprzedaż</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LBL}>Domknięte sprzedaże</label>
                  <input type="number" min="0" className={INP} style={inputStyle} placeholder="0"
                    value={cForm.closings}
                    onChange={e => { setCForm(p => ({ ...p, closings: e.target.value })); setRevSuggested(false); }} />
                </div>
                <div>
                  <label className={LBL}>
                    Przychód netto (PLN)
                    {revSuggested && settings.dealSize > 0 && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full" style={{ background: "var(--neon-dim)", color: "var(--neon)", border: "1px solid var(--neon-border)" }}>auto</span>
                    )}
                  </label>
                  <input type="number" min="0" className={INP} style={inputStyle}
                    placeholder={settings.dealSize > 0 ? `${settings.dealSize} × zamknięcia` : "0"}
                    value={cForm.revenue}
                    onChange={e => { setCForm(p => ({ ...p, revenue: e.target.value })); setRevSuggested(false); }} />
                </div>
              </div>
            </div>

            <div className="border-t pt-4" style={{ borderColor: "var(--border-card)" }}>
              <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>Follow-upy</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LBL}>Follow-upy odbyte</label>
                  <input type="number" min="0" className={INP} style={inputStyle} placeholder="0"
                    value={cForm.followUpsDone} onChange={e => setCForm(p => ({ ...p, followUpsDone: e.target.value }))} />
                </div>
                <div>
                  <label className={LBL}>Domknięcia z follow-upów</label>
                  <input type="number" min="0" className={INP} style={inputStyle} placeholder="0"
                    value={cForm.followUpClosings} onChange={e => setCForm(p => ({ ...p, followUpClosings: e.target.value }))} />
                </div>
              </div>
            </div>

            <div>
              <label className={LBL}>Notatki</label>
              <textarea className={INP} style={{ ...inputStyle, resize: "vertical", minHeight: "72px" }} placeholder="opcjonalnie"
                value={cForm.notes} onChange={e => setCForm(p => ({ ...p, notes: e.target.value }))} />
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={saveClosing} disabled={saving || !cPersonId} style={saveBtnStyle}>
                {saving ? "Zapisywanie..." : "Zapisz"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SETTING ── */}
      {tab === "setting" && (
        <div style={cardStyle}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: "var(--text-muted)" }}>
            Raport settingowy (dzienny)
          </div>

          <div className="space-y-4">
            <div>
              <label className={LBL}>Setter</label>
              <select className={INP} style={inputStyle} value={sPersonId} onChange={e => setSPersonId(e.target.value)}>
                <option value="">— wybierz settera —</option>
                {setters.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {setters.length === 0 && (
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Brak setterów. Dodaj w Ustawieniach.</p>
              )}
            </div>

            <div>
              <label className={LBL}>Data</label>
              <DatePicker value={sDate} onChange={setSDate} max={new Date().toISOString().split("T")[0]} className={INP} style={inputStyle} />
            </div>

            <div className="border-t pt-4" style={{ borderColor: "var(--border-card)" }}>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={LBL}>Wykonane telefony</label>
                  <input type="number" min="0" className={INP} style={inputStyle} placeholder="0"
                    value={sForm.callsMade} onChange={e => setSForm(p => ({ ...p, callsMade: e.target.value }))} />
                </div>
                <div>
                  <label className={LBL}>Przeprowadzone rozmowy</label>
                  <input type="number" min="0" className={INP} style={inputStyle} placeholder="0"
                    value={sForm.conductedCalls} onChange={e => setSForm(p => ({ ...p, conductedCalls: e.target.value }))} />
                </div>
                <div>
                  <label className={LBL}>Umówione spotkania</label>
                  <input type="number" min="0" className={INP} style={inputStyle} placeholder="0"
                    value={sForm.meetingsBooked} onChange={e => setSForm(p => ({ ...p, meetingsBooked: e.target.value }))} />
                </div>
              </div>

              {/* Live calculated KPIs */}
              {(pickupRate !== null || bookingRate !== null) && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {pickupRate !== null && (
                    <div style={calcRowStyle}>
                      <span style={{ color: "var(--text-muted)" }}>Pickup rate</span>
                      <span style={{ color: "var(--neon)", fontWeight: 600 }}>{fmt(pickupRate)}%</span>
                    </div>
                  )}
                  {bookingRate !== null && (
                    <div style={calcRowStyle}>
                      <span style={{ color: "var(--text-muted)" }}>Booking rate</span>
                      <span style={{ color: "var(--neon)", fontWeight: 600 }}>{fmt(bookingRate)}%</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className={LBL}>Notatki</label>
              <textarea className={INP} style={{ ...inputStyle, resize: "vertical", minHeight: "72px" }} placeholder="opcjonalnie"
                value={sForm.notes} onChange={e => setSForm(p => ({ ...p, notes: e.target.value }))} />
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={saveSetting} disabled={saving || !sPersonId} style={saveBtnStyle}>
                {saving ? "Zapisywanie..." : "Zapisz"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MARKETING ── */}
      {tab === "marketing" && (
        <div style={cardStyle}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: "var(--text-muted)" }}>
            Raport marketingowy (dzienny)
          </div>

          <div className="space-y-4">
            <div>
              <label className={LBL}>Data</label>
              <DatePicker value={mktDate} onChange={setMktDate} max={new Date().toISOString().split("T")[0]} className={INP} style={inputStyle} />
            </div>

            <div className="border-t pt-4" style={{ borderColor: "var(--border-card)" }}>
              <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>Dane reklamowe</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LBL}>Wydatek na reklamy (PLN)</label>
                  <input type="number" min="0" step="0.01" className={INP} style={inputStyle} placeholder="0.00"
                    value={mktForm.dailyAdSpend} onChange={e => setMktForm(p => ({ ...p, dailyAdSpend: e.target.value }))} />
                </div>
                <div>
                  <label className={LBL}>Wyświetlenia</label>
                  <input type="number" min="0" className={INP} style={inputStyle} placeholder="0"
                    value={mktForm.dailyImpressions} onChange={e => setMktForm(p => ({ ...p, dailyImpressions: e.target.value }))} />
                </div>
                <div>
                  <label className={LBL}>Unikatowe kliknięcia linku</label>
                  <input type="number" min="0" className={INP} style={inputStyle} placeholder="0"
                    value={mktForm.dailyClicks} onChange={e => setMktForm(p => ({ ...p, dailyClicks: e.target.value }))} />
                </div>
                <div>
                  <label className={LBL}>Liczba leadów</label>
                  <input type="number" min="0" className={INP} style={inputStyle} placeholder="0"
                    value={mktForm.dailyLeads} onChange={e => setMktForm(p => ({ ...p, dailyLeads: e.target.value }))} />
                </div>
                <div>
                  <label className={LBL}>Konwersja Optin Page (%)</label>
                  <input type="number" min="0" max="100" step="0.1" className={INP} style={inputStyle} placeholder="0.0"
                    value={mktForm.optinConversion} onChange={e => setMktForm(p => ({ ...p, optinConversion: e.target.value }))} />
                </div>
                <div>
                  <label className={LBL}>Umówione rozmowy z VSL</label>
                  <input type="number" min="0" className={INP} style={inputStyle} placeholder="0"
                    value={mktForm.vslMeetingsBooked} onChange={e => setMktForm(p => ({ ...p, vslMeetingsBooked: e.target.value }))} />
                </div>
              </div>

              {/* Live calculated KPIs */}
              {(cpm !== null || ctr !== null || cpc !== null || cpl !== null || vslRate !== null || costPerCall !== null) && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {cpm !== null && (
                    <div style={calcRowStyle}>
                      <span style={{ color: "var(--text-muted)" }}>CPM</span>
                      <span style={{ color: "var(--neon)", fontWeight: 600 }}>{fmt(cpm)} PLN</span>
                    </div>
                  )}
                  {ctr !== null && (
                    <div style={calcRowStyle}>
                      <span style={{ color: "var(--text-muted)" }}>CTR</span>
                      <span style={{ color: "var(--neon)", fontWeight: 600 }}>{fmt(ctr, 2)}%</span>
                    </div>
                  )}
                  {cpc !== null && (
                    <div style={calcRowStyle}>
                      <span style={{ color: "var(--text-muted)" }}>CPC</span>
                      <span style={{ color: "var(--neon)", fontWeight: 600 }}>{fmt(cpc)} PLN</span>
                    </div>
                  )}
                  {cpl !== null && (
                    <div style={calcRowStyle}>
                      <span style={{ color: "var(--text-muted)" }}>CPL</span>
                      <span style={{ color: "var(--neon)", fontWeight: 600 }}>{fmt(cpl)} PLN</span>
                    </div>
                  )}
                  {vslRate !== null && (
                    <div style={calcRowStyle}>
                      <span style={{ color: "var(--text-muted)" }}>VSL Booking Rate</span>
                      <span style={{ color: "var(--neon)", fontWeight: 600 }}>{fmt(vslRate)}%</span>
                    </div>
                  )}
                  {costPerCall !== null && (
                    <div style={calcRowStyle}>
                      <span style={{ color: "var(--text-muted)" }}>Koszt za rozmowę</span>
                      <span style={{ color: "var(--neon)", fontWeight: 600 }}>{fmt(costPerCall)} PLN</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={saveMkt} disabled={saving} style={saveBtnStyle}>
                {saving ? "Zapisywanie..." : "Zapisz"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Missing data panel */}
      {tab === "sprzedaz" && missingClosers.length > 0 && (
        <div style={{ ...cardStyle, background: "rgba(255,85,85,0.04)", border: "1px solid rgba(255,85,85,0.18)" }}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--red)" }}>
            Brakujące dane (14 dni)
          </div>
          <div className="space-y-1.5">
            {missingClosers.slice(0, 10).map((m, i) => (
              <button key={i}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left"
                style={{ background: "rgba(255,85,85,0.06)", border: "1px solid rgba(255,85,85,0.12)" }}
                onClick={() => { setCPersonId(m.person.id); setCDate(m.date); }}
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
