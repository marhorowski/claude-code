"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useClient } from "../layout";
import { useSession } from "next-auth/react";
import { getISOWeek, getWeekBounds } from "@/lib/calculations";
import { formatDateShort, getMonthName } from "@/lib/utils";

interface TeamMember { id: string; name: string; role: string }
interface DailyFormData {
  id: string; userId: string; date: string;
  plannedMeetings: number | null; attendedMeetings: number | null;
  closings: number | null; revenue: number | null;
  callsMade: number | null; meetingsBooked: number | null;
  vslMeetingsBooked: number | null; dailyLeads: number | null; dailyAdSpend: number | null;
  notes: string | null;
  user: { id: string; name: string; role: string };
}
interface WeeklyFormData {
  weekNumber: number; year: number; totalLeads: number; totalCallsMade: number;
  totalMeetingsBooked: number; totalPlannedMeetings: number; totalAttended: number;
  totalClosings: number; totalRevenue: number; adSpend: number | null; notes: string | null;
}
interface MonthlyFormData {
  month: number; year: number; targetRevenue: number | null;
  enge: number | null; aov: number | null; ar: number | null; leadToClose: number | null; notes: string | null;
}
interface QuarterlyFormData {
  quarter: number; year: number; targetRevenue: number | null;
  ltv: number | null; alpvc: number | null; notes: string | null;
}
interface SalesSettings {
  dealSize: number; closerCommissionPct: number; setterCommissionPct: number;
  fixedMonthlyCosts: number; leadToMeetingRate: number;
}
interface KpiTarget { code: string; target: number }

type Tab = "closing" | "setting" | "marketing" | "weekly" | "monthly" | "quarterly";

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function toDateInput(d: Date) { return d.toISOString().split("T")[0]; }

const INP = "w-full text-sm px-3 py-2 rounded-lg input-dark";
const LBL = "block text-xs mb-1" + " " + "text-[#555]";

