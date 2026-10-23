import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";
import { prisma } from "./prisma";
import { aggregateInputs, MONTHLY_FIELDS, MONTHLY_KEYS, WEEKLY_FIELDS, WEEKLY_KEYS, type Inputs } from "./fields";
import { parseThresholds } from "./grading";
import { monthKey, mondaysInMonth } from "./dates";
import type { AgencyInputs } from "./kpis";
import type { ReportData } from "./report";

export interface SessionUser {
  id: string;
  role: string;
  name?: string | null;
}

export const isLeader = (u: SessionUser) => u.role === "LIDER";

type Auth = { user: SessionUser; error?: undefined } | { user?: undefined; error: NextResponse };

export async function requireUser(): Promise<Auth> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 }) };
  return { user: session.user as SessionUser };
}

export async function requireLeader(): Promise<Auth> {
  const auth = await requireUser();
  if (auth.error) return auth;
  if (!isLeader(auth.user)) return { error: NextResponse.json({ error: "Tylko dla lidera CSM" }, { status: 403 }) };
  return auth;
}

// CSM zawsze widzi tylko siebie; lider — wybrany zakres ("team" albo id użytkownika)
export function resolveScope(user: SessionUser, requested: string | null): string {
  if (!isLeader(user)) return user.id;
  return requested && requested !== "" ? requested : "team";
}

// Czy użytkownik może zapisywać/odczytywać formularz danej osoby
export function canEditFor(user: SessionUser, targetUserId: string): boolean {
  return isLeader(user) || user.id === targetUserId;
}

export function intParam(v: string | null, min: number, max: number): number | null {
  if (v === null) return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

export function pickInputs(row: Record<string, unknown>, keys: string[]): Inputs {
  const out: Inputs = {};
  for (const k of keys) {
    const v = row[k];
    out[k] = typeof v === "number" ? v : null;
  }
  return out;
}

export async function loadConfig(): Promise<Pick<ReportData, "targets" | "thresholds">> {
  const [targets, setting] = await Promise.all([
    prisma.kpiTarget.findMany(),
    prisma.setting.findUnique({ where: { key: "thresholds" } }),
  ]);
  return {
    targets: Object.fromEntries(targets.map((t) => [t.code, t.target])),
    thresholds: parseThresholds(setting?.value),
  };
}

export async function loadReportData(scope: string): Promise<ReportData> {
  const userFilter = scope === "team" ? {} : { userId: scope };
  const [entries, agencyRows, responses, users, config] = await Promise.all([
    prisma.monthlyEntry.findMany({ where: userFilter }),
    prisma.agencyMonth.findMany(),
    prisma.surveyResponse.findMany({
      where: scope === "team" ? {} : { csmId: scope },
      select: { type: true, score: true, createdAt: true },
    }),
    prisma.user.findMany({ select: { id: true, fte: true } }),
    loadConfig(),
  ]);

  const fteByUser = new Map(users.map((u) => [u.id, u.fte]));
  const grouped = new Map<string, { inputs: Inputs[]; fte: number }>();
  for (const e of entries) {
    const key = monthKey(e.year, e.month);
    const g = grouped.get(key) ?? { inputs: [], fte: 0 };
    g.inputs.push(pickInputs(e as unknown as Record<string, unknown>, MONTHLY_KEYS));
    g.fte += fteByUser.get(e.userId) ?? 0;
    grouped.set(key, g);
  }

  const monthly = new Map<string, Inputs>();
  const fte = new Map<string, number>();
  for (const [key, g] of Array.from(grouped)) {
    monthly.set(key, aggregateInputs(g.inputs, MONTHLY_FIELDS)!);
    fte.set(key, g.fte);
  }

  const agency = new Map<string, AgencyInputs>(
    agencyRows.map((a) => [monthKey(a.year, a.month), {
      cac: a.cac, grossMarginPct: a.grossMarginPct, newClientsTotal: a.newClientsTotal, newClientsReferral: a.newClientsReferral,
    }])
  );

  return { monthly, agency, responses, fte, ...config };
}

// Tygodnie miesiąca zagregowane dla zakresu (tylko te z wpisami)
export async function loadWeeks(scope: string, year: number, month: number) {
  const mondays = mondaysInMonth(year, month);
  const rows = await prisma.weeklyEntry.findMany({
    where: {
      ...(scope === "team" ? {} : { userId: scope }),
      weekStart: { in: mondays },
    },
  });
  const weeks = mondays.map((monday) => {
    const list = rows
      .filter((r) => r.weekStart.getTime() === monday.getTime())
      .map((r) => pickInputs(r as unknown as Record<string, unknown>, WEEKLY_KEYS));
    return { monday, entries: list.length, inputs: aggregateInputs(list, WEEKLY_FIELDS) };
  });
  return { mondays, weeks };
}
