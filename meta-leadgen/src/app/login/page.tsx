"use client";

import { useFormState, useFormStatus } from "react-dom";
import { login } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary w-full" disabled={pending}>
      {pending ? "Logowanie…" : "Zaloguj"}
    </button>
  );
}

export default function LoginPage() {
  const [error, action] = useFormState(login, null);
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form action={action} className="card w-full max-w-sm space-y-4 p-6">
        <div>
          <h1 className="text-lg font-semibold">LeadGen Monitor</h1>
          <p className="text-sm text-slate-500">Panel wyników kampanii Meta</p>
        </div>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Hasło zespołu</span>
          <input name="password" type="password" required autoFocus className="input" />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Submit />
      </form>
    </main>
  );
}
