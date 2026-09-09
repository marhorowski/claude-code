"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { DatabaseZap, X } from "lucide-react";

interface AuthCtx {
  login: string | null;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({ login: null, signOut: async () => {} });
export const useAuth = () => useContext(Ctx);

function NoDbBar({ reason }: { reason: string | null }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <div className="sticky top-0 z-50 border-b border-terra-600/50 bg-terra-600/15 px-4 py-2 text-sm text-stone2-100 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center gap-2">
        <DatabaseZap className="h-4 w-4 shrink-0 text-terra-400" />
        <span className="min-w-0 flex-1">
          <b>Synchronizacja wyłączona</b> — ta wersja aplikacji nie ma
          połączenia z bazą danych, więc dane zostają tylko na tym urządzeniu.
          {reason === "connect-failed"
            ? " Baza jest skonfigurowana, ale połączenie zawodzi — sprawdź DATABASE_URL."
            : " Włącz zmienną DATABASE_URL dla środowiska Preview w ustawieniach Vercel, aby telefon i komputer się synchronizowały."}
        </span>
        <button
          className="btn-ghost px-2 py-0.5"
          onClick={() => setHidden(true)}
          aria-label="Ukryj"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * Logowanie jest wyłączone — aplikacja otwiera się od razu. Zostaje jedynie
 * lekki sygnał, gdy nie ma bazy (dane tylko lokalnie). Synchronizacja w chmurze
 * działa anonimowo (patrz /api/state).
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [noDb, setNoDb] = useState(false);
  const [noDbReason, setNoDbReason] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.mode === "no-db") {
          setNoDb(true);
          if (d.reason) setNoDbReason(d.reason as string);
        }
      })
      .catch(() => {
        setNoDb(true);
      });
  }, []);

  return (
    <Ctx.Provider value={{ login: null, signOut: async () => {} }}>
      {noDb && <NoDbBar reason={noDbReason} />}
      {children}
    </Ctx.Provider>
  );
}
