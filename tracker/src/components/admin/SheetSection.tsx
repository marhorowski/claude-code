import type { Client } from "@prisma/client";
import { connectSheet } from "@/app/admin-actions";
import { appsScriptSource } from "@/lib/apps-script";
import { StatusForm } from "@/components/StatusForm";
import { CopyScriptButton, SheetActions } from "./SheetControls";

const when = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Warsaw" });

/** Podłączenie arkusza Google przez Apps Script: instrukcja, skrypt z kluczem klienta, stan synchronizacji. */
export function SheetSection({ client, secret }: { client: Client; secret: string }) {
  const code = appsScriptSource(secret);

  if (client.sheetUrl) {
    return (
      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[16px] font-bold">Arkusz Google</h2>
          <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${client.sheetError ? "bg-down/10 text-down" : "bg-up/10 text-up"}`}>
            {client.sheetError ? "Błąd synchronizacji" : "Połączony"}
          </span>
        </div>
        <p className="mt-1 text-[13px] text-muted">
          {client.sheetName ? <>Arkusz „{client.sheetName}”. </> : null}
          Każdy nowy wpis, poprawka i usunięcie trafia do arkusza od razu.
        </p>
        <dl className="mt-4 grid gap-1 text-[13px]">
          <div className="flex gap-2"><dt className="text-muted">Ostatnia udana synchronizacja:</dt><dd className="tnum">{client.sheetSyncedAt ? when.format(client.sheetSyncedAt) : "—"}</dd></div>
          {client.sheetError && <div className="flex gap-2"><dt className="text-muted">Ostatni błąd:</dt><dd className="text-down">{client.sheetError}</dd></div>}
        </dl>
        <div className="mt-4"><SheetActions clientId={client.id} /></div>
        <details className="mt-5 rounded-xl border border-line bg-page/60 p-4">
          <summary className="cursor-pointer text-[13px] font-semibold text-ink-2">Skrypt (gdyby trzeba go wkleić ponownie)</summary>
          <div className="mt-3"><CopyScriptButton code={code} /></div>
        </details>
      </section>
    );
  }

  return (
    <section className="card p-6">
      <h2 className="text-[16px] font-bold">Arkusz Google</h2>
      <p className="mt-1 text-[13px] text-muted">
        Wpisy firmy będą trafiać do Twojego arkusza, a w nim policzą się podsumowania tygodniowe i miesięczne. Jednorazowo, ok. 3 minuty.
      </p>
      <ol className="mt-5 space-y-4 text-[13.5px]">
        <li className="flex gap-3">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent font-display text-[12px] font-extrabold text-on-accent">1</span>
          <div>
            Utwórz pusty arkusz:{" "}
            <a href="https://sheets.new" target="_blank" rel="noreferrer" className="font-semibold text-brown hover:underline">sheets.new ↗</a>
            . Nadaj mu nazwę, np. „KPI — {client.name}”.
          </div>
        </li>
        <li className="flex gap-3">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent font-display text-[12px] font-extrabold text-on-accent">2</span>
          <div className="min-w-0 flex-1">
            W arkuszu: <b>Rozszerzenia → Apps Script</b>. Usuń wszystko w pliku <code>Kod.gs</code>, wklej skrypt i zapisz (ikona dyskietki).
            <div className="mt-2"><CopyScriptButton code={code} /></div>
            <p className="mt-1.5 text-[12px] text-muted">Skrypt zawiera tajny klucz tej firmy — nie wysyłaj go nikomu.</p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent font-display text-[12px] font-extrabold text-on-accent">3</span>
          <div>
            Kliknij <b>Wdróż → Nowe wdrożenie</b>, typ <b>Aplikacja internetowa</b>. Ustaw „Wykonaj jako: <b>Ja</b>” i „Kto ma dostęp: <b>Każdy</b>”, potem <b>Wdróż</b>.
            Google poprosi o zgodę: <b>Zezwól na dostęp</b> → wybierz konto → <b>Zaawansowane → Przejdź do projektu</b> → <b>Zezwól</b>.
          </div>
        </li>
        <li className="flex gap-3">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent font-display text-[12px] font-extrabold text-on-accent">4</span>
          <div className="min-w-0 flex-1">
            Skopiuj <b>URL aplikacji internetowej</b> (kończy się na <code>/exec</code>) i wklej tutaj. Od razu wyślę do arkusza wszystkie dotychczasowe wpisy.
            <div className="mt-3">
              <StatusForm action={connectSheet} submitLabel="Połącz arkusz" resetOnSuccess={false}>
                <input type="hidden" name="clientId" value={client.id} />
                <input name="url" required placeholder="https://script.google.com/macros/s/…/exec" className="input" aria-label="URL aplikacji internetowej" />
              </StatusForm>
            </div>
          </div>
        </li>
      </ol>
    </section>
  );
}
