"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: string;
  fte: number;
  active: boolean;
}

interface AppContextType {
  me: { id: string; role: string; name: string } | null;
  isLeader: boolean;
  users: AppUser[];
  reloadUsers: () => void;
  // "team" albo id użytkownika (dla CSM zawsze jego id)
  scope: string;
  setScope: (s: string) => void;
  scopeName: string;
}

const AppContext = createContext<AppContextType>({
  me: null,
  isLeader: false,
  users: [],
  reloadUsers: () => {},
  scope: "team",
  setScope: () => {},
  scopeName: "",
});

export function useApp() {
  return useContext(AppContext);
}

const SCOPE_KEY = "csm-tracker-scope";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [scope, setScopeState] = useState("team");

  const me = session?.user ? { id: session.user.id, role: session.user.role, name: session.user.name ?? "" } : null;
  const isLeader = me?.role === "LIDER";

  const reloadUsers = useCallback(() => {
    fetch("/api/users")
      .then((r) => (r.ok ? r.json() : []))
      .then(setUsers)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (session) reloadUsers();
  }, [session, reloadUsers]);

  useEffect(() => {
    if (!me) return;
    if (!isLeader) {
      setScopeState(me.id);
      return;
    }
    try {
      const saved = localStorage.getItem(SCOPE_KEY);
      if (saved) setScopeState(saved);
    } catch {}
  }, [me?.id, isLeader]);

  // Gdy zapamiętany użytkownik zniknął, wróć do zespołu
  useEffect(() => {
    if (isLeader && scope !== "team" && users.length > 0 && !users.some((u) => u.id === scope)) setScopeState("team");
  }, [users, scope, isLeader]);

  function setScope(s: string) {
    setScopeState(s);
    try {
      localStorage.setItem(SCOPE_KEY, s);
    } catch {}
  }

  const scopeName = scope === "team" ? "Cały zespół" : users.find((u) => u.id === scope)?.name ?? me?.name ?? "";

  return (
    <AppContext.Provider value={{ me, isLeader, users, reloadUsers, scope, setScope, scopeName }}>
      {children}
    </AppContext.Provider>
  );
}
