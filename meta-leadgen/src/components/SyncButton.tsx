"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SyncButton({ clientId, label = "Synchronizuj" }: { clientId: string; label?: string }) {
  const router = useRouter();
  const [state, setState] = useState<{ busy: boolean; msg?: string; error?: boolean }>({ busy: false });

  async function run() {
    setState({ busy: true, msg: "Pobieram dane z Meta…" });
    try {
      const res = await fetch(`/api/clients/${clientId}/sync`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Synchronizacja nie powiodła się");
      setState({ busy: false, msg: `Gotowe: ${body.rows} wierszy, ${body.days} dni` });
      router.refresh();
    } catch (e) {
      setState({ busy: false, msg: (e as Error).message, error: true });
    }
  }

  return (
    <div className="flex items-center gap-2">
      {state.msg && <span className={`max-w-xs truncate text-xs ${state.error ? "text-red-600" : "text-slate-500"}`} title={state.msg}>{state.msg}</span>}
      <button onClick={run} disabled={state.busy} className="btn">
        {state.busy ? "Synchronizuję…" : label}
      </button>
    </div>
  );
}

// Synchronizuje klientów po kolei — każdy w osobnym żądaniu, żeby nie przekroczyć limitu czasu funkcji.
export function SyncAllButton({ clientIds }: { clientIds: string[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    let failed = 0;
    for (let i = 0; i < clientIds.length; i++) {
      setMsg(`Synchronizuję ${i + 1}/${clientIds.length}…`);
      const res = await fetch(`/api/clients/${clientIds[i]}/sync`, { method: "POST" }).catch(() => null);
      if (!res?.ok) failed++;
    }
    setMsg(failed ? `Gotowe, błędy: ${failed} (szczegóły przy kliencie)` : "Wszystko zsynchronizowane");
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-xs text-slate-500">{msg}</span>}
      <button onClick={run} disabled={busy || !clientIds.length} className="btn">
        {busy ? "Synchronizuję…" : "Synchronizuj wszystkich"}
      </button>
    </div>
  );
}
