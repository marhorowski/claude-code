"use client";

/**
 * Sygnały dźwiękowe generowane Web Audio API — bez plików audio.
 * Kontekst tworzony leniwie przy pierwszym dźwięku (wymaga gestu użytkownika).
 */

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

interface Note {
  freq: number;
  at: number; // s od startu
  dur: number; // s
  gain?: number;
  type?: OscillatorType;
}

function play(notes: Note[]) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime;
  for (const n of notes) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = n.type ?? "sine";
    osc.frequency.value = n.freq;
    const peak = n.gain ?? 0.12;
    g.gain.setValueAtTime(0, t0 + n.at);
    g.gain.linearRampToValueAtTime(peak, t0 + n.at + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.at + n.dur);
    osc.connect(g).connect(ac.destination);
    osc.start(t0 + n.at);
    osc.stop(t0 + n.at + n.dur + 0.05);
  }
}

/** Krótki, przyjemny blip po dodaniu zadania. */
export function sndTaskAdded() {
  play([
    { freq: 660, at: 0, dur: 0.09 },
    { freq: 880, at: 0.07, dur: 0.12 },
  ]);
}

/** Wznosząca sygnatura startu sesji Pomodoro. */
export function sndPomodoroStart() {
  play([
    { freq: 440, at: 0, dur: 0.12 },
    { freq: 554, at: 0.11, dur: 0.12 },
    { freq: 659, at: 0.22, dur: 0.2 },
  ]);
}

/** Podwójny sygnał ostrzegawczy — 5 minut do końca odliczania. */
export function sndFiveMinWarning() {
  play([
    { freq: 740, at: 0, dur: 0.14, type: "triangle", gain: 0.16 },
    { freq: 740, at: 0.25, dur: 0.14, type: "triangle", gain: 0.16 },
  ]);
}

/** Gong końca fazy pracy / przerwy. */
export function sndPhaseEnd() {
  play([
    { freq: 880, at: 0, dur: 0.5, gain: 0.14 },
    { freq: 587, at: 0.18, dur: 0.6, gain: 0.12 },
    { freq: 440, at: 0.36, dur: 0.8, gain: 0.1 },
  ]);
}

/** Triumfalny akord po zakończeniu zadania. */
export function sndTaskCompleted() {
  play([
    { freq: 523, at: 0, dur: 0.18 },
    { freq: 659, at: 0.12, dur: 0.18 },
    { freq: 784, at: 0.24, dur: 0.22 },
    { freq: 1047, at: 0.36, dur: 0.45, gain: 0.14 },
  ]);
}
