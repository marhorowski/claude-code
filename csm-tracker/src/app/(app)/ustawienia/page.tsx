"use client";

import { useEffect, useState } from "react";
import { useApp, type AppUser } from "@/components/AppContext";
import { Card, Notice, PageTitle } from "@/components/ui";
import { AREAS } from "@/lib/kpis";
import type { Thresholds } from "@/lib/grading";

type Msg = { kind: "ok" | "error"; text: string } | null;

async function send(url: string, method: string, body?: unknown): Promise<{ ok: boolean; data: any }> {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}

function MyAccount() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<Msg>(null);
  async function save() {
    const r = await send("/api/me/password", "POST", { current, next });
    setMsg(r.ok ? { kind: "ok", text: "Hasło zmienione." } : { kind: "error", text: r.data.error ?? "Błąd" });
    if (r.ok) { setCurrent(""); setNext(""); }
  }
  return (
    <Card title="Moje konto" description="Zmiana hasła">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
        <label className="block"><span className="lbl">Obecne hasło</span><input className="input-dark" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} /></label>
        <label className="block"><span className="lbl">Nowe hasło (min. 8 znaków)</span><input className="input-dark" type="password" value={next} onChange={(e) => setNext(e.target.value)} /></label>
        <button className="btn-neon" onClick={save}>Zmień hasło</button>
      </div>
      {msg && <div className="mt-3"><Notice kind={msg.kind}>{msg.text}</Notice></div>}
    </Card>
  );
}

function Users() {
  const { users, reloadUsers, me } = useApp();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "CSM", fte: "1" });
  const [msg, setMsg] = useState<Msg>(null);

  async function add() {
    const r = await send("/api/users", "POST", { ...form, fte: Number(form.fte.replace(",", ".")) });
    setMsg(r.ok ? { kind: "ok", text: `Dodano: ${r.data.name}` } : { kind: "error", text: r.data.error ?? "Błąd" });
    if (r.ok) { setForm({ name: "", email: "", password: "", role: "CSM", fte: "1" }); reloadUsers(); }
  }
  async function patch(u: AppUser, body: Record<string, unknown>) {
    const r = await send(`/api/users/${u.id}`, "PATCH", body);
    setMsg(r.ok ? { kind: "ok", text: `Zapisano: ${u.name}` } : { kind: "error", text: r.data.error ?? "Błąd" });
    reloadUsers();
  }
  async function resetPassword(u: AppUser) {
    const pwd = prompt(`Nowe hasło dla ${u.name} (min. 8 znaków):`);
    if (pwd) patch(u, { password: pwd });
  }
  async function remove(u: AppUser) {
    if (!confirm(`Usunąć ${u.name} razem z jego formularzami? Zamiast tego możesz go dezaktywować.`)) return;
    const r = await send(`/api/users/${u.id}`, "DELETE");
    setMsg(r.ok ? { kind: "ok", text: `Usunięto: ${u.name}` } : { kind: "error", text: r.data.error ?? "Błąd" });
    reloadUsers();
  }

  return (
    <Card title="Użytkownicy" description="Etat (FTE) służy do KPI „Klienci na CSM”. Lider bez własnego portfela: etat 0.">
      <div className="overflow-x-auto mb-5">
        <table className="kpi-table w-full text-sm">
          <thead><tr><th className="text-left">Osoba</th><th className="text-left">Rola</th><th className="text-right">Etat</th><th className="text-left">Status</th><th /></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td><div style={{ color: "var(--text-primary)", fontWeight: 600 }}>{u.name}</div><div className="text-xs" style={{ color: "var(--text-muted)" }}>{u.email}</div></td>
                <td>
                  <select className="input-dark" style={{ width: "auto" }} value={u.role} disabled={u.id === me?.id} onChange={(e) => patch(u, { role: e.target.value })}>
                    <option value="CSM">CSM</option><option value="LIDER">Lider CSM</option>
                  </select>
                </td>
                <td className="text-right">
                  <input className="input-dark text-right" style={{ width: 70 }} defaultValue={String(u.fte).replace(".", ",")}
                    onBlur={(e) => { const v = Number(e.target.value.replace(",", ".")); if (v !== u.fte) patch(u, { fte: v }); }} />
                </td>
                <td>
                  <button className="badge" style={{ color: u.active ? "var(--neon)" : "var(--red)", border: "1px solid var(--border-card)" }} disabled={u.id === me?.id} onClick={() => patch(u, { active: !u.active })}>
                    {u.active ? "aktywny" : "nieaktywny"}
                  </button>
                </td>
                <td className="text-right whitespace-nowrap space-x-2">
                  <button className="btn-ghost" onClick={() => resetPassword(u)}>Hasło</button>
                  {u.id !== me?.id && <button className="btn-ghost" style={{ color: "var(--red)" }} onClick={() => remove(u)}>Usuń</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
        <label className="block lg:col-span-1"><span className="lbl">Imię i nazwisko</span><input className="input-dark" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label className="block lg:col-span-1"><span className="lbl">Email</span><input className="input-dark" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label className="block lg:col-span-1"><span className="lbl">Hasło startowe</span><input className="input-dark" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        <label className="block"><span className="lbl">Rola</span>
          <select className="input-dark" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="CSM">CSM</option><option value="LIDER">Lider CSM</option></select>
        </label>
        <label className="block"><span className="lbl">Etat</span><input className="input-dark" value={form.fte} onChange={(e) => setForm({ ...form, fte: e.target.value })} /></label>
        <button className="btn-neon" onClick={add}>Dodaj osobę</button>
      </div>
      {msg && <div className="mt-3"><Notice kind={msg.kind}>{msg.text}</Notice></div>}
    </Card>
  );
}

