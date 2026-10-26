"use client";

import type { Client } from "@prisma/client";
import { useFormState, useFormStatus } from "react-dom";
import { deleteClient, updateClient, type ActionState } from "../../../actions";

function Save() {
  const { pending } = useFormStatus();
  return <button className="btn-primary" disabled={pending}>{pending ? "Zapisuję…" : "Zapisz"}</button>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="hint block">{hint}</span>}
    </label>
  );
}

export function ClientSettingsForm({ client, resolved }: { client: Client; resolved: { leadType: string | null; bookingType: string | null } }) {
  const [state, action] = useFormState<ActionState, FormData>(updateClient.bind(null, client.id), null);
  const cur = client.currency;
  return (
    <div className="space-y-6">
      <form action={action} className="space-y-6">
        <section className="card grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="section-title sm:col-span-2">Klient</h2>
          <Field label="Nazwa">
            <input name="name" defaultValue={client.name} className="input" />
          </Field>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" name="active" defaultChecked={client.active} className="h-4 w-4" />
            Aktywny (synchronizacja codziennie rano)
          </label>
        </section>

        <section className="card grid gap-4 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <h2 className="section-title mb-1">Cele i progi oceny reklam</h2>
            <p className="hint">Na tej podstawie aplikacja oznacza reklamy jako wygrane, do skalowania, słabsze lub do wyłączenia.</p>
          </div>
          <Field label={`Docelowy koszt umówionego spotkania (${cur})`} hint="Najważniejsza liczba. Reklama poniżej tego kosztu jest wygrana.">
            <input name="targetCostPerBooking" type="number" step="1" min="1" required defaultValue={client.targetCostPerBooking} className="input" />
          </Field>
          <Field label={`Docelowy koszt leada (${cur}) — opcjonalnie`} hint="Pozwala wykryć reklamy z tanimi leadami, które się nie umawiają.">
            <input name="targetCpl" type="number" step="1" min="0" defaultValue={client.targetCpl ?? ""} className="input" />
          </Field>
          <Field label="Min. liczba spotkań, żeby uznać reklamę za wygraną" hint="Chroni przed przypadkowymi zwycięzcami. Zalecane 3–5.">
            <input name="minBookingsForWin" type="number" step="1" min="1" defaultValue={client.minBookingsForWin} className="input" />
          </Field>
          <Field label="Wyłącz, gdy wydatek bez spotkania przekroczy … × cel" hint={`Przy 2 i celu ${client.targetCostPerBooking} ${cur}: reklama bez spotkań po wydaniu ${client.targetCostPerBooking * client.killSpendMultiplier} ${cur} trafia do „Do wyłączenia”.`}>
            <input name="killSpendMultiplier" type="number" step="0.1" min="1" defaultValue={client.killSpendMultiplier} className="input" />
          </Field>
          <Field label="Maksymalna frequency (7 dni)" hint="Powyżej tej wartości aplikacja ostrzega o zmęczeniu kreacji.">
            <input name="maxFrequency" type="number" step="0.1" min="1" defaultValue={client.maxFrequency} className="input" />
          </Field>
        </section>

        <section className="card grid gap-4 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <h2 className="section-title mb-1">Zdarzenia konwersji</h2>
            <p className="hint">
              Zostaw puste — aplikacja sama wykryje standardowe zdarzenia <code>Lead</code> i <code>Schedule</code>. Wpisz własny typ tylko, jeśli spotkania liczysz custom conversion (np.{" "}
              <code>offsite_conversion.custom.123456789</code>). Po zmianie dane przeliczą się automatycznie.
            </p>
          </div>
          <Field label="Zdarzenie leada" hint={`Używane teraz: ${resolved.leadType ?? "nie wykryto"}`}>
            <input name="leadActionType" list="action-types" defaultValue={client.leadActionType ?? ""} placeholder="auto" className="input" />
          </Field>
          <Field label="Zdarzenie umówionego spotkania" hint={`Używane teraz: ${resolved.bookingType ?? "nie wykryto — sprawdź, czy Schedule trafia do Meta"}`}>
            <input name="bookingActionType" list="action-types" defaultValue={client.bookingActionType ?? ""} placeholder="auto" className="input" />
          </Field>
          <datalist id="action-types">
            {client.detectedActionTypes.map((t) => <option key={t} value={t} />)}
          </datalist>
          {client.detectedActionTypes.length > 0 && (
            <details className="text-xs text-slate-500 sm:col-span-2">
              <summary className="cursor-pointer">Zdarzenia wykryte na koncie ({client.detectedActionTypes.length})</summary>
              <div className="mt-2 flex flex-wrap gap-1">{client.detectedActionTypes.map((t) => <code key={t} className="rounded bg-slate-100 px-1.5 py-0.5">{t}</code>)}</div>
            </details>
          )}
        </section>

        <div className="flex items-center gap-3">
          <Save />
          {state?.ok && <span className="text-sm text-emerald-700">{state.ok}</span>}
          {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
        </div>
      </form>

      <section className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="font-semibold">Usuń klienta</h2>
          <p className="hint">Usuwa klienta, wszystkie pobrane dane i raporty z aplikacji. Nic nie zmienia na koncie reklamowym w Meta.</p>
        </div>
        <form
          action={deleteClient.bind(null, client.id)}
          onSubmit={(e) => {
            if (!confirm(`Usunąć klienta „${client.name}” razem z danymi i raportami?`)) e.preventDefault();
          }}
        >
          <button className="btn-danger">Usuń klienta i dane</button>
        </form>
      </section>
    </div>
  );
}
