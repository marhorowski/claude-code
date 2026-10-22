"use client";

import { useState, useTransition } from "react";
import { deleteUser, setUserPassword } from "@/app/admin-actions";

/** „Nowe hasło” (gdy ktoś zapomni) i „Usuń” przy koncie. */
export function UserRowActions({ id, email, isSelf }: { id: string; email: string; isSelf: boolean }) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  const newPassword = () => {
    const password = prompt(`Nowe hasło dla ${email} (min. 8 znaków):`);
    if (!password) return;
    startTransition(async () => {
      const error = await setUserPassword(id, password);
      setNote(error ?? "Hasło ustawione. Przekaż je tej osobie.");
    });
  };

  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[13px]">
      {note && <span className="text-muted">{note}</span>}
      <button type="button" disabled={pending} onClick={newPassword} className="text-ink-2 hover:text-ink hover:underline disabled:opacity-50">
        Nowe hasło
      </button>
      {isSelf ? (
        <span className="text-muted">to Ty</span>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => confirm(`Usunąć konto ${email}? Ta osoba straci dostęp od razu.`) && startTransition(() => deleteUser(id))}
          className="text-down hover:underline disabled:opacity-50"
        >
          Usuń
        </button>
      )}
    </span>
  );
}