interface TargetRow { code: string; label: string; area: string; unit: string; lowerIsBetter: boolean; defaultTarget: number; target: number }

function Targets() {
  const [rows, setRows] = useState<TargetRow[]>([]);
  const [edit, setEdit] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<Msg>(null);
  const load = () => fetch("/api/targets").then((r) => r.json()).then((d: TargetRow[]) => {
    setRows(d);
    setEdit(Object.fromEntries(d.map((r) => [r.code, String(r.target).replace(".", ",")])));
  });
  useEffect(() => { load(); }, []);

  async function save() {
    const targets = Object.fromEntries(rows.map((r) => {
      const v = edit[r.code]?.trim();
      return [r.code, v === "" ? null : Number(v.replace(",", "."))];
    }));
    const r = await send("/api/targets", "PUT", { targets });
    setMsg(r.ok ? { kind: "ok", text: "Zapisano standardy." } : { kind: "error", text: r.data.error ?? "Błąd" });
    if (r.ok) load();
  }

  return (
    <Card title="Standardy KPI (100% normy)" description="Domyślnie wartości z dokumentu KPI działu CSM. Po 90 dniach danych warto je skalibrować do własnej bazy. Puste pole = standard domyślny.">
      {AREAS.map((a) => (
        <div key={a.id} className="mb-5">
          <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-label)" }}>{a.title}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {rows.filter((r) => r.area === a.id).map((r) => (
              <label key={r.code} className="block">
                <span className="lbl">{r.label} ({r.lowerIsBetter ? "≤" : "≥"}, {r.unit})</span>
                <input className="input-dark" value={edit[r.code] ?? ""} onChange={(e) => setEdit({ ...edit, [r.code]: e.target.value.replace(/[^\d.,-]/g, "") })} placeholder={String(r.defaultTarget)} />
                {r.target !== r.defaultTarget && <span className="block mt-1 text-xs" style={{ color: "var(--orange)" }}>Zmieniony (domyślnie {String(r.defaultTarget).replace(".", ",")})</span>}
              </label>
            ))}
          </div>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-neon" onClick={save}>Zapisz standardy</button>
        {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      </div>
    </Card>
  );
}

function Grading() {
  const [t, setT] = useState<Thresholds | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  useEffect(() => { fetch("/api/settings").then((r) => r.json()).then((d) => setT(d.thresholds)); }, []);
  if (!t) return null;
  async function save() {
    const r = await send("/api/settings", "PUT", { thresholds: t });
    setMsg(r.ok ? { kind: "ok", text: "Zapisano progi." } : { kind: "error", text: r.data.error ?? "Błąd" });
  }
  const field = (k: keyof Thresholds, label: string) => (
    <label className="block"><span className="lbl">{label}</span>
      <input className="input-dark" type="number" value={t[k]} onChange={(e) => setT({ ...t, [k]: Number(e.target.value) })} />
    </label>
  );
  return (
    <Card title="Progi gradingu (% normy)" description={`🔴 poniżej ${t.orange}% · 🟠 ${t.orange}–${t.green}% · 🟢 ${t.green}–${t.god}% · 🥇 powyżej ${t.god}%. Dla metryk „niżej = lepiej” % normy = norma / wynik.`}>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
        {field("orange", "Pomarańczowy od")}
        {field("green", "Zielony od")}
        {field("god", "God Mode powyżej")}
        <button className="btn-neon" onClick={save}>Zapisz progi</button>
      </div>
      {msg && <div className="mt-3"><Notice kind={msg.kind}>{msg.text}</Notice></div>}
    </Card>
  );
}

export default function SettingsPage() {
  const { isLeader } = useApp();
  return (
    <div className="space-y-6">
      <PageTitle title="Ustawienia" />
      <MyAccount />
      {isLeader && (
        <>
          <Users />
          <Grading />
          <Targets />
        </>
      )}
    </div>
  );
}
