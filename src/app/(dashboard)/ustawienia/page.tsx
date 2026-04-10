"use client";

import { useState, useEffect } from "react";
import { useClient } from "../layout";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/ui/Toast";

interface Client {
  id: string;
  name: string;
  strategy: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  clients: Array<{ client: { id: string; name: string } }>;
}

interface KpiTarget {
  id: string;
  code: string;
  label: string;
  target: number;
  unit: string;
  period: string;
  lowerIsBetter: boolean;
}

const TABS = ["Klienci", "Użytkownicy", "Cele KPI", "Moje konto"];

export default function UstawieniaPage() {
  const { selectedClientId, clients: contextClients } = useClient();
  const { data: session } = useSession();
  const router = useRouter();
  const isAdmin = session?.user?.role === "ADMIN";

  const [activeTab, setActiveTab] = useState(isAdmin ? "Klienci" : "Moje konto");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);

  // Clients state
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [newClientName, setNewClientName] = useState("");
  const [newClientStrategy, setNewClientStrategy] = useState("Paid Lead Gen");
  const [showNewClientForm, setShowNewClientForm] = useState(false);

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", name: "", password: "", role: "CLOSER", clientIds: [] as string[] });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // KPI targets state
  const [kpiTargets, setKpiTargets] = useState<KpiTarget[]>([]);
  const [kpiClientId, setKpiClientId] = useState(selectedClientId);
  const [editedTargets, setEditedTargets] = useState<Record<string, string>>({});

  // My account state
  const [myName, setMyName] = useState(session?.user?.name || "");
  const [myPassword, setMyPassword] = useState("");
  const [myPasswordConfirm, setMyPasswordConfirm] = useState("");

  useEffect(() => {
    if (!isAdmin) return;
    // Redirect non-admin away
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchClients();
      fetchUsers();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (kpiClientId) fetchKpiTargets(kpiClientId);
  }, [kpiClientId]);

  useEffect(() => {
    setKpiClientId(selectedClientId);
  }, [selectedClientId]);

  async function fetchClients() {
    const r = await fetch("/api/clients");
    const data = await r.json();
    setAllClients(Array.isArray(data) ? data : []);
  }

  async function fetchUsers() {
    const r = await fetch("/api/users");
    const data = await r.json();
    setUsers(Array.isArray(data) ? data : []);
  }

  async function fetchKpiTargets(cid: string) {
    const r = await fetch(`/api/kpi-targets?clientId=${cid}`);
    const data = await r.json();
    setKpiTargets(Array.isArray(data) ? data : []);
    setEditedTargets({});
  }

  async function addClient() {
    if (!newClientName.trim()) {
      setToast({ msg: "Podaj nazwę klienta", type: "error" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newClientName, strategy: newClientStrategy }),
      });
      if (!res.ok) throw new Error();
      setToast({ msg: "Klient dodany ✓", type: "success" });
      setShowNewClientForm(false);
      setNewClientName("");
      fetchClients();
    } catch {
      setToast({ msg: "Błąd dodawania klienta", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function addUser() {
    if (!newUser.email || !newUser.name || !newUser.password) {
      setToast({ msg: "Wypełnij wszystkie pola", type: "error" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Błąd");
      }
      setToast({ msg: "Użytkownik dodany ✓", type: "success" });
      setShowNewUserForm(false);
      setNewUser({ email: "", name: "", password: "", role: "CLOSER", clientIds: [] });
      fetchUsers();
    } catch (err: any) {
      setToast({ msg: err.message || "Błąd zapisu", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser(id: string) {
    if (!confirm("Czy na pewno chcesz usunąć tego użytkownika?")) return;
    try {
      const res = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setToast({ msg: "Użytkownik usunięty", type: "success" });
      fetchUsers();
    } catch {
      setToast({ msg: "Błąd usuwania", type: "error" });
    }
  }

  async function saveKpiTargets() {
    if (Object.keys(editedTargets).length === 0) {
      setToast({ msg: "Brak zmian do zapisania", type: "error" });
      return;
    }
    setLoading(true);
    try {
      const targets = Object.entries(editedTargets).map(([id, target]) => ({ id, target: parseFloat(target) }));
      const res = await fetch("/api/kpi-targets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targets }),
      });
      if (!res.ok) throw new Error();
      setToast({ msg: "Cele KPI zapisane ✓", type: "success" });
      setEditedTargets({});
      fetchKpiTargets(kpiClientId);
    } catch {
      setToast({ msg: "Błąd zapisu", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function saveMyAccount() {
    if (myPassword && myPassword !== myPasswordConfirm) {
      setToast({ msg: "Hasła nie są zgodne", type: "error" });
      return;
    }
    setLoading(true);
    try {
      const body: any = { id: session?.user?.id };
      if (myName) body.name = myName;
      if (myPassword) body.password = myPassword;

      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      setToast({ msg: "Dane konta zapisane ✓", type: "success" });
      setMyPassword("");
      setMyPasswordConfirm("");
    } catch {
      setToast({ msg: "Błąd zapisu", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  const tabs = isAdmin ? TABS : ["Moje konto"];
  const periodOrder = ["WEEKLY", "MONTHLY", "QUARTERLY"];
  const groupedTargets = periodOrder.reduce((acc, period) => {
    acc[period] = kpiTargets.filter((t) => t.period === period);
    return acc;
  }, {} as Record<string, KpiTarget[]>);

  const periodLabels: Record<string, string> = {
    WEEKLY: "Tygodniowe",
    MONTHLY: "Miesięczne",
    QUARTERLY: "Kwartalne",
  };

  return (
    <div className="space-y-6 fade-in">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <h1 className="text-2xl font-bold text-white">⚙️ Ustawienia</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0F172A] rounded-xl p-1 border border-[#334155] overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab
                ? "bg-indigo-500 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* KLIENCI */}
      {activeTab === "Klienci" && isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Klienci</h2>
            <button
              onClick={() => setShowNewClientForm(!showNewClientForm)}
              className="bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/30 text-sm font-medium rounded-xl px-4 py-2"
            >
              + Dodaj klienta
            </button>
          </div>

          {showNewClientForm && (
            <div className="bg-[#1E293B] border border-indigo-500/30 rounded-2xl p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nazwa klienta *</label>
                  <input
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-2 text-white text-sm"
                    placeholder="Nazwa firmy"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Strategia</label>
                  <input
                    value={newClientStrategy}
                    onChange={(e) => setNewClientStrategy(e.target.value)}
                    className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-2 text-white text-sm"
                    placeholder="Paid Lead Gen"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={addClient} disabled={loading} className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white font-semibold rounded-xl px-5 py-2.5 text-sm">
                  Dodaj
                </button>
                <button onClick={() => setShowNewClientForm(false)} className="text-slate-400 hover:text-white text-sm px-4 py-2.5">
                  Anuluj
                </button>
              </div>
            </div>
          )}

          <div className="bg-[#1E293B] border border-[#334155] rounded-2xl overflow-hidden">
            {allClients.length === 0 ? (
              <div className="p-8 text-center text-slate-400">Brak klientów</div>
            ) : (
              <table className="w-full kpi-table">
                <thead>
                  <tr><th>Nazwa</th><th>Strategia</th></tr>
                </thead>
                <tbody>
                  {allClients.map((c) => (
                    <tr key={c.id}>
                      <td className="text-white font-medium">{c.name}</td>
                      <td className="text-slate-400">{c.strategy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* UŻYTKOWNICY */}
      {activeTab === "Użytkownicy" && isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Użytkownicy</h2>
            <button
              onClick={() => setShowNewUserForm(!showNewUserForm)}
              className="bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/30 text-sm font-medium rounded-xl px-4 py-2"
            >
              + Dodaj użytkownika
            </button>
          </div>

          {showNewUserForm && (
            <div className="bg-[#1E293B] border border-indigo-500/30 rounded-2xl p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Imię i nazwisko *</label>
                  <input
                    value={newUser.name}
                    onChange={(e) => setNewUser((u) => ({ ...u, name: e.target.value }))}
                    className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Email *</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser((u) => ({ ...u, email: e.target.value }))}
                    className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Hasło tymczasowe *</label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))}
                    className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Rola *</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser((u) => ({ ...u, role: e.target.value }))}
                    className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-2 text-white text-sm"
                  >
                    <option value="CLOSER">Closer</option>
                    <option value="SETTER">Setter</option>
                    <option value="LIDER">Lider Sprzedaży</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-xs text-slate-400 mb-1">Przypisz do klientów</label>
                <div className="flex flex-wrap gap-2">
                  {allClients.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newUser.clientIds.includes(c.id)}
                        onChange={(e) => {
                          setNewUser((u) => ({
                            ...u,
                            clientIds: e.target.checked
                              ? [...u.clientIds, c.id]
                              : u.clientIds.filter((id) => id !== c.id),
                          }));
                        }}
                        className="rounded"
                      />
                      <span className="text-sm text-slate-300">{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={addUser} disabled={loading} className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white font-semibold rounded-xl px-5 py-2.5 text-sm">
                  Dodaj
                </button>
                <button onClick={() => setShowNewUserForm(false)} className="text-slate-400 hover:text-white text-sm px-4 py-2.5">
                  Anuluj
                </button>
              </div>
            </div>
          )}

          <div className="bg-[#1E293B] border border-[#334155] rounded-2xl overflow-hidden">
            {users.length === 0 ? (
              <div className="p-8 text-center text-slate-400">Brak użytkowników</div>
            ) : (
              <table className="w-full kpi-table">
                <thead>
                  <tr><th>Imię</th><th>Email</th><th>Rola</th><th>Klienci</th><th></th></tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="text-white font-medium">{u.name}</td>
                      <td className="text-slate-400 text-sm">{u.email}</td>
                      <td>
                        <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-lg">
                          {u.role}
                        </span>
                      </td>
                      <td className="text-slate-400 text-sm">
                        {u.clients.map((ca) => ca.client.name).join(", ") || "—"}
                      </td>
                      <td>
                        {u.id !== session?.user?.id && (
                          <button
                            onClick={() => deleteUser(u.id)}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            Usuń
                          </button>
                        )}
                      </td>
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
            <h2 className="text-lg font-bold text-white">Cele KPI</h2>
            <div className="flex items-center gap-3">
              <select
                value={kpiClientId}
                onChange={(e) => setKpiClientId(e.target.value)}
                className="bg-[#1E293B] border border-[#334155] rounded-xl px-3 py-2 text-white text-sm"
              >
                {allClients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                onClick={saveKpiTargets}
                disabled={loading || Object.keys(editedTargets).length === 0}
                className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white font-semibold rounded-xl px-4 py-2 text-sm"
              >
                Zapisz zmiany
              </button>
            </div>
          </div>

          {Object.entries(groupedTargets).map(([period, targets]) => (
            targets.length > 0 && (
              <div key={period} className="bg-[#1E293B] border border-[#334155] rounded-2xl overflow-hidden">
                <div className="px-6 py-3 border-b border-[#334155]">
                  <h3 className="font-semibold text-white">{periodLabels[period]}</h3>
                </div>
                <table className="w-full kpi-table">
                  <thead>
                    <tr><th>KPI</th><th>Kod</th><th>Cel</th><th>Jednostka</th></tr>
                  </thead>
                  <tbody>
                    {targets.map((t) => (
                      <tr key={t.id}>
                        <td className="text-white">{t.label}</td>
                        <td className="text-slate-400 text-xs">{t.code}</td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            value={editedTargets[t.id] ?? t.target}
                            onChange={(e) =>
                              setEditedTargets((prev) => ({ ...prev, [t.id]: e.target.value }))
                            }
                            className="w-24 bg-[#0F172A] border border-[#334155] rounded-lg px-2 py-1 text-white text-sm"
                          />
                        </td>
                        <td className="text-slate-400">{t.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ))}
        </div>
      )}

      {/* MOJE KONTO */}
      {activeTab === "Moje konto" && (
        <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-6 max-w-md">
          <h2 className="text-lg font-bold text-white mb-5">Moje konto</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Imię i nazwisko</label>
              <input
                value={myName}
                onChange={(e) => setMyName(e.target.value)}
                className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nowe hasło (zostaw puste aby nie zmieniać)</label>
              <input
                type="password"
                value={myPassword}
                onChange={(e) => setMyPassword(e.target.value)}
                className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-2 text-white text-sm"
                placeholder="••••••••"
              />
            </div>
            {myPassword && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Potwierdź hasło</label>
                <input
                  type="password"
                  value={myPasswordConfirm}
                  onChange={(e) => setMyPasswordConfirm(e.target.value)}
                  className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-2 text-white text-sm"
                  placeholder="••••••••"
                />
              </div>
            )}
            <button
              onClick={saveMyAccount}
              disabled={loading}
              className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white font-semibold rounded-xl px-5 py-2.5 text-sm"
            >
              Zapisz
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
