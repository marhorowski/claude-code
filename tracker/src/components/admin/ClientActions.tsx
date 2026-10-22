"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { regenerateFormToken, setActiveClient } from "@/app/admin-actions";

/** Ustawia firmę jako aktywną i otwiera jej wyniki. */
export function OpenResultsButton({ clientId, className = "" }: { clientId: string; className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => { await setActiveClient(clientId); router.push("/panel"); })}
      className={className}
    >
      {pending ? "Otwieranie…" : "Wyniki →"}
    </button>
  );
}

export function RegenerateLinkButton({ clientId }: { clientId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        confirm("Wygenerować nowy link? Stary link do formularza przestanie działać.") &&
        startTransition(() => regenerateFormToken(clientId))
      }
      className="text-[13px] text-ink-2 hover:text-ink hover:underline disabled:opacity-50"
    >
      {pending ? "Generowanie…" : "Wygeneruj nowy link"}
    </button>
  );
}
