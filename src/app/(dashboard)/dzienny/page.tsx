"use client";

import { useState, useEffect } from "react";
import { useClient } from "../layout";
import { useSession } from "next-auth/react";
import { formatDate, formatPLN, formatPercent } from "@/lib/utils";
import { calcSUR, calcCP, getKpiStatus, getStatusColor } from "@/lib/calculations";
import { Toast } from "@/components/ui/Toast";

interface DailyForm {
  id: string;
  userId: string;
  date: string;
  plannedMeetings: number | null;
  attendedMeetings: number | null;
  closings: number | null;
  revenue: number | null;
  callsMade: number | null;
  meetingsBooked: number | null;
  notes: string | null;
  user: { id: string; name: string; role: string };
}

interface User {
  id: string;
  name: string;
  role: string;
}

export default function DziennyPage() {
  const { selectedClientId } = useClient();
  const { data: session } = useSession();
  const role = session?.user?.role || "";
  const today = new Date().toISOString().split("T")[0];

  const [forms, setForms] = useState<DailyForm[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state - Closer/Setter
  const [plannedMeetings, setPlannedMeetings] = useState("");
  const [attendedMeetings, setAttendedMeetings] = useState("");
  const [closings, setClosings] = useState("");
  const [revenue, setRevenue] = useState("");
  const [callsMade, setCallsMade] = useState("");
  const [meetingsBooked, setMeetingsBooked] = useState("");
  const [notes, setNotes] = useState("");
  const [targetUserId, setTargetUserId] = useState("");

  const isAdmin = role === "ADMIN";
  const isLider = role === "LIDER";
  const isCloser = role === "CLOSER";
  const isSetter = role === "SETTER";

  const fetchForms = () => {
    if (!selectedClientId) return;
    fetch(`/api/daily?clientId=${selectedClientId}&date=${today}`)
      .then((r) => r.json())
      .then(setForms)
      .catch(() => {});
  };

  useEffect(() => {
    fetchForms();
  }, [selectedClientId, today]);

  useEffect(() => {
    if ((isAdmin || isLider) && selectedClientId) {
      fetch("/api/users")
        .then((r) => r.json())
        .then(setUsers)
        .catch(() => {});
    }
  }, [selectedClientId, isAdmin, isLider]);

  // Pre-fill from existing form
  useEffect(() => {
    if (isCloser || isSetter) {
      const myForm = forms.find((f) => f.userId === session?.user?.id);
      if (myForm) {
        setPlannedMeetings(String(myForm.plannedMeetings ?? ""));
        setAttendedMeetings(String(myForm.attendedMeetings ?? ""));
        setClosings(String(myForm.closings ?? ""));
        setRevenue(String(myForm.revenue ?? ""));
        setCallsMade(String(myForm.callsMade ?? ""));
        setMeetingsBooked(String(myForm.meetingsBooked ?? ""));
        setNotes(myForm.notes ?? "");
      }
    }
  }, [forms]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const body: any = {
      clientId: selectedClientId,
      date: today,
      notes: notes || null,
    };

    if (isCloser || isAdmin || isLider) {
      body.plannedMeetings = plannedMeetings ? parseInt(plannedMeetings) : null;
      body.attendedMeetings = attendedMeetings ? parseInt(attendedMeetings) : null;
      body.closings = closings ? parseInt(closings) : null;
      body.revenue = revenue ? parseFloat(revenue) : null;
    }

    if (isSetter || isAdmin || isLider) {
      body.callsMade = callsMade ? parseInt(callsMade) : null;
      body.meetingsBooked = meetingsBooked ? parseInt(meetingsBooked) : null;
    }

    if ((isAdmin || isLider) && targetUserId) {
      body.targetUserId = targetUserId;
    }

    try {
      const res = await fetch("/api/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      setToast({ msg: "Dane zapisane ✓", type: "success" });
      fetchForms();
    } catch {
      setToast({ msg: "Błąd zapisu danych", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  // Aggregate totals
  const closerForms = forms.filter((f) => f.user.role === "CLOSER" || (isCloser && f.userId === session?.user?.id));
  const setterForms = forms.filter((f) => f.user.role === "SETTER" || (isSetter && f.userId === session?.user?.id));

  const totalPlanned = closerForms.reduce((s, f) => s + (f.plannedMeetings ?? 0), 0);
  const totalAttended = closerForms.reduce((s, f) => s + (f.attendedMeetings ?? 0), 0);
  const totalClosings = closerForms.reduce((s, f) => s + (f.closings ?? 0), 0);
  const totalRevenue = closerForms.reduce((s, f) => s + (f.revenue ?? 0), 0);
  const sur = calcSUR(totalAttended, totalPlanned);
  const cp = calcCP(totalClosings, totalAttended);

  const surColor = getStatusColor(getKpiStatus(sur, 90));
  const cpColor = getStatusColor(getKpiStatus(cp, 60));

  const showCloserForm = isCloser || isAdmin || isLider;
  const showSetterForm = isSetter || isAdmin || isLider;

  return (
    <div className="space-y-6 fade-in">
      {toast && (
        <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />
      )}

      <h1 className="text-2xl font-bold text-white">
        Dashboard Dzienny — {formatDate(new Date())}
      </h1>

      {/* Form */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-5">Formularz dzienny</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Data</label>
              <input
                type="date"
                value={today}
                readOnly
                className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-2 text-white text-sm"
              />
            </div>

            {(isAdmin || isLider) && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Wypełnij za użytkownika</label>
                <select
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-2 text-white text-sm"
                >
                  <option value="">— Moje dane —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {showCloserForm && (
            <div>
              <div className="text-sm font-semibold text-indigo-400 mb-3">👥 Closing</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <FormField
                  label="Zaplanowane spotkania"
                  value={plannedMeetings}
                  onChange={setPlannedMeetings}
                  type="number"
                />
                <FormField
                  label="Odbyłe spotkania"
                  value={attendedMeetings}
                  onChange={setAttendedMeetings}
                  type="number"
                />
                <FormField
                  label="Zamknięcia"
                  value={closings}
                  onChange={setClosings}
                  type="number"
                />
                <FormField
                  label="Przychód (PLN)"
                  value={revenue}
                  onChange={setRevenue}
                  type="number"
                  step="0.01"
                />
              </div>
            </div>
          )}

          {showSetterForm && (
            <div>
              <div className="text-sm font-semibold text-indigo-400 mb-3">📞 Setting</div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label="Wykonane telefony"
                  value={callsMade}
                  onChange={setCallsMade}
                  type="number"
                />
                <FormField
                  label="Umówione spotkania"
                  value={meetingsBooked}
                  onChange={setMeetingsBooked}
                  type="number"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-400 mb-1">Notatka (opcjonalnie)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-2 text-white text-sm resize-none"
              placeholder="Opcjonalna notatka..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white font-semibold rounded-xl px-6 py-2.5 text-sm transition-colors"
          >
            {loading ? "Zapisywanie..." : "Zapisz dane"}
          </button>
        </form>
      </div>

      {/* Daily summary stats */}
      {(isAdmin || isLider) && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="SUR dzienny" value={formatPercent(sur)} color={surColor} />
            <StatCard label="CP dzienny" value={formatPercent(cp)} color={cpColor} />
            <StatCard label="Przychód dzienny" value={formatPLN(totalRevenue)} />
          </div>

          {/* Closer table */}
          {closerForms.length > 0 && (
            <div className="bg-[#1E293B] border border-[#334155] rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#334155]">
                <h2 className="font-bold text-white">👥 Closerzy — dzisiaj</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full kpi-table">
                  <thead>
                    <tr>
                      <th>Closer</th>
                      <th>Zaplanowane</th>
                      <th>Odbyłe</th>
                      <th>SUR</th>
                      <th>Zamknięcia</th>
                      <th>CP</th>
                      <th>Przychód</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closerForms.map((f) => {
                      const sur = calcSUR(f.attendedMeetings ?? 0, f.plannedMeetings ?? 0);
                      const cp = calcCP(f.closings ?? 0, f.attendedMeetings ?? 0);
                      return (
                        <tr key={f.id}>
                          <td className="text-white font-medium">{f.user.name}</td>
                          <td className="text-slate-300">{f.plannedMeetings ?? "—"}</td>
                          <td className="text-slate-300">{f.attendedMeetings ?? "—"}</td>
                          <td style={{ color: getStatusColor(getKpiStatus(sur, 90)) }}>
                            {formatPercent(sur)}
                          </td>
                          <td className="text-slate-300">{f.closings ?? "—"}</td>
                          <td style={{ color: getStatusColor(getKpiStatus(cp, 60)) }}>
                            {formatPercent(cp)}
                          </td>
                          <td className="text-slate-300">{formatPLN(f.revenue ?? 0)}</td>
                        </tr>
                      );
                    })}
                    <tr className="font-bold">
                      <td className="text-indigo-400">SUMA</td>
                      <td className="text-white">{totalPlanned}</td>
                      <td className="text-white">{totalAttended}</td>
                      <td style={{ color: surColor }}>{formatPercent(sur)}</td>
                      <td className="text-white">{totalClosings}</td>
                      <td style={{ color: cpColor }}>{formatPercent(cp)}</td>
                      <td className="text-white">{formatPLN(totalRevenue)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Setter table */}
          {setterForms.length > 0 && (
            <div className="bg-[#1E293B] border border-[#334155] rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#334155]">
                <h2 className="font-bold text-white">📞 Setterzy — dzisiaj</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full kpi-table">
                  <thead>
                    <tr>
                      <th>Setter</th>
                      <th>Telefony</th>
                      <th>Umówione</th>
                      <th>Booking Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {setterForms.map((f) => {
                      const br = f.callsMade ? ((f.meetingsBooked ?? 0) / f.callsMade) * 100 : 0;
                      return (
                        <tr key={f.id}>
                          <td className="text-white font-medium">{f.user.name}</td>
                          <td className="text-slate-300">{f.callsMade ?? "—"}</td>
                          <td className="text-slate-300">{f.meetingsBooked ?? "—"}</td>
                          <td className="text-slate-300">{formatPercent(br)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        step={step}
        min="0"
        className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-3 py-2 text-white text-sm"
        placeholder="0"
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="text-2xl font-bold" style={{ color: color || "#F1F5F9" }}>
        {value}
      </div>
    </div>
  );
}
