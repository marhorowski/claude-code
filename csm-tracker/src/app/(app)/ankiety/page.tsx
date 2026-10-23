"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/AppContext";
import { Card, MonthPicker, Notice, PageTitle } from "@/components/ui";
import { CSAT_STAGES, stageLabel } from "@/lib/surveys";
import { MONTHS_PL } from "@/lib/dates";

interface Link { id: string; token: string; type: string; stage: string | null; label: string; active: boolean; csm: { id: string; name: string } | null; _count: { responses: number } }
interface Resp { id: string; type: string; stage: string | null; score: number; company: string; comment: string | null; createdAt: string; link: { label: string; csm: { name: string } | null } }

function scoreColor(type: string, s: number) {
  if (type === "NPS") return s >= 9 ? "var(--neon)" : s >= 7 ? "var(--orange)" : "var(--red)";
  return s >= 4 ? "var(--neon)" : s === 3 ? "var(--orange)" : "var(--red)";
}

export default function SurveysPage() {
  const { isLeader, users } = useApp();
  const now = new Date();
  const [links, setLinks] = useState<Link[]>([]);
  const [type, setType] = useState<"NPS" | "CSAT">("NPS");
  const [stage, setStage] = useState<string>("ONBOARDING");
  const [csmId, setCsmId] = useState("");
  const [label, setLabel] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [responses, setResponses] = useState<Resp[]>([]);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const loadLinks = () => fetch("/api/survey-links").then((r) => (r.ok ? r.json() : [])).then(setLinks);
  useEffect(() => { if (isLeader) loadLinks(); }, [isLeader]);
  useEffect(() => {
    if (!isLeader) return;
    fetch(`/api/survey-responses?year=${year}&month=${month}`).then((r) => (r.ok ? r.json() : [])).then(setResponses);
  }, [year, month, isLeader]);

  if (!isLeader) return <p style={{ color: "var(--text-muted)" }}>Ten widok jest dostępny dla lidera CSM.</p>;

  async function create() {
    setMsg(null);
    const res = await fetch("/api/survey-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, stage: type === "CSAT" ? stage : null, csmId, label }),
    });
    if (!res.ok) return setMsg({ kind: "error", text: (await res.json()).error ?? "Błąd" });
    setLabel("");
    setMsg({ kind: "ok", text: "Link utworzony." });
    loadLinks();
  }

  async function toggle(l: Link) {
    await fetch(`/api/survey-links/${l.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !l.active }) });
    loadLinks();
  }

  async function remove(l: Link) {
    if (!confirm(`Usunąć link „${l.label}” razem z ${l._count.responses} odpowiedziami?`)) return;
    await fetch(`/api/survey-links/${l.id}`, { method: "DELETE" });
    loadLinks();
  }

  function copy(l: Link) {
    navigator.clipboard?.writeText(`${origin}/a/${l.token}`);
    setMsg({ kind: "ok", text: `Skopiowano link: ${l.label}` });
  }

  const nps = responses.filter((r) => r.type === "NPS");
  const csat = responses.filter((r) => r.type === "CSAT");
  const npsScore = nps.length ? Math.round(((nps.filter((r) => r.score >= 9).length - nps.filter((r) => r.score <= 6).length) / nps.length) * 100) : null;
  const csatScore = csat.length ? Math.round((csat.filter((r) => r.score >= 4).length / csat.length) * 100) : null;

  return (
    <div className="space-y-6">
      <PageTitle title="Ankiety NPS / CSAT" subtitle="Osobne publiczne linki dla NPS i dla każdego etapu CSAT. Odpowiedzi trafiają automatycznie do KPI." />

      <Card title="Nowy link" description="Przypisz link do CSM, żeby NPS i CSAT liczyły się też w jego portfelu.">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className="block"><span className="lbl">Typ</span>
            <select className="input-dark" value={type} onChange={(e) => setType(e.target.value as "NPS" | "CSAT")}>
              <option value="NPS">NPS (0–10, co kwartał)</option>
              <option value="CSAT">CSAT (1–5, po etapie)</option>
            </select>
          </label>
          {type === "CSAT" && (
            <label className="block"><span className="lbl">Etap</span>
              <select className="input-dark" value={stage} onChange={(e) => setStage(e.target.value)}>
                {CSAT_STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
          )}
          <label className="block"><span className="lbl">CSM</span>
            <select className="input-dark" value={csmId} onChange={(e) => setCsmId(e.target.value)}>
              <option value="">— cała agencja —</option>
              {users.filter((u) => u.active).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </label>
          <label className="block"><span className="lbl">Nazwa (opcjonalnie)</span>
            <input className="input-dark" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="np. NPS Q4 — Anna" />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <button className="btn-neon" onClick={create}>Utwórz link</button>
          {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
        </div>
      </Card>

      <Card title={`Linki (${links.length})`}>
        {links.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Brak linków.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="kpi-table w-full text-sm">
              <thead><tr><th className="text-left">Nazwa</th><th className="text-left">Typ</th><th className="text-left">CSM</th><th className="text-right">Odp.</th><th className="text-left">Status</th><th /></tr></thead>
              <tbody>
                {links.map((l) => (
                  <tr key={l.id}>
                    <td style={{ color: "var(--text-primary)", fontWeight: 600 }}>{l.label}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{l.type}{l.stage ? ` · ${stageLabel(l.stage)}` : ""}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{l.csm?.name ?? "—"}</td>
                    <td className="text-right" style={{ color: "var(--text-secondary)" }}>{l._count.responses}</td>
                    <td><span className={`badge ${l.active ? "badge-neon" : "badge-red"}`}>{l.active ? "aktywny" : "zamknięty"}</span></td>
                    <td className="text-right whitespace-nowrap space-x-2">
                      <button className="btn-ghost" onClick={() => copy(l)}>Kopiuj link</button>
                      <button className="btn-ghost" onClick={() => toggle(l)}>{l.active ? "Zamknij" : "Otwórz"}</button>
                      <button className="btn-ghost" style={{ color: "var(--red)" }} onClick={() => remove(l)}>Usuń</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        title={`Odpowiedzi · ${MONTHS_PL[month - 1]} ${year}`}
        description={`NPS z miesiąca: ${npsScore ?? "—"} (${nps.length} odp.) · CSAT: ${csatScore === null ? "—" : `${csatScore}%`} (${csat.length} odp.). Wyniki kwartalne są w raporcie KPI.`}
        right={<MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />}
      >
        {responses.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Brak odpowiedzi w tym miesiącu.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="kpi-table w-full text-sm">
              <thead><tr><th className="text-left">Data</th><th className="text-left">Firma</th><th className="text-left">Ankieta</th><th className="text-right">Ocena</th><th className="text-left">Komentarz</th></tr></thead>
              <tbody>
                {responses.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap" style={{ color: "var(--text-muted)" }}>{new Date(r.createdAt).toLocaleDateString("pl-PL")}</td>
                    <td style={{ color: "var(--text-primary)", fontWeight: 600 }}>{r.company}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{r.link.label}{r.link.csm ? ` · ${r.link.csm.name}` : ""}</td>
                    <td className="text-right" style={{ color: scoreColor(r.type, r.score), fontWeight: 800 }}>{r.score}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{r.comment ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
