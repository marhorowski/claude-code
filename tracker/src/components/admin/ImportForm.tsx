"use client";

import { useFormState, useFormStatus } from "react-dom";
import { importVsl } from "@/app/admin-actions";

function Buttons() {
  const { pending, data } = useFormStatus();
  const mode = data?.get("mode");
  return (
    <div className="flex flex-wrap gap-3">
      <button name="mode" value="preview" disabled={pending} className="rounded-xl border border-line-strong px-5 py-2.5 font-display text-[14px] font-bold hover:bg-soft disabled:opacity-50">
        {pending && mode === "preview" ? "Sprawdzanie…" : "Sprawdź plik"}
      </button>
      <button name="mode" value="import" disabled={pending} className="btn-primary">
        {pending && mode === "import" ? "Importowanie…" : "Importuj"}
      </button>
    </div>
  );
}

/** Import historii z arkusza śledzenia VSL: najpierw podgląd, potem zapis. */
export function ImportForm({ clientId }: { clientId: string }) {
  const [state, action] = useFormState(importVsl, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="clientId" value={clientId} />
      <input
        type="file"
        name="file"
        required
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="block w-full text-[13px] file:mr-3 file:rounded-lg file:border-0 file:bg-soft file:px-3 file:py-2 file:font-semibold file:text-ink hover:file:bg-line"
      />
      {state?.error && <p className="rounded-lg bg-down/10 px-3 py-2 text-[13px] text-down">{state.error}</p>}
      {state?.ok && <p className="rounded-lg bg-up/10 px-3 py-2 text-[13px] leading-relaxed text-ink">{state.ok}</p>}
      <Buttons />
    </form>
  );
}
