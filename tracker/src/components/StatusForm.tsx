"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { FormState } from "@/app/auth-actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60">
      {pending ? "Zapisywanie…" : label}
    </button>
  );
}

/** Formularz wysyłany akcją serwerową, z komunikatem o wyniku; po sukcesie czyści pola. */
export function StatusForm({
  action,
  submitLabel,
  children,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  submitLabel: string;
  children: React.ReactNode;
}) {
  const [state, formAction] = useFormState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={formAction} className="space-y-4">
      {children}
      {state?.error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{state.error}</p>}
      {state?.ok && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.ok}</p>}
      <SubmitButton label={submitLabel} />
    </form>
  );
}
