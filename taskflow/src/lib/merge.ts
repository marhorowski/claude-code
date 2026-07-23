/**
 * Scalanie stanu z dwóch urządzeń bez utraty danych.
 * Używane, gdy zapis natrafi na nowszą wersję w bazie (konflikt) lub
 * gdy pull musi połączyć zdalny stan z lokalnymi, jeszcze niewysłanymi zmianami.
 *
 * Zasada: sumy zbiorów po id (nowe elementy z obu urządzeń przetrwają),
 * a dla map liczbowych (workLog, log nawyków) bierzemy większą wartość.
 */

type Rec = Record<string, unknown>;

function ts(v: unknown): number {
  if (typeof v !== "string") return 0;
  const t = Date.parse(v);
  return isNaN(t) ? 0 : t;
}

/** Scal listę obiektów z polem `id`, wybierając nowszą wersję dla wspólnych id. */
function mergeById(
  local: unknown,
  remote: unknown,
  mtimeField?: string
): unknown[] {
  const l = Array.isArray(local) ? local : [];
  const r = Array.isArray(remote) ? remote : [];
  const map = new Map<string, Rec>();
  const order: string[] = [];
  const put = (item: unknown) => {
    if (!item || typeof item !== "object") return;
    const rec = item as Rec;
    const id = String(rec.id ?? "");
    if (!id) return;
    const prev = map.get(id);
    if (!prev) {
      map.set(id, rec);
      order.push(id);
      return;
    }
    // wspólne id: wybierz nowszą wersję wg pola czasu, inaczej zdalną
    if (mtimeField) {
      map.set(id, ts(rec[mtimeField]) >= ts(prev[mtimeField]) ? rec : prev);
    } else {
      map.set(id, rec);
    }
  };
  // najpierw lokalne (zachowaj kolejność), potem zdalne (uzupełnij/nadpisz)
  l.forEach(put);
  r.forEach(put);
  return order.map((id) => map.get(id)!);
}

/** Scal listę po dowolnym kluczu (np. pulseLog po ts). */
function mergeByKey(
  local: unknown,
  remote: unknown,
  keyOf: (r: Rec) => string
): unknown[] {
  const l = (Array.isArray(local) ? local : []) as Rec[];
  const r = (Array.isArray(remote) ? remote : []) as Rec[];
  const map = new Map<string, Rec>();
  [...l, ...r].forEach((item) => {
    if (item && typeof item === "object") map.set(keyOf(item), item);
  });
  return Array.from(map.values());
}

/** Scal mapę data→liczba, biorąc maksimum. */
function mergeNumMap(local: unknown, remote: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  const l = (local ?? {}) as Record<string, number>;
  const r = (remote ?? {}) as Record<string, number>;
  const keys = Array.from(new Set([...Object.keys(l), ...Object.keys(r)]));
  for (const k of keys) {
    out[k] = Math.max(l[k] ?? 0, r[k] ?? 0);
  }
  return out;
}

/** Scal nawyki: unia po id, a log każdego nawyku po maksimum na dzień. */
function mergeHabits(local: unknown, remote: unknown): unknown[] {
  const merged = mergeById(local, remote, "createdAt") as Rec[];
  const l = (Array.isArray(local) ? local : []) as Rec[];
  const r = (Array.isArray(remote) ? remote : []) as Rec[];
  const logById = (arr: Rec[], id: string) =>
    (arr.find((h) => h.id === id)?.log ?? {}) as Record<string, number>;
  return merged.map((h) => {
    const id = String(h.id);
    return { ...h, log: mergeNumMap(logById(l, id), logById(r, id)) };
  });
}

/** Scal journal: klucz = type+date, nowsza wersja wygrywa. */
function mergeJournal(local: unknown, remote: unknown): unknown[] {
  const l = (Array.isArray(local) ? local : []) as Rec[];
  const r = (Array.isArray(remote) ? remote : []) as Rec[];
  const map = new Map<string, Rec>();
  const order: string[] = [];
  const put = (j: Rec) => {
    const key = `${j.type}|${j.date}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, j);
      order.push(key);
    } else if (ts(j.updatedAt) >= ts(prev.updatedAt)) {
      map.set(key, j);
    }
  };
  l.forEach(put);
  r.forEach(put);
  return order.map((k) => map.get(k)!);
}

/** Scal daySummaries: klucz = date, nowszy createdAt wygrywa. */
function mergeDaySummaries(local: unknown, remote: unknown): unknown[] {
  const l = (Array.isArray(local) ? local : []) as Rec[];
  const r = (Array.isArray(remote) ? remote : []) as Rec[];
  const map = new Map<string, Rec>();
  [...l, ...r].forEach((d) => {
    const prev = map.get(String(d.date));
    if (!prev || ts(d.createdAt) >= ts(prev.createdAt)) map.set(String(d.date), d);
  });
  return Array.from(map.values()).sort((a, b) =>
    String(b.date).localeCompare(String(a.date))
  );
}

/**
 * Scal cały stan. `local` to bieżący stan urządzenia, `remote` z bazy.
 * settings: bierzemy lokalne (użytkownik mógł je właśnie zmienić),
 * uzupełnione o brakujące pola ze zdalnych.
 */
export function mergeStates(local: Rec, remote: Rec): Rec {
  return {
    tasks: mergeById(local.tasks, remote.tasks),
    projects: mergeById(local.projects, remote.projects),
    goals: mergeById(local.goals, remote.goals),
    habits: mergeHabits(local.habits, remote.habits),
    journal: mergeJournal(local.journal, remote.journal),
    pulseLog: mergeByKey(
      local.pulseLog,
      remote.pulseLog,
      (p) => `${p.ts}|${p.answer}`
    ),
    workSessions: mergeById(local.workSessions, remote.workSessions),
    daySummaries: mergeDaySummaries(local.daySummaries, remote.daySummaries),
    workLog: mergeNumMap(local.workLog, remote.workLog),
    pomodoroLog: mergeNumMap(local.pomodoroLog, remote.pomodoroLog),
    settings: {
      ...(remote.settings as Rec),
      ...(local.settings as Rec),
    },
  };
}