export default function DanePage() {
  const { selectedClientId } = useClient();
  const { data: session } = useSession();
  const [now] = useState(() => new Date());
  const { week: todayWeek, year: todayYear } = getISOWeek(now);
  const isMonday = now.getDay() === 1;
  const defWeek = isMonday ? (todayWeek === 1 ? 52 : todayWeek - 1) : todayWeek;
  const defWeekYear = isMonday && todayWeek === 1 ? todayYear - 1 : todayYear;

  const [tab, setTab] = useState<Tab>("closing");
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [daily, setDaily] = useState<DailyFormData[]>([]);
  const [weekly, setWeekly] = useState<WeeklyFormData[]>([]);
  const [monthly, setMonthly] = useState<MonthlyFormData[]>([]);
  const [quarterly, setQuarterly] = useState<QuarterlyFormData[]>([]);
  const [settings, setSettings] = useState<SalesSettings>({ dealSize: 0, closerCommissionPct: 0, setterCommissionPct: 0, fixedMonthlyCosts: 0, leadToMeetingRate: 0 });
  const [kpiTargets, setKpiTargets] = useState<KpiTarget[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Form states
  const [cPersonId, setCPersonId] = useState("");
  const [cDate, setCDate] = useState(toDateInput(now));
  const [cForm, setCForm] = useState({ plannedMeetings: "", attendedMeetings: "", closings: "", revenue: "", notes: "" });

  const [sPersonId, setSPersonId] = useState("");
  const [sDate, setSDate] = useState(toDateInput(now));
  const [sForm, setSForm] = useState({ callsMade: "", meetingsBooked: "", notes: "" });

  const [mktDate, setMktDate] = useState(toDateInput(now));
  const [mktForm, setMktForm] = useState({ vslMeetingsBooked: "", dailyLeads: "", dailyAdSpend: "" });

  const [wWeek, setWWeek] = useState(defWeek);
  const [wYear, setWYear] = useState(defWeekYear);
  const [wForm, setWForm] = useState({ totalLeads: "", adSpend: "", notes: "" });

  const [mMonth, setMMonth] = useState(now.getMonth() + 1);
  const [mYear, setMYear] = useState(now.getFullYear());
  const [mForm, setMForm] = useState({ targetRevenue: "", enge: "", aov: "", ar: "", leadToClose: "", notes: "" });

  const [qQuarter, setQQuarter] = useState(Math.ceil((now.getMonth() + 1) / 3));
  const [qYear, setQYear] = useState(now.getFullYear());
  const [qForm, setQForm] = useState({ targetRevenue: "", ltv: "", alpvc: "", notes: "" });

  const showMsg = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3000);
  };

  const fetchAll = useCallback(async () => {
    if (!selectedClientId) return;
    setLoading(true);
    try {
      const [t, d, w, m, q, ss, kt] = await Promise.all([
        fetch(`/api/team?clientId=${selectedClientId}`).then(r => r.json()),
        fetch(`/api/daily?clientId=${selectedClientId}`).then(r => r.json()),
        fetch(`/api/weekly?clientId=${selectedClientId}`).then(r => r.json()),
        fetch(`/api/monthly?clientId=${selectedClientId}`).then(r => r.json()),
        fetch(`/api/quarterly?clientId=${selectedClientId}`).then(r => r.json()),
        fetch(`/api/sales-settings?clientId=${selectedClientId}`).then(r => r.json()),
        fetch(`/api/kpi-targets?clientId=${selectedClientId}`).then(r => r.json()),
      ]);
      setTeam(Array.isArray(t) ? t : []);
      setDaily(Array.isArray(d) ? d : []);
      setWeekly(Array.isArray(w) ? w : []);
      setMonthly(Array.isArray(m) ? m : []);
      setQuarterly(Array.isArray(q) ? q : []);
      if (ss && !ss.error) setSettings(ss);
      setKpiTargets(Array.isArray(kt) ? kt : []);
    } catch {}
    setLoading(false);
  }, [selectedClientId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-fill closing form
  useEffect(() => {
    if (!cPersonId || !cDate) { setCForm({ plannedMeetings: "", attendedMeetings: "", closings: "", revenue: "", notes: "" }); return; }
    const ex = daily.find(f => f.userId === cPersonId && isSameDay(new Date(f.date), new Date(cDate)));
    if (ex) setCForm({ plannedMeetings: ex.plannedMeetings?.toString() ?? "", attendedMeetings: ex.attendedMeetings?.toString() ?? "", closings: ex.closings?.toString() ?? "", revenue: ex.revenue?.toString() ?? "", notes: ex.notes ?? "" });
    else setCForm({ plannedMeetings: "", attendedMeetings: "", closings: "", revenue: "", notes: "" });
  }, [cPersonId, cDate, daily]);

  // Auto-fill setting form
  useEffect(() => {
    if (!sPersonId || !sDate) { setSForm({ callsMade: "", meetingsBooked: "", notes: "" }); return; }
    const ex = daily.find(f => f.userId === sPersonId && isSameDay(new Date(f.date), new Date(sDate)));
    if (ex) setSForm({ callsMade: ex.callsMade?.toString() ?? "", meetingsBooked: ex.meetingsBooked?.toString() ?? "", notes: ex.notes ?? "" });
    else setSForm({ callsMade: "", meetingsBooked: "", notes: "" });
  }, [sPersonId, sDate, daily]);

  // Auto-fill marketing form
  useEffect(() => {
    if (!mktDate || !session?.user?.id) return;
    const ex = daily.find(f => f.userId === session.user.id && isSameDay(new Date(f.date), new Date(mktDate)) && (f.dailyLeads !== null || f.vslMeetingsBooked !== null || f.dailyAdSpend !== null));
    if (ex) setMktForm({ vslMeetingsBooked: ex.vslMeetingsBooked?.toString() ?? "", dailyLeads: ex.dailyLeads?.toString() ?? "", dailyAdSpend: ex.dailyAdSpend?.toString() ?? "" });
    else setMktForm({ vslMeetingsBooked: "", dailyLeads: "", dailyAdSpend: "" });
  }, [mktDate, daily, session?.user?.id]);

  // Auto-fill weekly form
  useEffect(() => {
    const ex = weekly.find(f => f.weekNumber === wWeek && f.year === wYear);
    if (ex) setWForm({ totalLeads: ex.totalLeads?.toString() ?? "", adSpend: ex.adSpend?.toString() ?? "", notes: ex.notes ?? "" });
    else setWForm({ totalLeads: "", adSpend: "", notes: "" });
  }, [wWeek, wYear, weekly]);

  // Auto-fill monthly form
  useEffect(() => {
    const ex = monthly.find(f => f.month === mMonth && f.year === mYear);
    if (ex) setMForm({ targetRevenue: ex.targetRevenue?.toString() ?? "", enge: ex.enge?.toString() ?? "", aov: ex.aov?.toString() ?? "", ar: ex.ar?.toString() ?? "", leadToClose: ex.leadToClose?.toString() ?? "", notes: ex.notes ?? "" });
    else setMForm({ targetRevenue: "", enge: "", aov: "", ar: "", leadToClose: "", notes: "" });
  }, [mMonth, mYear, monthly]);

  // Auto-fill quarterly form
  useEffect(() => {
    const ex = quarterly.find(f => f.quarter === qQuarter && f.year === qYear);
    if (ex) setQForm({ targetRevenue: ex.targetRevenue?.toString() ?? "", ltv: ex.ltv?.toString() ?? "", alpvc: ex.alpvc?.toString() ?? "", notes: ex.notes ?? "" });
    else setQForm({ targetRevenue: "", ltv: "", alpvc: "", notes: "" });
  }, [qQuarter, qYear, quarterly]);

  const post = async (url: string, body: object) => {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Błąd zapisu"); }
    return res.json();
  };

  const saveClosing = async () => {
    if (!cPersonId || !cDate || !selectedClientId) return;
    setSaving(true);
    try {
      await post("/api/daily", { clientId: selectedClientId, targetUserId: cPersonId, date: cDate, plannedMeetings: cForm.plannedMeetings ? +cForm.plannedMeetings : null, attendedMeetings: cForm.attendedMeetings ? +cForm.attendedMeetings : null, closings: cForm.closings ? +cForm.closings : null, revenue: cForm.revenue ? +cForm.revenue : null, notes: cForm.notes || null });
      showMsg("Zapisano!", true); fetchAll();
    } catch (e: any) { showMsg(e.message, false); }
    setSaving(false);
  };

  const saveMkt = async () => {
    if (!mktDate || !selectedClientId || !session?.user?.id) return;
    setSaving(true);
    try {
      await post("/api/daily", { clientId: selectedClientId, date: mktDate, vslMeetingsBooked: mktForm.vslMeetingsBooked ? +mktForm.vslMeetingsBooked : null, dailyLeads: mktForm.dailyLeads ? +mktForm.dailyLeads : null, dailyAdSpend: mktForm.dailyAdSpend ? +mktForm.dailyAdSpend : null });
      showMsg("Zapisano dane marketingowe!", true); fetchAll();
    } catch (e: any) { showMsg(e.message, false); }
    setSaving(false);
  };

  const saveSetting = async () => {
    if (!sPersonId || !sDate || !selectedClientId) return;
    setSaving(true);
    try {
      await post("/api/daily", { clientId: selectedClientId, targetUserId: sPersonId, date: sDate, callsMade: sForm.callsMade ? +sForm.callsMade : null, meetingsBooked: sForm.meetingsBooked ? +sForm.meetingsBooked : null, notes: sForm.notes || null });
      showMsg("Zapisano!", true); fetchAll();
    } catch (e: any) { showMsg(e.message, false); }
    setSaving(false);
  };

  const saveWeekly = async () => {
    if (!selectedClientId) return;
    setSaving(true);
    try {
      await post("/api/weekly", { clientId: selectedClientId, weekNumber: wWeek, year: wYear, totalLeads: wForm.totalLeads ? +wForm.totalLeads : 0, adSpend: wForm.adSpend ? +wForm.adSpend : null, notes: wForm.notes || null });
      showMsg("Zapisano dane tygodniowe!", true); fetchAll();
    } catch (e: any) { showMsg(e.message, false); }
    setSaving(false);
  };

  const saveMonthly = async () => {
    if (!selectedClientId) return;
    setSaving(true);
    try {
      await post("/api/monthly", { clientId: selectedClientId, month: mMonth, year: mYear, targetRevenue: mForm.targetRevenue ? +mForm.targetRevenue : null, enge: mForm.enge ? +mForm.enge : null, aov: mForm.aov ? +mForm.aov : null, ar: mForm.ar ? +mForm.ar : null, leadToClose: mForm.leadToClose ? +mForm.leadToClose : null, notes: mForm.notes || null });
      showMsg("Zapisano dane miesięczne!", true); fetchAll();
    } catch (e: any) { showMsg(e.message, false); }
    setSaving(false);
  };

  const saveQuarterly = async () => {
    if (!selectedClientId) return;
    setSaving(true);
    try {
      await post("/api/quarterly", { clientId: selectedClientId, quarter: qQuarter, year: qYear, targetRevenue: qForm.targetRevenue ? +qForm.targetRevenue : null, ltv: qForm.ltv ? +qForm.ltv : null, alpvc: qForm.alpvc ? +qForm.alpvc : null, notes: qForm.notes || null });
      showMsg("Zapisano dane kwartalne!", true); fetchAll();
    } catch (e: any) { showMsg(e.message, false); }
    setSaving(false);
  };

  const closers = useMemo(() => team.filter(m => m.role === "CLOSER"), [team]);
  const setters = useMemo(() => team.filter(m => m.role === "SETTER"), [team]);

  const missingC = useMemo(() => {
    const out: { person: TeamMember; date: Date }[] = [];
    for (let i = 1; i <= 30; i++) {
      const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(12, 0, 0, 0);
      for (const p of closers) { if (!daily.some(f => f.userId === p.id && isSameDay(new Date(f.date), d))) out.push({ person: p, date: new Date(d) }); }
    }
    return out.slice(0, 60);
  }, [closers, daily, now]);

  const missingS = useMemo(() => {
    const out: { person: TeamMember; date: Date }[] = [];
    for (let i = 1; i <= 30; i++) {
      const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(12, 0, 0, 0);
      for (const p of setters) { if (!daily.some(f => f.userId === p.id && isSameDay(new Date(f.date), d))) out.push({ person: p, date: new Date(d) }); }
    }
    return out.slice(0, 60);
  }, [setters, daily, now]);

  const missingW = useMemo(() => {
    const out: { week: number; year: number; label: string }[] = [];
    for (let i = 1; i <= 12; i++) {
      let w = todayWeek - i, y = todayYear;
      if (w < 1) { w += 52; y--; }
      if (!weekly.some(f => f.weekNumber === w && f.year === y)) {
        const { start, end } = getWeekBounds(w, y);
        out.push({ week: w, year: y, label: `Tydz. ${w} (${formatDateShort(start)}–${formatDateShort(end)}) ${y}` });
      }
    }
    return out;
  }, [weekly, todayWeek, todayYear]);

  const missingM = useMemo(() => {
    const out: { month: number; year: number }[] = [];
    for (let i = 1; i <= 12; i++) {
      let m = now.getMonth() + 1 - i, y = now.getFullYear();
      if (m < 1) { m += 12; y--; }
      if (!monthly.some(f => f.month === m && f.year === y)) out.push({ month: m, year: y });
    }
    return out;
  }, [monthly, now]);

  const missingQ = useMemo(() => {
    const out: { quarter: number; year: number }[] = [];
    const cq = Math.ceil((now.getMonth() + 1) / 3);
    for (let i = 1; i <= 4; i++) {
      let q = cq - i, y = now.getFullYear();
      if (q < 1) { q += 4; y--; }
      if (!quarterly.some(f => f.quarter === q && f.year === y)) out.push({ quarter: q, year: y });
    }
    return out;
  }, [quarterly, now]);

  const weekOpts = useMemo(() => {
    const opts: { week: number; year: number; label: string }[] = [];
    for (let i = 0; i < 26; i++) {
      let w = todayWeek - i, y = todayYear;
      if (w < 1) { w += 52; y--; }
      const { start, end } = getWeekBounds(w, y);
      opts.push({ week: w, year: y, label: `Tydz. ${w} (${formatDateShort(start)}–${formatDateShort(end)}) ${y}` });
    }
    return opts;
  }, [todayWeek, todayYear]);

  const curWeekData = weekly.find(f => f.weekNumber === wWeek && f.year === wYear);

  // Goal cascade for monthly
  const mCascade = useMemo(() => {
    const rev = parseFloat(mForm.targetRevenue) || 0;
    if (rev <= 0 || settings.dealSize <= 0) return null;
    const surTarget = kpiTargets.find(t => t.code === "SUR")?.target || 90;
    const cpTarget = kpiTargets.find(t => t.code === "CP")?.target || 60;
    const closings = rev / settings.dealSize;
    const attended = closings / (cpTarget / 100);
    const planned = attended / (surTarget / 100);
    const leads = settings.leadToMeetingRate > 0 ? planned / (settings.leadToMeetingRate / 100) : null;
    const closerComm = rev * settings.closerCommissionPct / 100;
    const setterComm = rev * settings.setterCommissionPct / 100;
    const cac = closings > 0 ? (closerComm + setterComm + settings.fixedMonthlyCosts) / closings : null;
    return { closings: Math.ceil(closings), attended: Math.ceil(attended), planned: Math.ceil(planned), leads: leads ? Math.ceil(leads) : null, closerComm, setterComm, cac };
  }, [mForm.targetRevenue, settings, kpiTargets]);

  const monthOpts = Array.from({ length: 12 }, (_, i) => {
    let m = now.getMonth() + 1 - i, y = now.getFullYear();
    if (m < 1) { m += 12; y--; }
    return { m, y };
  });

  const TABS: { id: Tab; label: string }[] = [
    { id: "closing", label: "Closing" },
    { id: "setting", label: "Setting" },
    { id: "marketing", label: "Marketing" },
    { id: "weekly", label: "Tygodniowy" },
    { id: "monthly", label: "Miesięczny" },
    { id: "quarterly", label: "Kwartalny" },
  ];

  if (loading) return <div className="text-center py-16" style={{ color: "#444" }}>Ładowanie...</div>;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Wprowadź dane</h1>
        {msg && (
          <div className={`px-4 py-2 rounded-lg text-sm font-medium ${msg.ok ? "badge-neon" : "badge-red"}`}>
            {msg.text}
          </div>
        )}
      </div>

      {/* Tab strip */}
      <div className="flex flex-wrap gap-1 p-1 rounded-xl" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={tab === t.id
              ? { background: "rgba(0,255,136,0.12)", color: "#00ff88", border: "1px solid rgba(0,255,136,0.3)" }
              : { color: "#555", background: "transparent", border: "1px solid transparent" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ===== FORM PANEL ===== */}
        <div className="lg:col-span-2 space-y-4">

          {/* CLOSING */}
          {tab === "closing" && (
            <div className="p-6 space-y-4 rounded-xl card">
              <h2 className="font-bold text-white text-sm tracking-wide uppercase" style={{ color: "#00ff88" }}>Dzienny — Closing</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LBL}>Closer *</label>
                  <select value={cPersonId} onChange={e => setCPersonId(e.target.value)} className={INP}>
                    <option value="">— wybierz closera —</option>
                    {closers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LBL}>Data *</label>
                  <input type="date" value={cDate} onChange={e => setCDate(e.target.value)} max={toDateInput(now)} className={INP} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={LBL}>Zaplanowane spotkania</label><input type="number" min="0" value={cForm.plannedMeetings} onChange={e => setCForm(p => ({ ...p, plannedMeetings: e.target.value }))} className={INP} placeholder="0" /></div>
                <div><label className={LBL}>Odbyłe spotkania</label><input type="number" min="0" value={cForm.attendedMeetings} onChange={e => setCForm(p => ({ ...p, attendedMeetings: e.target.value }))} className={INP} placeholder="0" /></div>
                <div><label className={LBL}>Zamknięcia</label><input type="number" min="0" value={cForm.closings} onChange={e => setCForm(p => ({ ...p, closings: e.target.value }))} className={INP} placeholder="0" /></div>
                <div><label className={LBL}>Przychód (PLN)</label><input type="number" min="0" step="0.01" value={cForm.revenue} onChange={e => setCForm(p => ({ ...p, revenue: e.target.value }))} className={INP} placeholder="0.00" /></div>
              </div>
              <div><label className={LBL}>Notatki</label><textarea value={cForm.notes} onChange={e => setCForm(p => ({ ...p, notes: e.target.value }))} className={`${INP} h-20 resize-none`} placeholder="Opcjonalne..." /></div>
              <button onClick={saveClosing} disabled={saving || !cPersonId || !cDate} className="btn-neon w-full py-2.5 disabled:opacity-40 disabled:cursor-not-allowed">
                {saving ? "Zapisywanie..." : "Zapisz"}
              </button>
            </div>
          )}

          {/* SETTING */}
          {tab === "setting" && (
            <div className="p-6 space-y-4 rounded-xl card">
              <h2 className="font-bold text-sm tracking-wide uppercase" style={{ color: "#00ff88" }}>Dzienny — Setting</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LBL}>Setter *</label>
                  <select value={sPersonId} onChange={e => setSPersonId(e.target.value)} className={INP}>
                    <option value="">— wybierz settera —</option>
                    {setters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LBL}>Data *</label>
                  <input type="date" value={sDate} onChange={e => setSDate(e.target.value)} max={toDateInput(now)} className={INP} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={LBL}>Wykonane telefony</label><input type="number" min="0" value={sForm.callsMade} onChange={e => setSForm(p => ({ ...p, callsMade: e.target.value }))} className={INP} placeholder="0" /></div>
                <div><label className={LBL}>Umówione spotkania</label><input type="number" min="0" value={sForm.meetingsBooked} onChange={e => setSForm(p => ({ ...p, meetingsBooked: e.target.value }))} className={INP} placeholder="0" /></div>
              </div>
              <div><label className={LBL}>Notatki</label><textarea value={sForm.notes} onChange={e => setSForm(p => ({ ...p, notes: e.target.value }))} className={`${INP} h-20 resize-none`} placeholder="Opcjonalne..." /></div>
              <button onClick={saveSetting} disabled={saving || !sPersonId || !sDate} className="btn-neon w-full py-2.5 disabled:opacity-40 disabled:cursor-not-allowed">
                {saving ? "Zapisywanie..." : "Zapisz"}
              </button>
            </div>
          )}

          {/* MARKETING */}
          {tab === "marketing" && (
            <div className="p-6 space-y-4 rounded-xl card">
              <h2 className="font-bold text-sm tracking-wide uppercase" style={{ color: "#00ff88" }}>Dzienny — Marketing</h2>
              <div>
                <label className={LBL}>Data *</label>
                <input type="date" value={mktDate} onChange={e => setMktDate(e.target.value)} max={toDateInput(now)} className={INP} />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div><label className={LBL}>Spotkania umówione z VSL</label><input type="number" min="0" value={mktForm.vslMeetingsBooked} onChange={e => setMktForm(p => ({ ...p, vslMeetingsBooked: e.target.value }))} className={INP} placeholder="0" /></div>
                <div><label className={LBL}>Liczba leadów</label><input type="number" min="0" value={mktForm.dailyLeads} onChange={e => setMktForm(p => ({ ...p, dailyLeads: e.target.value }))} className={INP} placeholder="0" /></div>
                <div><label className={LBL}>Dzienny Ad Spend (PLN)</label><input type="number" min="0" step="0.01" value={mktForm.dailyAdSpend} onChange={e => setMktForm(p => ({ ...p, dailyAdSpend: e.target.value }))} className={INP} placeholder="0.00" /></div>
              </div>
              <button onClick={saveMkt} disabled={saving || !mktDate} className="btn-neon w-full py-2.5 disabled:opacity-40 disabled:cursor-not-allowed">
                {saving ? "Zapisywanie..." : "Zapisz dane marketingowe"}
              </button>
            </div>
          )}

          {/* WEEKLY */}
          {tab === "weekly" && (
            <div className="p-6 space-y-4 rounded-xl card">
              <h2 className="font-bold text-sm tracking-wide uppercase" style={{ color: "#00ff88" }}>Tygodniowy</h2>
              <div>
                <label className={LBL}>Tydzień</label>
                <select value={`${wWeek}-${wYear}`} onChange={e => { const [w, y] = e.target.value.split("-").map(Number); setWWeek(w); setWYear(y); }} className={INP}>
                  {weekOpts.map(o => <option key={`${o.week}-${o.year}`} value={`${o.week}-${o.year}`}>{o.label}</option>)}
                </select>
              </div>
              {curWeekData && (
                <div className="rounded-lg p-4" style={{ background: "#080808", border: "1px solid #1a1a1a" }}>
                  <div className="text-xs mb-3" style={{ color: "#444" }}>Zagregowane z formularzy dziennych</div>
                  <div className="grid grid-cols-3 gap-3">
                    {[["Zaplanowane", curWeekData.totalPlannedMeetings], ["Odbyłe", curWeekData.totalAttended], ["Zamknięcia", curWeekData.totalClosings], ["Telefony", curWeekData.totalCallsMade], ["Umówione", curWeekData.totalMeetingsBooked], ["Przychód PLN", curWeekData.totalRevenue.toFixed(0)]].map(([l, v]) => (
                      <div key={String(l)}><div className="text-xs" style={{ color: "#444" }}>{l}</div><div className="text-white font-bold">{v}</div></div>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div><label className={LBL}>Liczba leadów</label><input type="number" min="0" value={wForm.totalLeads} onChange={e => setWForm(p => ({ ...p, totalLeads: e.target.value }))} className={INP} placeholder="0" /></div>
                <div><label className={LBL}>Ad Spend (PLN)</label><input type="number" min="0" step="0.01" value={wForm.adSpend} onChange={e => setWForm(p => ({ ...p, adSpend: e.target.value }))} className={INP} placeholder="0.00" /></div>
              </div>
              <div><label className={LBL}>Notatki / Podsumowanie tygodnia</label><textarea value={wForm.notes} onChange={e => setWForm(p => ({ ...p, notes: e.target.value }))} className={`${INP} h-20 resize-none`} placeholder="..." /></div>
              <button onClick={saveWeekly} disabled={saving} className="btn-neon w-full py-2.5 disabled:opacity-40">
                {saving ? "Zapisywanie..." : "Zapisz dane tygodniowe"}
              </button>
            </div>
          )}

          {/* MONTHLY */}
          {tab === "monthly" && (
            <div className="space-y-4">
              <div className="p-6 space-y-4 rounded-xl card">
                <h2 className="font-bold text-sm tracking-wide uppercase" style={{ color: "#00ff88" }}>Miesięczny</h2>
                <div>
                  <label className={LBL}>Miesiąc</label>
                  <select value={`${mMonth}-${mYear}`} onChange={e => { const [m, y] = e.target.value.split("-").map(Number); setMMonth(m); setMYear(y); }} className={INP}>
                    {monthOpts.map(o => <option key={`${o.m}-${o.y}`} value={`${o.m}-${o.y}`}>{getMonthName(o.m)} {o.y}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LBL}>Cel przychodowy (PLN)</label>
                  <input type="number" min="0" step="100" value={mForm.targetRevenue} onChange={e => setMForm(p => ({ ...p, targetRevenue: e.target.value }))} className={INP} placeholder="np. 250000" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={LBL}>ENGE — Engagement Rate (%)</label><input type="number" step="0.01" value={mForm.enge} onChange={e => setMForm(p => ({ ...p, enge: e.target.value }))} className={INP} placeholder="—" /></div>
                  <div><label className={LBL}>AOV — Average Order Value (PLN)</label><input type="number" step="0.01" value={mForm.aov} onChange={e => setMForm(p => ({ ...p, aov: e.target.value }))} className={INP} placeholder="—" /></div>
                  <div><label className={LBL}>AR — Ascension Rate (%)</label><input type="number" step="0.01" value={mForm.ar} onChange={e => setMForm(p => ({ ...p, ar: e.target.value }))} className={INP} placeholder="—" /></div>
                  <div><label className={LBL}>Lead to Close (dni)</label><input type="number" step="1" value={mForm.leadToClose} onChange={e => setMForm(p => ({ ...p, leadToClose: e.target.value }))} className={INP} placeholder="—" /></div>
                </div>
                <div><label className={LBL}>Notatki</label><textarea value={mForm.notes} onChange={e => setMForm(p => ({ ...p, notes: e.target.value }))} className={`${INP} h-20 resize-none`} placeholder="Podsumowanie miesiąca..." /></div>
                <button onClick={saveMonthly} disabled={saving} className="btn-neon w-full py-2.5 disabled:opacity-40">
                  {saving ? "Zapisywanie..." : "Zapisz dane miesięczne"}
                </button>
              </div>

              {/* Goal cascade */}
              {mCascade && (
                <div className="p-6 rounded-xl" style={{ background: "#0f0f0f", border: "1px solid rgba(0,255,136,0.2)" }}>
                  <h3 className="font-semibold mb-4 text-sm" style={{ color: "#00ff88" }}>Kaskada celu — {parseFloat(mForm.targetRevenue).toLocaleString("pl-PL")} PLN</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    <CascadeCard label="Domknięcia" value={String(mCascade.closings)} sub={`deal size: ${settings.dealSize.toLocaleString("pl-PL")} PLN`} />
                    <CascadeCard label="Odbyłe spotkania" value={String(mCascade.attended)} sub="wg celu CP" />
                    <CascadeCard label="Zaplanowane spotkania" value={String(mCascade.planned)} sub="wg celu SUR" />
                    {mCascade.leads && <CascadeCard label="Leady potrzebne" value={String(mCascade.leads)} sub={`konw. ${settings.leadToMeetingRate}%`} />}
                    <CascadeCard label="Prowizje closerów" value={`${mCascade.closerComm.toLocaleString("pl-PL", { maximumFractionDigits: 0 })} PLN`} sub={`${settings.closerCommissionPct}% przychodu`} />
                    <CascadeCard label="Prowizje setterów" value={`${mCascade.setterComm.toLocaleString("pl-PL", { maximumFractionDigits: 0 })} PLN`} sub={`${settings.setterCommissionPct}% przychodu`} />
                    {mCascade.cac && <CascadeCard label="Szacowane CAC" value={`${mCascade.cac.toLocaleString("pl-PL", { maximumFractionDigits: 0 })} PLN`} sub="bez ad spend" />}
                  </div>
                  {settings.dealSize === 0 && <p className="text-xs text-slate-500">Ustaw deal size w Ustawienia → Sprzedaż</p>}
                </div>
              )}
            </div>
          )}

          {/* QUARTERLY */}
          {tab === "quarterly" && (
            <div className="p-6 space-y-4 rounded-xl card">
              <h2 className="font-bold text-sm tracking-wide uppercase" style={{ color: "#00ff88" }}>Kwartalny</h2>
              <div>
                <label className={LBL}>Kwartał</label>
                <select value={`${qQuarter}-${qYear}`} onChange={e => { const [q, y] = e.target.value.split("-").map(Number); setQQuarter(q); setQYear(y); }} className={INP}>
                  {[1, 2, 3, 4].flatMap(q => [now.getFullYear(), now.getFullYear() - 1].map(y => ({ q, y }))).map(o => (
                    <option key={`${o.q}-${o.y}`} value={`${o.q}-${o.y}`}>Q{o.q} {o.y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LBL}>Cel kwartalny (PLN)</label>
                <input type="number" min="0" step="1000" value={qForm.targetRevenue} onChange={e => setQForm(p => ({ ...p, targetRevenue: e.target.value }))} className={INP} placeholder="np. 750000" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={LBL}>LTV — Lifetime Value (PLN)</label><input type="number" step="0.01" value={qForm.ltv} onChange={e => setQForm(p => ({ ...p, ltv: e.target.value }))} className={INP} placeholder="—" /></div>
                <div><label className={LBL}>ALPVC — Avg Lifetime Profit/Client (PLN)</label><input type="number" step="0.01" value={qForm.alpvc} onChange={e => setQForm(p => ({ ...p, alpvc: e.target.value }))} className={INP} placeholder="—" /></div>
              </div>
              <div><label className={LBL}>Notatki</label><textarea value={qForm.notes} onChange={e => setQForm(p => ({ ...p, notes: e.target.value }))} className={`${INP} h-20 resize-none`} placeholder="Podsumowanie kwartału..." /></div>
              <button onClick={saveQuarterly} disabled={saving} className="btn-neon w-full py-2.5 disabled:opacity-40">
                {saving ? "Zapisywanie..." : "Zapisz dane kwartalne"}
              </button>
            </div>
          )}
        </div>

        {/* ===== MISSING DATA PANEL ===== */}
        <div>
          <MissingPanel
            tab={tab}
            clientId={selectedClientId}
            missingC={missingC} missingS={missingS} missingW={missingW} missingM={missingM} missingQ={missingQ}
            onSelectC={(id, date) => { setCPersonId(id); setCDate(toDateInput(date)); }}
            onSelectS={(id, date) => { setSPersonId(id); setSDate(toDateInput(date)); }}
            onSelectW={(w, y) => { setWWeek(w); setWYear(y); }}
            onSelectM={(m, y) => { setMMonth(m); setMYear(y); }}
            onSelectQ={(q, y) => { setQQuarter(q); setQYear(y); }}
          />
        </div>
      </div>
    </div>
  );
}

function CascadeCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg p-3" style={{ background: "#080808", border: "1px solid #1a1a1a" }}>
      <div className="text-xs mb-1" style={{ color: "#444" }}>{label}</div>
      <div className="text-white font-bold text-lg">{value}</div>
      <div className="text-xs mt-0.5" style={{ color: "#333" }}>{sub}</div>
    </div>
  );
}

interface MissingItem { key: string; label: string; sub: string; action: () => void }

interface MissingPanelProps {
  tab: Tab;
  clientId: string;
  missingC: { person: TeamMember; date: Date }[];
  missingS: { person: TeamMember; date: Date }[];
  missingW: { week: number; year: number; label: string }[];
  missingM: { month: number; year: number }[];
  missingQ: { quarter: number; year: number }[];
  onSelectC: (id: string, date: Date) => void;
  onSelectS: (id: string, date: Date) => void;
  onSelectW: (week: number, year: number) => void;
  onSelectM: (month: number, year: number) => void;
  onSelectQ: (quarter: number, year: number) => void;
}

function MissingPanel({ tab, clientId, missingC, missingS, missingW, missingM, missingQ, onSelectC, onSelectS, onSelectW, onSelectM, onSelectQ }: MissingPanelProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!clientId) return;
    fetch(`/api/dismissed-alerts?clientId=${clientId}`)
      .then((r) => r.json())
      .then((keys: string[]) => setDismissed(new Set(Array.isArray(keys) ? keys : [])))
      .catch(() => {});
  }, [clientId]);

  const dismiss = (key: string) => {
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    fetch("/api/dismissed-alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, alertKey: key }),
    }).catch(() => {});
  };

  const allItems: MissingItem[] =
    tab === "closing" ? missingC.map(m => ({ key: `c_${m.person.id}_${m.date.toISOString().split("T")[0]}`, label: m.person.name, sub: m.date.toLocaleDateString("pl-PL"), action: () => onSelectC(m.person.id, m.date) })) :
    tab === "setting" ? missingS.map(m => ({ key: `s_${m.person.id}_${m.date.toISOString().split("T")[0]}`, label: m.person.name, sub: m.date.toLocaleDateString("pl-PL"), action: () => onSelectS(m.person.id, m.date) })) :
    tab === "marketing" ? [] :
    tab === "weekly" ? missingW.map(m => ({ key: `w_${m.week}_${m.year}`, label: m.label, sub: "", action: () => onSelectW(m.week, m.year) })) :
    tab === "monthly" ? missingM.map(m => ({ key: `m_${m.month}_${m.year}`, label: `${getMonthName(m.month)} ${m.year}`, sub: "", action: () => onSelectM(m.month, m.year) })) :
    missingQ.map(m => ({ key: `q_${m.quarter}_${m.year}`, label: `Q${m.quarter} ${m.year}`, sub: "", action: () => onSelectQ(m.quarter, m.year) }));

  const items = allItems.filter(i => !dismissed.has(i.key));

  return (
    <div className="rounded-xl overflow-hidden sticky top-4" style={{ background: "#0f0f0f", border: "1px solid #1a1a1a" }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #1a1a1a" }}>
        <h3 className="font-semibold text-white text-sm">Brakujące dane</h3>
        {items.length > 0 && <span className="badge badge-red">{items.length}</span>}
      </div>
      <div className="max-h-[60vh] overflow-y-auto">
        {tab === "marketing" ? (
          <div className="p-6 text-center text-xs" style={{ color: "#444" }}>Marketing — brak alertów</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-sm font-medium" style={{ color: "#00ff88" }}>Wszystko uzupełnione</div>
          </div>
        ) : (
          <ul>
            {items.map(item => (
              <li key={item.key} className="flex items-center gap-2 px-4 py-2.5 transition-colors hover:bg-[#1a1a1a]" style={{ borderBottom: "1px solid #141414" }}>
                <span className="dot-red flex-shrink-0" />
                <div className="flex-1 cursor-pointer" onClick={item.action}>
                  <div className="text-xs font-medium" style={{ color: "#ff4444" }}>{item.label}</div>
                  {item.sub && <div className="text-xs" style={{ color: "#ff444466" }}>{item.sub}</div>}
                </div>
                <button
                  onClick={() => dismiss(item.key)}
                  className="text-xs px-1.5 py-0.5 rounded transition-colors flex-shrink-0"
                  style={{ color: "#333", background: "#1a1a1a" }}
                  title="Pomiń"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
