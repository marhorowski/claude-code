"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "./store";

/**
 * Synchronizacja stanu z bazą (endpoint /api/state).
 * - pull przy starcie, co 45 s, przy powrocie do karty i po odzyskaniu sieci
 * - push z opóźnieniem po każdej zmianie
 * - zapis warunkowy: serwer odrzuca push oparty na nieaktualnej wersji (409),
 *   wtedy klient przyjmuje nowszy stan z bazy
 * localStorage pozostaje cache'em offline.
 */

export type SyncStatus = "loading" | "synced" | "saving" | "offline";

const SYNC_KEYS = [
  "tasks",
  "projects",
  "goals",
  "habits",
  "pulseLog",
  "workSessions",
  "journal",
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
// wersja stanu w bazie, na której bazuje to urządzenie
let remoteRev: string | null =
  typeof window !== "undefined"
    ? window.localStorage.getItem("ergon-remote-rev")
    : null;

function setRemoteRev(rev: string | null) {
  remoteRev = rev;
  if (typeof window !== "undefined") {
    if (rev) window.localStorage.setItem("ergon-remote-rev", rev);
    else window.localStorage.removeItem("ergon-remote-rev");
  }
}

function applyRemote(data: SyncSlice, updatedAt: string) {
  applyingRemote = true;
  const patch: SyncSlice = {};
  for (const k of SYNC_KEYS) {
    if (k in data) patch[k] = data[k];
  }
  // scal ustawienia z bieżącymi (nowe pola nie mogą zniknąć)
  const cur = useStore.getState().settings;
  patch.settings = { ...cur, ...(patch.settings as object | undefined) };
  useStore.setState(patch as never);
  setLastModified(updatedAt);
  setRemoteRev(updatedAt);
  applyingRemote = false;
}

async function fetchRemote(
  ws: string
): Promise<{ data: SyncSlice | null; updatedAt: string | null } | null> {
  try {
    const res = await fetch(`/api/state?ws=${encodeURIComponent(ws)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as {
      data: SyncSlice | null;
      updatedAt: string | null;
    };
  } catch {
    return null;
  }
}

/** Push warunkowy; zwraca nowy updatedAt, "conflict" albo null (błąd). */
async function push(ws: string): Promise<string | "conflict" | null> {
  try {
    const res = await fetch(`/api/state?ws=${encodeURIComponent(ws)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: currentSlice(),
        baseUpdatedAt: remoteRev,
      }),
    });
    if (res.status === 409) {
      const body = (await res.json()) as {
        data: SyncSlice;
        updatedAt: string;
      };
      // baza ma nowszy stan z innego urządzenia — przyjmujemy go
      applyRemote(body.data, body.updatedAt);
      return "conflict";
    }
    if (!res.ok) return null;
    const body = (await res.json()) as { updatedAt: string };
    setRemoteRev(body.updatedAt);
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
  const pushPending = () => timer.current !== null || maxTimer.current !== null;

  // dociągnięcie zmian z bazy (bez nadpisywania lokalnych, niewysłanych zmian)
  const pullLatest = useRef(async (key: string) => {
    if (!ready.current || pushPending()) return;
    const remote = await fetchRemote(key);
    if (!remote || !remote.data || !remote.updatedAt) return;
    setStatus("synced");
    if (remote.updatedAt === remoteRev) return; // nic nowego
    if (pushPending()) return; // w międzyczasie pojawiła się lokalna zmiana
    applyRemote(remote.data, remote.updatedAt);
    lastSerialized.current = JSON.stringify(currentSlice());
  });

  // inicjalizacja / zmiana klucza
  useEffect(() => {
    let alive = true;
    ready.current = false;
    setStatus("loading");
    (async () => {
      const remote = await fetchRemote(syncKey);
      if (!alive) return;
      if (remote === null) {
        setStatus("offline");
        return;
      }
      if (remote.data && remote.updatedAt) {
        const remoteTs = Date.parse(remote.updatedAt);
        // 5 s marginesu na różnice zegarów
        if (remoteTs + 5000 >= lastModified()) {
          applyRemote(remote.data, remote.updatedAt);
        } else {
          setRemoteRev(remote.updatedAt);
          const at = await push(syncKey);
          if (typeof at === "string" && at !== "conflict") setLastModified(at);
        }
      } else {
        setRemoteRev(null);
        const at = await push(syncKey);
        if (typeof at === "string" && at !== "conflict") setLastModified(at);
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

  // push po zmianach (debounce 3 s, max 20 s)
  useEffect(() => {
    const doPush = async () => {
      if (timer.current) clearTimeout(timer.current);
      if (maxTimer.current) clearTimeout(maxTimer.current);
      timer.current = null;
      maxTimer.current = null;
      setStatus("saving");
      const at = await push(syncKey);
      if (at === "conflict") {
        lastSerialized.current = JSON.stringify(currentSlice());
        setStatus("synced");
      } else if (at) {
        setLastModified(at);
        setStatus("synced");
      } else {
        setStatus("offline");
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

  // cykliczne i zdarzeniowe dociąganie zmian z innych urządzeń
  useEffect(() => {
    const pull = () => void pullLatest.current(syncKey);
    const interval = setInterval(pull, 45_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") pull();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", pull);
    window.addEventListener("online", pull);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", pull);
      window.removeEventListener("online", pull);
    };
  }, [syncKey]);

  return status;
}
