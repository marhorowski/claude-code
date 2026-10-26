"use client";

import { useFormState, useFormStatus } from "react-dom";
import { addClient } from "../actions";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className="btn-primary" disabled={pending}>{pending ? "Dodaję…" : label}</button>;
}

export function AddClientForm({ accountId, name, compact }: { accountId?: string; name?: string; compact?: boolean }) {
  const [state, action] = useFormState(addClient, null);
  if (compact)
    return (
      <form action={action} className="flex items-center gap-2">
        <input type="hidden" name="accountId" value={accountId} />
        <input type="hidden" name="name" value={name} />
        <input name="targetCostPerBooking" type="number" min="1" step="1" placeholder="cel kosztu spotkania" className="input w-44" />
        <Submit label="Dodaj" />
        {state?.error && <span className="text-xs text-red-600">{state.error}</span>}
      </form>
    );
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-4 sm:items-end">
      <label className="space-y-1">
        <span className="text-sm font-medium">ID konta reklamowego</span>
        <input name="accountId" required placeholder="np. 1234567890" className="input" />
      </label>
      <label className="space-y-1">
        <span className="text-sm font-medium">Nazwa klienta (opcjonalnie)</span>
        <input name="name" placeholder="z Meta, jeśli puste" className="input" />
      </label>
      <label className="space-y-1">
        <span className="text-sm font-medium">Cel kosztu spotkania</span>
        <input name="targetCostPerBooking" type="number" min="1" step="1" placeholder="np. 300" className="input" />
      </label>
      <Submit label="Dodaj i pobierz dane" />
      {state?.error && <p className="text-sm text-red-600 sm:col-span-4">{state.error}</p>}
    </form>
  );
}
