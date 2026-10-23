import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getCurrentClient } from "@/lib/clients";
import { buildDashboard, measureInfo } from "@/lib/dashboard";
import { formatKpi, formatValue } from "@/lib/format";
import { goalForMonth, kpiStatus, parseGoals, parseOffer, parseTargets, planFromRevenue, type Plan } from "@/lib/kpi";
import { daysInRange, todayInPoland, toIso } from "@/lib/periods";
import type { ViewDef } from "@/lib/views";
import { saveGoal } from "@/app/kpi-actions";
import { StatusForm } from "@/components/StatusForm";
import { StatusChip } from "@/components/KpiStatus";
import { ResultsTabs } from "@/components/dashboard/ResultsTabs";

const ROWS: { key: keyof Plan; label: string; indent?: boolean; unit: string }[] = [
  { key: "totalRevenue", label: "Przychód", unit: "PLN" },
  { key: "profit", label: "Zysk", unit: "PLN" },
  { key: "totalClosings", label: "Sprzedaże", unit: "szt." },
  { key: "attendedMeetings", label: "Odbyte spotkania pierwsze", unit: "szt." },
  { key: "bookedTotal", label: "Umówione rozmowy (setter + VSL)", unit: "szt." },
  { key: "meetingsBooked", label: "w tym przez settera", indent: true, unit: "szt." },
  { key: "vslMeetingsBooked", label: "w tym z VSL", indent: true, unit: "szt." },
  { key: "leads", label: "Leady", unit: "szt." },
  { key: "adSpend", label: "Budżet reklamowy", unit: "PLN" },
];

const monthName = (m: string) => {
  const s = new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}-01T00:00:00Z`));
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const shiftMonth = (m: string, n: number) => {
  const d = new Date(`${m}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
};
const lastDay = (m: string) => new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0)).toISOString().slice(0, 10);
/** Plan w sztukach zaokrąglamy w górę: 7,2 sprzedaży to w praktyce 8. */
const planValue = (v: number | null, unit: string) => (v === null ? null : unit === "szt." ? Math.ceil(v) : v);

