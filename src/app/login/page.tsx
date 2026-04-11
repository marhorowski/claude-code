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
    <div className="login-bg">
      {/* Animated waves */}
      <div className="wave-1" />
      <div className="wave-2" />
      <div className="wave-3" />

      {/* Orb */}
      <div className="orb-wrap">
        <div className="orb-glow" />
        <div className="orb-ring-2" />
        <div className="orb-ring" />
        <div className="orb-sphere" />
      </div>

      {/* Login card */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Brand */}
          <div className="text-center mb-10">
            <div
              className="text-5xl font-black tracking-tight mb-2"
              style={{ color: "#00ff88", textShadow: "0 0 50px rgba(0,255,136,0.45), 0 0 100px rgba(0,255,136,0.15)" }}
            >
              McKwacz<span style={{ color: "rgba(0,255,136,0.45)" }}>.ai</span>
            </div>
            <div className="text-xs font-medium tracking-widest uppercase" style={{ color: "rgba(0,255,136,0.35)" }}>
              Sales Intelligence Platform
            </div>
          </div>

          {/* Card */}
          <div
            style={{
              background: "rgba(6,14,10,0.88)",
              border: "1px solid rgba(0,255,136,0.14)",
              borderRadius: "20px",
              backdropFilter: "blur(24px)",
              padding: "2rem",
            }}
          >
            <h2 className="text-sm font-semibold mb-6" style={{ color: "#666" }}>
              Zaloguj się do panelu
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "#4a6655" }}>
                  Adres email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="email@firma.pl"
                  className="w-full text-sm px-3 py-2.5 rounded-lg outline-none transition-all"
                  style={{
                    background: "rgba(0,0,0,0.45)",
                    border: "1px solid rgba(0,255,136,0.12)",
                    color: "#e0ede7",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(0,255,136,0.4)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(0,255,136,0.12)")}
                />
              </div>

              <div>
                <label className="block text-xs mb-1.5" style={{ color: "#4a6655" }}>
                  Hasło
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full text-sm px-3 py-2.5 rounded-lg outline-none transition-all"
                  style={{
                    background: "rgba(0,0,0,0.45)",
                    border: "1px solid rgba(0,255,136,0.12)",
                    color: "#e0ede7",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(0,255,136,0.4)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(0,255,136,0.12)")}
                />
              </div>

              {error && (
                <div
                  className="px-3 py-2.5 rounded-xl text-sm"
                  style={{
                    background: "rgba(255,68,68,0.08)",
                    border: "1px solid rgba(255,68,68,0.2)",
                    color: "#ff6666",
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all mt-2"
                style={{
                  background: loading ? "rgba(0,255,136,0.07)" : "rgba(0,255,136,0.11)",
                  border: "1px solid rgba(0,255,136,0.28)",
                  color: "#00ff88",
                  boxShadow: loading ? "none" : "0 0 20px rgba(0,255,136,0.08)",
                }}
              >
                {loading ? "Logowanie..." : "Zaloguj się"}
              </button>
            </form>

            <p className="text-center text-xs mt-6" style={{ color: "#1e2e26" }}>
              Konta tworzone są przez administratora systemu
            </p>
          </div>

          <div className="text-center mt-8 text-xs" style={{ color: "#1a2820" }}>
            © 2025 McKwacz.ai
          </div>
        </div>
      </div>
    </div>
  );
}
