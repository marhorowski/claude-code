"use client";

import { useTransition } from "react";
import { deleteEntry } from "@/app/actions";

export function DeleteButton({ id, label }: { id: string; label: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm(`Usunąć wpis: ${label}?`)) startTransition(() => deleteEntry(id));
      }}
      className="text-down hover:underline disabled:opacity-50"
    >
      {pending ? "Usuwanie…" : "Usuń"}
    </button>
  );
}
