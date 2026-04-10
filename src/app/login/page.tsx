"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Nieprawidłowy email lub hasło.");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Wystąpił błąd. Spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-500/20 rounded-2xl mb-4">
            <span className="text-3xl">📊</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Sales KPI Dashboard</h1>
          <p className="text-slate-400 mt-1 text-sm">Zaloguj się, aby kontynuować</p>
        </div>

        {/* Form */}
        <div className="bg-[#1E293B] rounded-2xl border border-[#334155] p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Adres email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="email@firma.pl"
                className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Hasło
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-indigo-500 transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-4 py-3 transition-colors"
            >
              {loading ? "Logowanie..." : "Zaloguj się"}
            </button>
          </form>

          <p className="text-center text-slate-500 text-xs mt-6">
            Konta tworzone są przez administratora systemu
          </p>
        </div>
      </div>
    </div>
  );
}