export default async function GoalPage({ searchParams }: { searchParams: { m?: string } }) {
  const session = await requireSession();
  const isAdmin = session.role === "ADMIN";
  const client = await getCurrentClient();
  const today = todayInPoland();
  const thisMonth = today.slice(0, 7);
  const month = /^\d{4}-\d{2}$/.test(searchParams.m ?? "") && searchParams.m! <= thisMonth ? searchParams.m! : thisMonth;
  const from = `${month}-01`;
  const end = lastDay(month);
  const to = end < today ? end : today;
  const totalDays = daysInRange(from, end);
  const elapsed = daysInRange(from, to);
  const done = to === end;

  const offer = parseOffer(client.offer);
  const targets = parseTargets(client.kpiTargets);
  const goals = parseGoals(client.goals);
  const goal = goalForMonth(goals, month);
  const ownGoal = goals[month] !== undefined;
  const plan = goal === null ? null : planFromRevenue(goal, targets, offer);

  const entries = await prisma.entry.findMany({
    where: { clientId: client.id, dateTo: { gte: new Date(`${from}T00:00:00Z`), lte: new Date(`${to}T00:00:00Z`) } },
    select: { dateTo: true, values: true },
  });
  const view: ViewDef = { key: "ogolny", label: "", question: "", northStar: ROWS.map((r) => ({ key: r.key, hint: "" })), panels: [] };
  const data = buildDashboard(
    entries.map((e) => ({ dateTo: toIso(e.dateTo), values: e.values as Record<string, number> })),
    view,
    { from, to, grouping: "month", today },
    { offer, targets, goals },
  );
  const actual = new Map(data.kpis.map((k) => [k.key, k.value]));
  const paceShare = elapsed / totalDays;
  const revenue = actual.get("totalRevenue") ?? null;
  const revenuePlan = plan?.totalRevenue ?? null;

  const missing: string[] = [];
  if (plan && plan.totalClosings === null) missing.push(offer?.price ? "cel średniej wartości sprzedaży" : "cenę oferty (KPI i oferta)");
  if (plan && plan.totalClosings !== null && plan.leads === null) missing.push("cele CP, SUR i Booking Rate łącznie");

  return (
    <div className="space-y-6">
      <ResultsTabs active="realizacja" />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Realizacja celu</p>
          <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-[-0.02em] sm:text-[30px]">Czy dowieziemy cel miesiąca?</h1>
          <p className="tnum mt-1.5 text-[13px] text-muted">
            {monthName(month)} · {done ? "miesiąc zamknięty" : `dzień ${elapsed} z ${totalDays} (${Math.round(paceShare * 100)}% miesiąca)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <nav aria-label="Miesiąc" className="flex items-center rounded-xl bg-soft p-1 text-[13px] font-medium">
            <Link href={`/panel/realizacja?m=${shiftMonth(month, -1)}`} className="rounded-lg px-3 py-1.5 text-muted hover:text-ink" aria-label="Poprzedni miesiąc">←</Link>
            <span className="px-2 text-ink">{monthName(month)}</span>
            {month < thisMonth ? (
              <Link href={`/panel/realizacja?m=${shiftMonth(month, 1)}`} className="rounded-lg px-3 py-1.5 text-muted hover:text-ink" aria-label="Następny miesiąc">→</Link>
            ) : (
              <span className="px-3 py-1.5 text-line-strong" aria-hidden>→</span>
            )}
          </nav>
          {isAdmin && (
            <details className="group relative">
              <summary
                className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-xl border border-line bg-card text-ink-2 hover:bg-soft [&::-webkit-details-marker]:hidden"
                aria-label="Ustaw cel przychodu"
                title="Ustaw cel przychodu"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                  <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
                </svg>
              </summary>
              <div className="absolute right-0 top-12 z-20 w-[min(340px,calc(100vw-2rem))] rounded-2xl bg-card p-5 shadow-pop">
                <p className="font-display text-[15px] font-bold">Cel przychodu: {monthName(month)}</p>
                <p className="mb-4 mt-1 text-[12.5px] text-muted">
                  Netto, z follow-upami. Z niego liczymy plan sprzedaży, rozmów, leadów i budżetu. Cel obowiązuje też w kolejnych miesiącach, dopóki go nie zmienisz.
                </p>
                <StatusForm action={saveGoal} submitLabel="Zapisz cel" resetOnSuccess={false}>
                  <input type="hidden" name="clientId" value={client.id} />
                  <input type="hidden" name="month" value={month} />
                  <label className="block">
                    <span className="label">Przychód na miesiąc</span>
                    <span className="relative mt-1 block">
                      <input name="revenue" inputMode="decimal" defaultValue={ownGoal ? String(goals[month]).replace(".", ",") : ""} placeholder={goal ? String(goal) : "np. 300000"} className="input mt-0 pr-10 tnum" />
                      <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-[13px] text-muted">zł</span>
                    </span>
                  </label>
                </StatusForm>
              </div>
            </details>
          )}
        </div>
      </div>

      {plan === null ? (
        <section className="card grid place-items-center px-6 py-16 text-center">
          <p className="font-display text-[18px] font-bold">Brak celu na {monthName(month).toLowerCase()}</p>
          <p className="mt-2 max-w-md text-[13.5px] text-muted">
            {isAdmin
              ? "Kliknij zębatkę i wpisz, ile przychodu chcesz zrobić w tym miesiącu. Plan sprzedaży, rozmów, leadów i budżetu policzy się z celów KPI."
              : "Cel przychodu ustawia opiekun z agencji."}
          </p>
        </section>
      ) : (
        <>
          <section className="card grid gap-6 p-6 sm:grid-cols-3">
            <div>
              <p className="text-[13px] text-ink-2">Przychód</p>
              <p className="tnum mt-1 font-display text-[30px] font-extrabold leading-tight tracking-[-.02em] text-brown">{formatKpi(revenue, "PLN")}</p>
              <p className="tnum text-[13px] text-muted">z {formatKpi(revenuePlan, "PLN")} celu{!ownGoal && " (cel z poprzedniego miesiąca)"}</p>
            </div>
            <div>
              <p className="text-[13px] text-ink-2">Realizacja</p>
              <p className="tnum mt-1 font-display text-[30px] font-extrabold leading-tight tracking-[-.02em]">{revenuePlan ? formatValue(((revenue ?? 0) / revenuePlan) * 100, "%") : "—"}</p>
              <p className="tnum text-[13px] text-muted">{done ? "wynik końcowy" : `na dziś powinno być ${formatValue(paceShare * 100, "%")}`}</p>
            </div>
            <div>
              <p className="text-[13px] text-ink-2">{done ? "Wynik miesiąca" : "Prognoza na koniec miesiąca"}</p>
              <p className="tnum mt-1 font-display text-[30px] font-extrabold leading-tight tracking-[-.02em]">
                {formatKpi(revenue === null ? null : done ? revenue : revenue / paceShare, "PLN")}
              </p>
              <p className="text-[13px] text-muted">{done ? "" : "jeśli utrzymamy dotychczasowe tempo"}</p>
            </div>
          </section>

          {missing.length > 0 && (
            <p className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-[13.5px]">
              Żeby policzyć resztę planu, uzupełnij {missing.join(" oraz ")} w zakładce{" "}
              <Link href="/panel/kpi" className="font-medium text-brown hover:underline">KPI i oferta</Link>.
            </p>
          )}

          <section className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th className="px-5 py-3 font-medium">Pozycja</th>
                    <th className="px-3 py-3 text-right font-medium">Wynik</th>
                    <th className="px-3 py-3 text-right font-medium">Cel miesiąca</th>
                    <th className="min-w-[200px] px-3 py-3 font-medium">Realizacja</th>
                    {!done && <th className="px-3 py-3 text-right font-medium">Na dziś powinno być</th>}
                    <th className="px-3 py-3 text-right font-medium">{done ? "Wynik końcowy" : "Prognoza"}</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((r) => {
                    const value = actual.get(r.key) ?? null;
                    const target = planValue(plan[r.key], r.unit);
                    const budget = r.key === "adSpend";
                    const forecast = value === null ? null : done ? value : value / paceShare;
                    // Budżet to limit, nie wynik do pobicia: status dla niego odwrócony.
                    const status = kpiStatus(forecast, target, budget ? "lower" : measureInfo(r.key).better);
                    const pct = value !== null && target ? (value / target) * 100 : null;
                    return (
                      <tr key={r.key} className="border-t border-line">
                        <td className={`whitespace-nowrap px-5 py-2.5 ${r.indent ? "pl-9 text-ink-2" : "font-medium"}`}>{r.label}</td>
                        <td className="tnum whitespace-nowrap px-3 py-2.5 text-right font-semibold">{formatValue(value, r.unit)}</td>
                        <td className="tnum whitespace-nowrap px-3 py-2.5 text-right text-ink-2">{formatValue(target, r.unit)}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-3">
                            <div className="relative h-2 flex-1 rounded-full bg-soft">
                              {pct !== null && (
                                <div className={`absolute inset-y-0 left-0 rounded-full ${r.unit === "PLN" && !budget ? "bg-money" : "bg-accent"}`} style={{ width: `${Math.max(1, Math.min(100, pct))}%` }} />
                              )}
                              {!done && target !== null && (
                                <div className="absolute -inset-y-1 w-0.5 rounded bg-ink/60" style={{ left: `${paceShare * 100}%` }} title="Tempo: gdzie powinniśmy być dziś" />
                              )}
                            </div>
                            <span className="tnum w-14 text-right text-[13px] text-ink-2">{pct === null ? "—" : `${Math.round(pct)}%`}</span>
                          </div>
                        </td>
                        {!done && <td className="tnum whitespace-nowrap px-3 py-2.5 text-right text-ink-2">{formatValue(target === null ? null : target * paceShare, r.unit)}</td>}
                        <td className="tnum whitespace-nowrap px-3 py-2.5 text-right">{formatValue(forecast, r.unit)}</td>
                        <td className="px-5 py-2.5">{status ? <StatusChip status={status} /> : <span className="text-muted">—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="border-t border-line px-5 py-3 text-[12.5px] leading-relaxed text-muted">
              Plan liczony wstecz od przychodu: sprzedaże = przychód / docelowa wartość sprzedaży ({formatValue(offer?.price && targets.avgDealValue ? (offer.price * targets.avgDealValue) / 100 : null, "PLN")}),
              odbyte = sprzedaże / CP, umówione = odbyte / SUR, leady = umówione / Booking Rate łącznie, budżet = leady × CPL, zysk = przychód × marża.
              Status ocenia prognozę na koniec miesiąca; dla budżetu — czy nie przekroczymy planu. Pionowa kreska na pasku to miejsce, w którym powinniśmy być dziś.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
