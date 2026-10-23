"use client";

import { useEffect, useState } from "react";
import { CSAT_STAGES, NPS_QUESTION } from "@/lib/surveys";

const CSAT_LABELS = ["Bardzo źle", "Źle", "Przeciętnie", "Dobrze", "Bardzo dobrze"];

export default function PublicSurveyPage({ params }: { params: { token: string } }) {
  const [info, setInfo] = useState<{ type: string; stage: string | null } | null>(null);
  const [error, setError] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [company, setCompany] = useState("");
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/public-survey/${params.token}`)
      .then(async (r) => (r.ok ? setInfo(await r.json()) : setError((await r.json()).error ?? "Ankieta niedostępna")))
      .catch(() => setError("Ankieta niedostępna"));
  }, [params.token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (score === null) return setError("Wybierz ocenę.");
    setSending(true);
    setError("");
    const r = await fetch(`/api/public-survey/${params.token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score, company, comment }),
    });
    setSending(false);
    if (r.ok) setDone(true);
    else setError((await r.json().catch(() => ({}))).error ?? "Nie udało się wysłać.");
  }

  const isNps = info?.type === "NPS";
  const scale = isNps ? Array.from({ length: 11 }, (_, i) => i) : [1, 2, 3, 4, 5];
  const question = isNps ? NPS_QUESTION : CSAT_STAGES.find((s) => s.id === info?.stage)?.question ?? CSAT_STAGES[3].question;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg-primary)" }}>
      <div className="card w-full max-w-xl p-6 sm:p-8">
        {done ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">🙏</div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Dziękujemy za opinię!</h1>
            <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>Każda odpowiedź pomaga nam lepiej prowadzić Twoje kampanie.</p>
          </div>
        ) : !info ? (
          <p className="text-sm" style={{ color: error ? "var(--red)" : "var(--text-muted)" }}>{error || "Ładowanie…"}</p>
        ) : (
          <form onSubmit={submit} className="space-y-6">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--neon)" }}>{isNps ? "Ankieta NPS" : "Ankieta satysfakcji"}</div>
              <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{question}</h1>
            </div>

            <div>
              <div className={`grid gap-1.5 ${isNps ? "grid-cols-6 sm:grid-cols-11" : "grid-cols-5"}`}>
                {scale.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setScore(n)}
                    className="py-3 rounded-lg text-sm font-bold transition-all"
                    style={{
                      background: score === n ? "var(--neon-dim)" : "var(--bg-input)",
                      border: `1px solid ${score === n ? "var(--neon)" : "var(--border-card)"}`,
                      color: score === n ? "var(--neon)" : "var(--text-secondary)",
                    }}
                    aria-pressed={score === n}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                {isNps ? <><span>0 — zdecydowanie nie</span><span>10 — zdecydowanie tak</span></> : <><span>{CSAT_LABELS[0]}</span><span>{CSAT_LABELS[4]}</span></>}
              </div>
            </div>

            <label className="block">
              <span className="lbl">Nazwa firmy *</span>
              <input className="input-dark" value={company} onChange={(e) => setCompany(e.target.value)} required maxLength={120} />
            </label>

            <label className="block">
              <span className="lbl">{isNps ? "Co jest główną przyczyną Twojej oceny?" : "Co możemy poprawić?"} (opcjonalnie)</span>
              <textarea className="input-dark" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} />
            </label>

            {error && <p className="text-sm" style={{ color: "var(--red)" }}>{error}</p>}
            <button className="btn-neon w-full" type="submit" disabled={sending}>{sending ? "Wysyłanie…" : "Wyślij odpowiedź"}</button>
          </form>
        )}
      </div>
    </div>
  );
}
