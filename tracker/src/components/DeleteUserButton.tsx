"use client";

import { useTransition } from "react";
import { deleteUser } from "@/app/auth-actions";

export function DeleteUserButton({ id, email }: { id: string; email: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm(`Usunąć konto ${email}? Ta osoba straci dostęp od razu.`)) startTransition(() => deleteUser(id));
      }}
      className="text-rose-600 hover:underline disabled:opacity-50"
    >
      {pending ? "Usuwanie…" : "Usuń"}
    </button>
  );
}
