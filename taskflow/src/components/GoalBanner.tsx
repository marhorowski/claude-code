"use client";

import { useStore } from "@/lib/store";

/** Stały pasek z przypomnieniem o celu głównym oraz fokusem dnia i tygodnia. */
export default function GoalBanner({ onGoals }: { onGoals: () => void }) {
  const goals = useStore((s) => s.goals);
  const settings = useStore((s) => s.settings);
  const main = goals.find((g) => g.isMain) ?? goals[0];

  return (
    <div className="card overflow-hidden">
      <div className="meander" />
      <div className="p-4">
        {main ? (
          <button className="block w-full text-left" onClick={onGoals}>
            <div className="text-[11px] uppercase text-bronze-400">
              Twój cel
            </div>
            <div className="font-display text-xl md:text-2xl text-stone2-100 leading-snug">
              {main.title}
            </div>
            {main.why && (
              <div className="mt-0.5 text-sm text-stone2-400">{main.why}</div>
            )}
            {main.keyResults.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {main.keyResults.map((kr) => (
                  <span
                    key={kr.id}
                    className="chip border border-ink-600 bg-ink-900 text-stone2-300"
                  >
                    {kr.text}: {kr.current}/{kr.target} {kr.unit}
                  </span>
                ))}
              </div>
            )}
          </button>
        ) : (
          <button className="block w-full text-left" onClick={onGoals}>
            <div className="text-[11px] uppercase text-bronze-400">
              Twój cel
            </div>
            <div className="text-sm text-stone2-400">
              Nie masz jeszcze celu głównego —{" "}
              <span className="text-bronze-300 underline">
                zdefiniuj go w module Cele
              </span>
              , a będzie Ci tu codziennie przypominany.
            </div>
          </button>
        )}

        {(settings.dayFocus || settings.weekFocus) && (
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {settings.dayFocus && (
              <div className="rounded-lg border border-terra-600/40 bg-terra-600/10 px-3 py-2">
                <div className="text-[11px] uppercase text-terra-400">
                  Fokus dnia
                </div>
                <div className="text-sm text-stone2-100">
                  {settings.dayFocus}
                </div>
              </div>
            )}
            {settings.weekFocus && (
              <div className="rounded-lg border border-bronze-500/40 bg-bronze-500/10 px-3 py-2">
                <div className="text-[11px] uppercase text-bronze-400">
                  Fokus tygodnia
                </div>
                <div className="text-sm text-stone2-100">
                  {settings.weekFocus}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
