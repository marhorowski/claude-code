"use client";

import { useState, useEffect } from "react";
import { useClient } from "../layout";
import { useSession } from "next-auth/react";
import { Toast } from "@/components/ui/Toast";

interface Client { id: string; name: string; strategy: string }
interface User {
  id: string; email: string; name: string; role: string;
  clients: Array<{ client: { id: string; name: string } }>;
}
interface KpiTarget {
  id: string; code: string; label: string; target: number;
  unit: string; period: string; lowerIsBetter: boolean; visible: boolean;
}
interface SalesSettings {
  dealSize: number; closerCommissionPct: number; setterCommissionPct: number;
  fixedMonthlyCosts: number; leadToMeetingRate: number;
  setterBookingRate: number; vslConversionRate: number;
}
interface FormToken {
  id: string; token: string; label: string; userId: string | null; createdAt: string;
}

const MANDATORY_CODES = ["SUR", "CP", "CLOSINGS", "REVENUE", "MEETINGS_ATTENDED", "MEETINGS_BOOKED", "LEADS"];
const TABS = ["Klienci", "Użytkownicy", "Cele KPI", "Sprzedaż", "Tokeny", "Moje konto"];

export default function UstawieniaPage() {
  const { selectedClientId, clients: contextClients } = useClient();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [activeTab, setActiveTab] = useState(isAdmin ? "Klienci" : "Moje konto");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);

  const [allClients, setAllClients] = useState<Client[]>([]);
  const [newClientName, setNewClientName] = useState("");
  const [newClientStrategy, setNewClientStrategy] = useState("Paid Lead Gen");
  const [showNewClientForm, setShowNewClientForm] = useState(false);

  const [users, setUsers] = useState<User[]>([]);
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", name: "", password: "", role: "CLOSER", clientIds: [] as string[] });

  const [kpiTargets, setKpiTargets] = useState<KpiTarget[]>([]);
  const [kpiClientId, setKpiClientId] = useState(selectedClientId);
  const [editedTargets, setEditedTargets] = useState<Record<string, { target?: string; visible?: boolean }>>({});

  const [salesClientId, setSalesClientId] = useState(selectedClientId);
  const [salesSettings, setSalesSettings] = useState<SalesSettings>({ dealSize: 0, closerCommissionPct: 0, setterCommissionPct: 0, fixedMonthlyCosts: 0, leadToMeetingRate: 0, setterBookingRate: 0, vslConversionRate: 0 });

  const [myName, setMyName] = useState(session?.user?.name || "");
  const [myPassword, setMyPassword] = useState("");
  const [myPasswordConfirm, setMyPasswordConfirm] = useState("");

  const [tokenClientId, setTokenClientId] = useState(selectedClientId);
  const [tokens, setTokens] = useState<FormToken[]>([]);
  const [newTokenLabel, setNewTokenLabel] = useState("");
  const [newTokenUserId, setNewTokenUserId] = useState("");
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) fetchClients();
    if (isAdmin || session?.user?.role === "LIDER") fetchUsers();
  }, [isAdmin, session?.user?.role]);

  useEffect(() => { if (kpiClientId) fetchKpiTargets(kpiClientId); }, [kpiClientId]);
  useEffect(() => { setKpiClientId(selectedClientId); setSalesClientId(selectedClientId); setTokenClientId(selectedClientId); }, [selectedClientId]);
  useEffect(() => { if (salesClientId) fetchSalesSettings(salesClientId); }, [salesClientId]);
  useEffect(() => { if (tokenClientId) fetchTokens(tokenClientId); }, [tokenClientId]);

  async function fetchClients() {
    const r = await fetch("/api/clients");
    setAllClients(Array.isArray(await r.json()) ? await fetch("/api/clients").then(x => x.json()) : []);
    const data = await fetch("/api/clients").then(x => x.json());
    setAllClients(Array.isArray(data) ? data : []);
  }

  async function fetchUsers() {
    const data = await fetch("/api/users").then(r => r.json());
    setUsers(Array.isArray(data) ? data : []);
  }

  async function fetchKpiTargets(cid: string) {
    const data = await fetch(`/api/kpi-targets?clientId=${cid}`).then(r => r.json());
    setKpiTargets(Array.isArray(data) ? data : []);
    setEditedTargets({});
  }

  async function fetchSalesSettings(cid: string) {
    const data = await fetch(`/api/sales-settings?clientId=${cid}`).then(r => r.json());
    if (data && !data.error) setSalesSettings(data);
  }

  async function fetchTokens(cid: string) {
    const data = await fetch(`/api/form-tokens?clientId=${cid}`).then(r => r.json());
    setTokens(Array.isArray(data) ? data : []);
  }

  async function addToken() {
    if (!tokenClientId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/form-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: tokenClientId, label: newTokenLabel, userId: newTokenUserId || null }),
      });
      if (!res.ok) throw new Error();
      setToast({ msg: "Token wygenerowany ✓", type: "success" });
      setNewTokenLabel(""); setNewTokenUserId("");
      fetchTokens(tokenClientId);
    } catch { setToast({ msg: "Błąd generowania tokenu", type: "error" }); }
    setLoading(false);
  }

  async function deleteToken(id: string) {
    if (!confirm("Usunąć ten token?")) return;
    try {
      const res = await fetch(`/api/form-tokens?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setToast({ msg: "Token usunięty", type: "success" });
      fetchTokens(tokenClientId);
    } catch { setToast({ msg: "Błąd usuwania", type: "error" }); }
  }

  function copyToken(token: string, id: string) {
    const url = `${window.location.origin}/f/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedTokenId(id);
      setTimeout(() => setCopiedTokenId(null), 2000);
    });
  }

  async function addClient() {
    if (!newClientName.trim()) { setToast({ msg: "Podaj nazwę klienta", type: "error" }); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newClientName, strategy: newClientStrategy }) });
      if (!res.ok) throw new Error();
      setToast({ msg: "Klient dodany ✓", type: "success" });
      setShowNewClientForm(false); setNewClientName("");
      fetchClients();
    } catch { setToast({ msg: "Błąd dodawania klienta", type: "error" }); }
    setLoading(false);
  }

  async function addUser() {
    if (!newUser.email || !newUser.name || !newUser.password) { setToast({ msg: "Wypełnij wszystkie pola", type: "error" }); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newUser) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Błąd"); }
      setToast({ msg: "Użytkownik dodany ✓", type: "success" });
      setShowNewUserForm(false);
      setNewUser({ email: "", name: "", password: "", role: "CLOSER", clientIds: [] });
      fetchUsers();
    } catch (err: any) { setToast({ msg: err.message || "Błąd zapisu", type: "error" }); }
    setLoading(false);
  }

  async function deleteUser(id: string) {
    if (!confirm("Czy na pewno chcesz usunąć tego użytkownika?")) return;
    try {
      const res = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setToast({ msg: "Użytkownik usunięty", type: "success" }); fetchUsers();
    } catch { setToast({ msg: "Błąd usuwania", type: "error" }); }
  }

  async function saveKpiTargets() {
    if (Object.keys(editedTargets).length === 0) { setToast({ msg: "Brak zmian", type: "error" }); return; }
    setLoading(true);
    try {
      const targets = Object.entries(editedTargets).map(([id, v]) => ({ id, ...v, target: v.target !== undefined ? parseFloat(v.target) : undefined }));
      const res = await fetch("/api/kpi-targets", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targets }) });
      if (!res.ok) throw new Error();
      setToast({ msg: "Zapisano ✓", type: "success" });
      setEditedTargets({}); fetchKpiTargets(kpiClientId);
    } catch { setToast({ msg: "Błąd zapisu", type: "error" }); }
    setLoading(false);
  }

  async function saveSalesSettings() {
    setLoading(true);
    try {
      const res = await fetch("/api/sales-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId: salesClientId, ...salesSettings }) });
      if (!res.ok) throw new Error();
      setToast({ msg: "Ustawienia sprzedaży zapisane ✓", type: "success" });
    } catch { setToast({ msg: "Błąd zapisu", type: "error" }); }
    setLoading(false);
  }

  async function saveMyAccount() {
    if (myPassword && myPassword !== myPasswordConfirm) { setToast({ msg: "Hasła nie są zgodne", type: "error" }); return; }
    setLoading(true);
    try {
      const body: any = { id: session?.user?.id };
      if (myName) body.name = myName;
      if (myPassword) body.password = myPassword;
      const res = await fetch("/api/users", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      setToast({ msg: "Dane konta zapisane ✓", type: "success" });
      setMyPassword(""); setMyPasswordConfirm("");
    } catch { setToast({ msg: "Błąd zapisu", type: "error" }); }
    setLoading(false);
  }

  const isLider = session?.user?.role === "LIDER";
  const isAdminOrLider = isAdmin || isLider;
  const tabs = isAdmin ? TABS : isLider ? ["Użytkownicy", "Tokeny", "Moje konto"] : ["Moje konto"];
  const periodOrder = ["WEEKLY", "MONTHLY", "QUARTERLY"];
  const groupedTargets = periodOrder.reduce((acc, p) => { acc[p] = kpiTargets.filter(t => t.period === p); return acc; }, {} as Record<string, KpiTarget[]>);
  const periodLabels: Record<string, string> = { WEEKLY: "Tygodniowe", MONTHLY: "Miesięczne", QUARTERLY: "Kwartalne" };
  const INP = "w-full rounded-xl px-3 py-2 text-sm";
  const INP_STYLE = { background: "var(--bg-input)", border: "1px solid var(--border-card)", color: "var(--text-primary)" };
  const LBL = "block text-xs mb-1";

  return (
    <div className="space-y-6 fade-in">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Ustawienia</h1>

      <div className="flex gap-1 rounded-xl p-1 overflow-x-auto" style={{ background: "var(--bg-input)", border: "1px solid var(--border-card)" }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
            style={activeTab === t ? { background: "var(--neon)", color: "#000" } : { color: "var(--text-muted)" }}>
            {t}
          </button>
        ))}
      </div>

      {/* KLIENCI */}
      {activeTab === "Klienci" && isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Klienci</h2>
            <button onClick={() => setShowNewClientForm(!showNewClientForm)} className="bg-indigo-500/20 border border-indigo-500/40 hover:bg-indigo-500/30 text-sm font-medium rounded-xl px-4 py-2" style={{ color: "var(--neon)" }}>+ Dodaj klienta</button>
          </div>
          {showNewClientForm && (
            <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div><label className={LBL} style={{ color: "var(--text-muted)" }}>Nazwa klienta *</label><input value={newClientName} onChange={e => setNewClientName(e.target.value)} className={INP} style={INP_STYLE} placeholder="Nazwa firmy" /></div>
                <div><label className={LBL} style={{ color: "var(--text-muted)" }}>Strategia</label><input value={newClientStrategy} onChange={e => setNewClientStrategy(e.target.value)} className={INP} style={INP_STYLE} placeholder="Paid Lead Gen" /></div>
              </div>
              <div className="flex gap-3">
                <button onClick={addClient} disabled={loading} className="disabled:opacity-60 font-semibold rounded-xl px-5 py-2.5 text-sm" style={{ background: "var(--neon)", color: "#000" }}>Dodaj</button>
                <button onClick={() => setShowNewClientForm(false)} className="text-sm px-4 py-2.5" style={{ color: "var(--text-muted)" }}>Anuluj</button>
              </div>
            </div>
          )}
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
            {allClients.length === 0 ? <div className="p-8 text-center" style={{ color: "var(--text-muted)" }}>Brak klientów</div> : (
              <table className="w-full kpi-table">
                <thead><tr><th>Nazwa</th><th>Strategia</th></tr></thead>
                <tbody>{allClients.map(c => <tr key={c.id}><td className="font-medium" style={{ color: "var(--text-primary)" }}>{c.name}</td><td style={{ color: "var(--text-muted)" }}>{c.strategy}</td></tr>)}</tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* UŻYTKOWNICY */}
      {activeTab === "Użytkownicy" && isAdminOrLider && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Użytkownicy</h2>
            <button onClick={() => setShowNewUserForm(!showNewUserForm)} className="bg-indigo-500/20 border border-indigo-500/40 hover:bg-indigo-500/30 text-sm font-medium rounded-xl px-4 py-2" style={{ color: "var(--neon)" }}>+ Dodaj użytkownika</button>
          </div>
          {showNewUserForm && (
            <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div><label className={LBL} style={{ color: "var(--text-muted)" }}>Imię i nazwisko *</label><input value={newUser.name} onChange={e => setNewUser(u => ({ ...u, name: e.target.value }))} className={INP} style={INP_STYLE} /></div>
                <div><label className={LBL} style={{ color: "var(--text-muted)" }}>Email *</label><input type="email" value={newUser.email} onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))} className={INP} style={INP_STYLE} /></div>
                <div><label className={LBL} style={{ color: "var(--text-muted)" }}>Hasło tymczasowe *</label><input type="password" value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} className={INP} style={INP_STYLE} /></div>
                <div>
                  <label className={LBL} style={{ color: "var(--text-muted)" }}>Rola *</label>
                  <select value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))} className={INP} style={INP_STYLE}>
                    <option value="CLOSER">Closer</option>
                    <option value="SETTER">Setter</option>
                    {isAdmin && <option value="LIDER">Lider Sprzedaży</option>}
                    {isAdmin && <option value="ADMIN">Admin</option>}
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className={LBL} style={{ color: "var(--text-muted)" }}>Przypisz do klientów</label>
                <div className="flex flex-wrap gap-2">
                  {allClients.map(c => (
                    <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={newUser.clientIds.includes(c.id)} onChange={e => setNewUser(u => ({ ...u, clientIds: e.target.checked ? [...u.clientIds, c.id] : u.clientIds.filter(id => id !== c.id) }))} className="rounded" />
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={addUser} disabled={loading} className="disabled:opacity-60 font-semibold rounded-xl px-5 py-2.5 text-sm" style={{ background: "var(--neon)", color: "#000" }}>Dodaj</button>
                <button onClick={() => setShowNewUserForm(false)} className="text-sm px-4 py-2.5" style={{ color: "var(--text-muted)" }}>Anuluj</button>
              </div>
            </div>
          )}
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
            {users.length === 0 ? <div className="p-8 text-center" style={{ color: "var(--text-muted)" }}>Brak użytkowników</div> : (
              <table className="w-full kpi-table">
                <thead><tr><th>Imię</th><th>Email</th><th>Rola</th><th>Klienci</th><th></th></tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td className="font-medium" style={{ color: "var(--text-primary)" }}>{u.name}</td>
                      <td className="text-sm" style={{ color: "var(--text-muted)" }}>{u.email}</td>
                      <td><span className="text-xs bg-indigo-500/20 px-2 py-0.5 rounded-lg" style={{ color: "var(--neon)" }}>{u.role}</span></td>
                      <td className="text-sm" style={{ color: "var(--text-muted)" }}>{u.clients.map(ca => ca.client.name).join(", ") || "—"}</td>
                      <td>{u.id !== session?.user?.id && <button onClick={() => deleteUser(u.id)} className="text-red-400 hover:text-red-300 text-xs">Usuń</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* CELE KPI */}
      {activeTab === "Cele KPI" && isAdmin && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Cele KPI</h2>
            <div className="flex items-center gap-3">
              <select value={kpiClientId} onChange={e => setKpiClientId(e.target.value)} className="rounded-xl px-3 py-2 text-sm" style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)", color: "var(--text-primary)" }}>
                {allClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button onClick={saveKpiTargets} disabled={loading || Object.keys(editedTargets).length === 0} className="disabled:opacity-60 font-semibold rounded-xl px-4 py-2 text-sm" style={{ background: "var(--neon)", color: "#000" }}>Zapisz zmiany</button>
            </div>
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Zaznaczone KPI widoczne na dashboardzie. Szare gwiazdki (*) — zawsze widoczne, nie można ukryć.</p>
          {Object.entries(groupedTargets).map(([period, targets]) => targets.length > 0 && (
            <div key={period} className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
              <div className="px-6 py-3" style={{ borderBottom: "1px solid var(--border-card)" }}>
                <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>{periodLabels[period]}</h3>
              </div>
              <table className="w-full kpi-table">
                <thead><tr><th>KPI</th><th>Kod</th><th>Cel</th><th>Jednostka</th><th>Widoczny</th></tr></thead>
                <tbody>
                  {targets.map(t => {
                    const isMandatory = MANDATORY_CODES.includes(t.code);
                    const edited = editedTargets[t.id] || {};
                    const currentVisible = edited.visible !== undefined ? edited.visible : t.visible;
                    return (
                      <tr key={t.id}>
                        <td style={{ color: "var(--text-primary)" }}>{t.label}</td>
                        <td className="text-xs" style={{ color: "var(--text-muted)" }}>{t.code}</td>
                        <td>
                          <input type="number" step="0.01"
                            value={edited.target !== undefined ? edited.target : t.target}
                            onChange={e => setEditedTargets(p => ({ ...p, [t.id]: { ...p[t.id], target: e.target.value } }))}
                            className="w-24 rounded-lg px-2 py-1 text-sm"
                            style={{ background: "var(--bg-input)", border: "1px solid var(--border-card)", color: "var(--text-primary)" }} />
                        </td>
                        <td style={{ color: "var(--text-muted)" }}>{t.unit}</td>
                        <td>
                          {isMandatory ? (
                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>* zawsze</span>
                          ) : (
                            <input type="checkbox" checked={currentVisible}
                              onChange={e => setEditedTargets(p => ({ ...p, [t.id]: { ...p[t.id], visible: e.target.checked } }))}
                              className="w-4 h-4 rounded accent-indigo-500" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* SPRZEDAŻ */}
      {activeTab === "Sprzedaż" && isAdmin && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Ustawienia sprzedaży</h2>
            <select value={salesClientId} onChange={e => setSalesClientId(e.target.value)} className="rounded-xl px-3 py-2 text-sm" style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)", color: "var(--text-primary)" }}>
              {allClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="rounded-2xl p-6 space-y-5 max-w-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Te ustawienia są używane do obliczania kaskady celów i szacowanego CAC.</p>
            {[
              { key: "dealSize", label: "Deal size (PLN)", help: "Średnia wartość jednej sprzedaży", step: "100", placeholder: "10000" },
              { key: "closerCommissionPct", label: "Prowizja closera (%)", help: "Procent od wartości sprzedaży", step: "0.1", placeholder: "10" },
              { key: "setterCommissionPct", label: "Prowizja settera (%)", help: "Procent od wartości sprzedaży", step: "0.1", placeholder: "5" },
              { key: "fixedMonthlyCosts", label: "Stałe koszty działu sprzedaży / mies. (PLN)", help: "Pensje, narzędzia, biuro itp. (bez prowizji i ad spend)", step: "100", placeholder: "8000" },
              { key: "setterBookingRate", label: "Skuteczność settera (%)", help: "Ile % leadów setter umawia na spotkanie", step: "0.1", placeholder: "15" },
              { key: "vslConversionRate", label: "Skuteczność VSL (%)", help: "Ile % leadów przechodzi przez VSL i się kwalifikuje do settera", step: "0.1", placeholder: "30" },
              { key: "leadToMeetingRate", label: "Lead → spotkanie legacy (%) — używany gdy brak VSL/setter", help: "Używany tylko gdy powyższe pola = 0", step: "0.1", placeholder: "5" },
            ].map(f => (
              <div key={f.key}>
                <label className={LBL} style={{ color: "var(--text-muted)" }}>{f.label}</label>
                <input type="number" step={f.step} min="0"
                  value={(salesSettings as any)[f.key]}
                  onChange={e => setSalesSettings(p => ({ ...p, [f.key]: parseFloat(e.target.value) || 0 }))}
                  className={INP} style={INP_STYLE} placeholder={f.placeholder} />
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{f.help}</p>
              </div>
            ))}
            <button onClick={saveSalesSettings} disabled={loading} className="w-full disabled:opacity-60 font-semibold rounded-xl px-5 py-2.5 text-sm" style={{ background: "var(--neon)", color: "#000" }}>
              {loading ? "Zapisywanie..." : "Zapisz ustawienia sprzedaży"}
            </button>
          </div>
        </div>
      )}

      {/* TOKENY */}
      {activeTab === "Tokeny" && isAdminOrLider && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Publiczne linki do formularzy</h2>
            {allClients.length > 1 && (
              <select value={tokenClientId} onChange={e => setTokenClientId(e.target.value)} className="rounded-xl px-3 py-2 text-sm" style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)", color: "var(--text-primary)" }}>
                {allClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Linki permanentne — nie wymagają logowania. Closer lub setter może wypełniać formularz przez link. Przypisz link do konkretnego użytkownika.</p>

          {/* Add new token */}
          <div className="rounded-2xl p-5 space-y-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
            <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Wygeneruj nowy link</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={LBL} style={{ color: "var(--text-muted)" }}>Etykieta (opis linku)</label>
                <input value={newTokenLabel} onChange={e => setNewTokenLabel(e.target.value)} className={INP} style={INP_STYLE} placeholder="np. Jan Kowalski — Closer" />
              </div>
              <div>
                <label className={LBL} style={{ color: "var(--text-muted)" }}>Przypisz do użytkownika *</label>
                <select value={newTokenUserId} onChange={e => setNewTokenUserId(e.target.value)} className={INP} style={INP_STYLE}>
                  <option value="">— wybierz użytkownika —</option>
                  {users.filter(u => u.role === "CLOSER" || u.role === "SETTER" || u.role === "LIDER").map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
            </div>
            <button onClick={addToken} disabled={loading || !newTokenUserId} className="disabled:opacity-60 font-semibold rounded-xl px-5 py-2.5 text-sm" style={{ background: "var(--neon)", color: "#000" }}>
              Wygeneruj link
            </button>
          </div>

          {/* Token list */}
          {tokens.length === 0 ? (
            <div className="rounded-2xl p-8 text-center text-sm" style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)", color: "var(--text-muted)" }}>Brak wygenerowanych tokenów</div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
              <table className="w-full kpi-table">
                <thead><tr><th>Etykieta</th><th>Link</th><th>Użytkownik</th><th>Data</th><th></th></tr></thead>
                <tbody>
                  {tokens.map(t => {
                    const url = typeof window !== "undefined" ? `${window.location.origin}/f/${t.token}` : `/f/${t.token}`;
                    const user = users.find(u => u.id === t.userId);
                    return (
                      <tr key={t.id}>
                        <td className="font-medium" style={{ color: "var(--text-primary)" }}>{t.label || "—"}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="text-xs truncate max-w-[200px]" style={{ color: "var(--text-muted)" }}>/f/{t.token.slice(0, 12)}…</span>
                            <button
                              onClick={() => copyToken(t.token, t.id)}
                              className="text-xs px-2.5 py-1 rounded-lg transition-colors flex-shrink-0"
                              style={copiedTokenId === t.id
                                ? { background: "rgba(0,255,136,0.1)", color: "#00ff88", border: "1px solid rgba(0,255,136,0.3)" }
                                : { background: "var(--bg-input)", color: "#888", border: "1px solid var(--border-card)" }
                              }
                            >
                              {copiedTokenId === t.id ? "Skopiowano ✓" : "Kopiuj"}
                            </button>
                          </div>
                        </td>
                        <td className="text-sm" style={{ color: "var(--text-muted)" }}>{user ? `${user.name} (${user.role})` : "—"}</td>
                        <td className="text-xs" style={{ color: "var(--text-muted)" }}>{new Date(t.createdAt).toLocaleDateString("pl-PL")}</td>
                        <td>
                          {isAdmin && (
                            <button onClick={() => deleteToken(t.id)} className="text-red-400 hover:text-red-300 text-xs">Usuń</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MOJE KONTO */}
      {activeTab === "Moje konto" && (
        <div className="rounded-2xl p-6 max-w-md" style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}>
          <h2 className="text-lg font-bold mb-5" style={{ color: "var(--text-primary)" }}>Moje konto</h2>
          <div className="space-y-4">
            <div><label className={LBL} style={{ color: "var(--text-muted)" }}>Imię i nazwisko</label><input value={myName} onChange={e => setMyName(e.target.value)} className={INP} style={INP_STYLE} /></div>
            <div><label className={LBL} style={{ color: "var(--text-muted)" }}>Nowe hasło (zostaw puste aby nie zmieniać)</label><input type="password" value={myPassword} onChange={e => setMyPassword(e.target.value)} className={INP} style={INP_STYLE} placeholder="••••••••" /></div>
            {myPassword && <div><label className={LBL} style={{ color: "var(--text-muted)" }}>Potwierdź hasło</label><input type="password" value={myPasswordConfirm} onChange={e => setMyPasswordConfirm(e.target.value)} className={INP} style={INP_STYLE} placeholder="••••••••" /></div>}
            <button onClick={saveMyAccount} disabled={loading} className="disabled:opacity-60 font-semibold rounded-xl px-5 py-2.5 text-sm" style={{ background: "var(--neon)", color: "#000" }}>Zapisz</button>
          </div>
        </div>
      )}
    </div>
  );
}
