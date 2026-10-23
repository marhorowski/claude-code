"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { parseNumber } from "@/lib/entries";
import { Prisma } from "@prisma/client";
import { COST_KINDS, parseGoals, TARGETABLE, type CostKind, type Offer, type OfferCost } from "@/lib/kpi";
import { measureInfo } from "@/lib/dashboard";
import type { FormState } from "./auth-actions";

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

/** Puste pole = brak wartości; inaczej liczba ≥ 0 albo komunikat błędu. */
function optionalNumber(raw: string, label: string): number | null | string {
  if (!raw.trim()) return null;
  const n = parseNumber(raw);
  if (Number.isNaN(n) || n < 0) return `„${label}”: wpisz liczbę nie mniejszą niż 0.`;
  return n;
}

export async function saveOffer(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const clientId = str(fd, "clientId");
  const fields = { price: "Cena oferty netto", closerPct: "Prowizja closera", setterPct: "Prowizja settera" } as const;
  const parsed: Record<string, number | null> = {};
  for (const [key, label] of Object.entries(fields)) {
    const v = optionalNumber(str(fd, key), label);
    if (typeof v === "string") return { error: v };
    parsed[key] = v;
  }

  const names = fd.getAll("costName").map(String);
  const kinds = fd.getAll("costKind").map(String);
  const values = fd.getAll("costValue").map(String);
  const costs: OfferCost[] = [];
  for (let i = 0; i < names.length; i++) {
    const name = names[i].trim();
    if (!name && !values[i]?.trim()) continue; // pusty wiersz
    const kind = COST_KINDS.find((k) => k.key === kinds[i])?.key as CostKind | undefined;
    const value = optionalNumber(values[i] ?? "", name || `Koszt ${i + 1}`);
    if (typeof value === "string") return { error: value };
    if (!kind || value === null) return { error: `Uzupełnij kwotę kosztu „${name || i + 1}”.` };
    costs.push({ name: name || `Koszt ${i + 1}`, kind, value });
  }

  const pctSum = (parsed.closerPct ?? 0) + (parsed.setterPct ?? 0) + costs.filter((c) => c.kind === "percent").reduce((a, c) => a + c.value, 0);
  if (pctSum > 100) return { error: "Prowizje i koszty procentowe razem przekraczają 100% przychodu." };

  const offer: Offer = { price: parsed.price, closerPct: parsed.closerPct ?? 0, setterPct: parsed.setterPct ?? 0, costs };
  await prisma.client.update({ where: { id: clientId }, data: { offer: offer as object } });
  revalidatePath("/panel", "layout");
  return { ok: "Zapisano ustawienia oferty. Zysk na dashboardzie liczy się już z nowych stawek." };
}

export async function saveTargets(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const clientId = str(fd, "clientId");
  const targets: Record<string, number> = {};
  for (const { key } of TARGETABLE.flatMap((g) => g.keys)) {
    const v = optionalNumber(str(fd, `t:${key}`), measureInfo(key).label);
    if (typeof v === "string") return { error: v };
    if (v) targets[key] = v; // 0 albo puste = bez celu
  }
  await prisma.client.update({ where: { id: clientId }, data: { kpiTargets: targets } });
  revalidatePath("/panel", "layout");
  return { ok: `Zapisano cele (${Object.keys(targets).length}). Kafelki i tabele pokazują już statusy.` };
}

/** Wraca do standardu agencji (cele startowe z DEFAULT_TARGETS). */
export async function resetTargets(clientId: string) {
  await requireAdmin();
  await prisma.client.update({ where: { id: clientId }, data: { kpiTargets: Prisma.DbNull } });
  revalidatePath("/panel", "layout");
}

/** Cel przychodu na miesiąc (RRRR-MM). Puste pole usuwa cel tego miesiąca. */
export async function saveGoal(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const clientId = str(fd, "clientId");
  const month = str(fd, "month");
  if (!/^\d{4}-\d{2}$/.test(month)) return { error: "Nieprawidłowy miesiąc." };
  const v = optionalNumber(str(fd, "revenue"), "Cel przychodu");
  if (typeof v === "string") return { error: v };
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { goals: true } });
  if (!client) return { error: "Nie ma takiego klienta." };
  const goals = parseGoals(client.goals);
  if (v) goals[month] = v;
  else delete goals[month];
  await prisma.client.update({ where: { id: clientId }, data: { goals } });
  revalidatePath("/panel", "layout");
  return { ok: v ? "Zapisano cel. Plan lejka przeliczony." : "Usunięto cel tego miesiąca." };
}
