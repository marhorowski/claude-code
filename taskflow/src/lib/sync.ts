"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "./store";

/**
 * Synchronizacja stanu z bazą danych (endpoint /api/state).
 * localStorage pozostaje cache'em offline; wygrywa nowszy zapis.
 */

export type SyncStatus = "loading" | "synced" | "saving" | "offline";

const SYNC_KEYS = [
  "tasks",
  "projects",
  "goals",
  "habits",
  "settings",
  "daySummaries",
  "workLog",
] as const;

type SyncSlice = Record<string, unknown>;

function currentSlice(): SyncSlice {
  const s = useStore.getState() as unknown as Record<string, unknown>;
  const out: SyncSlice = {};
  for (const k of SYNC_KEYS) out[k] = s[k];
  return out;
}

function lastModified(): number {
  const v =
    typeof window !== "undefined"
      ? window.localStorage.getItem("ergon-last-modified")
      : null;
  return v ? Date.parse(v) : 0;
}

function setLastModified(iso: string) {
  window.localStorage.setItem("ergon-last-modified", iso);
}

let applyingRemote = false;

function applyRemote(data: SyncSlice, updatedAt: string) {
  applyingRemote = true;
  const patch: SyncSlice = {};
  for (const k of SYNC_KEYS) {
    if (k in data) patch[k] = data[k];
  }
  // scal ustawienia z domyślnymi (nowe pola nie mogą zniknąć)
  const cur = useStore.getState().settings;
  patch.settings = { ...cur, ...(patch.settings as object | undefined) };
  useStore.setState(patch as never);
  setLastModified(updatedAt);
  applyingRemote = false;
}

async function pull(
  ws: string
): Promise<{ data: SyncSlice | null; updatedAt: string | null } | null> {
  try {
    const res = await fetch(`/api/state?ws=${encodeURIComponent(ws)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null; // 501 = brak bazy, inne = błąd
    return (await res.json()) as {
      data: SyncSlice | null;
      updatedAt: string | null;
    };
  } catch {
    return null;
  }
}

async function push(ws: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/state?ws=${encodeURIComponent(ws)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: currentSlice() }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { updatedAt: string };
    return body.updatedAt;
  } catch {
    return null;
  }
}

export function useCloudSync(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>("loading");
  const syncKey = useStore((s) => s.settings.syncKey ?? "default");
  const ready = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSerialized = useRef("");

  // inicjalizacja / zmiana klucza: pobierz stan z chmury
  useEffect(() => {
    let alive = true;
    ready.current = false;
    setStatus("loading");
    (async () => {
      const remote = await pull(syncKey);
      if (!alive) return;
      if (remote === null) {
        setStatus("offline");
        ready.current = false;
        return;
      }
      if (remote.data && remote.updatedAt) {
        const remoteTs = Date.parse(remote.updatedAt);
        // 5 s marginesu na różnice zegarów
        if (remoteTs + 5000 >= lastModified()) {
          applyRemote(remote.data, remote.updatedAt);
        } else {
          const at = await push(syncKey);
          if (at) setLastModified(at);
        }
      } else {
        const at = await push(syncKey);
        if (at) setLastModified(at);
      }
      if (!alive) return;
      lastSerialized.current = JSON.stringify(currentSlice());
      ready.current = true;
      setStatus("synced");
    })();
    return () => {
      alive = false;
    };
  }, [syncKey]);

  // obserwuj zmiany stanu i zapisuj z opóźnieniem (debounce 3 s, max 20 s)
  useEffect(() => {
    const doPush = async () => {
      if (timer.current) clearTimeout(timer.current);
      if (maxTimer.current) clearTimeout(maxTimer.current);
      timer.current = null;
      maxTimer.current = null;
      setStatus("saving");
      const at = await push(syncKey);
      if (at) {
        setLastModified(at);
        setStatus("synced");
      } else {
        setStatus("offline");
        ready.current = false;
      }
    };

    const unsub = useStore.subscribe(() => {
      if (!ready.current || applyingRemote) return;
      const ser = JSON.stringify(currentSlice());
      if (ser === lastSerialized.current) return;
      lastSerialized.current = ser;
      setLastModified(new Date().toISOString());
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(doPush, 3000);
      if (!maxTimer.current) {
        maxTimer.current = setTimeout(doPush, 20000);
      }
    });
    return () => {
      unsub();
      if (timer.current) clearTimeout(timer.current);
      if (maxTimer.current) clearTimeout(maxTimer.current);
    };
  }, [syncKey]);

  return status;
}
