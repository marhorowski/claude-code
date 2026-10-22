import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getActiveClient } from "@/lib/clients";
import { formatDay, toIso } from "@/lib/periods";
import { createClient, createUser } from "@/app/admin-actions";
import { StatusForm } from "@/components/StatusForm";
import { OpenResultsButton } from "@/components/admin/ClientActions";
import { NewUserFields } from "@/components/admin/NewUserFields";
import { UsersTable } from "@/components/admin/UsersTable";

export default async function ClientsPage() {
  const session = await requireAdmin();
  const [clients, lastEntries, admins, active] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { users: true, entries: true } } } }),
    prisma.entry.groupBy({ by: ["clientId"], _max: { dateTo: true } }),
    prisma.user.findMany({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } }),
    getActiveClient(),
  ]);
  const lastBy = new Map(lastEntries.map((e) => [e.clientId, e._max.dateTo]));

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Administracja</p>
        <h1 className="mt-1 text-[30px] font-extrabold leading-tight tracking-[-0.02em]">Klienci</h1>
        <p className="mt-1.5 text-[13px] text-muted">Firmy, ich linki do formularza i konta osób, które się logują.</p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <section className="card overflow-hidden">
          <h2 className="border-b border-line px-5 py-4 text-[16px] font-bold">Firmy <span className="tnum font-medium text-muted">· {clients.length}</span></h2>
          <div className="overflow-x-auto">
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="text-left text-[12px] text-muted">
                  <th className="px-5 py-2 font-medium">Firma</th>
                  <th className="px-3 py-2 text-right font-medium">Konta</th>
                  <th className="px-3 py-2 text-right font-medium">Wpisy</th>
                  <th className="px-3 py-2 font-medium">Ostatni wpis</th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody>
                {clients.length === 0 && (
                  <tr className="border-t border-line">
                    <td colSpan={5} className="px-5 py-8 text-center text-muted">Nie ma jeszcze żadnej firmy. Dodaj pierwszą w formularzu obok.</td>
                  </tr>
                )}
                {clients.map((c) => {
                  const last = lastBy.get(c.id);
                  return (
                    <tr key={c.id} className="border-t border-line hover:bg-soft/50">
                      <td className="px-5 py-3">
                        <Link href={`/panel/klienci/${c.id}`} className="font-display font-bold hover:underline">{c.name}</Link>
                        {active?.id === c.id && <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-brown">wybrana</span>}
                      </td>
                      <td className="tnum px-3 py-3 text-right">{c._count.users}</td>
                      <td className="tnum px-3 py-3 text-right">{c._count.entries}</td>
                      <td className="tnum whitespace-nowrap px-3 py-3 text-muted">{last ? `${formatDay(toIso(last))} ${toIso(last).slice(0, 4)}` : "—"}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-right text-[13px]">
                        <Link href={`/panel/klienci/${c.id}`} className="mr-4 text-ink-2 hover:text-ink hover:underline">Zarządzaj</Link>
                        <OpenResultsButton clientId={c.id} className="font-semibold text-brown hover:underline disabled:opacity-50" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="text-[16px] font-bold">Nowy klient</h2>
          <p className="mb-4 mt-1 text-[13px] text-muted">Firma dostanie własny link do formularza i osobne dane.</p>
          <StatusForm action={createClient} submitLabel="Dodaj klienta">
            <label className="block">
              <span className="label">Nazwa firmy</span>
              <input name="name" required autoComplete="off" className="input" />
            </label>
            <details className="rounded-xl border border-line bg-page/60 p-4">
              <summary className="cursor-pointer text-[13px] font-semibold text-ink-2">Od razu dodaj konto do logowania (opcjonalnie)</summary>
              <div className="mt-4 space-y-4"><NewUserFields required={false} /></div>
            </details>
          </StatusForm>
        </section>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <section className="card overflow-hidden">
          <h2 className="border-b border-line px-5 py-4 text-[16px] font-bold">Administratorzy</h2>
          <p className="px-5 pt-3 text-[13px] text-muted">Widzą wszystkie firmy i zarządzają kontami.</p>
          <UsersTable users={admins} selfId={session.uid} empty="Brak administratorów." />
        </section>
        <section className="card p-6">
          <h2 className="mb-4 text-[16px] font-bold">Nowy administrator</h2>
          <StatusForm action={createUser} submitLabel="Dodaj administratora">
            <NewUserFields />
          </StatusForm>
        </section>
      </div>
    </div>
  );
}
