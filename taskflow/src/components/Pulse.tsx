"use client";

import { useEffect, useState, useCallback } from "react";
import { useStore } from "@/lib/store";
import { sndFiveMinWarning } from "@/lib/sounds";
import { Flame, CircleSlash } from "lucide-react";

const LAST_KEY = "ergon-last-pulse-at";

function lastPulseAt(): number {
  const v =
    typeof window !== "undefined" ? localStorage.getItem(LAST_KEY) : null;
  return v ? Number(v) : 0;
}

function markPulse() {
  localStorage.setItem(LAST_KEY, String(Date.now()));
}

/** Silnik pulsu: co `pulseIntervalMin` minut pyta o realizację potencjału. */
export function usePulse() {
  const settings = useStore((s) => s.settings);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!settings.pulseEnabled) return;
    // pierwszy start: nie pytaj od razu po otwarciu, wystartuj odliczanie
    if (lastPulseAt() === 0) markPulse();

    const check = () => {
      if (open) return;
      const h = new Date().getHours();
      if (h < (settings.pulseFromHour ?? 8) || h >= (settings.pulseToHour ?? 21))
        return;
      const interval = Math.max(1, settings.pulseIntervalMin ?? 15) * 60_000;
      if (Date.now() - lastPulseAt() < interval) return;

      setOpen(true);
      if (useStore.getState().settings.soundsEnabled !== false) {
        sndFiveMinWarning();
      }
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted" &&
        document.hidden
      ) {
        const n = new Notification("Puls potencjału", {
          body: "Czy realizujesz swój potencjał, czy marnujesz życie?",
          tag: "ergon-pulse",
        });
        n.onclick = () => window.focus();
      }
    };

    const id = setInterval(check, 15_000);
    check();
    return () => clearInterval(id);
  }, [
    open,
    settings.pulseEnabled,
    settings.pulseIntervalMin,
    settings.pulseFromHour,
    settings.pulseToHour,
  ]);

  const close = useCallback(() => {
    markPulse();
    setOpen(false);
  }, []);

  return { open, close };
}

export function PulseModal({ onClose }: { onClose: () => void }) {
  const addPulse = useStore((s) => s.addPulse);

  const answer = (a: "realize" | "waste") => {
    addPulse(a);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="card w-full max-w-md overflow-hidden fade-in-up">
        <div className="meander" />
        <div className="p-6 text-center">
          <div className="text-[11px] uppercase text-bronze-400">
            Puls potencjału
          </div>
          <div className="mt-2 font-display text-2xl md:text-3xl text-stone2-100 leading-snug">
            Czy realizujesz swój potencjał,
            <br />
            czy marnujesz życie?
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              className="flex flex-col items-center gap-2 rounded-lg border border-olive-400/60 bg-olive-500/10 px-4 py-4 text-olive-400 hover:bg-olive-500/20 transition-colors"
              onClick={() => answer("realize")}
            >
              <Flame className="h-7 w-7" />
              <span className="font-medium">Realizuję</span>
            </button>
            <button
              className="flex flex-col items-center gap-2 rounded-lg border border-terra-500/60 bg-terra-600/10 px-4 py-4 text-terra-400 hover:bg-terra-600/20 transition-colors"
              onClick={() => answer("waste")}
            >
              <CircleSlash className="h-7 w-7" />
              <span className="font-medium">Marnuję</span>
            </button>
          </div>
          <p className="mt-4 text-xs text-stone2-400">
            Szczera odpowiedź wystarczy. Wynik zapisuje się w Dzienniku.
          </p>
        </div>
      </div>
    </div>
  );
}
