import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getCurrentClient } from "@/lib/clients";
import { buildDashboard, measureInfo } from "@/lib/dashboard";
import { formatValue } from "@/lib/format";
import { isPerMonth, parseOffer, parseTargets, STATUS_INFO, TARGETABLE, type KpiStatus } from "@/lib/kpi";
import { todayInPoland, toIso } from "@/lib/periods";
import { datesLabel, DEFAULT_PRESET, rangePresets } from "@/lib/ranges";
import type { ViewDef } from "@/lib/views";
import { saveOffer, saveTargets } from "@/app/kpi-actions";
import { StatusForm } from "@/components/StatusForm";
import { StatusChip } from "@/components/KpiStatus";
import { OfferFields } from "@/components/kpi/OfferFields";

const UNIT_SUFFIX: Record<string, string> = { PLN: "zł", "%": "%", "×": "×", "szt.": "szt." };
const STATUSES: KpiStatus[] = ["god", "on", "below", "critical"];

export default async function KpiPage() {
  const session = await requireSession();
  const client = await getCurrentClient();
  const isAdmin = session.role === "ADMIN";
  const offer = parseOffer(client.offer);
  const targets = parseTargets(client.kpiTargets);

  // Bieżące wartości z ostatnich 4 tygodni (domyślny zakres dashboardu), żeby od razu widać było status.
  const today = todayInPoland();
  const range = rangePresets(today).find((p) => p.key === DEFAULT_PRESET)!;
  const entries = await prisma.entry.findMany({
    where: { clientId: client.id, dateTo: { gte: new Date(`${range.from}T00:00:00Z`), lte: new Date(`${range.to}T00:00:00Z`) } },
    select: { dateTo: true, values: true },
  });
  const all: ViewDef = {
    key: "ogolny",
    label: "",
    question: "",
    northStar: TARGETABLE.flatMap((g) => g.keys.map((k) => ({ key: k.key, hint: "" }))),
    panels: [],
  };
  const data = buildDashboard(
    entries.map((e) => ({ dateTo: toIso(e.dateTo), values: e.values as Record<string, number> })),
    all,
    { from: range.from, to: range.to, grouping: "week", today },
    { offer, targets },
  );
  const current = new Map(data.kpis.map((k) => [k.key, k]));
  const input = (n: number | undefined) => (n === undefined ? "" : String(n).replace(".", ","));

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">KPI i oferta</p>
        <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-[-0.02em] sm:text-[30px]">Cele wskaźników i ustawienia oferty</h1>
        <p className="mt-1.5 text-[13px] text-muted">
          {client.name} · {isAdmin ? "zmiany widać od razu na dashboardzie" : "ustawia je opiekun z agencji"}
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <section className="card p-6">
          <h2 className="text-[16px] font-bold">Oferta</h2>
          <p className="mb-5 mt-1 text-[13px] text-muted">Z tych stawek liczymy zysk, marżę i ROI na dashboardzie. Kwoty netto w PLN.</p>
          {isAdmin ? (
            <StatusForm action={saveOffer} submitLabel="Zapisz ofertę" resetOnSuccess={false}>
              <input type="hidden" name="clientId" value={client.id} />
              <OfferFields offer={offer} />
            </StatusForm>
          ) : (
            <OfferFields offer={offer} readOnly />
          )}
        </section>

        <section className="card p-6">
          <h2 className="text-[16px] font-bold">Jak liczymy status</h2>
          <p className="mb-4 mt-1 text-[13px] text-muted">Wynik w okresie porównany z celem. Dla kosztów (niżej = lepiej) progi są odwrócone.</p>
          <ul className="space-y-3">
            {STATUSES.map((s) => (
              <li key={s} className="flex items-start justify-between gap-3">
                <StatusChip status={s} />
                <span className="tnum text-right text-[12.5px] leading-snug text-ink-2">
                  ↑ {STATUS_INFO[s].higher}
                  <br />↓ {STATUS_INFO[s].lower}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[12.5px] text-muted">
            Cele oznaczone „na miesiąc” (leady, sprzedaże, przychód…) skalujemy do długości wybranego okresu — w tygodniu cel to ok. ¼ miesięcznego.
          </p>
        </section>
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-[16px] font-bold">Cele KPI</h2>
          <p className="mt-1 text-[13px] text-muted">
            Puste pole = bez celu i bez koloru. Bieżący wynik: {datesLabel(range.from, range.to)}.
          </p>
        </div>
        <StatusFormOrPlain isAdmin={isAdmin}>
          <input type="hidden" name="clientId" value={client.id} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="px-5 py-2 font-medium">Wskaźnik</th>
                  <th className="px-3 py-2 font-medium">Lepiej</th>
                  <th className="px-3 py-2 font-medium">Cel</th>
                  <th className="px-3 py-2 text-right font-medium">Ostatnie 4 tyg.</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                </tr>
              </thead>
              {TARGETABLE.map((g) => (
                <tbody key={g.group}>
                  <tr className="border-t border-line-strong bg-soft/60">
                    <th colSpan={5} className="px-5 py-2 text-left text-[12px] font-bold uppercase tracking-[.08em] text-ink-2">{g.group}</th>
                  </tr>
                  {g.keys.map(({ key }) => {
                    const info = measureInfo(key);
                    const k = current.get(key)!;
                    return (
                      <tr key={key} className="border-t border-line">
                        <td className="whitespace-nowrap px-5 py-2 font-medium">{info.label}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-ink-2">{info.better === "higher" ? "↑ wyżej" : "↓ niżej"}</td>
                        <td className="px-3 py-1.5">
                          <span className="flex items-center gap-2">
                            <input
                              name={`t:${key}`}
                              inputMode="decimal"
                              defaultValue={input(targets[key])}
                              disabled={!isAdmin}
                              aria-label={`Cel: ${info.label}`}
                              className="input mt-0 w-28 py-1.5 tnum"
                            />
                            <span className="whitespace-nowrap text-[12.5px] text-muted">
                              {UNIT_SUFFIX[info.unit]}{isPerMonth(key) ? " / mies." : ""}
                            </span>
                          </span>
                        </td>
                        <td className="tnum whitespace-nowrap px-3 py-2 text-right">{formatValue(k.value, info.unit)}</td>
                        <td className="px-5 py-2">{k.status ? <StatusChip status={k.status} /> : <span className="text-muted">—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              ))}
            </table>
          </div>
        </StatusFormOrPlain>
      </section>
    </div>
  );
}

/** Admin zapisuje cele, klient tylko je widzi. */
function StatusFormOrPlain({ isAdmin, children }: { isAdmin: boolean; children: React.ReactNode }) {
  if (!isAdmin) return <div>{children}</div>;
  return (
    <div className="[&>form>p]:mx-5 [&>form>button]:mx-5 [&>form>button]:mb-5 [&>form]:space-y-4">
      <StatusForm action={saveTargets} submitLabel="Zapisz cele" resetOnSuccess={false}>{children}</StatusForm>
    </div>
  );
}
