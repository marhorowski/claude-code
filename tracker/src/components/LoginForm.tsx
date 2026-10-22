"use client";

import { useFormState, useFormStatus } from "react-dom";
import { login } from "@/app/auth-actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full py-3">
      {pending ? "Logowanie…" : "Zaloguj się"}
    </button>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useFormState(login, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="label">Email</span>
        <input name="email" type="email" required autoComplete="username" autoFocus className="input" />
      </label>
      <label className="block">
        <span className="label">Hasło</span>
        <input name="password" type="password" required autoComplete="current-password" className="input" />
      </label>
      <label className="flex items-center gap-2 text-sm text-ink-2">
        <input name="remember" type="checkbox" defaultChecked className="h-4 w-4 rounded border-line-strong" />
        Zapamiętaj mnie na tym urządzeniu (90 dni)
      </label>
      {state?.error && <p className="rounded-lg bg-down/10 px-3 py-2 text-sm text-down">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
