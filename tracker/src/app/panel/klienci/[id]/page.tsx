import { randomBytes } from "node:crypto";
import Link from "next/link";
import { headers } from "next/headers";
import { SheetSection } from "@/components/admin/SheetSection";
import { ImportForm } from "@/components/admin/ImportForm";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { createUser, deleteClient, renameClient } from "@/app/admin-actions";
import { StatusForm } from "@/components/StatusForm";
import { CopyLink } from "@/components/CopyLink";
import { OpenResultsButton, RegenerateLinkButton } from "@/components/admin/ClientActions";
import { NewUserFields } from "@/components/admin/NewUserFields";
import { UsersTable } from "@/components/admin/UsersTable";

export default async function ClientPage({ params, searchParams }: { params: { id: string }; searchParams: { nowy?: string } }) {
  const session = await requireAdmin();
  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: { users: { orderBy: { createdAt: "asc" } }, _count: { select: { entries: true } } },
  });
  if (!client) notFound();

  // Tajny klucz do skryptu arkusza: tworzony raz, przy pierwszym wejściu na stronę klienta.
  const secret =
    client.sheetSecret ??
    (await prisma.client.update({ where: { id: client.id }, data: { sheetSecret: randomBytes(24).toString("base64url") } })).sheetSecret!;

  const h = headers();
  const formUrl = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}/f/${client.formToken}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/panel/klienci" className="text-[13px] text-muted hover:underline">← Klienci</Link>
          <p className="eyebrow mt-3">Klient</p>
          <h1 className="mt-1 text-[30px] font-extrabold leading-tight tracking-[-0.02em]">{client.name}</h1>
          <p className="tnum mt-1.5 text-[13px] text-muted">Wpisów: {client._count.entries} · kont: {client.users.length}</p>
        </div>
        <OpenResultsButton clientId={client.id} className="btn-primary" />
      </div>

      {searchParams.nowy && (
        <p className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-[13.5px] text-ink">
          Klient dodany. Wyślij firmie link do formularza poniżej i dodaj konta osób, które mają oglądać wyniki.
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="text-[16px] font-bold">Link do formularza</h2>
            <p className="mb-3 mt-1 text-[13px] text-muted">Publiczny, bez logowania — przez niego zespół firmy wysyła dane.</p>
            <div className="flex flex-wrap items-center gap-3">
              <code className="min-w-0 flex-1 truncate rounded-xl border border-line bg-page px-3 py-2 text-[12.5px] text-ink-2">{formUrl}</code>
              <CopyLink url={formUrl} />
            </div>
            <div className="mt-3"><RegenerateLinkButton clientId={client.id} /></div>
          </section>

          <SheetSection client={client} secret={secret} />

          <section className="card p-6">
            <h2 className="text-[16px] font-bold">Import historii z arkusza VSL (.xlsx)</h2>
            <p className="mb-4 mt-1 text-[13px] text-muted">
              Plik w formacie „Arkusz śledzenia danych VSL” (zakładka „Dane z Facebook Ads”, wiersz na dzień). Pobierz go z Dysku jako .xlsx
              (Plik → Pobierz → Microsoft Excel). Najpierw sprawdź, co się zaimportuje — dzień, który już jest w aplikacji, zostanie zastąpiony.
            </p>
            <ImportForm clientId={client.id} />
          </section>

          <section className="card overflow-hidden">
            <h2 className="border-b border-line px-5 py-4 text-[16px] font-bold">Konta do logowania</h2>
            <p className="px-5 pt-3 text-[13px] text-muted">Te osoby po zalogowaniu widzą tylko dane firmy „{client.name}”.</p>
            <UsersTable users={client.users} selfId={session.uid} empty="Nikt z tej firmy nie ma jeszcze konta." />
          </section>
        </div>

        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="mb-4 text-[16px] font-bold">Nowe konto</h2>
            <StatusForm action={createUser} submitLabel="Dodaj konto">
              <input type="hidden" name="clientId" value={client.id} />
              <NewUserFields />
            </StatusForm>
          </section>

          <section className="card p-6">
            <h2 className="mb-4 text-[16px] font-bold">Nazwa firmy</h2>
            <StatusForm action={renameClient} submitLabel="Zapisz nazwę" resetOnSuccess={false}>
              <input type="hidden" name="clientId" value={client.id} />
              <input name="name" required defaultValue={client.name} className="input" aria-label="Nazwa firmy" />
            </StatusForm>
          </section>

          <section className="card border-down/30 p-6">
            <h2 className="text-[16px] font-bold text-down">Usuń klienta</h2>
            <p className="mb-4 mt-1 text-[13px] text-muted">
              Usuwa firmę, wszystkie jej wpisy i konta. Nie da się tego cofnąć. Wpisz nazwę firmy, żeby potwierdzić.
            </p>
            <StatusForm action={deleteClient} submitLabel="Usuń na zawsze" variant="danger">
              <input type="hidden" name="clientId" value={client.id} />
              <input name="confirm" required autoComplete="off" placeholder={client.name} className="input" aria-label="Nazwa firmy do potwierdzenia" />
            </StatusForm>
          </section>
        </div>
      </div>
    </div>
  );
}
