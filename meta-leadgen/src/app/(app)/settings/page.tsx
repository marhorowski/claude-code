import Link from "next/link";
import { prisma } from "@/lib/db";
import { testConnection, type AdAccountInfo } from "@/lib/meta/graph";
import { addDemoClient } from "../actions";
import { AddClientForm } from "./AddClientForm";

export const dynamic = "force-dynamic";

const ACCOUNT_STATUS: Record<number, string> = { 1: "aktywne", 2: "wyłączone", 3: "nieopłacone", 7: "w weryfikacji", 9: "okres karencji", 101: "zamknięte" };

export default async function SettingsPage() {
  const hasToken = Boolean(process.env.META_ACCESS_TOKEN);
  let me: { name: string } | null = null;
  let accounts: AdAccountInfo[] = [];
  let error: string | null = null;
  if (hasToken) {
    try {
      ({ me, accounts } = await testConnection());
    } catch (e) {
      error = (e as Error).message;
    }
  }
  const existing = await prisma.client.findMany({ select: { id: true, adAccountId: true } });
  const byAccount = new Map(existing.map((c) => [c.adAccountId, c.id]));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Ustawienia</h1>

      <section className="card space-y-3 p-5">
        <h2 className="section-title">Połączenie z Meta</h2>
        {!hasToken ? (
          <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            Brak tokenu. Dodaj zmienną <code>META_ACCESS_TOKEN</code> w Vercel (Settings → Environment Variables) i zrób redeploy. Instrukcja jak wygenerować token jest w pliku README.
          </div>
        ) : error ? (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</div>
        ) : (
          <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
            Połączono jako <strong>{me?.name}</strong>. Dostępne konta reklamowe: {accounts.length}.
          </div>
        )}
        <p className="hint">Token jest przechowywany tylko w zmiennych środowiskowych Vercel — aplikacja nigdy go nie wyświetla ani nie zapisuje w bazie.</p>
      </section>

      {accounts.length > 0 && (
        <section className="card overflow-x-auto">
          <div className="p-5 pb-2">
            <h2 className="section-title mb-1">Konta reklamowe dostępne dla tokenu</h2>
            <p className="hint">Dodaj konto klienta — aplikacja od razu pobierze dane z ostatnich 90 dni. Później synchronizuje się samo raz dziennie.</p>
          </div>
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Konto</th>
                <th className="th">Business</th>
                <th className="th">Waluta</th>
                <th className="th">Status</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accounts.map((a) => (
                <tr key={a.account_id}>
                  <td className="td">
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs text-slate-400">act_{a.account_id}</div>
                  </td>
                  <td className="td text-slate-500">{a.business?.name ?? "—"}</td>
                  <td className="td">{a.currency}</td>
                  <td className="td text-slate-500">{ACCOUNT_STATUS[a.account_status] ?? a.account_status}</td>
                  <td className="td">
                    {byAccount.has(a.account_id) ? (
                      <Link href={`/clients/${byAccount.get(a.account_id)}`} className="text-sm text-indigo-700 hover:underline">Otwórz →</Link>
                    ) : (
                      <AddClientForm compact accountId={a.account_id} name={a.name} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="card space-y-3 p-5">
        <h2 className="section-title">Dodaj konto ręcznie</h2>
        <p className="hint">ID znajdziesz w Ads Managerze w adresie URL (act=…) albo w ustawieniach konta reklamowego.</p>
        <AddClientForm />
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="section-title">Konto demo</h2>
        <p className="text-sm text-slate-600">Chcesz zobaczyć, jak działa aplikacja bez podłączania Meta? Dodaj klienta z przykładowymi danymi z 90 dni. Możesz go potem usunąć w jego ustawieniach.</p>
        <form action={addDemoClient}>
          <button className="btn">Dodaj klienta demo</button>
        </form>
      </section>
    </div>
  );
}
