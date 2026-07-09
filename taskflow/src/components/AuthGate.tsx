"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { LogIn, UserPlus, Loader2 } from "lucide-react";

type AuthMode = "checking" | "no-db" | "setup" | "login" | "authed";

interface AuthCtx {
  login: string | null;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({ login: null, signOut: async () => {} });
export const useAuth = () => useContext(Ctx);

export default function AuthGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mode, setMode] = useState<AuthMode>("checking");
  const [userLogin, setUserLogin] = useState<string | null>(null);
  const [form, setForm] = useState({ login: "", password: "", password2: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setMode(d.mode as AuthMode);
        if (d.login) setUserLogin(d.login as string);
      })
      .catch(() => setMode("no-db"));
  }, []);

  const submit = async (action: "register" | "login") => {
    setBusy(true);
    setError("");
    try {
      if (action === "register" && form.password !== form.password2) {
        setError("Hasła nie są identyczne.");
        return;
      }
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          login: form.login,
          password: form.password,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "Coś poszło nie tak.");
        return;
      }
      setUserLogin(d.login as string);
      setMode("authed");
    } catch {
      setError("Błąd połączenia.");
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setUserLogin(null);
    setMode("login");
  };

  if (mode === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="font-display text-4xl text-bronze-300">Ergon</div>
          <Loader2 className="mx-auto mt-3 h-5 w-5 animate-spin text-stone2-400" />
        </div>
      </div>
    );
  }

  // brak bazy: aplikacja działa lokalnie, bez logowania
  if (mode === "no-db" || mode === "authed") {
    return (
      <Ctx.Provider value={{ login: userLogin, signOut }}>
        {children}
      </Ctx.Provider>
    );
  }

  const isSetup = mode === "setup";

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-sm overflow-hidden">
        <div className="meander" />
        <div className="p-6">
          <div className="text-center">
            <div className="font-display text-4xl text-bronze-300">ΕRGON</div>
            <div className="text-[11px] uppercase text-stone2-400">
              praca · dzieło · czyn
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div>
              <label className="label" htmlFor="auth-login">
                Login
              </label>
              <input
                id="auth-login"
                className="input"
                autoComplete="username"
                value={form.login}
                onChange={(e) => setForm({ ...form, login: e.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="auth-pass">
                Hasło {isSetup && "(min. 8 znaków)"}
              </label>
              <input
                id="auth-pass"
                type="password"
                className="input"
                autoComplete={isSetup ? "new-password" : "current-password"}
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isSetup) submit("login");
                }}
              />
            </div>
            {isSetup && (
              <div>
                <label className="label" htmlFor="auth-pass2">
                  Powtórz hasło
                </label>
                <input
                  id="auth-pass2"
                  type="password"
                  className="input"
                  autoComplete="new-password"
                  value={form.password2}
                  onChange={(e) =>
                    setForm({ ...form, password2: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submit("register");
                  }}
                />
              </div>
            )}
            {error && <p className="text-xs text-terra-400">{error}</p>}
            <button
              className="btn-primary w-full justify-center py-2.5"
              disabled={busy}
              onClick={() => submit(isSetup ? "register" : "login")}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isSetup ? (
                <UserPlus className="h-4 w-4" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              {isSetup ? "Utwórz konto i zacznij" : "Zaloguj się"}
            </button>
            {isSetup && (
              <p className="text-center text-xs text-stone2-400">
                Pierwsze uruchomienie — utwórz swoje konto. Dane będą zapisywane
                w bazie i dostępne tylko po zalogowaniu.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
