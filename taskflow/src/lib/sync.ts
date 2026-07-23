"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "./store";
import { mergeStates } from "./merge";

/**
 * Synchronizacja stanu z bazą (endpoint /api/state).
 *
 * Kluczowe cechy (naprawa rozjazdu telefon↔komputer):
 * - odporność na chwilowe błędy: jeśli pierwszy fetch się nie uda (np. zimny
 *   start funkcji na Vercel), urządzenie NIE zostaje na stałe „offline" —
 *   próbuje ponownie przy każdym cyklu, focusie i powrocie sieci,
 * - scalanie zamiast nadpisywania: przy konflikcie (inne urządzenie zapisało
 *   w międzyczasie) stany są łączone po id, więc żadne zadanie nie ginie,
 * - częsty pull: co 15 s oraz natychmiast po powrocie do aplikacji.
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
  "pomodoroLog",
] as const;

type Slice = Record<string, unknown>;

function currentSlice(): Slice {
  const s = useStore.getState() as unknown as Record<string, unknown>;
  const out: Slice = {};
  for (const k of SYNC_KEYS) out[k] = s[k];
  return out;
}

let applyingRemote = false;
let remoteRev: string | null = null;

function lsGet(k: string): string | null {
  return typeof window !== "undefined" ? localStorage.getItem(k) : null;
}
function lsSet(k: string, v: string | null) {
  if (typeof window === "undefined") return;
  if (v === null) localStorage.removeItem(k);
  else localStorage.setItem(k, v);
}

function revKey(ws: string) {
  return `ergon-remote-rev:${ws}`;
}

function setRemoteRev(ws: string, rev: string | null) {
  remoteRev = rev;
  lsSet(revKey(ws), rev);
}

/** Zastąp lokalny stan zdalnym (LWW). */
function applyRemote(data: Slice) {
  applyingRemote = true;
  const patch: Slice = {};
  for (const k of SYNC_KEYS) if (k in data) patch[k] = data[k];
  const cur = useStore.getState().settings;
  patch.settings = { ...cur, ...(patch.settings as object | undefined) };
  useStore.setState(patch as never);
  applyingRemote = false;
}

/** Scal zdalny stan z lokalnym (bez utraty lokalnych zmian). */
function applyMerged(remote: Slice) {
  applyingRemote = true;
  const merged = mergeStates(currentSlice(), remote);
  const cur = useStore.getState().settings;
  merged.settings = { ...cur, ...(merged.settings as object | undefined) };
  useStore.setState(merged as never);
  applyingRemote = false;
}

async function getRemote(
  ws: string
): Promise<{ data: Slice | null; updatedAt: string | null } | "error"> {
  try {
    const res = await fetch(`/api/state?ws=${encodeURIComponent(ws)}`, {
      cache: "no-store",
    });
    if (res.status === 501) return { data: null, updatedAt: null }; // brak bazy
    if (!res.ok) return "error";
    return (await res.json()) as {
      data: Slice | null;
      updatedAt: string | null;
    };
  } catch {
    return "error";
  }
}

async function putState(
  ws: string,
  base: string | null
): Promise<
  { ok: true; updatedAt: string } | { ok: false; conflict?: Slice } | "error"
> {
  try {
    const res = await fetch(`/api/state?ws=${encodeURIComponent(ws)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: currentSlice(), baseUpdatedAt: base }),
    });
    if (res.status === 409) {
      const body = (await res.json()) as { data: Slice; updatedAt: string };
      return { ok: false, conflict: body.data };
    }
    if (!res.ok) return "error";
    const body = (await res.json()) as { updatedAt: string };
    return { ok: true, updatedAt: body.updatedAt };
  } catch {
    return "error";
  }
}

export function useCloudSync(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>("loading");
  const syncKey = useStore((s) => s.settings.syncKey ?? "default");

  const ready = useRef(false);
  const dirty = useRef(false); // są lokalne zmiany do wysłania
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const lastSerialized = useRef("");

  useEffect(() => {
    let alive = true;
    ready.current = false;
    dirty.current = false;
    remoteRev = lsGet(revKey(syncKey));
    lastSerialized.current = JSON.stringify(currentSlice());
    setStatus("loading");

    const flush = async () => {
      if (!alive || inFlight.current) return;
      inFlight.current = true;
      try {
        // 1) pobierz stan zdalny
        const remote = await getRemote(syncKey);
        if (!alive) return;
        if (remote === "error") {
          if (!ready.current) setStatus("offline");
          return; // spróbujemy przy następnym cyklu
        }

        // brak danych zdalnych — wypchnij lokalne
        if (!remote.data || !remote.updatedAt) {
          const put = await putState(syncKey, remoteRev);
          if (!alive) return;
          if (put === "error") {
            setStatus("offline");
            return;
          }
          if (put.ok) {
            setRemoteRev(syncKey, put.updatedAt);
            dirty.current = false;
            lastSerialized.current = JSON.stringify(currentSlice());
          }
          ready.current = true;
          setStatus("synced");
          return;
        }

        // pojawił się nowszy stan w bazie
        if (remote.updatedAt !== remoteRev) {
          if (dirty.current) applyMerged(remote.data);
          else applyRemote(remote.data);
          setRemoteRev(syncKey, remote.updatedAt);
          lastSerialized.current = JSON.stringify(currentSlice());
          // po scaleniu z lokalnymi zmianami trzeba odesłać wynik
          if (dirty.current) {
            const put = await putState(syncKey, remoteRev);
            if (alive && put !== "error" && put.ok) {
              setRemoteRev(syncKey, put.updatedAt);
              dirty.current = false;
              lastSerialized.current = JSON.stringify(currentSlice());
            }
          }
          ready.current = true;
          setStatus("synced");
          return;
        }

        // baza aktualna — wyślij lokalne zmiany jeśli są
        if (dirty.current) {
          setStatus("saving");
          const put = await putState(syncKey, remoteRev);
          if (!alive) return;
          if (put === "error") {
            setStatus("offline");
            return;
          }
          if (!put.ok && put.conflict) {
            applyMerged(put.conflict);
            const put2 = await putState(syncKey, remoteRev);
            if (alive && put2 !== "error" && put2.ok) {
              setRemoteRev(syncKey, put2.updatedAt);
            }
          } else if (put.ok) {
            setRemoteRev(syncKey, put.updatedAt);
          }
          dirty.current = false;
          lastSerialized.current = JSON.stringify(currentSlice());
        }
        ready.current = true;
        setStatus("synced");
      } finally {
        inFlight.current = false;
      }
    };

    // obserwuj lokalne zmiany
    const unsub = useStore.subscribe(() => {
      if (applyingRemote) return;
      const ser = JSON.stringify(currentSlice());
      if (ser === lastSerialized.current) return;
      lastSerialized.current = ser;
      dirty.current = true;
      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(() => void flush(), 1500);
    });

    // cykliczny sync + zdarzenia
    const interval = setInterval(() => void flush(), 15_000);
    const onFocus = () => void flush();
    const onVisible = () => {
      if (document.visibilityState === "visible") void flush();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);

    void flush(); // start

    return () => {
      alive = false;
      unsub();
      clearInterval(interval);
      if (pushTimer.current) clearTimeout(pushTimer.current);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
    };
  }, [syncKey]);

  return status;
}
