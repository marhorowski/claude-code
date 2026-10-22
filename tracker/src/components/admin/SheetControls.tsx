"use client";

import { useState, useTransition } from "react";
import { disconnectSheet, resyncSheet } from "@/app/admin-actions";

export function CopyScriptButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }}
      className="btn-primary"
    >
      {copied ? "Skopiowano skrypt" : "Kopiuj skrypt"}
    </button>
  );
}

/** „Wyślij wszystko ponownie” i „Odłącz” przy podłączonym arkuszu. */
export function SheetActions({ clientId }: { clientId: string }) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-4 text-[13px]">
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(async () => setNote(await resyncSheet(clientId)))}
          className="font-semibold text-brown hover:underline disabled:opacity-50"
        >
          {pending ? "Wysyłanie…" : "Wyślij wszystko ponownie"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            confirm("Odłączyć arkusz? Dane w arkuszu zostaną, ale nowe wpisy przestaną do niego trafiać.") &&
            startTransition(() => disconnectSheet(clientId))
          }
          className="text-ink-2 hover:text-ink hover:underline disabled:opacity-50"
        >
          Odłącz
        </button>
      </div>
      {note && <p className="text-[13px] text-muted">{note}</p>}
    </div>
  );
}
