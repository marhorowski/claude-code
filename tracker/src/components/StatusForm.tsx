"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { FormState } from "@/app/auth-actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent/90 disabled:opacity-60">
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
      {state?.error && <p className="rounded-lg bg-down/10 px-3 py-2 text-sm text-down">{state.error}</p>}
      {state?.ok && <p className="rounded-lg bg-up/10 px-3 py-2 text-sm text-up">{state.ok}</p>}
      <SubmitButton label={submitLabel} />
    </form>
  );
}
