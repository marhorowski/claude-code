"use client";

/**
 * Dźwięki w duchu antycznym — synteza Web Audio, bez plików:
 * - lira: szarpana struna (algorytm Karplusa-Stronga),
 * - dzwon z brązu: niestrojne alikwoty o długim wybrzmieniu,
 * - stuknięcia drewna (odliczanie).
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

/* ---------- lira: szarpana struna (Karplus-Strong) ---------- */

const pluckCache = new Map<string, AudioBuffer>();

function pluckBuffer(
  ac: AudioContext,
  freq: number,
  durSec = 2.2,
  damp = 0.995
): AudioBuffer {
  const key = `${Math.round(freq)}|${durSec}|${damp}`;
  const hit = pluckCache.get(key);
  if (hit) return hit;

  const sr = ac.sampleRate;
  const n = Math.floor(sr * durSec);
  const buf = ac.createBuffer(1, n, sr);
  const out = buf.getChannelData(0);
  const period = Math.max(2, Math.round(sr / freq));
  const line = new Float32Array(period);
  // szarpnięcie: krótki impuls szumu
  for (let i = 0; i < period; i++) line[i] = Math.random() * 2 - 1;
  let idx = 0;
  for (let i = 0; i < n; i++) {
    const cur = line[idx];
    const next = line[(idx + 1) % period];
    out[i] = cur;
    line[idx] = (cur + next) * 0.5 * damp; // tłumiony filtr uśredniający
    idx = (idx + 1) % period;
  }
  pluckCache.set(key, buf);
  return buf;
}

function pluck(freq: number, at = 0, gain = 0.22, durSec = 2.2) {
  const ac = audio();
  if (!ac) return;
  const src = ac.createBufferSource();
  src.buffer = pluckBuffer(ac, freq, durSec);
  const g = ac.createGain();
  g.gain.value = gain;
  src.connect(g).connect(ac.destination);
  src.start(ac.currentTime + at);
}

/* ---------- dzwon z brązu ---------- */

function bronzeBell(freq: number, at = 0, gain = 0.16, durSec = 2.4) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + at;
  // niestrojne alikwoty typowe dla dzwonu
  const partials: [number, number][] = [
    [1, 1],
    [2.02, 0.55],
    [2.72, 0.35],
    [4.17, 0.2],
  ];
  for (const [mult, amp] of partials) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = freq * mult;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain * amp, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + durSec / mult ** 0.5);
    osc.connect(g).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + durSec + 0.1);
  }
}

/* ---------- stuknięcie drewna ---------- */

export function sndTick() {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime;
  const src = ac.createBufferSource();
  const n = Math.floor(ac.sampleRate * 0.05);
  const buf = ac.createBuffer(1, n, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) {
    d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (n * 0.18));
  }
  src.buffer = buf;
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1500;
  bp.Q.value = 6;
  const g = ac.createGain();
  g.gain.value = 0.5;
  src.connect(bp).connect(g).connect(ac.destination);
  src.start(t0);
}

/* ---------- sygnatury zdarzeń ---------- */

// skala: E frygijska/pentatonika — antyczny charakter
const E3 = 164.81;
const G3 = 196.0;
const A3 = 220.0;
const B3 = 246.94;
const D4 = 293.66;
const E4 = 329.63;
const G4 = 392.0;
const A4 = 440.0;
const B4 = 493.88;
const E5 = 659.26;

/** Pojedyncze, miękkie szarpnięcie struny — dodanie zadania. */
export function sndTaskAdded() {
  pluck(A4, 0, 0.16, 1.4);
}

/** Trzy wznoszące struny — start sesji Pomodoro. */
export function sndPomodoroStart() {
  pluck(E4, 0, 0.2);
  pluck(A4, 0.14, 0.2);
  pluck(E5, 0.28, 0.22);
}

/** Dwa niskie szarpnięcia — ostrzeżenie / puls. */
export function sndFiveMinWarning() {
  pluck(A3, 0, 0.24, 1.8);
  pluck(A3, 0.3, 0.2, 1.8);
}

/** Dzwon z brązu — koniec fazy pracy / przerwy. */
export function sndPhaseEnd() {
  bronzeBell(220, 0, 0.18, 2.6);
  bronzeBell(146.83, 0.25, 0.12, 3);
}

/** Triumfalny pochód strun — zakończenie zadania. */
export function sndTaskCompleted() {
  pluck(E4, 0, 0.2);
  pluck(G4, 0.12, 0.2);
  pluck(B4, 0.24, 0.2);
  pluck(E5, 0.38, 0.24, 2.6);
  bronzeBell(659.26, 0.55, 0.07, 1.6);
}

/* ---------- cicha lira w trakcie przerwy ---------- */

const BREAK_SCALE = [E3, G3, A3, B3, D4, E4, G4, A4];
let breakTimer: ReturnType<typeof setTimeout> | null = null;
let breakStep = 2;

function scheduleBreakNote(isEnabled: () => boolean) {
  if (!isEnabled()) {
    stopBreakMusic();
    return;
  }
  // spokojny błądzący pochód po skali
  breakStep = Math.min(
    BREAK_SCALE.length - 1,
    Math.max(0, breakStep + (Math.floor(Math.random() * 3) - 1))
  );
  const freq = BREAK_SCALE[breakStep];
  pluck(freq, 0, 0.045, 2.6); // cichutko
  if (Math.random() < 0.25) {
    // czasem kwinta niżej, jak drugi palec na lirze
    pluck(freq * 0.667, 0.18, 0.03, 2.4);
  }
  breakTimer = setTimeout(
    () => scheduleBreakNote(isEnabled),
    1400 + Math.random() * 1600
  );
}

/** Start cichej muzyki liry (przerwa Pomodoro). */
export function startBreakMusic(isEnabled: () => boolean) {
  if (breakTimer) return; // już gra
  if (!isEnabled()) return;
  breakStep = 2;
  scheduleBreakNote(isEnabled);
}

/** Stop muzyki przerwy. */
export function stopBreakMusic() {
  if (breakTimer) {
    clearTimeout(breakTimer);
    breakTimer = null;
  }
}
