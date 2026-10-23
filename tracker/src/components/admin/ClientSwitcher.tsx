"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setActiveClient } from "@/app/admin-actions";

/** Wybór firmy w nagłówku (tylko administrator): wyniki i dane pokazują się dla wybranej. */
export function ClientSwitcher({ clients, activeId }: { clients: { id: string; name: string }[]; activeId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <label className="relative block min-w-0 flex-1 md:flex-none">
      <span className="sr-only">Klient</span>
      <select
        value={activeId}
        disabled={pending}
        onChange={(e) => {
          const id = e.target.value;
          startTransition(async () => { await setActiveClient(id); router.refresh(); });
        }}
        className="w-full max-w-[220px] cursor-pointer truncate rounded-xl border border-line bg-card py-1.5 pl-3 pr-8 font-display text-[13.5px] font-bold text-ink hover:bg-soft disabled:opacity-60"
      >
        {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </label>
  );
}
