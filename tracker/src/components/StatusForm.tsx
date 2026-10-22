"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { FormState } from "@/app/auth-actions";

function SubmitButton({ label, danger }: { label: string; danger: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={danger ? "rounded-xl border border-down/40 px-5 py-2.5 font-display text-[14px] font-extrabold text-down hover:bg-down/10 disabled:opacity-50" : "btn-primary"}
    >
      {pending ? "Zapisywanie…" : label}
    </button>
  );
}

/** Formularz wysyłany akcją serwerową, z komunikatem o wyniku; po sukcesie domyślnie czyści pola. */
export function StatusForm({
  action,
  submitLabel,
  children,
  resetOnSuccess = true,
  variant = "primary",
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  submitLabel: string;
  children: React.ReactNode;
  resetOnSuccess?: boolean;
  variant?: "primary" | "danger";
}) {
  const [state, formAction] = useFormState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className="space-y-4">
      {children}
      {state?.error && <p className="rounded-lg bg-down/10 px-3 py-2 text-sm text-down">{state.error}</p>}
      {state?.ok && <p className="rounded-lg bg-up/10 px-3 py-2 text-sm text-up">{state.ok}</p>}
      <SubmitButton label={submitLabel} danger={variant === "danger"} />
    </form>
  );
}
